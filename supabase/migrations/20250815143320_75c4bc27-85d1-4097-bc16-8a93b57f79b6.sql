-- Update existing track with audio URL and duration from the Mureka generation
UPDATE tracks 
SET 
  audio_url = 'https://zwbhlfhwymbmvioaikvs.supabase.co/storage/v1/object/public/albert-tracks/51c04f97-a158-4f77-8c18-5c7aeb1b4283/mureka/mureka-track-5f826f95-2025-08-15T13-35-02-145Z.mp3',
  duration = 97,
  updated_at = now()
WHERE id = '2b137dec-daf5-4f46-b3de-f5e6afd32136';

-- Update the ai_generation record to link it with the existing track
UPDATE ai_generations 
SET track_id = '2b137dec-daf5-4f46-b3de-f5e6afd32136'
WHERE id = '5f826f95-f896-47f7-862c-95ee30fd34e4';