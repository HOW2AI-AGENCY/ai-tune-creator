-- Create project notes table for ideas, references, and lyrics
CREATE TABLE public.project_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  note_type TEXT NOT NULL DEFAULT 'idea' CHECK (note_type IN ('idea', 'reference', 'lyric')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reference research table for AI analysis
CREATE TABLE public.reference_research (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_note_id UUID NOT NULL,
  reference_title TEXT NOT NULL,
  reference_artist TEXT NOT NULL,
  analysis_data JSONB DEFAULT '{}',
  ai_analysis TEXT,
  ai_provider TEXT,
  ai_model TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add current_version field to tracks table
ALTER TABLE public.tracks 
ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1;

-- Enable RLS on new tables
ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_research ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project_notes
CREATE POLICY "Users can manage own project notes" 
ON public.project_notes 
FOR ALL 
USING (project_id IN (
  SELECT p.id 
  FROM projects p 
  JOIN artists a ON p.artist_id = a.id 
  WHERE a.user_id = auth.uid()
))
WITH CHECK (project_id IN (
  SELECT p.id 
  FROM projects p 
  JOIN artists a ON p.artist_id = a.id 
  WHERE a.user_id = auth.uid()
));

-- Create RLS policies for reference_research
CREATE POLICY "Users can manage own reference research" 
ON public.reference_research 
FOR ALL 
USING (project_note_id IN (
  SELECT pn.id 
  FROM project_notes pn 
  JOIN projects p ON pn.project_id = p.id 
  JOIN artists a ON p.artist_id = a.id 
  WHERE a.user_id = auth.uid()
))
WITH CHECK (project_note_id IN (
  SELECT pn.id 
  FROM project_notes pn 
  JOIN projects p ON pn.project_id = p.id 
  JOIN artists a ON p.artist_id = a.id 
  WHERE a.user_id = auth.uid()
));

-- Create foreign key constraints
ALTER TABLE public.project_notes 
ADD CONSTRAINT fk_project_notes_project_id 
FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.reference_research 
ADD CONSTRAINT fk_reference_research_note_id 
FOREIGN KEY (project_note_id) REFERENCES public.project_notes(id) ON DELETE CASCADE;

-- Create triggers for updated_at
CREATE TRIGGER update_project_notes_updated_at
  BEFORE UPDATE ON public.project_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_project_notes_project_id ON public.project_notes(project_id);
CREATE INDEX idx_project_notes_type ON public.project_notes(note_type);
CREATE INDEX idx_reference_research_note_id ON public.reference_research(project_note_id);
CREATE INDEX idx_tracks_current_version ON public.tracks(current_version);