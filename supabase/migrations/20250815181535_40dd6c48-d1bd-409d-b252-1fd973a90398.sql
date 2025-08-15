-- Update projects.type check constraint to include 'mixtape'
ALTER TABLE public.projects 
DROP CONSTRAINT IF EXISTS projects_type_check;

ALTER TABLE public.projects 
ADD CONSTRAINT projects_type_check 
CHECK (type IN ('album', 'ep', 'single', 'mixtape', 'project', 'compilation', 'soundtrack'));
