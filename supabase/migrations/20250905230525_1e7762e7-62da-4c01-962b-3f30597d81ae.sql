-- Create optimized user stats RPC function
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS TABLE(
  total_tracks INTEGER,
  total_projects INTEGER,
  total_artists INTEGER,
  active_generations INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER 
     FROM tracks t
     JOIN projects p ON t.project_id = p.id
     JOIN artists a ON p.artist_id = a.id
     WHERE a.user_id = p_user_id)::INTEGER as total_tracks,
    
    (SELECT COUNT(*)::INTEGER
     FROM projects p
     JOIN artists a ON p.artist_id = a.id
     WHERE a.user_id = p_user_id)::INTEGER as total_projects,
    
    (SELECT COUNT(*)::INTEGER
     FROM artists a
     WHERE a.user_id = p_user_id)::INTEGER as total_artists,
    
    (SELECT COUNT(*)::INTEGER
     FROM ai_generations g
     WHERE g.user_id = p_user_id 
     AND g.status IN ('pending', 'processing'))::INTEGER as active_generations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracks_project_id ON tracks(project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_artist_id ON projects(artist_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artists_user_id ON artists(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_generations_user_status ON ai_generations(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracks_created_at_desc ON tracks(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tracks_audio_metadata ON tracks(audio_url) WHERE audio_url IS NOT NULL;

-- Create public tracks view for feed
CREATE OR REPLACE FUNCTION get_public_tracks_feed(p_limit INTEGER DEFAULT 15)
RETURNS TABLE(
  id UUID,
  title TEXT,
  created_at TIMESTAMPTZ,
  audio_url TEXT,
  metadata JSONB,
  project_id UUID,
  artist_name TEXT,
  artist_avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.created_at,
    t.audio_url,
    t.metadata,
    t.project_id,
    a.name as artist_name,
    a.avatar_url as artist_avatar_url
  FROM tracks t
  JOIN projects p ON t.project_id = p.id
  JOIN artists a ON p.artist_id = a.id
  WHERE t.audio_url IS NOT NULL
    AND (t.metadata->>'deleted')::boolean IS NOT TRUE
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;