-- Fix function search path security warning
CREATE OR REPLACE FUNCTION public.cleanup_expired_telegram_nonces()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.telegram_auth_nonces 
  WHERE expires_at < now();
END;
$$;