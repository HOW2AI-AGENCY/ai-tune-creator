-- Создание RPC функции для создания треков Mureka
-- Эта функция будет вызываться из Edge Function

CREATE OR REPLACE FUNCTION create_mureka_track(
  p_generation_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT 'Mureka Track',
  p_audio_url TEXT DEFAULT '',
  p_lyrics TEXT DEFAULT '',
  p_duration INTEGER DEFAULT 120,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_track_id UUID;
  v_user_id UUID;
  v_track_number INTEGER;
BEGIN
  -- Получаем user_id из generation
  SELECT user_id INTO v_user_id
  FROM ai_generations 
  WHERE id = p_generation_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Generation not found or no user_id';
  END IF;
  
  -- Определяем следующий номер трека в проекте
  SELECT COALESCE(MAX(track_number), 0) + 1 INTO v_track_number
  FROM tracks 
  WHERE project_id = p_project_id;
  
  -- Создаем новый UUID для трека
  v_track_id := gen_random_uuid();
  
  -- Вставляем трек
  INSERT INTO tracks (
    id,
    project_id,
    title,
    audio_url,
    lyrics,
    duration,
    track_number,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    v_track_id,
    p_project_id,
    p_title,
    p_audio_url,
    p_lyrics,
    p_duration,
    v_track_number,
    p_metadata || jsonb_build_object(
      'service', 'mureka',
      'generation_id', p_generation_id,
      'created_by_function', 'create_mureka_track'
    ),
    NOW(),
    NOW()
  );
  
  -- Связываем с generation
  UPDATE ai_generations 
  SET track_id = v_track_id,
      result_url = p_audio_url
  WHERE id = p_generation_id;
  
  RETURN v_track_id;
END;
$$;