-- Fix security warning by properly setting search_path for ensure_single_project function
-- Functions that modify data cannot be IMMUTABLE, removing that and ensuring proper search_path
CREATE OR REPLACE FUNCTION public.ensure_single_project(
    p_user_id uuid,
    p_title text,
    p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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