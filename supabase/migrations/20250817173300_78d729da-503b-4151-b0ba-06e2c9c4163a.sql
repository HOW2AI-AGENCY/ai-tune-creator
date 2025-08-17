-- Add ensure_single_project function
CREATE OR REPLACE FUNCTION public.ensure_single_project(
    p_user_id uuid,
    p_title text,
    p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    single_project_id UUID;
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

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_projects_type_artist ON public.projects(type, artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_project_count ON public.tracks(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_external_service ON public.ai_generations(external_id, service);

-- Add trigger to enforce one track per single project
CREATE OR REPLACE FUNCTION public.enforce_single_project_track_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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
$function$;

-- Create trigger
DROP TRIGGER IF EXISTS enforce_single_project_track_limit_trigger ON public.tracks;
CREATE TRIGGER enforce_single_project_track_limit_trigger
    BEFORE INSERT ON public.tracks
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_single_project_track_limit();