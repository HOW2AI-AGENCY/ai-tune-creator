-- Security Fix: Remove user access to auth_analytics table
-- Users should not be able to view their own authentication analytics data
-- as it contains sensitive information like IP addresses, user agents, and error messages

-- Drop the policy that allows users to view their own auth analytics
DROP POLICY IF EXISTS "Users can only view their own auth analytics" ON public.auth_analytics;

-- Update the admin policy to be more explicit about admin-only access
DROP POLICY IF EXISTS "Admins can view auth analytics" ON public.auth_analytics;

CREATE POLICY "Only admins can view auth analytics" 
ON public.auth_analytics 
FOR SELECT 
USING (is_admin());

-- Keep the service role insert policy for logging functionality
-- No changes needed to "Service role can insert auth analytics" policy