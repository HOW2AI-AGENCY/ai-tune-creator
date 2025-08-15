-- Insert completed Mureka generation that was missed
INSERT INTO ai_generations (
  user_id, 
  service, 
  status, 
  external_id, 
  prompt, 
  result_url, 
  completed_at, 
  metadata, 
  parameters
) VALUES (
  '51c04f97-a158-4f77-8c18-5c7aeb1b4283', 
  'mureka', 
  'completed', 
  '89308629434369', 
  'Создай современный хип-хоп трек с мощными басами, характерными drums и стильными семплами. Добавь атмосферные элементы.', 
  'https://cdn.mureka.ai/cos-prod/open/song/20250815/81403406581761-RTg5CQETrfrpJamE37L2mA.mp3', 
  '2025-08-15 13:21:54+00', 
  '{"mode": "quick", "mureka_task_id": "89308629434369", "mureka_track_id": "89308702769155", "duration": 97320, "mureka_status": "succeeded", "title": "AI Generated Track 15.08.2025", "model": "mureka-7", "genre": "хип-хоп", "mood": "энергичное", "tempo": "medium"}'::jsonb, 
  '{"model": "mureka-7", "service": "mureka", "prompt": "Создай современный хип-хоп трек с мощными басами, характерными drums и стильными семплами. Добавь атмосферные элементы.", "genre": "хип-хоп", "mood": "энергичное", "tempo": "medium", "duration": 120, "instrumental": false, "language": "ru"}'::jsonb
);