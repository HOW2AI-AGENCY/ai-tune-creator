-- Extend create_or_update_track_from_generation RPC to support artist-only context
-- This enables "Artist without project" scenario by creating an Inbox for the specified artist

CREATE OR REPLACE FUNCTION public.create_or_update_track_from_generation(
  p_generation_id uuid, 
  p_project_id uuid DEFAULT NULL::uuid,
  p_artist_id uuid DEFAULT NULL::uuid
) 
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Determine target project
  IF p_project_id IS NOT NULL THEN
    -- Use provided project
    v_project_id := p_project_id;
  ELSIF p_artist_id IS NOT NULL THEN
    -- Create/find Inbox for specified artist
    SELECT id INTO v_project_id
    FROM public.projects
    WHERE artist_id = p_artist_id 
    AND is_inbox = true
    LIMIT 1;
    
    -- Create artist's inbox if it doesn't exist
    IF v_project_id IS NULL THEN
      INSERT INTO public.projects (artist_id, title, description, type, status, is_inbox)
      VALUES (p_artist_id, 'Inbox', 'Generated tracks for this artist', 'mixtape', 'draft', true)
      RETURNING id INTO v_project_id;
    END IF;
  ELSE
    -- Use user's default inbox
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
$function$;