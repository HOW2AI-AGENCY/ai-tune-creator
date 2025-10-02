-- Add SET search_path = public to remaining functions for security
-- This prevents search_path manipulation attacks

-- Update update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Update handle_new_user_profile
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$function$;

-- Update enforce_single_project_track_limit
CREATE OR REPLACE FUNCTION public.enforce_single_project_track_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
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

-- Update validate_track_metadata
CREATE OR REPLACE FUNCTION public.validate_track_metadata(metadata_json jsonb)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $function$
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
$function$;

-- Update update_track_stems_count
CREATE OR REPLACE FUNCTION public.update_track_stems_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE tracks
  SET 
    has_stems = EXISTS (SELECT 1 FROM track_stems WHERE track_id = NEW.track_id),
    stems_count = (SELECT COUNT(*) FROM track_stems WHERE track_id = NEW.track_id)
  WHERE id = NEW.track_id;
  RETURN NEW;
END;
$function$;

-- Update log_track_operations
CREATE OR REPLACE FUNCTION public.log_track_operations()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
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
$function$;

-- Update log_role_change
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_activity_log(
      NEW.user_id,
      'ROLE_ASSIGNED',
      format('Role %s assigned to user', NEW.role),
      'user_role',
      NEW.id,
      'completed',
      jsonb_build_object('role', NEW.role, 'assigned_by', NEW.assigned_by)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.create_activity_log(
      OLD.user_id,
      'ROLE_REMOVED',
      format('Role %s removed from user', OLD.role),
      'user_role',
      OLD.id,
      'completed',
      jsonb_build_object('role', OLD.role)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

-- Update log_profile_access
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Log sensitive operations on user profiles
  IF TG_OP = 'SELECT' AND OLD.telegram_id IS NOT NULL THEN
    -- Log when Telegram data is accessed
    PERFORM public.create_activity_log(
      auth.uid(),
      'PROFILE_TELEGRAM_ACCESS',
      'Telegram profile data accessed',
      'user_profile',
      OLD.id,
      'completed',
      jsonb_build_object(
        'accessed_user_id', OLD.user_id,
        'access_type', 'telegram_data'
      )
    );
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Log profile updates
    PERFORM public.create_activity_log(
      auth.uid(),
      'PROFILE_UPDATE',
      'User profile updated',
      'user_profile',
      NEW.id,
      'completed',
      jsonb_build_object(
        'updated_fields', CASE 
          WHEN OLD.display_name IS DISTINCT FROM NEW.display_name THEN jsonb_build_array('display_name')
          ELSE jsonb_build_array()
        END
      )
    );
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Update audit_profile_access
CREATE OR REPLACE FUNCTION public.audit_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Only log if accessing sensitive Telegram data
  IF TG_OP = 'SELECT' AND (
    NEW.telegram_id IS NOT NULL OR 
    NEW.telegram_username IS NOT NULL OR
    NEW.telegram_first_name IS NOT NULL OR 
    NEW.telegram_last_name IS NOT NULL
  ) THEN
    -- Log the access for security monitoring
    INSERT INTO public.activity_logs (
      user_id,
      action,
      description,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      auth.uid(),
      'SENSITIVE_PROFILE_ACCESS',
      'Accessed Telegram profile data',
      'user_profile',
      NEW.id,
      jsonb_build_object(
        'accessed_fields', CASE 
          WHEN NEW.telegram_id IS NOT NULL THEN jsonb_build_array('telegram_id')
          ELSE jsonb_build_array()
        END ||
        CASE 
          WHEN NEW.telegram_username IS NOT NULL THEN jsonb_build_array('telegram_username')
          ELSE jsonb_build_array()
        END,
        'access_timestamp', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;