-- Security Fix: Make albert-tracks bucket private and update RLS policies
-- This addresses Critical vulnerability: Public exposure of user audio

-- First, make the bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'albert-tracks';

-- Create RLS policies for private audio access (owner-only)
CREATE POLICY "Users can only view their own audio files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'albert-tracks' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can only upload to their own folder" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'albert-tracks' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can only update their own audio files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'albert-tracks' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can only delete their own audio files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'albert-tracks' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Add allowlist table for download URLs
CREATE TABLE IF NOT EXISTS public.url_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on allowlist
ALTER TABLE public.url_allowlist ENABLE ROW LEVEL SECURITY;

-- Only admins can manage the allowlist
CREATE POLICY "Only admins can manage URL allowlist" 
ON public.url_allowlist 
FOR ALL 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Insert allowed domains for audio downloads
INSERT INTO public.url_allowlist (domain, description) VALUES 
('api.mureka.ai', 'Mureka AI API domain'),
('cdn.mureka.ai', 'Mureka CDN domain'),
('api.sunoapi.org', 'Suno API domain'),
('cdn.sunoapi.org', 'Suno CDN domain'),
('suno.ai', 'Suno official domain'),
('tempfile.redpandaai.co', 'RedPanda temporary files'),
('zwbhlfhwymbmvioaikvs.supabase.co', 'Our Supabase storage domain')
ON CONFLICT (domain) DO NOTHING;

-- Function to check if a URL is allowed
CREATE OR REPLACE FUNCTION public.is_url_allowed(url_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  url_domain TEXT;
  allowed_domain TEXT;
BEGIN
  -- Extract domain from URL
  SELECT regexp_replace(url_to_check, '^https?://([^/]+).*', '\1') INTO url_domain;
  
  -- Check if domain or any parent domain is in allowlist
  FOR allowed_domain IN 
    SELECT domain FROM public.url_allowlist WHERE is_active = true
  LOOP
    IF url_domain = allowed_domain OR url_domain LIKE '%.' || allowed_domain THEN
      RETURN true;
    END IF;
  END LOOP;
  
  RETURN false;
END;
$$;