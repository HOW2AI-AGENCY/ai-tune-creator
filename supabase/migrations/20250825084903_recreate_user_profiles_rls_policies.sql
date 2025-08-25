-- Recreate RLS policies for user_profiles to address a security alert and ensure a known good state.
-- This migration drops the existing policies and recreates them with the correct checks.

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

-- Re-create policies with the correct security rules
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);
