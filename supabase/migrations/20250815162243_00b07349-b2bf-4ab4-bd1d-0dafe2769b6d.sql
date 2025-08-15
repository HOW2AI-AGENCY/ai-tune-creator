-- Phase 1: Database Schema Enhancements

-- Add is_inbox field to projects table
ALTER TABLE public.projects 
ADD COLUMN is_inbox boolean DEFAULT false;

-- Add index for efficient inbox queries
CREATE INDEX idx_projects_artist_inbox ON public.projects(artist_id, is_inbox);

-- Create track_assets table for storing stems, masters, covers, videos, etc.
CREATE TABLE public.track_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'stem_vocals', 'stem_drums', 'stem_bass', 'stem_other', 'stem_instrumental', 'stems_zip', 'master', 'enhanced', 'cover', 'video', 'midi'
    url TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on track_assets
ALTER TABLE public.track_assets ENABLE ROW LEVEL SECURITY;

-- RLS policy for track_assets - users can manage assets for their own tracks
CREATE POLICY "Users can manage assets for own tracks" 
ON public.track_assets 
FOR ALL 
USING (
    track_id IN (
        SELECT t.id 
        FROM tracks t
        JOIN projects p ON t.project_id = p.id
        JOIN artists a ON p.artist_id = a.id
        WHERE a.user_id = auth.uid()
    )
)
WITH CHECK (
    track_id IN (
        SELECT t.id 
        FROM tracks t
        JOIN projects p ON t.project_id = p.id
        JOIN artists a ON p.artist_id = a.id
        WHERE a.user_id = auth.uid()
    )
);

-- Add indexes for track_assets
CREATE INDEX idx_track_assets_track_type ON public.track_assets(track_id, type);
CREATE INDEX idx_track_assets_created_at ON public.track_assets(created_at);

-- Add indexes for performance optimization
CREATE INDEX idx_tracks_project_title ON public.tracks(project_id, lower(title));
CREATE INDEX idx_track_versions_track_version ON public.track_versions(track_id, version_number);

-- Database function: ensure_user_inbox
-- Returns the inbox project_id for a user (creates if doesn't exist)
CREATE OR REPLACE FUNCTION public.ensure_user_inbox(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    inbox_project_id UUID;
    default_artist_id UUID;
BEGIN
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
    
    -- Check if inbox project exists
    SELECT id INTO inbox_project_id
    FROM public.projects
    WHERE artist_id = default_artist_id 
    AND is_inbox = true
    LIMIT 1;
    
    -- Create inbox project if it doesn't exist
    IF inbox_project_id IS NULL THEN
        INSERT INTO public.projects (artist_id, title, description, type, status, is_inbox)
        VALUES (default_artist_id, 'Inbox', 'Generated tracks without specific project context', 'mixtape', 'draft', true)
        RETURNING id INTO inbox_project_id;
    END IF;
    
    RETURN inbox_project_id;
END;
$$;

-- Database function: dedupe_track_title
-- Returns a unique title within a project (adds "(2)", "(3)" etc. if needed)
CREATE OR REPLACE FUNCTION public.dedupe_track_title(p_project_id UUID, p_title TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    counter INTEGER := 1;
    new_title TEXT := p_title;
    title_exists BOOLEAN;
BEGIN
    -- Check if original title exists
    SELECT EXISTS(
        SELECT 1 FROM public.tracks 
        WHERE project_id = p_project_id 
        AND lower(title) = lower(p_title)
    ) INTO title_exists;
    
    -- If original title is unique, return it
    IF NOT title_exists THEN
        RETURN p_title;
    END IF;
    
    -- Find next available number
    LOOP
        counter := counter + 1;
        new_title := p_title || ' (' || counter || ')';
        
        SELECT EXISTS(
            SELECT 1 FROM public.tracks 
            WHERE project_id = p_project_id 
            AND lower(title) = lower(new_title)
        ) INTO title_exists;
        
        IF NOT title_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN new_title;
END;
$$;

-- Database function: get_next_track_number
-- Returns the next track number in a project
CREATE OR REPLACE FUNCTION public.get_next_track_number(p_project_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_number INTEGER;
BEGIN
    SELECT COALESCE(MAX(track_number), 0) + 1
    INTO next_number
    FROM public.tracks
    WHERE project_id = p_project_id;
    
    RETURN next_number;
END;
$$;