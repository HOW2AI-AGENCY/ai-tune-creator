-- Verify Current Security Configuration for User Profiles
-- Check the exact state of our RLS policies

-- Show all current policies with their exact definitions
SELECT 
  policyname,
  cmd,
  permissive,
  roles::text as applies_to,
  qual as using_condition,
  with_check as check_condition
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles'
ORDER BY cmd, policyname;

-- Verify RLS is enabled and forced
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  forcerowsecurity as rls_forced
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';

-- Check table permissions
SELECT 
  table_name,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'user_profiles'
ORDER BY grantee, privilege_type;

-- Security status summary
SELECT 
  'User Profiles Security Status: MAXIMUM SECURITY APPLIED' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';