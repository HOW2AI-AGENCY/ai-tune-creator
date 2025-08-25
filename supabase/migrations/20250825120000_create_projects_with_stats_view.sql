-- Migration: Create a view for projects with pre-calculated stats
-- Description: This view solves the N+1 query problem on the projects page
-- by pre-calculating the track count for each project.

CREATE OR REPLACE VIEW public.projects_with_stats AS
SELECT
  p.id,
  p.artist_id,
  p.title,
  p.description,
  p.type,
  p.status,
  p.cover_url,
  p.metadata,
  p.created_at,
  p.updated_at,
  p.is_inbox,
  a.name as artist_name,
  a.avatar_url as artist_avatar_url,
  a.user_id as user_id, -- Expose user_id for RLS and queries
  COUNT(t.id) as track_count
FROM
  public.projects p
LEFT JOIN
  public.artists a ON p.artist_id = a.id
LEFT JOIN
  public.tracks t ON p.id = t.project_id
GROUP BY
  p.id, a.id;

-- RLS Policy for the new view
-- Users can only see projects linked to artists they own.
-- Note: Views in PostgreSQL do not automatically inherit RLS from base tables.
-- A new policy must be created for the view.
ALTER VIEW public.projects_with_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, to prevent errors on re-runs
DROP POLICY IF EXISTS "Users can see their own projects with stats" ON public.projects_with_stats;

CREATE POLICY "Users can see their own projects with stats"
ON public.projects_with_stats
FOR SELECT
USING (auth.uid() = user_id);
