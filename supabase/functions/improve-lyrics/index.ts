import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Improve lyrics function called');
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

ВАЖНО: Верни ТОЛЬКО улучшенную лирику в том же формате, что и оригинал. Не добавляй комментарии или объяснения.`;

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