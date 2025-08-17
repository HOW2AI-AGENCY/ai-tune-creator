import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// Basic in-memory rate limiter (per function instance)
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 60; // 60 requests per window
const rateMap = new Map<string, { count: number; reset: number }>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Improve lyrics function called');
  
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
    return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } else {
    rl.count++;
  }

  try {
    const { 
      lyrics, 
      analysis, 
      stylePrompt, 
      genreTags,
      provider = 'openai',
      model = 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 2000
    } = await req.json();

    console.log('Improving lyrics with params:', { 
      lyricsLength: lyrics?.length || 0, 
      provider, 
      model,
      hasAnalysis: !!analysis 
    });

    if (!lyrics) {
      throw new Error('Лирика не предоставлена');
    }

    if (!analysis) {
      throw new Error('Анализ не предоставлен');
    }

    // Формируем детальные рекомендации из анализа
    const recommendations = [];
    
    // Собираем все рекомендации экспертов
    analysis.expert_analyses?.forEach((expert: any) => {
      if (expert.recommendations) {
        recommendations.push(...expert.recommendations);
      }
      if (expert.weaknesses) {
        recommendations.push(...expert.weaknesses.map((w: string) => `Исправить: ${w}`));
      }
    });

    // Добавляем приоритетные улучшения
    if (analysis.summary?.priority_improvements) {
      recommendations.push(...analysis.summary.priority_improvements);
    }

    // Добавляем быстрые исправления
    if (analysis.summary?.quick_fixes) {
      recommendations.push(...analysis.summary.quick_fixes);
    }

    // Добавляем конкретные предложения по строкам
    if (analysis.improvement_suggestions?.specific_lines) {
      analysis.improvement_suggestions.specific_lines.forEach((suggestion: any) => {
        recommendations.push(`Для строки "${suggestion.line}": ${suggestion.suggestion}`);
      });
    }

    const systemPrompt = `Ты - опытный автор-песенник и литературный редактор. Твоя задача - улучшить предоставленную лирику на основе экспертного анализа и рекомендаций.

СТИЛЬ: ${stylePrompt || 'Универсальный'}
ЖАНРЫ: ${genreTags?.join(', ') || 'Не указано'}

РЕКОМЕНДАЦИИ ДЛЯ УЛУЧШЕНИЯ:
${recommendations.join('\n- ')}

ПРАВИЛА УЛУЧШЕНИЯ:
1. Сохрани общую структуру и концепцию песни
2. Улучши рифмы, сделай их более качественными и соответствующими стилю
3. Исправь ритмические неточности, обеспечь естественность ударений
4. Усиль образность и метафоричность языка
5. Убери банальные фразы и клише
6. Сделай текст более запоминающимся и цепляющим
7. Обеспечь соответствие жанру и стилю
8. Сохрани эмоциональное воздействие оригинала

ВАЖНО: Верни ТОЛЬКО улучшенную лирику в читаемом формате с английскими тегами в квадратных скобках.
НЕ используй JSON! Формат: [TAG] затем текст, каждая секция с новой строки.

Пример правильного формата:
[INTRO]
текст интро

[VERSE 1]
строка 1
строка 2
строка 3
строка 4

[CHORUS]
припев
...`;

    const userPrompt = `Улучши эту лирику согласно рекомендациям:

${lyrics}`;

    let apiUrl = '';
    let requestBody = {};
    let headers = {};

    if (provider === 'openai') {
      apiUrl = 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      };
      requestBody = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: temperature,
        max_tokens: maxTokens,
      };
    } else {
      throw new Error(`Провайдер ${provider} пока не поддерживается для улучшения лирики`);
    }

    console.log('Making API request to:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`API Error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('API Response received');

    let improvedLyrics = '';

    if (provider === 'openai') {
      improvedLyrics = data.choices?.[0]?.message?.content;
    }

    if (!improvedLyrics) {
      throw new Error('Не удалось получить улучшенную лирику от API');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          improved_lyrics: improvedLyrics.trim(),
          applied_recommendations: recommendations.length,
          original_score: analysis.overall_score
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in improve-lyrics function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Произошла ошибка при улучшении лирики' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});