-- Check current constraint using correct PostgreSQL syntax
SELECT 
    conname, 
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'projects_type_check';

-- Update the check constraint to include 'mixtape' as a valid project type
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_type_check;

ALTER TABLE public.projects 
ADD CONSTRAINT projects_type_check 
CHECK (type IN ('album', 'ep', 'single', 'mixtape', 'compilation', 'soundtrack'));