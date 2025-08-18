-- Create operation locks table for idempotency
CREATE TABLE IF NOT EXISTS public.operation_locks (
  key TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '2 hours')
);

-- Function to acquire a lock
CREATE OR REPLACE FUNCTION public.acquire_lock(p_key TEXT, p_ttl_seconds INTEGER DEFAULT 120)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clean up expired locks
  DELETE FROM public.operation_locks WHERE expires_at < now();
  
  -- Try to acquire the lock
  BEGIN
    INSERT INTO public.operation_locks (key, expires_at)
    VALUES (p_key, now() + (p_ttl_seconds || ' seconds')::interval);
    RETURN TRUE;
  EXCEPTION WHEN unique_violation THEN
    RETURN FALSE;
  END;
END;
$$;

-- Function to release a lock
CREATE OR REPLACE FUNCTION public.release_lock(p_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.operation_locks WHERE key = p_key;
END;
$$;

-- Function to create or update track from generation atomically
CREATE OR REPLACE FUNCTION public.create_or_update_track_from_generation(
  p_generation_id UUID,
  p_project_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_track_id UUID;
  v_generation RECORD;
  v_project_id UUID;
  v_title TEXT;
  v_track_number INTEGER;
BEGIN
  -- Get generation data
  SELECT * INTO v_generation
  FROM public.ai_generations
  WHERE id = p_generation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Generation not found: %', p_generation_id;
  END IF;
  
  -- Use provided project_id or get user's inbox
  IF p_project_id IS NOT NULL THEN
    v_project_id := p_project_id;
  ELSE
    v_project_id := public.ensure_user_inbox(v_generation.user_id);
  END IF;
  
  -- Check if track already exists for this generation
  SELECT track_id INTO v_track_id
  FROM public.ai_generations
  WHERE id = p_generation_id AND track_id IS NOT NULL;
  
  IF v_track_id IS NOT NULL THEN
    -- Update existing track
    UPDATE public.tracks
    SET 
      audio_url = COALESCE(v_generation.result_url, audio_url),
      metadata = COALESCE(tracks.metadata, '{}'::jsonb) || COALESCE(v_generation.metadata, '{}'::jsonb),
      updated_at = now()
    WHERE id = v_track_id;
    
    RETURN v_track_id;
  END IF;
  
  -- Generate title from metadata or prompt
  v_title := COALESCE(
    v_generation.metadata->>'title',
    v_generation.metadata->>'style',
    split_part(v_generation.prompt, E'\n', 1),
    'Generated Track'
  );
  
  -- Dedupe title
  v_title := public.dedupe_track_title(v_project_id, v_title);
  
  -- Get next track number
  v_track_number := public.get_next_track_number(v_project_id);
  
  -- Create new track
  INSERT INTO public.tracks (
    project_id,
    title,
    track_number,
    audio_url,
    lyrics,
    metadata
  ) VALUES (
    v_project_id,
    v_title,
    v_track_number,
    v_generation.result_url,
    v_generation.metadata->>'lyrics',
    COALESCE(v_generation.metadata, '{}'::jsonb) || jsonb_build_object(
      'generation_id', p_generation_id,
      'service', v_generation.service,
      'external_id', v_generation.external_id
    )
  ) RETURNING id INTO v_track_id;
  
  -- Update generation with track_id
  UPDATE public.ai_generations
  SET track_id = v_track_id
  WHERE id = p_generation_id;
  
  RETURN v_track_id;
END;
$$;