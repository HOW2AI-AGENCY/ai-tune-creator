-- Fix remaining function search paths for security compliance
-- Set search_path for all remaining functions without it

ALTER FUNCTION public.update_updated_at_column() SET search_path TO 'public';
ALTER FUNCTION public.enforce_single_project_track_limit() SET search_path TO 'public';
ALTER FUNCTION public.validate_track_metadata(jsonb) SET search_path TO 'public';
ALTER FUNCTION public.log_track_operations() SET search_path TO 'public';
ALTER FUNCTION public.acquire_lock(text, integer) SET search_path TO 'public';
ALTER FUNCTION public.release_lock(text) SET search_path TO 'public';
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path TO 'public';
ALTER FUNCTION public.is_admin() SET search_path TO 'public';
ALTER FUNCTION public.acquire_operation_lock(text, integer) SET search_path TO 'public';
ALTER FUNCTION public.release_operation_lock(text) SET search_path TO 'public';
ALTER FUNCTION public.log_role_change() SET search_path TO 'public';
ALTER FUNCTION public.log_critical_operation(text, text, uuid, jsonb) SET search_path TO 'public';