-- Fix 1: User Preferences RLS - Add proper INSERT policy
-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;

-- Create comprehensive RLS policies for user_preferences
CREATE POLICY "user_preferences_select_own"
ON public.user_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_preferences_insert_own"
ON public.user_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "user_preferences_update_own"
ON public.user_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_preferences_delete_own"
ON public.user_preferences
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Fix 2: User Profiles - Replace absolute DELETE block with user-controlled deletion
DROP POLICY IF EXISTS "user_profiles_no_delete" ON public.user_profiles;

CREATE POLICY "user_profiles_delete_own"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- Fix 3: Make public storage buckets private and add proper policies
-- Update buckets to private
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('project-covers', 'avatars', 'artist-assets', 'promo-materials');

-- Drop existing overly permissive policies if they exist
DROP POLICY IF EXISTS "Public access for project covers" ON storage.objects;
DROP POLICY IF EXISTS "Public access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public access for artist assets" ON storage.objects;
DROP POLICY IF EXISTS "Public access for promo materials" ON storage.objects;

-- Create secure storage policies for project-covers
CREATE POLICY "project_covers_select_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'project-covers');

CREATE POLICY "project_covers_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "project_covers_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "project_covers_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create secure storage policies for avatars
CREATE POLICY "avatars_select_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "avatars_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create secure storage policies for artist-assets
CREATE POLICY "artist_assets_select_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'artist-assets');

CREATE POLICY "artist_assets_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artist-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "artist_assets_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'artist-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "artist_assets_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'artist-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create secure storage policies for promo-materials
CREATE POLICY "promo_materials_select_authenticated"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'promo-materials');

CREATE POLICY "promo_materials_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'promo-materials' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "promo_materials_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'promo-materials' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "promo_materials_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'promo-materials' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);