-- Enable Row Level Security on logs table
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view only their own logs
CREATE POLICY "Users can view their own logs" 
ON public.logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for users to create their own logs
CREATE POLICY "Users can create their own logs" 
ON public.logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own logs
CREATE POLICY "Users can update their own logs" 
ON public.logs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy for users to delete their own logs
CREATE POLICY "Users can delete their own logs" 
ON public.logs 
FOR DELETE 
USING (auth.uid() = user_id);