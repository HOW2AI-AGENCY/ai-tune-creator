-- Clean Security Fix for User Profiles Table
-- This addresses the security vulnerability properly

-- Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Users can only view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can only create own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can only update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.user_profiles;

-- Remove public and anonymous access
REVOKE ALL ON public.user_profiles FROM public;
REVOKE ALL ON public.user_profiles FROM anon;

-- Create restrictive RLS policies
CREATE POLICY "secure_profile_select" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "secure_profile_insert" 
ON public.user_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "secure_profile_update" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "secure_profile_delete" 
ON public.user_profiles 
FOR DELETE 
TO authenticated
USING (public.is_admin());

-- Grant minimal permissions to authenticated users only
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

-- Force RLS to prevent any bypass
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;

-- Update public profile function for safe data access
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

-- Add security documentation
COMMENT ON TABLE public.user_profiles IS 'Contains sensitive user data. Access controlled via RLS. Users access own data only. Admins have management access.';

-- Log success
SELECT 'User profiles security fix applied successfully' as status;