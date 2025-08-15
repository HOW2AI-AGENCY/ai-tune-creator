-- Завершение системы артистов: создание таблицы и связей

-- Создание таблицы артистов (если не существует)
CREATE TABLE IF NOT EXISTS public.artists (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'solo' CHECK (type IN ('solo', 'band', 'collaboration')),
    genre TEXT,
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    social_links JSONB DEFAULT '{}',
    contact_info JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_artists_user_id ON public.artists(user_id);
CREATE INDEX IF NOT EXISTS idx_artists_name ON public.artists(name);
CREATE INDEX IF NOT EXISTS idx_artists_type ON public.artists(type);
CREATE INDEX IF NOT EXISTS idx_artists_genre ON public.artists(genre);
CREATE INDEX IF NOT EXISTS idx_artists_active ON public.artists(is_active);

-- Enable Row Level Security
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

-- Политики безопасности для артистов
DROP POLICY IF EXISTS "Users can view their own artists" ON public.artists;
CREATE POLICY "Users can view their own artists" 
ON public.artists 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own artists" ON public.artists;
CREATE POLICY "Users can create their own artists" 
ON public.artists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own artists" ON public.artists;
CREATE POLICY "Users can update their own artists" 
ON public.artists 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own artists" ON public.artists;
CREATE POLICY "Users can delete their own artists" 
ON public.artists 
FOR DELETE 
USING (auth.uid() = user_id);

-- Создание таблицы промо-материалов с полиморфными связями
CREATE TABLE IF NOT EXISTS public.promo_materials (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('artist', 'project', 'track')),
    entity_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    category TEXT NOT NULL CHECK (category IN ('photo', 'video', 'banner', 'poster', 'logo', 'other')),
    title TEXT,
    description TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Индексы для промо-материалов
CREATE INDEX IF NOT EXISTS idx_promo_materials_user_id ON public.promo_materials(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_materials_entity ON public.promo_materials(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_promo_materials_category ON public.promo_materials(category);
CREATE INDEX IF NOT EXISTS idx_promo_materials_primary ON public.promo_materials(is_primary);

-- Enable Row Level Security
ALTER TABLE public.promo_materials ENABLE ROW LEVEL SECURITY;

-- Политики безопасности для промо-материалов
DROP POLICY IF EXISTS "Users can view their own promo materials" ON public.promo_materials;
CREATE POLICY "Users can view their own promo materials" 
ON public.promo_materials 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own promo materials" ON public.promo_materials;
CREATE POLICY "Users can create their own promo materials" 
ON public.promo_materials 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own promo materials" ON public.promo_materials;
CREATE POLICY "Users can update their own promo materials" 
ON public.promo_materials 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own promo materials" ON public.promo_materials;
CREATE POLICY "Users can delete their own promo materials" 
ON public.promo_materials 
FOR DELETE 
USING (auth.uid() = user_id);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Применение триггера к таблицам
DROP TRIGGER IF EXISTS update_artists_updated_at ON public.artists;
CREATE TRIGGER update_artists_updated_at
    BEFORE UPDATE ON public.artists
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_promo_materials_updated_at ON public.promo_materials;
CREATE TRIGGER update_promo_materials_updated_at
    BEFORE UPDATE ON public.promo_materials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Создание Storage buckets для файлов
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('artists', 'artists', true),
  ('promo-materials', 'promo-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Политики Storage для аватаров артистов
DROP POLICY IF EXISTS "Artists avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Artists avatars are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'artists');

DROP POLICY IF EXISTS "Users can upload artist avatars" ON storage.objects;
CREATE POLICY "Users can upload artist avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'artists' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their artist avatars" ON storage.objects;
CREATE POLICY "Users can update their artist avatars" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'artists' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their artist avatars" ON storage.objects;
CREATE POLICY "Users can delete their artist avatars" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'artists' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Политики Storage для промо-материалов
DROP POLICY IF EXISTS "Promo materials are publicly accessible" ON storage.objects;
CREATE POLICY "Promo materials are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'promo-materials');

DROP POLICY IF EXISTS "Users can upload promo materials" ON storage.objects;
CREATE POLICY "Users can upload promo materials" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'promo-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their promo materials" ON storage.objects;
CREATE POLICY "Users can update their promo materials" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'promo-materials' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their promo materials" ON storage.objects;
CREATE POLICY "Users can delete their promo materials" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'promo-materials' AND auth.uid()::text = (storage.foldername(name))[1]);