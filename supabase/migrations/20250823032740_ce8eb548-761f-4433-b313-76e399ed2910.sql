-- Создаем bucket для хранения audio треков
INSERT INTO storage.buckets (id, name, public) VALUES ('track-audio', 'track-audio', true);

-- Создаем политики безопасности для bucket track-audio
CREATE POLICY "Authenticated users can view track audio" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'track-audio' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload their own track audio" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'track-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own track audio" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'track-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own track audio" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'track-audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Обновляем таблицу tracks для отслеживания статуса загрузки в хранилище
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS storage_status text DEFAULT 'pending'::text;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS storage_metadata jsonb DEFAULT '{}'::jsonb;

-- Создаем индекс для быстрого поиска треков требующих загрузки
CREATE INDEX IF NOT EXISTS idx_tracks_storage_status ON tracks (storage_status) WHERE storage_status IN ('pending', 'downloading');

-- Создаем функцию для получения треков требующих загрузки в хранилище
CREATE OR REPLACE FUNCTION public.get_tracks_needing_storage_upload(p_user_id uuid)
RETURNS TABLE (
  track_id uuid,
  generation_id uuid,
  external_url text,
  title text,
  service text,
  external_id text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
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
    AND g.result_url IS NOT NULL
    AND g.result_url != ''
    AND (t.audio_url IS NULL OR t.audio_url = '' OR NOT t.audio_url LIKE '%storage.v1%')
  ORDER BY t.created_at DESC;
END;
$$;

-- Создаем функцию для обновления статуса хранения трека
CREATE OR REPLACE FUNCTION public.update_track_storage_status(
  p_track_id uuid,
  p_status text,
  p_storage_path text DEFAULT NULL,
  p_storage_metadata jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tracks 
  SET 
    storage_status = p_status,
    storage_path = COALESCE(p_storage_path, storage_path),
    storage_metadata = COALESCE(p_storage_metadata, storage_metadata),
    updated_at = now()
  WHERE id = p_track_id;
END;
$$;