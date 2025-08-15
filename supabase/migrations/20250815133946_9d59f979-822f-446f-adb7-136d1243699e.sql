-- Create missing track record for the completed Mureka generation
INSERT INTO tracks (
  id,
  title,
  project_id,
  track_number,
  audio_url,
  duration,
  metadata,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'AI Generated Track 15.08.2025',
  (SELECT id FROM projects WHERE artist_id = (SELECT id FROM artists WHERE user_id = '51c04f97-a158-4f77-8c18-5c7aeb1b4283' LIMIT 1) LIMIT 1),
  1,
  'https://zwbhlfhwymbmvioaikvs.supabase.co/storage/v1/object/public/albert-tracks/51c04f97-a158-4f77-8c18-5c7aeb1b4283/mureka/mureka-track-5f826f95-2025-08-15T13-35-02-145Z.mp3',
  97,
  jsonb_build_object(
    'service', 'mureka',
    'generation_id', '5f826f95-f896-47f7-862c-95ee30fd34e4',
    'original_external_url', 'https://cdn.mureka.ai/cos-prod/open/song/20250815/81403406581761-RTg5CQETrfrpJamE37L2mA.mp3',
    'local_storage_path', '51c04f97-a158-4f77-8c18-5c7aeb1b4283/mureka/mureka-track-5f826f95-2025-08-15T13-35-02-145Z.mp3',
    'file_size', 2337271,
    'genre', 'хип-хоп',
    'mood', 'энергичное',
    'downloaded_at', '2025-08-15T13:35:03.044Z'
  ),
  '2025-08-15 13:35:03+00',
  '2025-08-15 13:35:03+00'
);

-- Update the ai_generation record to link it with the track
UPDATE ai_generations 
SET track_id = (SELECT id FROM tracks WHERE metadata->>'generation_id' = '5f826f95-f896-47f7-862c-95ee30fd34e4')
WHERE id = '5f826f95-f896-47f7-862c-95ee30fd34e4';