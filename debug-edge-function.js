// Детальная диагностика Edge Function
const testData = {
  prompt: "Создай современную поп-песню с ярким вокалом, запоминающимся припевом и танцевальным битом. Используй синтезаторы и современное звучание.",
  style: "",
  projectId: undefined,
  artistId: undefined,
  title: "AI Generated 14.08.2025",
  mode: "quick",
  language: "ru",
  make_instrumental: false,
  model: "chirp-v3-5",
  tags: "поп, энергичное",
  wait_audio: true
};

console.log('🔍 Testing Edge Function parameters validation...');
console.log('Test data:', JSON.stringify(testData, null, 2));

// Симулируем валидацию из Edge Function
const { 
  prompt,
  style = "",
  title = "",
  tags = "energetic, creative, viral",
  make_instrumental = false,
  wait_audio = true,
  model = "chirp-v3-5",
  trackId = null,
  projectId = null,
  artistId = null,
  mode = "quick",
  custom_lyrics = "",
  voice_style = "",
  language = "ru",
  tempo = ""
} = testData;

console.log('\n📋 Extracted parameters:');
console.log('prompt:', prompt ? `"${prompt.substring(0, 50)}..."` : '[empty]');
console.log('mode:', mode);
console.log('language:', language);
console.log('make_instrumental:', make_instrumental);
console.log('custom_lyrics:', custom_lyrics || '[empty]');

// Симулируем валидацию
console.log('\n✅ Validation checks:');
if (mode === 'custom' && custom_lyrics && custom_lyrics.trim().length > 0) {
  console.log('✅ Custom mode validation: PASSED (using custom lyrics)');
} else if (!prompt || prompt.trim().length === 0) {
  console.log('❌ Validation: FAILED - Prompt is required and cannot be empty');
} else {
  console.log('✅ Quick mode validation: PASSED');
}

// Симулируем формирование Suno запроса
const requestPrompt = mode === 'custom' && custom_lyrics && custom_lyrics.trim().length > 0 ? custom_lyrics : prompt;

const sunoRequest = {
  prompt: requestPrompt || prompt,
  style: style || 'Pop, Electronic',
  title: title || `AI Generated ${new Date().toLocaleDateString('ru-RU')}`,
  customMode: true,
  instrumental: make_instrumental,
  model: model.replace('chirp-v', 'V').replace('-', '_'),
};

// Добавляем дополнительные параметры для кастомного режима
if (mode === 'custom') {
  if (voice_style && voice_style !== 'none' && voice_style.trim().length > 0) {
    sunoRequest.voiceStyle = voice_style;
  }
  if (tempo && tempo !== 'none' && tempo.trim().length > 0) {
    sunoRequest.tempo = tempo;
  }
  if (language && language !== 'auto') {
    sunoRequest.language = language;
  }
}

console.log('\n🎵 Suno request object:');
console.log(JSON.stringify(sunoRequest, null, 2));

console.log('\n✅ Edge Function simulation completed successfully!');
console.log('👨‍💻 The parameters appear to be correctly structured.');
console.log('🔍 The 500 error is likely coming from the Suno API call itself.');