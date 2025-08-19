-- Fix remaining function search paths for security compliance
-- Identify and fix any remaining functions without proper search_path

-- List all functions that might need search_path fixes
SELECT 
    p.proname as function_name,
    n.nspname as schema_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.prokind = 'f'
AND p.proname NOT LIKE 'pg_%'
AND p.proname NOT LIKE 'information_schema%';