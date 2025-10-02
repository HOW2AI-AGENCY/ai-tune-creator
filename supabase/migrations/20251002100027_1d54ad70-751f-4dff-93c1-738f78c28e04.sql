-- ===========================================
-- 1. TRACK VARIANTS SYSTEM
-- ===========================================

-- Add variant fields to tracks table
ALTER TABLE tracks 
  ADD COLUMN IF NOT EXISTS variant_group_id uuid,
  ADD COLUMN IF NOT EXISTS variant_number integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_master_variant boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_stems boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS stems_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stems_separation_mode text CHECK (stems_separation_mode IN ('simple', 'detailed'));

-- Add variant fields to ai_generations table
ALTER TABLE ai_generations
  ADD COLUMN IF NOT EXISTS variant_group_id uuid,
  ADD COLUMN IF NOT EXISTS total_variants integer DEFAULT 2;

-- Create indexes for variants
CREATE INDEX IF NOT EXISTS idx_tracks_variant_group ON tracks(variant_group_id);
CREATE INDEX IF NOT EXISTS idx_tracks_variant_number ON tracks(variant_number);
CREATE INDEX IF NOT EXISTS idx_ai_generations_variant_group ON ai_generations(variant_group_id);

-- ===========================================
-- 2. TRACK STEMS SYSTEM
-- ===========================================

-- Create track_stems table
CREATE TABLE IF NOT EXISTS track_stems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  variant_number integer NOT NULL DEFAULT 1,
  separation_mode text NOT NULL CHECK (separation_mode IN ('simple', 'detailed')),
  stem_type text NOT NULL,
  stem_name text NOT NULL,
  stem_url text NOT NULL,
  file_size bigint,
  duration integer,
  waveform_data jsonb,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(track_id, variant_number, stem_type)
);

-- Create indexes for stems
CREATE INDEX idx_track_stems_track_variant ON track_stems(track_id, variant_number);
CREATE INDEX idx_track_stems_type ON track_stems(stem_type);
CREATE INDEX idx_track_stems_created_at ON track_stems(created_at DESC);

-- RLS policies for track_stems
ALTER TABLE track_stems ENABLE ROW LEVEL SECURITY;

-- Users can view stems for their own tracks
CREATE POLICY "Users can view own track stems"
  ON track_stems FOR SELECT
  USING (
    track_id IN (
      SELECT t.id FROM tracks t
      JOIN projects p ON t.project_id = p.id
      JOIN artists a ON p.artist_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- Users can manage stems for their own tracks
CREATE POLICY "Users can manage own track stems"
  ON track_stems FOR ALL
  USING (
    track_id IN (
      SELECT t.id FROM tracks t
      JOIN projects p ON t.project_id = p.id
      JOIN artists a ON p.artist_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- ===========================================
-- 3. TRACK RELATIONS SYSTEM
-- ===========================================

-- Create enum for relation types
DO $$ BEGIN
  CREATE TYPE track_relation_type AS ENUM (
    'variant',
    'version', 
    'cover',
    'remix',
    'prompt_variation',
    'lyrics_variation',
    'style_variation',
    'continuation',
    'inspiration'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create track_relations table
CREATE TABLE IF NOT EXISTS track_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  target_track_id uuid NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  relation_type track_relation_type NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  UNIQUE(source_track_id, target_track_id, relation_type),
  CHECK (source_track_id != target_track_id)
);

-- Create indexes for relations
CREATE INDEX idx_track_relations_source ON track_relations(source_track_id);
CREATE INDEX idx_track_relations_target ON track_relations(target_track_id);
CREATE INDEX idx_track_relations_type ON track_relations(relation_type);

-- RLS policies for track_relations
ALTER TABLE track_relations ENABLE ROW LEVEL SECURITY;

-- Users can view relations for their own tracks
CREATE POLICY "Users can view own track relations"
  ON track_relations FOR SELECT
  USING (
    source_track_id IN (
      SELECT t.id FROM tracks t
      JOIN projects p ON t.project_id = p.id
      JOIN artists a ON p.artist_id = a.id
      WHERE a.user_id = auth.uid()
    )
    OR
    target_track_id IN (
      SELECT t.id FROM tracks t
      JOIN projects p ON t.project_id = p.id
      JOIN artists a ON p.artist_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- Users can manage relations for their own tracks
CREATE POLICY "Users can manage own track relations"
  ON track_relations FOR ALL
  USING (
    source_track_id IN (
      SELECT t.id FROM tracks t
      JOIN projects p ON t.project_id = p.id
      JOIN artists a ON p.artist_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- ===========================================
-- 4. FILTER PRESETS SYSTEM
-- ===========================================

CREATE TABLE IF NOT EXISTS filter_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  filters jsonb NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_filter_presets_user ON filter_presets(user_id);
CREATE INDEX idx_filter_presets_default ON filter_presets(is_default) WHERE is_default = true;

-- RLS policies
ALTER TABLE filter_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own filter presets"
  ON filter_presets FOR ALL
  USING (auth.uid() = user_id);

-- ===========================================
-- 5. HELPER FUNCTIONS
-- ===========================================

-- Function to update stems count
CREATE OR REPLACE FUNCTION update_track_stems_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tracks
  SET 
    has_stems = EXISTS (SELECT 1 FROM track_stems WHERE track_id = NEW.track_id),
    stems_count = (SELECT COUNT(*) FROM track_stems WHERE track_id = NEW.track_id)
  WHERE id = NEW.track_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update stems count
DROP TRIGGER IF EXISTS trigger_update_stems_count ON track_stems;
CREATE TRIGGER trigger_update_stems_count
AFTER INSERT OR DELETE ON track_stems
FOR EACH ROW
EXECUTE FUNCTION update_track_stems_count();