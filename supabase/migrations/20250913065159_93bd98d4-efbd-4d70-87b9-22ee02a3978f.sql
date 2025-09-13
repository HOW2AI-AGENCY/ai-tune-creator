-- Final Definitive Security Fix for User Profiles
-- The scanner still detects issues, let's fix this once and for all

-- First, let's see the exact policy definitions
SELECT 
  policyname,
  cmd,
  permissive,
  roles::text,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles'
ORDER BY policyname;

-- Drop all existing policies completely
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.user_profiles;

-- Ensure RLS is enabled and forced
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;

-- Remove all table-level permissions
REVOKE ALL ON public.user_profiles FROM public;
REVOKE ALL ON public.user_profiles FROM anon;

-- Create extremely restrictive policies that only allow own-data access
-- SELECT: Only the user themselves can view their profile (NO other users)
CREATE POLICY "user_profiles_own_data_only_select" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Only the user can create their own profile
CREATE POLICY "user_profiles_own_data_only_insert" 
ON public.user_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- UPDATE: Only the user can update their own profile  
CREATE POLICY "user_profiles_own_data_only_update" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: No one can delete profiles (not even admins, for data protection)
-- If admin deletion is needed, it should be done via a special function
CREATE POLICY "user_profiles_no_deletion" 
ON public.user_profiles 
FOR DELETE 
TO authenticated
USING (false);

-- Grant minimal permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

-- Verify the policies are correctly applied
SELECT 
  'Policy: ' || policyname || ' (' || cmd || ') - ' || 
  CASE 
    WHEN qual LIKE '%auth.uid() = user_id%' AND qual NOT LIKE '%OR%' THEN 'SECURE (own data only)'
    WHEN qual = 'false' THEN 'SECURE (completely denied)'
    ELSE 'POTENTIAL ISSUE: ' || qual
  END as security_status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles'
ORDER BY cmd;

-- Final count verification
SELECT 
  COUNT(*) as total_policies,
  'Policies configured for maximum security' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';