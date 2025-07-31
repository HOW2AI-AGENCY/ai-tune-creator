-- Create storage buckets for avatars and artist assets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('artist-assets', 'artist-assets', true);

-- Create policies for avatars bucket
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policies for artist-assets bucket
CREATE POLICY "Artist assets are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'artist-assets');

CREATE POLICY "Users can upload their own artist assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'artist-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own artist assets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'artist-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own artist assets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'artist-assets' AND auth.uid()::text = (storage.foldername(name))[1]);