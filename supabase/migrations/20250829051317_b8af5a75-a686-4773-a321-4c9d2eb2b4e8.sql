-- Drop the insecure RPC overload that lacks ownership validation
DROP FUNCTION IF EXISTS public.create_or_update_track_from_generation(uuid, uuid);

-- Keep only the secure three-parameter version with proper authorization checks