-- Исправляем функцию синхронизации: создаем недостающие треки для завершенных генераций
-- Сначала создаем треки для генераций которые имеют result_url но не имеют треков

-- Получаем ID inbox проекта пользователя
DO $$
DECLARE
    user_uuid UUID := '51c04f97-a158-4f77-8c18-5c7aeb1b4283';
    inbox_project_id UUID;
    generation_record RECORD;
    track_id UUID;
BEGIN
    -- Получаем inbox проект
    SELECT id INTO inbox_project_id 
    FROM projects p 
    JOIN artists a ON p.artist_id = a.id 
    WHERE a.user_id = user_uuid 
    AND p.is_inbox = true 
    LIMIT 1;
    
    -- Если inbox не найден, создаем его
    IF inbox_project_id IS NULL THEN
        -- Получаем или создаем артиста
        DECLARE artist_id UUID;
        BEGIN
            SELECT id INTO artist_id FROM artists WHERE user_id = user_uuid LIMIT 1;
            
            IF artist_id IS NULL THEN
                INSERT INTO artists (user_id, name, description) 
                VALUES (user_uuid, 'Personal Artist', 'Default artist profile')
                RETURNING id INTO artist_id;
            END IF;
            
            INSERT INTO projects (artist_id, title, description, type, status, is_inbox)
            VALUES (artist_id, 'Inbox', 'Generated tracks', 'mixtape', 'draft', true)
            RETURNING id INTO inbox_project_id;
        END;
    END IF;
    
    -- Создаем треки для генераций которые имеют result_url но не имеют треков
    FOR generation_record IN 
        SELECT g.id, g.service, g.result_url, g.metadata, g.prompt, g.created_at
        FROM ai_generations g
        LEFT JOIN tracks t ON t.metadata->>'generation_id' = g.id::text
        WHERE g.user_id = user_uuid
        AND g.status = 'completed'
        AND g.result_url IS NOT NULL
        AND t.id IS NULL
    LOOP
        -- Получаем следующий номер трека
        DECLARE next_track_number INTEGER;
        BEGIN
            SELECT COALESCE(MAX(track_number), 0) + 1 
            INTO next_track_number
            FROM tracks 
            WHERE project_id = inbox_project_id;
            
            -- Создаем трек
            INSERT INTO tracks (
                title,
                description,
                audio_url,
                project_id,
                track_number,
                metadata,
                genre_tags,
                created_at
            ) VALUES (
                COALESCE(generation_record.metadata->>'title', 'AI Generated Track'),
                generation_record.prompt,
                generation_record.result_url,
                inbox_project_id,
                next_track_number,
                jsonb_build_object(
                    'generation_id', generation_record.id,
                    'service', generation_record.service,
                    'generated_by_ai', true,
                    'ai_service', generation_record.service
                ) || COALESCE(generation_record.metadata, '{}'::jsonb),
                COALESCE(ARRAY(SELECT jsonb_array_elements_text(generation_record.metadata->'tags')), ARRAY[]::text[]),
                generation_record.created_at
            ) RETURNING id INTO track_id;
            
            -- Обновляем генерацию чтобы указать track_id
            UPDATE ai_generations 
            SET track_id = track_id
            WHERE id = generation_record.id;
            
            RAISE NOTICE 'Создан трек % для генерации %', track_id, generation_record.id;
        END;
    END LOOP;
END $$;