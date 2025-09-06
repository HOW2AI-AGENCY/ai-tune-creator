-- Security Fix: Remove user access to auth_analytics table
-- First, let's check current policies and clean them up properly

-- Drop the policy that allows users to view their own auth analytics
DROP POLICY IF EXISTS "Users can only view their own auth analytics" ON public.auth_analytics;

-- The admin policy already exists, so we just need to ensure user access is removed
-- Now auth_analytics table will only be accessible to:
-- 1. Admins (via existing "Admins can view auth analytics" policy)
-- 2. Service role for inserts (via existing "Service role can insert auth analytics" policy)

-- Verify there are no other permissive policies that could allow user access
-- This ensures users cannot view sensitive authentication data including IP addresses,
-- user agents, and error messages that could be used for tracking or security analysis