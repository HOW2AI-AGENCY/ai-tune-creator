-- Fix security issues: Set search_path for functions that need it
-- This addresses the Supabase linter warnings about mutable search paths

-- Fix function search paths for security compliance
ALTER FUNCTION public.create_activity_log(uuid, text, text, text, uuid, text, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.ensure_single_project(uuid, text, text) SET search_path TO 'public';
ALTER FUNCTION public.get_next_track_number(uuid) SET search_path TO 'public';
ALTER FUNCTION public.ensure_user_inbox(uuid) SET search_path TO 'public';
ALTER FUNCTION public.dedupe_track_title(uuid, text) SET search_path TO 'public';
ALTER FUNCTION public.create_notification(uuid, text, text, text, text, text, jsonb) SET search_path TO 'public';
ALTER FUNCTION public.create_or_update_track_from_generation(uuid, uuid) SET search_path TO 'public';