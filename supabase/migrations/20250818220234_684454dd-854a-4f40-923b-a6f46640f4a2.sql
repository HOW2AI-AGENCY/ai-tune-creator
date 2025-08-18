-- =============================================
-- SECURITY FIX: Operation Locks Access Control
-- Issue: operation_locks table accessible to all users
-- Solution: Implement proper role-based access control
-- =============================================

-- Step 1: Create user role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Step 2: Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, role)
);

-- Step 3: Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Step 5: Create helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role);
$$;

-- Step 6: Create RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Step 7: DROP the insecure operation_locks policy
DROP POLICY IF EXISTS "Admin access to operation locks" ON public.operation_locks;

-- Step 8: Create secure operation_locks policies
CREATE POLICY "Only admins can access operation locks"
ON public.operation_locks
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Step 9: Create a function to safely acquire locks (for system use)
CREATE OR REPLACE FUNCTION public.acquire_operation_lock(_key TEXT, _ttl_seconds INTEGER DEFAULT 120)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins or service role to acquire locks
  IF NOT (public.is_admin() OR current_user = 'service_role') THEN
    RAISE EXCEPTION 'Insufficient permissions to acquire operation lock';
  END IF;
  
  -- Clean up expired locks first
  DELETE FROM public.operation_locks WHERE expires_at < now();
  
  -- Try to acquire the lock
  BEGIN
    INSERT INTO public.operation_locks (key, expires_at)
    VALUES (_key, now() + (_ttl_seconds || ' seconds')::interval);
    RETURN TRUE;
  EXCEPTION WHEN unique_violation THEN
    RETURN FALSE;
  END;
END;
$$;

-- Step 10: Create a function to safely release locks
CREATE OR REPLACE FUNCTION public.release_operation_lock(_key TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins or service role to release locks
  IF NOT (public.is_admin() OR current_user = 'service_role') THEN
    RAISE EXCEPTION 'Insufficient permissions to release operation lock';
  END IF;
  
  DELETE FROM public.operation_locks WHERE key = _key;
END;
$$;

-- Step 11: Add initial admin user (replace with actual admin user ID)
-- Note: This will need to be updated with the actual admin user ID after migration
-- INSERT INTO public.user_roles (user_id, role, assigned_by) 
-- VALUES ('YOUR_ADMIN_USER_ID', 'admin', 'YOUR_ADMIN_USER_ID');

-- Step 12: Create audit log function for role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_activity_log(
      NEW.user_id,
      'ROLE_ASSIGNED',
      format('Role %s assigned to user', NEW.role),
      'user_role',
      NEW.id,
      'completed',
      jsonb_build_object('role', NEW.role, 'assigned_by', NEW.assigned_by)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.create_activity_log(
      OLD.user_id,
      'ROLE_REMOVED',
      format('Role %s removed from user', OLD.role),
      'user_role',
      OLD.id,
      'completed',
      jsonb_build_object('role', OLD.role)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Step 13: Create trigger for role change logging
CREATE TRIGGER log_user_role_changes
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change();

-- Step 14: Add comments for documentation
COMMENT ON TABLE public.user_roles IS 'Stores user roles for access control. Each user can have multiple roles.';
COMMENT ON FUNCTION public.has_role(UUID, app_role) IS 'Security definer function to check if a user has a specific role. Prevents RLS recursion.';
COMMENT ON FUNCTION public.is_admin() IS 'Helper function to check if current user has admin role.';
COMMENT ON FUNCTION public.acquire_operation_lock(TEXT, INTEGER) IS 'Safely acquire an operation lock. Only accessible to admins and service role.';
COMMENT ON FUNCTION public.release_operation_lock(TEXT) IS 'Safely release an operation lock. Only accessible to admins and service role.';