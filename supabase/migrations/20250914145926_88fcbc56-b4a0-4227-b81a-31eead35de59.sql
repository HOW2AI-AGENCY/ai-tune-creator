-- Security audit and enhancement for user_profiles table
-- This migration addresses the reported security vulnerability

-- 1. First, let's verify the current state and add additional security measures
DO $$
DECLARE
    policy_count INTEGER;
    rls_status BOOLEAN;
    force_rls_status BOOLEAN;
BEGIN
    -- Check current RLS status
    SELECT relrowsecurity, relforcerowsecurity 
    INTO rls_status, force_rls_status
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'user_profiles';
    
    RAISE NOTICE 'Current RLS status: enabled=%, forced=%', rls_status, force_rls_status;
    
    -- Count existing policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'user_profiles';
    
    RAISE NOTICE 'Current policy count: %', policy_count;
END $$;

-- 2. Drop and recreate all RLS policies with enhanced security
-- This ensures no policy gaps or misconfigurations

-- Drop existing policies
DROP POLICY IF EXISTS "user_profiles_own_data_only_select" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_own_data_only_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_own_data_only_update" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_no_deletion" ON public.user_profiles;

-- 3. Create enhanced, restrictive RLS policies

-- SELECT: Users can ONLY access their own profile data
CREATE POLICY "user_profiles_select_own_only" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- INSERT: Users can ONLY create their own profile
CREATE POLICY "user_profiles_insert_own_only" 
ON public.user_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- UPDATE: Users can ONLY update their own profile
CREATE POLICY "user_profiles_update_own_only" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id AND auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- DELETE: Completely disable deletion of user profiles for security
CREATE POLICY "user_profiles_no_delete" 
ON public.user_profiles 
FOR DELETE 
TO authenticated
USING (false);

-- 4. Ensure RLS is enabled and forced (redundant but critical)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;

-- 5. Revoke any potentially dangerous permissions
-- Remove all permissions and re-grant only what's needed
REVOKE ALL ON public.user_profiles FROM anon;
REVOKE ALL ON public.user_profiles FROM public;
REVOKE ALL ON public.user_profiles FROM authenticated;

-- Grant minimal required permissions to authenticated users only
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

-- 6. Create a security audit function for ongoing monitoring
CREATE OR REPLACE FUNCTION public.audit_user_profiles_security()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    recommendation TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check 1: RLS enabled and forced
    RETURN QUERY
    SELECT 
        'RLS Protection'::TEXT,
        CASE 
            WHEN c.relrowsecurity AND c.relforcerowsecurity THEN 'SECURE'
            ELSE 'VULNERABLE'
        END::TEXT,
        CASE 
            WHEN c.relrowsecurity AND c.relforcerowsecurity THEN 'RLS is properly enabled and forced'
            ELSE 'CRITICAL: Enable and force RLS on user_profiles table'
        END::TEXT
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relname = 'user_profiles';
    
    -- Check 2: Policy count
    RETURN QUERY
    SELECT 
        'Policy Coverage'::TEXT,
        CASE 
            WHEN COUNT(*) >= 4 THEN 'SECURE'
            ELSE 'REVIEW NEEDED'
        END::TEXT,
        'Found ' || COUNT(*)::TEXT || ' RLS policies. Expected: 4 (SELECT, INSERT, UPDATE, DELETE)'::TEXT
    FROM pg_policies 
    WHERE tablename = 'user_profiles';
    
    -- Check 3: Anonymous access
    RETURN QUERY
    SELECT 
        'Anonymous Access'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'SECURE'
            ELSE 'VULNERABLE'
        END::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'No anonymous access granted'
            ELSE 'CRITICAL: Remove anonymous access grants'
        END::TEXT
    FROM information_schema.role_table_grants 
    WHERE table_name = 'user_profiles' AND grantee = 'anon';
END;
$$;

-- 7. Log this security enhancement
DO $$
BEGIN
    RAISE NOTICE 'Security enhancement completed for user_profiles table';
    RAISE NOTICE 'All policies recreated with enhanced restrictions';
    RAISE NOTICE 'RLS forced and permissions minimized';
    RAISE NOTICE 'Security audit function created: audit_user_profiles_security()';
END $$;