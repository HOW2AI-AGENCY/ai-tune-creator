-- Create storage buckets for different content types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('audio-tracks', 'audio-tracks', false, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/mp3']),
  ('project-covers', 'project-covers', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('artist-assets', 'artist-assets', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('user-uploads', 'user-uploads', false, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/mp3', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for audio-tracks bucket
CREATE POLICY "Users can view their own audio files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'audio-tracks' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own audio files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'audio-tracks' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own audio files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'audio-tracks' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own audio files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'audio-tracks' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create RLS policies for project-covers bucket (public read, user write)
CREATE POLICY "Project covers are publicly readable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'project-covers');

CREATE POLICY "Users can upload project covers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'project-covers' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own project covers" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'project-covers' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own project covers" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'project-covers' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create RLS policies for artist-assets bucket (public read, user write)
CREATE POLICY "Artist assets are publicly readable" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'artist-assets');

CREATE POLICY "Users can upload artist assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'artist-assets' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own artist assets" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'artist-assets' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own artist assets" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'artist-assets' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create RLS policies for user-uploads bucket (private)
CREATE POLICY "Users can view their own uploads" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'user-uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'user-uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own uploads" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'user-uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own uploads" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'user-uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Fix remaining function search paths
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.handle_auth_user_created() SET search_path = public;
ALTER FUNCTION public.notify_track_generation_update() SET search_path = public;
ALTER FUNCTION public.notify_processing_status_update() SET search_path = public;