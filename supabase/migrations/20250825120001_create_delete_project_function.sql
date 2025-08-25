-- Migration: Create a stored procedure for securely deleting a project and its children
-- Description: This function encapsulates the logic for deleting a project and all of
-- its associated data (tracks, assets, notes) in a single, transactional operation.
-- It also performs an ownership check to ensure only the owner can delete it.

CREATE OR REPLACE FUNCTION public.delete_project_and_children(p_project_id uuid, p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_artist_id uuid;
BEGIN
  -- First, verify that the user owns the project's artist.
  -- This is a crucial security check.
  SELECT artist_id INTO v_artist_id FROM public.projects WHERE id = p_project_id;

  IF NOT EXISTS (SELECT 1 FROM public.artists WHERE id = v_artist_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'User does not have permission to delete this project';
  END IF;

  -- The `tracks` table has `ON DELETE CASCADE` for its `project_id` foreign key.
  -- This means Supabase will automatically delete all tracks belonging to the project.
  -- The `track_versions` and `track_assets` tables also have `ON DELETE CASCADE`
  -- for their `track_id` foreign keys, so they will be deleted when their parent track is deleted.
  -- This creates a clean, cascading delete.

  -- We only need to manually delete related data that does NOT have a cascade relationship.
  -- Based on the frontend logic, `project_notes` is one such table.
  DELETE FROM public.project_notes WHERE project_id = p_project_id;

  -- Finally, delete the project itself. The rest will cascade automatically.
  DELETE FROM public.projects WHERE id = p_project_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
