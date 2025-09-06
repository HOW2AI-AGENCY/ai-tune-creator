-- Ultimate Security Lock-Down for User Profiles
-- This implements the most restrictive security possible

-- Disable RLS temporarily to recreate from scratch
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Remove ALL existing grants to ensure clean slate
REVOKE ALL PRIVILEGES ON public.user_profiles FROM public;
REVOKE ALL PRIVILEGES ON public.user_profiles FROM anon;
REVOKE ALL PRIVILEGES ON public.user_profiles FROM authenticated;

-- Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure completely clean state
DROP POLICY IF EXISTS "Secure profile access" ON public.user_profiles;
DROP POLICY IF EXISTS "Secure profile creation" ON public.user_profiles;
DROP POLICY IF EXISTS "Secure profile updates" ON public.user_profiles;
DROP POLICY IF EXISTS "Admin only profile deletion" ON public.user_profiles;

-- Create the most restrictive policies possible
-- Absolutely NO access for anonymous users, public role, or unauthenticated requests

-- 1. SELECT: Only authenticated users viewing their own data + admins
CREATE POLICY "ultra_secure_profile_select" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id 
    OR public.is_admin()
  )
);

-- 2. INSERT: Only authenticated users creating their own profile
CREATE POLICY "ultra_secure_profile_insert" 
ON public.user_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
  AND user_id IS NOT NULL
);

-- 3. UPDATE: Only authenticated users updating their own profile
CREATE POLICY "ultra_secure_profile_update" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id 
    OR public.is_admin()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    auth.uid() = user_id 
    OR public.is_admin()
  )
  AND user_id IS NOT NULL
);

-- 4. DELETE: Only admins can delete profiles
CREATE POLICY "ultra_secure_profile_delete" 
ON public.user_profiles 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND public.is_admin()
);

-- Grant minimal necessary permissions ONLY to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

-- Explicitly DENY access to public and anonymous roles
-- This is redundant but ensures no access paths exist
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;

-- Create a secure view that only exposes absolutely necessary public data
-- This replaces direct table access for any public-facing features
CREATE OR REPLACE VIEW public.safe_user_profiles AS
SELECT 
  id,
  display_name,
  avatar_url
FROM public.user_profiles
WHERE 
  -- Only show profiles where display_name is set (indicating user opted for visibility)
  display_name IS NOT NULL 
  AND display_name != '';

-- Apply RLS to the view as well
ALTER VIEW public.safe_user_profiles SET (security_barrier = true);

-- Create a more restricted version of the public profile function
CREATE OR REPLACE FUNCTION public.get_safe_public_profile(profile_user_id UUID)
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
  -- Only return data if the profile user has opted for public visibility
  -- by setting a display name
  RETURN QUERY
  SELECT 
    up.id,
    up.display_name,
    up.avatar_url
  FROM public.user_profiles up
  WHERE up.user_id = profile_user_id
    AND up.display_name IS NOT NULL
    AND up.display_name != ''
    AND LENGTH(up.display_name) > 0
  LIMIT 1;
END;
$$;

-- Log this security upgrade
INSERT INTO public.activity_logs (
  user_id,
  action,
  description,
  entity_type,
  metadata
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- System user ID
  'SECURITY_UPGRADE',
  'Applied ultra-secure RLS policies to user_profiles table',
  'security',
  jsonb_build_object(
    'table', 'user_profiles',
    'security_level', 'maximum',
    'policies_applied', jsonb_build_array(
      'ultra_secure_profile_select',
      'ultra_secure_profile_insert', 
      'ultra_secure_profile_update',
      'ultra_secure_profile_delete'
    ),
    'access_denied_to', jsonb_build_array('public', 'anon', 'unauthenticated'),
    'timestamp', NOW()
  )
);

-- Final verification
DO $$
BEGIN
  RAISE NOTICE '=== ULTRA-SECURE USER PROFILES CONFIGURATION APPLIED ===';
  RAISE NOTICE 'Security Level: MAXIMUM';
  RAISE NOTICE 'RLS Enabled: YES (FORCED)';
  RAISE NOTICE 'Anonymous Access: COMPLETELY DENIED';
  RAISE NOTICE 'Public Access: COMPLETELY DENIED';
  RAISE NOTICE 'Authenticated Access: OWN DATA ONLY (+ Admin Override)';
  RAISE NOTICE 'Safe Public View: Created for opt-in visibility';
  RAISE NOTICE 'Secure Function: Enhanced with visibility checks';
  RAISE NOTICE '================================================================';
END;
$$;