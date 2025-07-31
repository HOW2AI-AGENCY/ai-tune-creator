-- T-050: Расширить схему базы данных tracks
-- Добавить поля для ИИ генерации и дополнительной информации о треках

-- Добавляем новые поля к существующей таблице tracks
ALTER TABLE public.tracks 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS genre_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS style_prompt TEXT;

-- Создаем индекс для поиска по жанрам  
CREATE INDEX IF NOT EXISTS idx_tracks_genre_tags ON public.tracks USING GIN(genre_tags);

-- Добавляем комментарии для документации
COMMENT ON COLUMN public.tracks.description IS 'Короткое описание трека';
COMMENT ON COLUMN public.tracks.genre_tags IS 'Массив тегов жанров для трека';
COMMENT ON COLUMN public.tracks.style_prompt IS 'Промпт с описанием стиля для ИИ генерации';

-- TODO: Добавить валидацию жанров через CHECK constraint в будущем
-- FIXME: Обновить существующие запросы для новых полей