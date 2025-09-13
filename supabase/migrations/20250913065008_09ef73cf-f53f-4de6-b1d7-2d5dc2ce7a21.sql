-- Remove Old Duplicate Policies from User Profiles
-- This will leave only the clean, properly named policies

-- Remove the old policies with the previous naming scheme
DROP POLICY IF EXISTS "Admin only profile deletion" ON public.user_profiles;
DROP POLICY IF EXISTS "Secure profile creation" ON public.user_profiles;
DROP POLICY IF EXISTS "Secure profile access" ON public.user_profiles;
DROP POLICY IF EXISTS "Secure profile updates" ON public.user_profiles;

-- Keep only the new policies with consistent naming
-- These should already exist and be properly configured:
-- - user_profiles_select_policy 
-- - user_profiles_insert_policy
-- - user_profiles_update_policy  
-- - user_profiles_delete_policy

-- Verify we now have exactly 4 policies
SELECT 
  COUNT(*) as policy_count,
  'Should be exactly 4 policies' as expected
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';

-- List the final policies to confirm they're correct
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Allows users to view own data + admin access'
    WHEN cmd = 'INSERT' THEN 'Allows users to create own profile only'
    WHEN cmd = 'UPDATE' THEN 'Allows users to update own data + admin access'
    WHEN cmd = 'DELETE' THEN 'Admin only profile deletion'
  END as purpose
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles'
ORDER BY cmd, policyname;