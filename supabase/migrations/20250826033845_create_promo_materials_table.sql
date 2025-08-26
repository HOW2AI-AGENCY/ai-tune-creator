-- Create ENUM type for promo material types
CREATE TYPE public.promo_material_type AS ENUM (
  'image',
  'video',
  'audio',
  'document'
);

-- Create promo_materials table
CREATE TABLE public.promo_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  material_type public.promo_material_type NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  title TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_related_entity CHECK (track_id IS NOT NULL OR artist_id IS NOT NULL OR project_id IS NOT NULL)
);

-- Add comments to the table and columns
COMMENT ON TABLE public.promo_materials IS 'Stores promotional materials like images, videos, etc., linked to tracks, artists, or projects.';
COMMENT ON COLUMN public.promo_materials.storage_path IS 'The path to the file in the storage bucket.';
COMMENT ON COLUMN public.promo_materials.chk_related_entity IS 'Ensures that each promo material is linked to at least one entity (track, artist, or project).';

-- Enable RLS
ALTER TABLE public.promo_materials ENABLE ROW LEVEL SECURITY;

-- Create trigger for automatic timestamp updates
-- Assuming the function `update_updated_at_column` already exists from previous migrations.
CREATE TRIGGER update_promo_materials_updated_at
BEFORE UPDATE ON public.promo_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create policies for RLS
CREATE POLICY "Users can view their own promo materials"
ON public.promo_materials
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own promo materials"
ON public.promo_materials
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own promo materials"
ON public.promo_materials
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own promo materials"
ON public.promo_materials
FOR DELETE
USING (auth.uid() = user_id);
