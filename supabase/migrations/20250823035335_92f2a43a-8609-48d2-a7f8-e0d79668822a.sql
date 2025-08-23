-- Create user_preferences table for storing user settings
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  notifications JSONB DEFAULT '{
    "email_notifications": true,
    "push_notifications": false,
    "ai_generation_complete": true,
    "project_updates": true,
    "weekly_digest": false
  }'::jsonb,
  preferences JSONB DEFAULT '{
    "default_ai_service": "suno",
    "auto_save_projects": true,
    "theme": "system"
  }'::jsonb,
  ai_settings JSONB DEFAULT '{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.8,
    "max_tokens": 1000,
    "custom_prompts": {
      "artist_generation": "Создай детальный профиль артиста для музыкального проекта.",
      "lyrics_generation": "Создай текст песни в указанном стиле.",
      "marketing_materials": "Создай маркетинговые материалы для продвижения."
    }
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Add profiles columns if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;