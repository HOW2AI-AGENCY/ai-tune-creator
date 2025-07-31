-- T-007: Создание индексов для оптимизации таблицы artists
CREATE INDEX IF NOT EXISTS idx_artists_user_id ON public.artists(user_id);
CREATE INDEX IF NOT EXISTS idx_artists_name ON public.artists(name);
CREATE INDEX IF NOT EXISTS idx_artists_created_at ON public.artists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artists_metadata ON public.artists USING GIN(metadata);

-- T-008: Создание таблицы artist_collaborators для совместной работы
CREATE TABLE IF NOT EXISTS public.artist_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  collaborator_user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer', -- viewer, editor, admin
  permissions JSONB DEFAULT '{"can_edit": false, "can_invite": false, "can_manage": false}'::jsonb,
  invited_by UUID,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, revoked
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(artist_id, collaborator_user_id)
);

-- Enable RLS for artist_collaborators
ALTER TABLE public.artist_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS политики для artist_collaborators
CREATE POLICY "Artist owners can manage collaborators" 
ON public.artist_collaborators 
FOR ALL 
USING (
  artist_id IN (
    SELECT id FROM public.artists WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  artist_id IN (
    SELECT id FROM public.artists WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Collaborators can view their own records" 
ON public.artist_collaborators 
FOR SELECT 
USING (collaborator_user_id = auth.uid());

CREATE POLICY "Collaborators can update their own status" 
ON public.artist_collaborators 
FOR UPDATE 
USING (
  collaborator_user_id = auth.uid() 
  AND status = 'pending'
)
WITH CHECK (
  collaborator_user_id = auth.uid() 
  AND status IN ('accepted', 'declined')
);

-- Создание индексов для artist_collaborators
CREATE INDEX idx_artist_collaborators_artist_id ON public.artist_collaborators(artist_id);
CREATE INDEX idx_artist_collaborators_user_id ON public.artist_collaborators(collaborator_user_id);
CREATE INDEX idx_artist_collaborators_status ON public.artist_collaborators(status);

-- Добавление триггера для обновления updated_at
CREATE TRIGGER update_artist_collaborators_updated_at
  BEFORE UPDATE ON public.artist_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();