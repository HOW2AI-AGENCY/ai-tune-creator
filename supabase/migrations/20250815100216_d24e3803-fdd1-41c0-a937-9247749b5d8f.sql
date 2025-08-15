-- Add missing metadata column to ai_generations table
ALTER TABLE public.ai_generations 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Update the existing records to have proper metadata
UPDATE public.ai_generations 
SET metadata = '{}'::jsonb 
WHERE metadata IS NULL;