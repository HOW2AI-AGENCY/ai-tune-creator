-- Fix storage policies for file uploads
-- First, remove existing policies that might conflict
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Artist assets are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own artist assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own artist assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own artist assets" ON storage.objects;

-- Create new, more permissive policies for avatars bucket
CREATE POLICY "Public read access for avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can update avatars" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "Users can delete avatars" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'avatars');

-- Create new, more permissive policies for artist-assets bucket
CREATE POLICY "Public read access for artist assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'artist-assets');

CREATE POLICY "Authenticated users can upload artist assets" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'artist-assets');

CREATE POLICY "Users can update artist assets" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (bucket_id = 'artist-assets');

CREATE POLICY "Users can delete artist assets" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'artist-assets');