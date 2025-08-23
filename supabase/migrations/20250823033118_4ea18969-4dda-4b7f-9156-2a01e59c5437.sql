-- Fix linter: set stable search_path for newly created functions
ALTER FUNCTION public.get_tracks_needing_storage_upload(uuid)
  SET search_path = public;

ALTER FUNCTION public.update_track_storage_status(uuid, text, text, jsonb)
  SET search_path = public;