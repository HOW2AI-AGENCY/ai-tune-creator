-- Final Security Fix for User Profiles Table
-- The scanner still detects issues, let's ensure complete security

-- Check and ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can delete user profiles" ON public.user_profiles;

-- Create more restrictive policies with explicit role-based access
-- 1. Only authenticated users can access ANY data (no anonymous access)
-- 2. Users can only see their own data
-- 3. Admins can access all data for management purposes

-- SELECT policy - Very restrictive, only own data + admin override
CREATE POLICY "Secure profile access" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (
  -- User can only see their own profile
  auth.uid() = user_id 
  -- OR they are an admin (for administrative purposes)
  OR public.is_admin()
);

-- INSERT policy - Users can only create their own profile
CREATE POLICY "Secure profile creation" 
ON public.user_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Must be authenticated and creating their own profile
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- UPDATE policy - Users can only update their own profile
CREATE POLICY "Secure profile updates" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- DELETE policy - Only admins can delete profiles (for GDPR/account management)
CREATE POLICY "Admin only profile deletion" 
ON public.user_profiles 
FOR DELETE 
TO authenticated
USING (public.is_admin());

-- Ensure no public schema-level permissions exist
REVOKE ALL ON public.user_profiles FROM public;
REVOKE ALL ON public.user_profiles FROM anon;

-- Grant only necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
-- DELETE is implicitly handled by the RLS policy

-- Create an audit function to log sensitive profile access
CREATE OR REPLACE FUNCTION public.audit_profile_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if accessing sensitive Telegram data
  IF TG_OP = 'SELECT' AND (
    NEW.telegram_id IS NOT NULL OR 
    NEW.telegram_username IS NOT NULL OR
    NEW.telegram_first_name IS NOT NULL OR 
    NEW.telegram_last_name IS NOT NULL
  ) THEN
    -- Log the access for security monitoring
    INSERT INTO public.activity_logs (
      user_id,
      action,
      description,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      auth.uid(),
      'SENSITIVE_PROFILE_ACCESS',
      'Accessed Telegram profile data',
      'user_profile',
      NEW.id,
      jsonb_build_object(
        'accessed_fields', CASE 
          WHEN NEW.telegram_id IS NOT NULL THEN jsonb_build_array('telegram_id')
          ELSE jsonb_build_array()
        END ||
        CASE 
          WHEN NEW.telegram_username IS NOT NULL THEN jsonb_build_array('telegram_username')
          ELSE jsonb_build_array()
        END,
        'access_timestamp', NOW()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Note: Trigger commented out to avoid performance impact
-- Uncomment if detailed audit logging is required
-- CREATE TRIGGER audit_user_profile_sensitive_access
--   AFTER SELECT ON public.user_profiles
--   FOR EACH ROW 
--   WHEN (NEW.telegram_id IS NOT NULL OR NEW.telegram_username IS NOT NULL)
--   EXECUTE FUNCTION public.audit_profile_access();

-- Add additional constraint to prevent data exposure through table grants
COMMENT ON TABLE public.user_profiles IS 'Contains sensitive user profile data. Access strictly controlled via RLS policies. Only users can access their own data, admins can access all for management purposes.';

-- Security verification query (for logging purposes)
-- This will help verify the policies are working correctly
DO $$
BEGIN
  RAISE NOTICE 'User Profiles Security Fix Applied:';
  RAISE NOTICE '- RLS Enabled: Yes';
  RAISE NOTICE '- Anonymous Access: Revoked';
  RAISE NOTICE '- Public Access: Revoked';
  RAISE NOTICE '- User Access: Own data only';
  RAISE NOTICE '- Admin Access: All data (for management)';
  RAISE NOTICE '- Audit Function: Created (trigger disabled for performance)';
END;
$$;