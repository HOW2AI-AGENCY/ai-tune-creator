-- Create auth analytics table for monitoring authentication patterns
CREATE TABLE IF NOT EXISTS public.auth_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('email', 'google', 'apple', 'spotify', 'telegram')),
  action TEXT NOT NULL CHECK (action IN ('signup', 'signin', 'signout', 'error')),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auth_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for auth analytics (admin only access)
CREATE POLICY "Admins can view auth analytics" 
ON public.auth_analytics 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "System can insert auth analytics" 
ON public.auth_analytics 
FOR INSERT 
WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_auth_analytics_user_id ON public.auth_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_analytics_created_at ON public.auth_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_analytics_provider ON public.auth_analytics(provider);

-- Create function to log auth events
CREATE OR REPLACE FUNCTION public.log_auth_event(
  p_user_id UUID,
  p_provider TEXT,
  p_action TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.auth_analytics (
    user_id, provider, action, ip_address, user_agent, success, error_message, metadata
  ) VALUES (
    p_user_id, p_provider, p_action, p_ip_address, p_user_agent, p_success, p_error_message, p_metadata
  );
END;
$$;