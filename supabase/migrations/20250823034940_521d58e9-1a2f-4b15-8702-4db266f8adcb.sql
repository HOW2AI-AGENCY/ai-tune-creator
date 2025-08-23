-- Create delete-track function with comprehensive cleanup
CREATE OR REPLACE FUNCTION delete_track_completely(
  p_track_id UUID,
  p_user_id UUID,
  p_hard_delete BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_track_record RECORD;
  v_generation_id UUID;
  v_storage_path TEXT;
  v_result JSONB := jsonb_build_object('success', TRUE, 'deleted_items', jsonb_build_array());
BEGIN
  -- Verify track ownership
  SELECT t.*, p.artist_id INTO v_track_record
  FROM tracks t
  JOIN projects p ON t.project_id = p.id
  JOIN artists a ON p.artist_id = a.id
  WHERE t.id = p_track_id AND a.user_id = p_user_id;
  
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
        'deleted_by', p_user_id
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
    p_user_id,
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
$$;

-- Create function to prevent re-sync of deleted tracks
CREATE OR REPLACE FUNCTION get_tracks_needing_storage_upload(p_user_id uuid)
RETURNS TABLE(track_id uuid, generation_id uuid, external_url text, title text, service text, external_id text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
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
$$;