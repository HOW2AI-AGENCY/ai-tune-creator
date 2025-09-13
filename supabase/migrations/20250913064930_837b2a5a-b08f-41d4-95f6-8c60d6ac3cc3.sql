-- Final Policy Cleanup and Verification
-- Let's see exactly what policies exist and clean them up

-- List all current policies on user_profiles
SELECT 
  'Current policy: ' || policyname || ' (CMD: ' || cmd || ')' as policy_info
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles'
ORDER BY policyname;

-- Drop ALL policies and recreate clean set
DROP POLICY IF EXISTS "secure_profile_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "secure_profile_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "secure_profile_select" ON public.user_profiles;
DROP POLICY IF EXISTS "secure_profile_update" ON public.user_profiles;

-- Also drop any that might have different names
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Only admins can delete user profiles" ON public.user_profiles;

-- Create the final, definitive set of 4 policies
CREATE POLICY "user_profiles_select_policy" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "user_profiles_insert_policy" 
ON public.user_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "user_profiles_update_policy" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "user_profiles_delete_policy" 
ON public.user_profiles 
FOR DELETE 
TO authenticated
USING (public.is_admin());

-- Final verification
SELECT 
  'Final clean policy count: ' || COUNT(*) || ' policies' as final_status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';

-- List final policies
SELECT 
  policyname || ' (' || cmd || ')' as final_policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles'
ORDER BY cmd, policyname;