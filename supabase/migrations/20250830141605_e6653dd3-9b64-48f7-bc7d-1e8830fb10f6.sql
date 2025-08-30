-- Security fix: Update auth_analytics RLS policies to be more restrictive
DROP POLICY IF EXISTS "System can insert auth analytics" ON public.auth_analytics;

-- Replace with more restrictive policy that only allows service role or edge functions
CREATE POLICY "Service role can insert auth analytics" 
ON public.auth_analytics 
FOR INSERT 
WITH CHECK (
  -- Only allow service role key or specific edge function contexts
  current_setting('role', true) = 'service_role' OR
  -- Allow authenticated users to log their own analytics
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
);

-- Add policy to prevent unauthorized access to sensitive data
CREATE POLICY "Users can only view their own auth analytics"
ON public.auth_analytics
FOR SELECT
USING (auth.uid() = user_id OR public.is_admin());

-- Security fix: Add replay protection table for telegram auth
CREATE TABLE IF NOT EXISTS public.telegram_auth_nonces (
  nonce TEXT PRIMARY KEY,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes')
);

-- Enable RLS on the nonces table
ALTER TABLE public.telegram_auth_nonces ENABLE ROW LEVEL SECURITY;

-- Only service role can manage nonces
CREATE POLICY "Only service role can manage telegram nonces"
ON public.telegram_auth_nonces
FOR ALL
USING (current_setting('role', true) = 'service_role')
WITH CHECK (current_setting('role', true) = 'service_role');

-- Create function to clean up expired nonces
CREATE OR REPLACE FUNCTION public.cleanup_expired_telegram_nonces()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.telegram_auth_nonces 
  WHERE expires_at < now();
END;
$$;