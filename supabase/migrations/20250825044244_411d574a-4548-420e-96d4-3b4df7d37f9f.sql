-- Security Fixes Migration: Storage buckets, SQL functions, and authentication improvements

-- 1. Make track-audio bucket private for security
UPDATE storage.buckets 
SET public = false 
WHERE id = 'track-audio';

-- 2. Harden SECURITY DEFINER functions with proper authorization checks
-- Fix create_or_update_track_from_generation to require ownership
CREATE OR REPLACE FUNCTION public.create_or_update_track_from_generation(p_generation_id uuid, p_project_id uuid DEFAULT NULL::uuid, p_artist_id uuid DEFAULT NULL::uuid)
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
  v_current_user_id UUID;
BEGIN
  -- Get current authenticated user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get generation data
  SELECT * INTO v_generation
  FROM public.ai_generations
  WHERE id = p_generation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Generation not found: %', p_generation_id;
  END IF;
  
  -- Verify ownership: user must own the generation OR be admin
  IF v_generation.user_id != v_current_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: generation belongs to different user';
  END IF;
  
  -- Determine target project
  IF p_project_id IS NOT NULL THEN
    -- Verify user owns the target project
    IF NOT EXISTS (
      SELECT 1 FROM projects p 
      JOIN artists a ON p.artist_id = a.id 
      WHERE p.id = p_project_id AND a.user_id = v_current_user_id
    ) AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access denied: project belongs to different user';
    END IF;
    v_project_id := p_project_id;
  ELSIF p_artist_id IS NOT NULL THEN
    -- Verify user owns the artist
    IF NOT EXISTS (
      SELECT 1 FROM artists WHERE id = p_artist_id AND user_id = v_current_user_id
    ) AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access denied: artist belongs to different user';
    END IF;
    
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

-- Fix delete_track_completely to require proper authorization
CREATE OR REPLACE FUNCTION public.delete_track_completely(p_track_id uuid, p_user_id uuid, p_hard_delete boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_track_record RECORD;
  v_generation_id UUID;
  v_storage_path TEXT;
  v_result JSONB := jsonb_build_object('success', TRUE, 'deleted_items', jsonb_build_array());
  v_current_user_id UUID;
BEGIN
  -- Get current authenticated user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ignore passed p_user_id and use authenticated user OR verify admin
  IF p_user_id != v_current_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: can only delete own tracks or must be admin';
  END IF;

  -- Verify track ownership through RLS-style check
  SELECT t.*, p.artist_id INTO v_track_record
  FROM tracks t
  JOIN projects p ON t.project_id = p.id
  JOIN artists a ON p.artist_id = a.id
  WHERE t.id = p_track_id AND (a.user_id = v_current_user_id OR public.is_admin());
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Track not found or access denied');
  END IF;

  -- Get generation ID from metadata
  v_generation_id := (v_track_record.metadata->>'generation_id')::UUID;
  v_storage_path := v_track_record.storage_path;

  IF p_hard_delete THEN
    -- Hard delete: Remove from all tables
    
    -- Delete from track_assets
    DELETE FROM track_assets WHERE track_id = p_track_id;
    v_result := jsonb_set(v_result, '{deleted_items}', 
      (v_result->'deleted_items') || jsonb_build_array('track_assets'));
    
    -- Delete from track_versions  
    DELETE FROM track_versions WHERE track_id = p_track_id;
    v_result := jsonb_set(v_result, '{deleted_items}', 
      (v_result->'deleted_items') || jsonb_build_array('track_versions'));
    
    -- Delete from promo_materials
    DELETE FROM promo_materials WHERE track_id = p_track_id;
    v_result := jsonb_set(v_result, '{deleted_items}', 
      (v_result->'deleted_items') || jsonb_build_array('promo_materials'));
    
    -- Unlink from ai_generations (don't delete generation, just unlink)
    IF v_generation_id IS NOT NULL THEN
      UPDATE ai_generations 
      SET track_id = NULL, 
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('track_deleted', TRUE)
      WHERE id = v_generation_id;
      v_result := jsonb_set(v_result, '{deleted_items}', 
        (v_result->'deleted_items') || jsonb_build_array('ai_generations_unlinked'));
    END IF;
    
    -- Delete the track record
    DELETE FROM tracks WHERE id = p_track_id;
    v_result := jsonb_set(v_result, '{deleted_items}', 
      (v_result->'deleted_items') || jsonb_build_array('tracks'));
    
    -- Mark for storage cleanup
    v_result := jsonb_set(v_result, '{storage_cleanup_needed}', 
      jsonb_build_object('path', v_storage_path, 'audio_url', v_track_record.audio_url));
      
  ELSE
    -- Soft delete: Mark as deleted
    UPDATE tracks 
    SET 
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'deleted', TRUE,
        'deleted_at', NOW()::text,
        'deleted_by', v_current_user_id
      ),
      storage_status = 'deleted'
    WHERE id = p_track_id;
    
    v_result := jsonb_set(v_result, '{deleted_items}', 
      (v_result->'deleted_items') || jsonb_build_array('tracks_soft_deleted'));
  END IF;

  -- Log the deletion
  INSERT INTO activity_logs (
    user_id, 
    action, 
    description, 
    entity_type, 
    entity_id, 
    metadata
  ) VALUES (
    v_current_user_id,
    CASE WHEN p_hard_delete THEN 'TRACK_HARD_DELETE' ELSE 'TRACK_SOFT_DELETE' END,
    format('Track "%s" deleted (%s)', v_track_record.title, 
           CASE WHEN p_hard_delete THEN 'permanent' ELSE 'soft' END),
    'track',
    p_track_id,
    jsonb_build_object(
      'track_title', v_track_record.title,
      'generation_id', v_generation_id,
      'storage_path', v_storage_path,
      'delete_type', CASE WHEN p_hard_delete THEN 'hard' ELSE 'soft' END
    )
  );

  RETURN v_result;
END;
$function$;

-- Fix get_tracks_needing_storage_upload to require proper authorization
CREATE OR REPLACE FUNCTION public.get_tracks_needing_storage_upload(p_user_id uuid)
 RETURNS TABLE(track_id uuid, generation_id uuid, external_url text, title text, service text, external_id text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_user_id UUID;
BEGIN
  -- Get current authenticated user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify authorization: user can only get their own tracks OR be admin
  IF p_user_id != v_current_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: can only get own tracks or must be admin';
  END IF;

  RETURN QUERY
  SELECT 
    t.id as track_id,
    g.id as generation_id,
    g.result_url as external_url,
    t.title,
    g.service,
    g.external_id,
    t.created_at
  FROM tracks t
  JOIN ai_generations g ON t.metadata->>'generation_id' = g.id::text
  JOIN projects p ON t.project_id = p.id
  JOIN artists a ON p.artist_id = a.id
  WHERE a.user_id = p_user_id
    AND t.storage_status IN ('pending', 'failed')
    -- Exclude soft-deleted tracks
    AND (t.metadata->>'deleted')::boolean IS NOT TRUE
    AND t.storage_status != 'deleted'
    AND g.result_url IS NOT NULL
    AND g.result_url != ''
    AND (t.audio_url IS NULL OR t.audio_url = '' OR NOT t.audio_url LIKE '%storage.v1%')
  ORDER BY t.created_at DESC;
END;
$function$;

-- Fix update_track_storage_status to require proper authorization
CREATE OR REPLACE FUNCTION public.update_track_storage_status(p_track_id uuid, p_status text, p_storage_path text DEFAULT NULL::text, p_storage_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_user_id UUID;
BEGIN
  -- Get current authenticated user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify track ownership OR admin privileges
  IF NOT EXISTS (
    SELECT 1 FROM tracks t
    JOIN projects p ON t.project_id = p.id
    JOIN artists a ON p.artist_id = a.id
    WHERE t.id = p_track_id 
    AND (a.user_id = v_current_user_id OR public.is_admin())
  ) THEN
    RAISE EXCEPTION 'Access denied: track not found or belongs to different user';
  END IF;

  UPDATE tracks 
  SET 
    storage_status = p_status,
    storage_path = COALESCE(p_storage_path, storage_path),
    storage_metadata = COALESCE(p_storage_metadata, storage_metadata),
    updated_at = now()
  WHERE id = p_track_id;
END;
$function$;

-- Fix ensure_single_project to require proper authorization
CREATE OR REPLACE FUNCTION public.ensure_single_project(p_user_id uuid, p_title text, p_description text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    single_project_id UUID;
    default_artist_id UUID;
    v_current_user_id UUID;
BEGIN
    -- Get current authenticated user
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify authorization: user can only create projects for themselves OR be admin
    IF p_user_id != v_current_user_id AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Access denied: can only create projects for own user or must be admin';
    END IF;

    -- Get user's default artist (first artist or create one)
    SELECT id INTO default_artist_id 
    FROM public.artists 
    WHERE user_id = p_user_id 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- If no artist exists, create a default one
    IF default_artist_id IS NULL THEN
        INSERT INTO public.artists (user_id, name, description)
        VALUES (p_user_id, 'Personal Artist', 'Default artist profile')
        RETURNING id INTO default_artist_id;
    END IF;
    
    -- Create single project
    INSERT INTO public.projects (
        artist_id, 
        title, 
        description, 
        type, 
        status
    ) VALUES (
        default_artist_id,
        p_title,
        COALESCE(p_description, 'AI Generated Single'),
        'single',
        'active'
    ) RETURNING id INTO single_project_id;
    
    RETURN single_project_id;
END;
$function$;

-- Fix create_notification to require proper authorization
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_title text, p_message text, p_type text DEFAULT 'info'::text, p_category text DEFAULT 'general'::text, p_action_url text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  notification_id UUID;
  v_current_user_id UUID;
BEGIN
  -- Get current authenticated user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify authorization: user can only create notifications for themselves OR be admin
  IF p_user_id != v_current_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: can only create notifications for own user or must be admin';
  END IF;

  INSERT INTO public.notifications (
    user_id, title, message, type, category, action_url, metadata
  ) VALUES (
    p_user_id, p_title, p_message, p_type, p_category, p_action_url, p_metadata
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;

-- Fix create_activity_log to require proper authorization
CREATE OR REPLACE FUNCTION public.create_activity_log(p_user_id uuid, p_action text, p_description text, p_entity_type text DEFAULT NULL::text, p_entity_id uuid DEFAULT NULL::uuid, p_status text DEFAULT 'completed'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  log_id UUID;
  v_current_user_id UUID;
BEGIN
  -- Get current authenticated user
  v_current_user_id := auth.uid();
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify authorization: user can only create logs for themselves OR be admin
  IF p_user_id != v_current_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: can only create logs for own user or must be admin';
  END IF;

  INSERT INTO public.activity_logs (
    user_id, action, description, entity_type, entity_id, status, metadata
  ) VALUES (
    p_user_id, p_action, p_description, p_entity_type, p_entity_id, p_status, p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;