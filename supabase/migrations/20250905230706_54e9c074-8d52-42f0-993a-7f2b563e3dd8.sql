-- Fix security warnings by setting search_path for functions
DROP FUNCTION IF EXISTS get_user_stats(UUID);
DROP FUNCTION IF EXISTS get_public_tracks_feed(INTEGER);

-- Create optimized user stats RPC function with proper search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create public tracks view for feed with proper search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;