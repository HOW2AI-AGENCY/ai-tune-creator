import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// T-055: Edge Function для генерации концепции трека
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
      projectInfo = {},
      provider = 'openai',
      model = 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 800,
      customPrompt = null
    } = await req.json();

    console.log('Generating track concept with params:', { 
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

    // Создаем промпт для генерации концепции
    const systemPrompt = customPrompt || `Ты музыкальный продюсер и креативный директор. Создай детальную концепцию для музыкального трека.

ЗАДАЧА: 
Проанализируй предоставленную информацию и создай всестороннюю концепцию трека, которая поможет в дальнейшем создании музыки и лирики.

ФОРМАТ ОТВЕТА:
Верни только JSON с полями:
{
  "title_suggestions": ["предложение 1", "предложение 2", "предложение 3"],
  "description": "подробное описание концепции трека",
  "mood_and_energy": "описание настроения и энергетики",
  "musical_elements": {
    "tempo": "быстрый/средний/медленный + BPM примерно",
    "key_signature": "предполагаемая тональность",
    "instruments": ["инструмент1", "инструмент2"],
    "vocal_style": "описание вокального стиля"
  },
  "lyrical_themes": ["тема1", "тема2", "тема3"],
  "target_audience": "описание целевой аудитории",
  "marketing_angle": "как позиционировать трек",
  "production_notes": "рекомендации для продакшена",
  "visual_concept": "идеи для клипа/обложки",
  "genre_analysis": "анализ соответствия жанрам",
  "artist_fit": "как трек подходит артисту"
}`;

    const userPrompt = `
СТИЛЬ И ПРОМПТ: ${stylePrompt}
ЖАНРЫ: ${genreTags.join(', ')}
${artistInfo.name ? `АРТИСТ: ${artistInfo.name}` : ''}
${artistInfo.description ? `ОПИСАНИЕ АРТИСТА: ${artistInfo.description}` : ''}
${projectInfo.title ? `ПРОЕКТ: ${projectInfo.title}` : ''}
${projectInfo.description ? `ОПИСАНИЕ ПРОЕКТА: ${projectInfo.description}` : ''}
${projectInfo.type ? `ТИП ПРОЕКТА: ${projectInfo.type}` : ''}

Создай концепцию трека, учитывая все эти данные. Убедись, что концепция соответствует стилю артиста и общей концепции проекта.
`;

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
      // HACK: Пытаемся извлечь JSON из ответа используя регулярку
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.log('Failed to parse JSON, using fallback format');
      // Если не удалось распарсить JSON, создаем базовую структуру
      result = {
        title_suggestions: ["Новый трек", "Без названия", "Концепция в разработке"],
        description: generatedText,
        mood_and_energy: "Требует дополнительного анализа",
        musical_elements: {
          tempo: "средний",
          key_signature: "не определена",
          instruments: genreTags,
          vocal_style: "стандартный"
        },
        lyrical_themes: genreTags,
        target_audience: "широкая аудитория",
        marketing_angle: "требует доработки",
        production_notes: "сгенерированный контент требует ревизии",
        visual_concept: "стандартная концепция",
        genre_analysis: `Соответствует жанрам: ${genreTags.join(', ')}`,
        artist_fit: "требует анализа соответствия артисту"
      };
    }

    // TODO: Добавить валидацию всех полей концепции
    // FIXME: Улучшить fallback логику для некорректного JSON

    return new Response(JSON.stringify({
      success: true,
      data: result,
      metadata: {
        provider,
        model,
        generatedAt: new Date().toISOString(),
        inputParams: { 
          stylePrompt, 
          genreTags, 
          hasArtistInfo: !!artistInfo.name,
          hasProjectInfo: !!projectInfo.title
        }
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-track-concept function:', error);
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