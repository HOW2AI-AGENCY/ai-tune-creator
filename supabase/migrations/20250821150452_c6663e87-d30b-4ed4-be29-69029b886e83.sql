-- Fix function search path security warning
-- This ensures the function is secure against search_path manipulation

CREATE OR REPLACE FUNCTION public.is_url_allowed(url_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  url_domain TEXT;
  allowed_domain TEXT;
BEGIN
  -- Extract domain from URL
  SELECT regexp_replace(url_to_check, '^https?://([^/]+).*', '\1') INTO url_domain;
  
  -- Check if domain or any parent domain is in allowlist
  FOR allowed_domain IN 
    SELECT domain FROM public.url_allowlist WHERE is_active = true
  LOOP
    IF url_domain = allowed_domain OR url_domain LIKE '%.' || allowed_domain THEN
      RETURN true;
    END IF;
  END LOOP;
  
  RETURN false;
END;
$$;