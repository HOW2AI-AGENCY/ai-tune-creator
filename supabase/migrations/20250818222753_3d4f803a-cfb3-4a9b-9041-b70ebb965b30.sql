-- Update log_critical_operation to avoid NULL user_id and infer user when called from service role
CREATE OR REPLACE FUNCTION public.log_critical_operation(
    operation_type text,
    entity_type text,
    entity_id uuid,
    details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    current_user_id uuid;
BEGIN
    -- Try to use authenticated user first
    current_user_id := auth.uid();

    -- Fallback 1: infer user from ai_generations by track_id
    IF current_user_id IS NULL AND entity_type = 'track' THEN
        SELECT g.user_id INTO current_user_id
        FROM public.ai_generations g
        WHERE g.track_id = entity_id
        LIMIT 1;
    END IF;

    -- Fallback 2: infer user from projects via tracks
    IF current_user_id IS NULL AND entity_type = 'track' THEN
        SELECT p.user_id INTO current_user_id
        FROM public.tracks t
        JOIN public.projects p ON p.id = t.project_id
        WHERE t.id = entity_id
        LIMIT 1;
    END IF;

    -- If we still don't know user, skip logging to avoid NOT NULL violations
    IF current_user_id IS NULL THEN
        RAISE NOTICE 'log_critical_operation: user_id is NULL, skipping log for % %', entity_type, entity_id;
        RETURN;
    END IF;

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
$function$;