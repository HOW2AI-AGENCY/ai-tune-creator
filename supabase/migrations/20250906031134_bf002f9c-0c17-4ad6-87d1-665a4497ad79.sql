-- Security Fix 1: Add is_public field to tracks table for proper access control
ALTER TABLE public.tracks ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- Security Fix 2: Update get_public_tracks_feed to only return actually public tracks
CREATE OR REPLACE FUNCTION public.get_public_tracks_feed(p_limit integer DEFAULT 15)
 RETURNS TABLE(id uuid, title text, created_at timestamp with time zone, audio_url text, metadata jsonb, project_id uuid, artist_name text, artist_avatar_url text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.created_at,
    t.audio_url,
    t.metadata,
    t.project_id,
    a.name as artist_name,
    a.avatar_url as artist_avatar_url
  FROM tracks t
  JOIN projects p ON t.project_id = p.id
  JOIN artists a ON p.artist_id = a.id
  WHERE t.audio_url IS NOT NULL
    AND t.is_public = true  -- SECURITY: Only return explicitly public tracks
    AND (t.metadata->>'deleted')::boolean IS NOT TRUE
    AND t.storage_status != 'deleted'
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$function$;

-- Security Fix 3: Add database-backed rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  operation text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(identifier, operation)
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Only service role can manage rate limits" ON public.rate_limits
FOR ALL USING (current_setting('role', true) = 'service_role');

-- Security Fix 4: Add function for database-backed rate limiting
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_operation text,
  p_max_requests integer,
  p_window_minutes integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_count integer := 0;
  v_window_start timestamp with time zone;
  v_expires_at timestamp with time zone;
  v_remaining integer;
BEGIN
  -- Calculate window boundaries
  v_window_start := date_trunc('minute', now()) - (extract(minute from now())::integer % p_window_minutes || ' minutes')::interval;
  v_expires_at := v_window_start + (p_window_minutes || ' minutes')::interval;
  
  -- Clean up expired entries
  DELETE FROM public.rate_limits WHERE expires_at < now();
  
  -- Get or create rate limit record
  INSERT INTO public.rate_limits (identifier, operation, count, window_start, expires_at)
  VALUES (p_identifier, p_operation, 1, v_window_start, v_expires_at)
  ON CONFLICT (identifier, operation) 
  DO UPDATE SET 
    count = CASE 
      WHEN rate_limits.window_start = v_window_start THEN rate_limits.count + 1
      ELSE 1 
    END,
    window_start = v_window_start,
    expires_at = v_expires_at
  RETURNING count INTO v_current_count;
  
  v_remaining := greatest(0, p_max_requests - v_current_count);
  
  RETURN jsonb_build_object(
    'allowed', v_current_count <= p_max_requests,
    'remaining', v_remaining,
    'resetTime', extract(epoch from v_expires_at),
    'current', v_current_count,
    'limit', p_max_requests
  );
END;
$function$;

-- Security Fix 5: Add MIME type validation function
CREATE OR REPLACE FUNCTION public.validate_file_upload(
  p_file_name text,
  p_mime_type text,
  p_file_size bigint,
  p_upload_type text DEFAULT 'general'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_allowed_types text[];
  v_max_size bigint;
  v_is_valid boolean := true;
  v_errors text[] := ARRAY[]::text[];
BEGIN
  -- Define allowed MIME types per upload type
  CASE p_upload_type
    WHEN 'image' THEN
      v_allowed_types := ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      v_max_size := 10485760; -- 10MB
    WHEN 'audio' THEN
      v_allowed_types := ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/ogg'];
      v_max_size := 104857600; -- 100MB
    ELSE
      v_allowed_types := ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp3'];
      v_max_size := 50485760; -- 50MB
  END CASE;
  
  -- Validate MIME type
  IF p_mime_type IS NULL OR NOT (p_mime_type = ANY(v_allowed_types)) THEN
    v_is_valid := false;
    v_errors := array_append(v_errors, format('Invalid file type: %s. Allowed types: %s', 
      COALESCE(p_mime_type, 'unknown'), array_to_string(v_allowed_types, ', ')));
  END IF;
  
  -- Validate file size
  IF p_file_size > v_max_size THEN
    v_is_valid := false;
    v_errors := array_append(v_errors, format('File too large: %s bytes. Maximum: %s bytes', 
      p_file_size, v_max_size));
  END IF;
  
  -- Validate file extension matches MIME type
  IF p_file_name IS NOT NULL AND p_mime_type IS NOT NULL THEN
    IF (p_mime_type LIKE 'image/%' AND NOT (p_file_name ~* '\.(jpg|jpeg|png|webp)$')) OR
       (p_mime_type LIKE 'audio/%' AND NOT (p_file_name ~* '\.(mp3|wav|m4a|ogg)$')) THEN
      v_is_valid := false;
      v_errors := array_append(v_errors, 'File extension does not match MIME type');
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'valid', v_is_valid,
    'errors', v_errors,
    'mime_type', p_mime_type,
    'max_size', v_max_size,
    'allowed_types', v_allowed_types
  );
END;
$function$;