-- Add database constraints and triggers for data integrity

-- 1. Add partial unique index for inbox projects
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_inbox_per_artist 
ON public.projects (artist_id) 
WHERE is_inbox = true;

-- 2. Add trigger for single project track limit
CREATE OR REPLACE FUNCTION public.enforce_single_project_track_limit()
RETURNS TRIGGER AS $$
DECLARE
    project_type text;
    track_count integer;
BEGIN
    -- Get project type
    SELECT type INTO project_type
    FROM public.projects
    WHERE id = NEW.project_id;
    
    -- Only enforce for single projects
    IF project_type = 'single' THEN
        -- Count existing tracks
        SELECT COUNT(*) INTO track_count
        FROM public.tracks
        WHERE project_id = NEW.project_id;
        
        -- Allow first track, prevent additional ones
        IF track_count >= 1 THEN
            RAISE EXCEPTION 'Single projects can only contain one track. Use track versions for variations.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to tracks table
DROP TRIGGER IF EXISTS enforce_single_track_limit ON public.tracks;
CREATE TRIGGER enforce_single_track_limit
    BEFORE INSERT ON public.tracks
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_single_project_track_limit();

-- 3. Add updated_at triggers for all main tables
DROP TRIGGER IF EXISTS update_tracks_updated_at ON public.tracks;
CREATE TRIGGER update_tracks_updated_at
    BEFORE UPDATE ON public.tracks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_artists_updated_at ON public.artists;
CREATE TRIGGER update_artists_updated_at
    BEFORE UPDATE ON public.artists
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Add validation function for track metadata
CREATE OR REPLACE FUNCTION public.validate_track_metadata(metadata_json jsonb)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if metadata contains valid service if specified
    IF metadata_json ? 'service' THEN
        IF NOT (metadata_json->>'service' IN ('suno', 'mureka')) THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Check if processing_status is valid if specified
    IF metadata_json ? 'processing_status' THEN
        IF NOT (metadata_json->>'processing_status' IN ('pending', 'processing', 'completed', 'failed')) THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    -- Check if deleted is boolean if specified
    IF metadata_json ? 'deleted' THEN
        IF NOT (jsonb_typeof(metadata_json->'deleted') = 'boolean') THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. Add check constraint for track metadata validation
ALTER TABLE public.tracks 
DROP CONSTRAINT IF EXISTS check_valid_metadata;

ALTER TABLE public.tracks 
ADD CONSTRAINT check_valid_metadata 
CHECK (metadata IS NULL OR public.validate_track_metadata(metadata));

-- 6. Add check constraint for positive track numbers
ALTER TABLE public.tracks 
DROP CONSTRAINT IF EXISTS check_positive_track_number;

ALTER TABLE public.tracks 
ADD CONSTRAINT check_positive_track_number 
CHECK (track_number > 0);

-- 7. Add check constraint for non-empty track titles
ALTER TABLE public.tracks 
DROP CONSTRAINT IF EXISTS check_non_empty_title;

ALTER TABLE public.tracks 
ADD CONSTRAINT check_non_empty_title 
CHECK (length(trim(title)) > 0);

-- 8. Add function to log critical operations
CREATE OR REPLACE FUNCTION public.log_critical_operation(
    operation_type text,
    entity_type text,
    entity_id uuid,
    details jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
DECLARE
    current_user_id uuid;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Insert log entry
    INSERT INTO public.activity_logs (
        user_id,
        action,
        description,
        entity_type,
        entity_id,
        metadata,
        created_at
    ) VALUES (
        current_user_id,
        operation_type,
        format('%s operation on %s', operation_type, entity_type),
        entity_type,
        entity_id,
        details,
        now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Add trigger to log track operations
CREATE OR REPLACE FUNCTION public.log_track_operations()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_critical_operation(
            'CREATE',
            'track',
            NEW.id,
            jsonb_build_object(
                'title', NEW.title,
                'project_id', NEW.project_id,
                'track_number', NEW.track_number
            )
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log significant updates
        IF OLD.metadata IS DISTINCT FROM NEW.metadata OR 
           OLD.audio_url IS DISTINCT FROM NEW.audio_url OR
           OLD.title IS DISTINCT FROM NEW.title THEN
            PERFORM public.log_critical_operation(
                'UPDATE',
                'track',
                NEW.id,
                jsonb_build_object(
                    'changes', jsonb_build_object(
                        'title_changed', OLD.title IS DISTINCT FROM NEW.title,
                        'audio_url_changed', OLD.audio_url IS DISTINCT FROM NEW.audio_url,
                        'metadata_changed', OLD.metadata IS DISTINCT FROM NEW.metadata
                    )
                )
            );
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.log_critical_operation(
            'DELETE',
            'track',
            OLD.id,
            jsonb_build_object(
                'title', OLD.title,
                'project_id', OLD.project_id
            )
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add logging trigger to tracks
DROP TRIGGER IF EXISTS log_track_operations ON public.tracks;
CREATE TRIGGER log_track_operations
    AFTER INSERT OR UPDATE OR DELETE ON public.tracks
    FOR EACH ROW
    EXECUTE FUNCTION public.log_track_operations();