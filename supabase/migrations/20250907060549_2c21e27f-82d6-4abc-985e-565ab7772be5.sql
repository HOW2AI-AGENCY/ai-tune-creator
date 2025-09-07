-- Final Cleanup: Remove Duplicate RLS Policies on User Profiles
-- This resolves the remaining warning about duplicate policies

-- Check current policies on user_profiles table
SELECT 
  policyname, 
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles'
ORDER BY policyname;

-- Drop any remaining old/duplicate policies that might exist
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;  
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can delete user profiles" ON public.user_profiles;

-- Ensure our clean policies are the only ones present
-- (These should already exist from the previous migration)
DROP POLICY IF EXISTS "secure_profile_select" ON public.user_profiles;
DROP POLICY IF EXISTS "secure_profile_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "secure_profile_update" ON public.user_profiles;
DROP POLICY IF EXISTS "secure_profile_delete" ON public.user_profiles;

-- Recreate the final, clean set of policies
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

-- Verify final policy state
SELECT 
  'Final policy count: ' || COUNT(*) as policy_status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';