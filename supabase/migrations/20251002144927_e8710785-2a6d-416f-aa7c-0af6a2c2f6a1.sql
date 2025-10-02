-- Fix security warning: Set search_path for the function
CREATE OR REPLACE FUNCTION update_track_storage_sync_timestamp()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;