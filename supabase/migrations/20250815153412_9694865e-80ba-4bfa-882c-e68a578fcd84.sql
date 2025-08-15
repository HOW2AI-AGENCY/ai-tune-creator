-- Create indexes for improved performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracks_project_title_lower 
ON tracks(project_id, lower(title));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracks_genre_tags 
ON tracks USING GIN(genre_tags);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_track_versions_track_version 
ON track_versions(track_id, version_number DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_generations_status_service 
ON ai_generations(status, service);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_generations_user_created 
ON ai_generations(user_id, created_at DESC);

-- Add inbox project type
ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_inbox BOOLEAN DEFAULT FALSE;

-- Create function to ensure user has an inbox
CREATE OR REPLACE FUNCTION ensure_user_inbox(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_artist_id UUID;
    v_project_id UUID;
    v_artist_name TEXT;
BEGIN
    -- Get user info for artist name
    SELECT 
        COALESCE(raw_user_meta_data->>'display_name', email, 'Личный артист')
    INTO v_artist_name
    FROM auth.users 
    WHERE id = p_user_id;
    
    -- Ensure personal artist exists
    SELECT id INTO v_artist_id
    FROM artists 
    WHERE user_id = p_user_id AND name = 'Личный артист'
    LIMIT 1;
    
    IF v_artist_id IS NULL THEN
        INSERT INTO artists (user_id, name, description)
        VALUES (p_user_id, 'Личный артист', 'Автоматически созданный личный артист')
        RETURNING id INTO v_artist_id;
    END IF;
    
    -- Ensure inbox project exists
    SELECT id INTO v_project_id
    FROM projects 
    WHERE artist_id = v_artist_id AND is_inbox = TRUE
    LIMIT 1;
    
    IF v_project_id IS NULL THEN
        -- Get next track number for inbox
        INSERT INTO projects (
            artist_id, 
            title, 
            description, 
            type, 
            status,
            is_inbox
        )
        VALUES (
            v_artist_id,
            'Inbox',
            'Треки без привязки к конкретному проекту',
            'single',
            'draft',
            TRUE
        )
        RETURNING id INTO v_project_id;
    END IF;
    
    RETURN v_project_id;
END;
$$;

-- Create function to deduplicate track titles within a project
CREATE OR REPLACE FUNCTION dedupe_track_title(p_project_id UUID, p_title TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_final_title TEXT := p_title;
    v_counter INTEGER := 1;
    v_exists BOOLEAN;
BEGIN
    -- Check if title already exists
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM tracks 
            WHERE project_id = p_project_id 
            AND lower(title) = lower(v_final_title)
        ) INTO v_exists;
        
        IF NOT v_exists THEN
            EXIT;
        END IF;
        
        v_counter := v_counter + 1;
        v_final_title := p_title || ' (' || v_counter || ')';
    END LOOP;
    
    RETURN v_final_title;
END;
$$;

-- Create function to get next track number in project
CREATE OR REPLACE FUNCTION get_next_track_number(p_project_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_max_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(track_number), 0) + 1
    INTO v_max_number
    FROM tracks
    WHERE project_id = p_project_id;
    
    RETURN v_max_number;
END;
$$;

-- Update existing tracks without project_id to inbox (cleanup)
DO $$
DECLARE
    v_user_id UUID;
    v_inbox_id UUID;
BEGIN
    FOR v_user_id IN 
        SELECT DISTINCT 
            a.user_id
        FROM tracks t
        LEFT JOIN projects p ON t.project_id = p.id
        LEFT JOIN artists a ON p.artist_id = a.id
        WHERE p.id IS NULL
    LOOP
        -- Ensure inbox exists for this user
        SELECT ensure_user_inbox(v_user_id) INTO v_inbox_id;
        
        -- Move orphaned tracks to inbox
        UPDATE tracks 
        SET project_id = v_inbox_id,
            track_number = get_next_track_number(v_inbox_id)
        WHERE project_id IS NULL 
        AND id IN (
            SELECT t2.id FROM tracks t2
            LEFT JOIN projects p2 ON t2.project_id = p2.id
            WHERE p2.id IS NULL
        );
    END LOOP;
END $$;