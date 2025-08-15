-- Fix security warnings by setting search_path for functions

-- Update ensure_user_inbox function
CREATE OR REPLACE FUNCTION public.ensure_user_inbox(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Update dedupe_track_title function
CREATE OR REPLACE FUNCTION public.dedupe_track_title(p_project_id UUID, p_title TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Update get_next_track_number function
CREATE OR REPLACE FUNCTION public.get_next_track_number(p_project_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Update existing functions to set search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_title text, p_message text, p_type text DEFAULT 'info'::text, p_category text DEFAULT 'general'::text, p_action_url text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id, title, message, type, category, action_url, metadata
  ) VALUES (
    p_user_id, p_title, p_message, p_type, p_category, p_action_url, p_metadata
  ) RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_activity_log(p_user_id uuid, p_action text, p_description text, p_entity_type text DEFAULT NULL::text, p_entity_id uuid DEFAULT NULL::uuid, p_status text DEFAULT 'completed'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    user_id, action, description, entity_type, entity_id, status, metadata
  ) VALUES (
    p_user_id, p_action, p_description, p_entity_type, p_entity_id, p_status, p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;