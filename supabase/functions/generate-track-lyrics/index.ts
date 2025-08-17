import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Basic in-memory rate limiter (per function instance)
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 60; // 60 requests per window
const rateMap = new Map<string, { count: number; reset: number }>();

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

  // Extract user id from verified JWT for rate limiting
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const jwtPayload = token.split('.')[1];
  const userId = jwtPayload ? JSON.parse(atob(jwtPayload)).sub as string : 'anonymous';

  // Rate limit per user
  const now = Date.now();
  const rl = rateMap.get(userId);
  if (!rl || now > rl.reset) {
    rateMap.set(userId, { count: 1, reset: now + RATE_LIMIT_WINDOW });
  } else if (rl.count >= RATE_LIMIT_MAX) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } else {
    rl.count++;
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

    // Создаем улучшенный промпт для генерации лирики в читаемом формате
    const systemPrompt = customPrompt || `Ты — опытный русскоязычный сонграйтер и продюсер. Пиши зрелые, образные тексты без клише и пустых фраз.

ВАЖНО: Отвечай в читаемом формате с английскими тегами в квадратных скобках. НЕ используй JSON!

ТРЕБОВАНИЯ К КАЧЕСТВУ:
- Язык: русский (естественный, без англицизмов, если не обусловлено стилем)
- Структура и объем:
  • [INTRO] 2–4 строки
  • Каждый [VERSE] 8–12 строк, смыслово насыщен, с внутренними/многосложными рифмами
  • [CHORUS] 4–8 строк, запоминающийся хук, воспеваемость, ритм
  • [BRIDGE] 4–6 строк с новым поворотом смысла/мелодии
  • [OUTRO] 2–4 строки (вариация/эхо идеи)
- Тематика и глубина: избегай общих мест вроде «Эй, жизнь — игра». Используй конкретику, образы, детали, контекст.
- Ритмика/рифма: внутренние рифмы, ассонансы, аллитерации. Без «детсадовых» парных рифм на протяжении всего текста.
- Тональность: зрелая, уверенная; без инфантильных «эй» в начале куплетов.
- Контент должен соответствовать СТИЛЮ и ЖАНРАМ ниже.

ФОРМАТ ОТВЕТА (каждый блок с новой строки):
[INTRO]
текст интро

[VERSE 1]
первая строка куплета
вторая строка куплета
третья строка куплета
четвертая строка куплета

[CHORUS]
первая строка припева
вторая строка припева
третья строка припева
четвертая строка припева

[VERSE 2]
новый куплет с развитием темы

[CHORUS]
повтор припева

[BRIDGE]
текст бриджа

[CHORUS]
финальный припев

[OUTRO]
завершающие строки

КОНТЕКСТ:
СТИЛЬ: ${stylePrompt}
ЖАНРЫ: ${genreTags.join(', ')}${artistInfo.name ? `\nАРТИСТ: ${artistInfo.name}` : ''}`

    const userPrompt = `Создай лирику для трека в читаемом формате:

${existingLyrics ? `ОСНОВА: ${existingLyrics}

Создай улучшенную версию.` : 'Создай новую лирику для трека.'}

Верни только текст лирики в указанном формате без дополнительных пояснений.`;

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

    // Возвращаем лирику в читаемом формате (не JSON)
    const result = generatedText.trim();

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