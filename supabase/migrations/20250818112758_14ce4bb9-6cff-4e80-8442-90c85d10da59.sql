-- Создание Edge Function для удаления треков
-- Создаём функцию для безопасного удаления треков пользователем

CREATE OR REPLACE FUNCTION public.delete_track_safely(
  p_track_id UUID,
  p_user_id UUID,
  p_soft_delete BOOLEAN DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  track_record RECORD;
  project_record RECORD;
  artist_record RECORD;
  result jsonb;
BEGIN
  -- Проверяем, что трек существует и принадлежит пользователю
  SELECT t.*, p.artist_id, a.user_id as owner_id
  INTO track_record, project_record, artist_record
  FROM public.tracks t
  JOIN public.projects p ON t.project_id = p.id
  JOIN public.artists a ON p.artist_id = a.id
  WHERE t.id = p_track_id AND a.user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Track not found or access denied'
    );
  END IF;
  
  IF p_soft_delete THEN
    -- Soft delete: помечаем трек как удаленный в metadata
    UPDATE public.tracks
    SET 
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'deleted', true,
        'deleted_at', NOW(),
        'deleted_by', p_user_id
      ),
      updated_at = NOW()
    WHERE id = p_track_id;
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Track moved to trash',
      'deleted', false,
      'track_id', p_track_id
    );
  ELSE
    -- Hard delete: полное удаление
    -- Сначала удаляем связанные записи
    DELETE FROM public.track_assets WHERE track_id = p_track_id;
    DELETE FROM public.track_versions WHERE track_id = p_track_id;
    DELETE FROM public.ai_generations WHERE track_id = p_track_id;
    
    -- Затем удаляем сам трек
    DELETE FROM public.tracks WHERE id = p_track_id;
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Track permanently deleted',
      'deleted', true,
      'track_id', p_track_id
    );
  END IF;
  
  -- Создаём лог активности
  PERFORM public.create_activity_log(
    p_user_id,
    CASE WHEN p_soft_delete THEN 'track_soft_delete' ELSE 'track_hard_delete' END,
    CASE WHEN p_soft_delete THEN 'Track moved to trash' ELSE 'Track permanently deleted' END,
    'track',
    p_track_id,
    'completed',
    jsonb_build_object(
      'track_title', track_record.title,
      'project_id', track_record.project_id,
      'soft_delete', p_soft_delete
    )
  );
  
  RETURN result;
END;
$function$;

-- Функция для восстановления треков из корзины
CREATE OR REPLACE FUNCTION public.restore_track(
  p_track_id UUID,
  p_user_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  track_record RECORD;
  result jsonb;
BEGIN
  -- Проверяем, что трек принадлежит пользователю и помечен как удаленный
  SELECT t.*
  INTO track_record
  FROM public.tracks t
  JOIN public.projects p ON t.project_id = p.id
  JOIN public.artists a ON p.artist_id = a.id
  WHERE t.id = p_track_id 
    AND a.user_id = p_user_id
    AND (t.metadata->>'deleted')::boolean = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Track not found, not deleted, or access denied'
    );
  END IF;
  
  -- Восстанавливаем трек
  UPDATE public.tracks
  SET 
    metadata = metadata - 'deleted' - 'deleted_at' - 'deleted_by',
    updated_at = NOW()
  WHERE id = p_track_id;
  
  -- Создаём лог активности
  PERFORM public.create_activity_log(
    p_user_id,
    'track_restore',
    'Track restored from trash',
    'track',
    p_track_id,
    'completed',
    jsonb_build_object(
      'track_title', track_record.title,
      'project_id', track_record.project_id
    )
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Track restored successfully',
    'track_id', p_track_id
  );
END;
$function$;