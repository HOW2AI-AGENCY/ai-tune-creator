-- Security Fix: Update function with proper security settings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Security Fix: Complete RLS policy for track_versions table
DROP POLICY IF EXISTS "Users can manage own track versions" ON public.track_versions;

CREATE POLICY "Users can manage own track versions" ON public.track_versions 
FOR ALL 
USING (track_id IN (
  SELECT t.id 
  FROM public.tracks t 
  JOIN public.projects p ON t.project_id = p.id 
  JOIN public.artists a ON p.artist_id = a.id 
  WHERE a.user_id = auth.uid()
))
WITH CHECK (track_id IN (
  SELECT t.id 
  FROM public.tracks t 
  JOIN public.projects p ON t.project_id = p.id 
  JOIN public.artists a ON p.artist_id = a.id 
  WHERE a.user_id = auth.uid()
));