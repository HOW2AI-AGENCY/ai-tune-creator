-- Enhanced Security Fix for User Profiles Table
-- This migration addresses the security concern about personal information exposure

-- First, let's ensure RLS is enabled (should already be enabled but double-check)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them with enhanced security
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;

-- Create enhanced RLS policies with additional security checks

-- 1. INSERT policy - Users can only create their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

-- 2. SELECT policy - Users can only view their own profile + admins can view all
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.is_admin()
);

-- 3. UPDATE policy - Users can only update their own profile + admins can update all
CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = user_id 
  OR public.is_admin()
)
WITH CHECK (
  auth.uid() = user_id 
  OR public.is_admin()
);

-- 4. DELETE policy - Only admins can delete profiles (for GDPR compliance)
CREATE POLICY "Only admins can delete user profiles" 
ON public.user_profiles 
FOR DELETE 
TO authenticated
USING (public.is_admin());

-- Create a secure function to get minimal public profile data for collaboration features
-- This allows controlled exposure of only necessary data (display_name, avatar_url)
-- without exposing sensitive Telegram data
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
  -- Only return minimal public information
  -- No Telegram data, personal names, or bio
  RETURN QUERY
  SELECT 
    up.id,
    up.display_name,
    up.avatar_url
  FROM public.user_profiles up
  WHERE up.user_id = profile_user_id
    AND up.display_name IS NOT NULL
  LIMIT 1;
END;
$$;

-- Create audit function for sensitive profile operations
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log sensitive operations on user profiles
  IF TG_OP = 'SELECT' AND OLD.telegram_id IS NOT NULL THEN
    -- Log when Telegram data is accessed
    PERFORM public.create_activity_log(
      auth.uid(),
      'PROFILE_TELEGRAM_ACCESS',
      'Telegram profile data accessed',
      'user_profile',
      OLD.id,
      'completed',
      jsonb_build_object(
        'accessed_user_id', OLD.user_id,
        'access_type', 'telegram_data'
      )
    );
  END IF;
  
  IF TG_OP = 'UPDATE' THEN
    -- Log profile updates
    PERFORM public.create_activity_log(
      auth.uid(),
      'PROFILE_UPDATE',
      'User profile updated',
      'user_profile',
      NEW.id,
      'completed',
      jsonb_build_object(
        'updated_fields', CASE 
          WHEN OLD.display_name IS DISTINCT FROM NEW.display_name THEN jsonb_build_array('display_name')
          ELSE jsonb_build_array()
        END
      )
    );
    RETURN NEW;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for profile access logging (commented out to avoid performance impact)
-- Uncomment if you need detailed audit logging
-- CREATE TRIGGER log_user_profile_operations
--   AFTER SELECT OR UPDATE ON public.user_profiles
--   FOR EACH ROW EXECUTE FUNCTION public.log_profile_access();

-- Revoke any public access that might exist
REVOKE ALL ON public.user_profiles FROM public;
REVOKE ALL ON public.user_profiles FROM anon;

-- Grant specific permissions only to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

-- Comment explaining the security measures:
-- 1. Enhanced RLS policies with explicit authentication checks
-- 2. Admin override capability for user management
-- 3. Secure public profile function that exposes only minimal data
-- 4. Audit logging capability for sensitive operations
-- 5. Explicit permission revocation and re-granting
-- 6. No public or anonymous access to sensitive profile data