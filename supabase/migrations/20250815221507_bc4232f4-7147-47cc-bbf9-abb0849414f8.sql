-- Fix storage RLS policies to allow authenticated users to upload files

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can upload to their own folders" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own objects" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for public buckets" ON storage.objects;

-- Allow authenticated users to insert objects into any bucket they own
CREATE POLICY "Users can upload to their own folders" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to view their own objects
CREATE POLICY "Users can view their own objects" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own objects
CREATE POLICY "Users can update their own objects" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own objects
CREATE POLICY "Users can delete their own objects" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- For public buckets, allow public read access
CREATE POLICY "Public read access for public buckets" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id IN ('project-covers', 'avatars', 'artist-assets', 'promo-materials', 'albert-tracks'));