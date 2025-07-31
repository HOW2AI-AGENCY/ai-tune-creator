import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// T-054: Edge Function для генерации лирики
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { 
      stylePrompt, 
      genreTags = [], 
      artistInfo = {}, 
      existingLyrics = null,
      provider = 'openai',
      model = 'gpt-4o-mini',
      temperature = 0.8,
      maxTokens = 1000,
      customPrompt = null
    } = await req.json();

    console.log('Generating lyrics with params:', { 
      stylePrompt, 
      genreTags, 
      provider, 
      model 
    });

    // Получаем API ключ для выбранного провайдера
    let apiKey: string | undefined;
    let apiUrl: string;
    let requestBody: any;

    switch (provider) {
      case 'openai':
        apiKey = Deno.env.get('OPENAI_API_KEY');
        apiUrl = 'https://api.openai.com/v1/chat/completions';
        break;
      case 'anthropic':
        apiKey = Deno.env.get('ANTHROPIC_API_KEY');
        apiUrl = 'https://api.anthropic.com/v1/messages';
        break;
      case 'deepseek':
        apiKey = Deno.env.get('DEEPSEEK_API_KEY');
        apiUrl = 'https://api.deepseek.com/v1/chat/completions';
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    if (!apiKey) {
      throw new Error(`API key not found for provider: ${provider}`);
    }

    // Создаем улучшенный промпт для генерации лирики с SUNO AI тегами  
    const systemPrompt = customPrompt || `Here is the user's prompt for creating a song:
<user_prompt>
СТИЛЬ: ${stylePrompt}
ЖАНРЫ: ${genreTags.join(', ')}
${artistInfo.name ? `ИСПОЛНИТЕЛЬ: ${artistInfo.name}` : ''}
</user_prompt>

Ты мирового класса музыкальный продюсер, автор песен и маркетинговый эксперт. Создай вирусный хит используя формат SUNO.AI для ИИ-генерации музыки.

ВАЖНО: Отвечай СТРОГО в формате JSON без дополнительного текста.

ОБЯЗАТЕЛЬНАЯ СТРУКТУРА JSON:
{
  "lyrics": "Полный текст песни с тегами SUNO.AI в формате [Intro], [Verse], [Chorus], {main_vox}, [!fade_in] и т.д.",
  "structure": ["intro", "verse", "chorus", "verse", "chorus", "bridge", "chorus", "outro"],
  "mood": "Конкретное описание настроения песни",
  "themes": ["тема1", "тема2", "тема3"],
  "suno_tags": ["BPM: 140", "Genre: Hip-Hop", "Mood: Energetic", "Style: Russian Rap"]
}

ТРЕБОВАНИЯ К ЛИРИКЕ:
- Используй теги SUNO.AI: [Intro], [Verse], [Chorus], [Bridge], [Outro]
- Добавляй вокальные теги: {main_vox}, {backing_vox}, {harmonies}
- Используй эффекты: [!fade_in], [!build_up], [!drop], [!reverb]
- Эмоциональные маркеры: [Emotional], [Intense], [Gentle]
- Создай запоминающиеся хуки и припевы
- Текст на русском языке для русского рэпа`;

    const userPrompt = `Создай лирику для трека в формате SUNO.AI:

${existingLyrics ? `ОСНОВА: ${existingLyrics}

Создай улучшенную версию с SUNO AI тегами.` : 'Создай новую лирику с тегами SUNO.AI для максимального вирусного потенциала.'}

ОБЯЗАТЕЛЬНЫЕ ЭЛЕМЕНТЫ:
1. Структурные теги: [Intro], [Verse], [Chorus], [Bridge], [Outro]
2. Вокальные эффекты: {main_vox}, {backing_vox}
3. Динамические эффекты: [!fade_in], [!build_up], [!drop]
4. Эмоциональные маркеры: [Emotional], [Intense]
5. Запоминающиеся хуки для TikTok/Reels

Верни только JSON без пояснений.`;

    // Формируем запрос в зависимости от провайдера
    if (provider === 'anthropic') {
      requestBody = {
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
        messages: [
          {
            role: "user",
            content: `${systemPrompt}\n\n${userPrompt}`
          }
        ]
      };
    } else {
      // OpenAI и DeepSeek используют одинаковый формат
      requestBody = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens
      };
    }

    console.log('Making API request to:', apiUrl);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': provider === 'anthropic' 
          ? `Bearer ${apiKey}` 
          : `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(provider === 'anthropic' && { 'anthropic-version': '2023-06-01' })
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`${provider} API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('API Response received');

    // Извлекаем результат в зависимости от провайдера
    let generatedText: string;
    if (provider === 'anthropic') {
      generatedText = data.content[0].text;
    } else {
      generatedText = data.choices[0].message.content;
    }

    // Парсим JSON ответ
    let result;
    try {
      // Пытаемся извлечь JSON из ответа
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.log('Failed to parse JSON, using fallback format');
      // Если не удалось распарсить JSON, создаем структуру вручную
      result = {
        lyrics: `[Intro]\n{main_vox}\n${generatedText.substring(0, 200)}...\n\n[Verse]\n{main_vox}\n...\n\n[Chorus]\n{main_vox}\n...`,
        structure: ["intro", "verse", "chorus", "verse", "chorus", "bridge", "chorus", "outro"],
        mood: `${genreTags[0] || 'Энергичное'} настроение`,
        themes: genreTags.length > 0 ? genreTags : ["Городская жизнь", "Личные переживания", "Социальные темы"],
        suno_tags: [
          "BPM: 140",
          `Genre: ${genreTags[0] || 'Hip-Hop'}`,
          "Mood: Energetic",
          "Language: Russian"
        ]
      };
    }

    // TODO: Добавить валидацию сгенерированного контента
    // FIXME: Улучшить обработку ошибок парсинга

    return new Response(JSON.stringify({
      success: true,
      data: result,
      metadata: {
        provider,
        model,
        generatedAt: new Date().toISOString(),
        inputParams: { stylePrompt, genreTags, hasExistingLyrics: !!existingLyrics }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-track-lyrics function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});