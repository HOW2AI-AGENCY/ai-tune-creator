-- Create comprehensive API request logging table
CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  service TEXT NOT NULL CHECK (service IN ('suno', 'mureka')),
  operation TEXT NOT NULL, -- 'generate', 'status_check', 'download', etc.
  
  -- Request data
  request_endpoint TEXT NOT NULL,
  request_method TEXT NOT NULL DEFAULT 'POST',
  request_headers JSONB DEFAULT '{}',
  request_body JSONB DEFAULT '{}',
  
  -- Response data
  response_status INTEGER,
  response_headers JSONB DEFAULT '{}',
  response_body JSONB DEFAULT '{}',
  response_time_ms INTEGER,
  
  -- Metadata
  generation_id UUID REFERENCES public.ai_generations(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_request_logs_user_id ON public.api_request_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_service ON public.api_request_logs(service);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_generation_id ON public.api_request_logs(generation_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON public.api_request_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own logs
CREATE POLICY "Users can view own API logs"
ON public.api_request_logs
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert logs
CREATE POLICY "Service role can insert API logs"
ON public.api_request_logs
FOR INSERT
WITH CHECK (
  current_setting('role', true) = 'service_role' 
  OR auth.uid() = user_id
);

-- Create table for tracking storage sync status
CREATE TABLE IF NOT EXISTS public.track_storage_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE UNIQUE,
  generation_id UUID REFERENCES public.ai_generations(id) ON DELETE SET NULL,
  
  external_url TEXT NOT NULL,
  storage_path TEXT,
  storage_url TEXT,
  
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'downloading', 'completed', 'failed')),
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  last_sync_attempt TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  
  file_size BIGINT,
  checksum TEXT,
  
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for sync tracking
CREATE INDEX IF NOT EXISTS idx_track_storage_sync_track_id ON public.track_storage_sync(track_id);
CREATE INDEX IF NOT EXISTS idx_track_storage_sync_status ON public.track_storage_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_track_storage_sync_generation_id ON public.track_storage_sync(generation_id);

-- Enable RLS
ALTER TABLE public.track_storage_sync ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view sync status for their tracks
CREATE POLICY "Users can view own track sync status"
ON public.track_storage_sync
FOR SELECT
USING (
  track_id IN (
    SELECT t.id FROM public.tracks t
    JOIN public.projects p ON t.project_id = p.id
    JOIN public.artists a ON p.artist_id = a.id
    WHERE a.user_id = auth.uid()
  )
);

-- RLS Policy: Service role can manage sync records
CREATE POLICY "Service role can manage track sync"
ON public.track_storage_sync
FOR ALL
USING (current_setting('role', true) = 'service_role')
WITH CHECK (current_setting('role', true) = 'service_role');

-- Create function to auto-update sync timestamp
CREATE OR REPLACE FUNCTION update_track_storage_sync_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-update
CREATE TRIGGER update_track_storage_sync_timestamp
BEFORE UPDATE ON public.track_storage_sync
FOR EACH ROW
EXECUTE FUNCTION update_track_storage_sync_timestamp();

-- Add comments for documentation
COMMENT ON TABLE public.api_request_logs IS 'Comprehensive logging of all API requests to Suno/Mureka with full request/response data';
COMMENT ON TABLE public.track_storage_sync IS 'Tracks synchronization status of audio files from external providers to local storage';
