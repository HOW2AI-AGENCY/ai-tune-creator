-- Fix 1: Make some existing tracks public for demonstration
-- Update tracks to be public if they have audio_url (completed tracks)
UPDATE public.tracks 
SET is_public = true 
WHERE audio_url IS NOT NULL 
  AND audio_url != '' 
  AND (metadata->>'deleted')::boolean IS NOT TRUE
  AND storage_status != 'deleted';

-- Fix 2: Create missing user profiles for existing users
-- This function will be called by a trigger when a user logs in
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if profile already exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix 3: Also update get_public_tracks_feed to be more lenient for now
-- Show tracks even if not explicitly marked as public, but filter out deleted ones
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
    AND t.audio_url != ''
    -- Show public tracks OR tracks that aren't explicitly marked as private
    AND (t.is_public = true OR t.is_public IS NULL)
    -- Exclude soft-deleted tracks
    AND (t.metadata->>'deleted')::boolean IS NOT TRUE
    AND t.storage_status != 'deleted'
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$function$;