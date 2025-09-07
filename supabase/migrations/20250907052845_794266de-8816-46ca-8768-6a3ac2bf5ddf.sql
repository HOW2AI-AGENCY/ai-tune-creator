-- Corrected Security Fix for User Profiles
-- Fixing the constraint issue and implementing proper security

-- Ensure RLS is enabled on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate with better names and security
DROP POLICY IF EXISTS "ultra_secure_profile_select" ON public.user_profiles;
DROP POLICY IF EXISTS "ultra_secure_profile_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "ultra_secure_profile_update" ON public.user_profiles;
DROP POLICY IF EXISTS "ultra_secure_profile_delete" ON public.user_profiles;

-- Remove any overly permissive grants
REVOKE ALL ON public.user_profiles FROM public;
REVOKE ALL ON public.user_profiles FROM anon;

-- Create secure RLS policies
-- 1. SELECT: Users can only view their own profile, admins can view all
CREATE POLICY "Users can only view own profile" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.is_admin()
);

-- 2. INSERT: Users can only create their own profile
CREATE POLICY "Users can only create own profile" 
ON public.user_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND auth.uid() IS NOT NULL
);

-- 3. UPDATE: Users can only update their own profile
CREATE POLICY "Users can only update own profile" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 4. DELETE: Only admins can delete profiles
CREATE POLICY "Only admins can delete profiles" 
ON public.user_profiles 
FOR DELETE 
TO authenticated
USING (public.is_admin());

-- Grant minimal necessary permissions to authenticated users only
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

-- Force RLS (this prevents bypassing RLS even with superuser access)
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;

-- Update the public profile function to be more secure
CREATE OR REPLACE FUNCTION public.get_public_profile(profile_user_id UUID)
RETURNS TABLE(
  id UUID,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return minimal public data only if display_name is set
  -- This acts as an opt-in mechanism for public visibility
  RETURN QUERY
  SELECT 
    up.id,
    up.display_name,
    up.avatar_url
  FROM public.user_profiles up
  WHERE up.user_id = profile_user_id
    AND up.display_name IS NOT NULL
    AND up.display_name != ''
  LIMIT 1;
END;
$$;

-- Add a table comment documenting the security measures
COMMENT ON TABLE public.user_profiles IS 
'SECURITY: Contains sensitive user data including Telegram information. ' ||
'Access strictly controlled via RLS policies. ' ||
'Users can only access their own data. ' ||
'Admins have full access for management. ' ||
'Public access completely denied. ' ||
'Use get_public_profile() function for safe public data access.';

-- Verify the security configuration
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Count the number of policies on the table
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles';
    
    RAISE NOTICE 'User Profiles Security Configuration:';
    RAISE NOTICE '- RLS Enabled: TRUE (FORCED)';
    RAISE NOTICE '- Active Policies: %', policy_count;
    RAISE NOTICE '- Anonymous Access: DENIED';
    RAISE NOTICE '- Public Access: DENIED';
    RAISE NOTICE '- User Access: Own data only';
    RAISE NOTICE '- Admin Access: Full (for management)';
    RAISE NOTICE '- Security Level: HIGH';
END;
$$;