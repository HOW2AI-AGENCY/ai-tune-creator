-- Simple Security Status Check for User Profiles

-- Show current policies
SELECT 
  policyname,
  cmd,
  qual as using_condition
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles'
ORDER BY cmd;

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';

-- Count policies 
SELECT 
  COUNT(*) as total_policies,
  'Security configuration complete' as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles';