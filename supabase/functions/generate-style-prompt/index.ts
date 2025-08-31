import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSecureCorsHeaders } from '../_shared/cors.ts';
import { AuthUtils } from '../_shared/auth-utils.ts';
import { SecureLogger } from '../_shared/secure-logger.ts';

// Basic in-memory rate limiter (per function instance)
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 60; // 60 requests per window
const rateMap = new Map<string, { count: number; reset: number }>();

// T-061: Edge Function для генерации промпта стиля на основе контекста
serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getSecureCorsHeaders(origin);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY FIX: Use proper authentication instead of manual JWT parsing
  const authResult = await AuthUtils.authenticateUser(req, 'generate-style-prompt');
  if (!authResult.success || !authResult.context) {
    return new Response(JSON.stringify({ 
      error: authResult.error?.message || 'Authentication required',
      code: authResult.error?.code || 'AUTH_ERROR'
    }), {
      status: authResult.error?.status || 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const userId = authResult.context.user.id;

  // Rate limit per user using secure auth utilities
  const rateCheck = AuthUtils.checkUserRateLimit(
    userId, 
    'generate-style-prompt',
    { maxRequests: RATE_LIMIT_MAX, windowMs: RATE_LIMIT_WINDOW },
    rateMap
  );

  if (!rateCheck.allowed) {
    SecureLogger.logRateLimit('generate-style-prompt', userId, true, rateCheck.remaining);
    return new Response(JSON.stringify({ 
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((rateCheck.resetTime - Date.now()) / 1000)
    }), {
      status: 429,
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((rateCheck.resetTime - Date.now()) / 1000).toString()
      },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { 
      artistInfo = {},
      projectInfo = {},
      provider = 'openai',
      model = 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 500
    } = await req.json();

    console.log('Generating style prompt with params:', { 
      artistInfo: artistInfo.name || 'Unknown', 
      projectInfo: projectInfo.title || 'Unknown',
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

    // Создаем промпт для генерации стиля на основе контекста
    const systemPrompt = `Ты профессиональный музыкальный продюсер и саунд-дизайнер. Создай промпт стиля и жанры для трека на основе контекста артиста и проекта.

ВАЖНО: Отвечай СТРОГО в формате JSON без дополнительного текста.

ОБЯЗАТЕЛЬНАЯ СТРУКТУРА JSON:
{
  "style_prompt": "Детальный промпт стиля (100-200 слов)",
  "genre_tags": ["жанр1", "жанр2", "жанр3", "жанр4", "жанр5"]
}`;

    const userPrompt = `КОНТЕКСТ:
${artistInfo.name ? `АРТИСТ: ${artistInfo.name}` : ''}
${artistInfo.bio ? `БИО АРТИСТА: ${artistInfo.bio}` : ''}
${artistInfo.genres ? `ЖАНРЫ АРТИСТА: ${artistInfo.genres.join(', ')}` : ''}
${projectInfo.title ? `ПРОЕКТ: ${projectInfo.title}` : ''}
${projectInfo.description ? `ОПИСАНИЕ ПРОЕКТА: ${projectInfo.description}` : ''}
${projectInfo.genre ? `ЖАНР ПРОЕКТА: ${projectInfo.genre}` : ''}

Создай:
1. STYLE_PROMPT: Детальный промпт стиля для трека, учитывающий стиль артиста и концепцию проекта
2. GENRE_TAGS: 5 конкретных жанровых тегов, соответствующих стилю артиста и проекта

Учитывай:
- Музыкальный стиль и предпочтения артиста
- Концепцию и настроение проекта
- Современные тренды в указанных жанрах
- Уникальные особенности, которые выделят трек

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
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.log('Failed to parse JSON, using fallback format');
      // Создаем базовую структуру на основе контекста
      const artistGenres = artistInfo.genres || [];
      const projectGenre = projectInfo.genre || '';
      
      result = {
        style_prompt: `Создай трек в стиле ${artistInfo.name || 'современного артиста'} для проекта "${projectInfo.title || 'Новый проект'}". ${projectInfo.description || 'Энергичное и современное звучание'} с элементами ${artistGenres.length > 0 ? artistGenres.join(', ') : 'поп-музыки'}.`,
        genre_tags: artistGenres.length > 0 
          ? artistGenres.slice(0, 5)
          : projectGenre 
            ? [projectGenre, "современная музыка", "поп", "электронная музыка", "инди"]
            : ["поп", "современная музыка", "электронная музыка", "инди", "альтернатива"]
      };
    }

    return new Response(JSON.stringify({
      success: true,
      data: result,
      metadata: {
        provider,
        model,
        generatedAt: new Date().toISOString(),
        inputParams: { 
          hasArtistInfo: !!artistInfo.name,
          hasProjectInfo: !!projectInfo.title
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-style-prompt function:', error);
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