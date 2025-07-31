import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// AI Provider configurations
const AI_PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4.1-2025-04-14',
    key: 'OPENAI_API_KEY'
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-20250514',
    key: 'ANTHROPIC_API_KEY'
  },
  deepseek: {
    url: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    key: 'DEEPSEEK_API_KEY'
  }
};

async function callOpenAI(apiKey: string, model: string, prompt: string) {
  const response = await fetch(AI_PROVIDERS.openai.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Ты эксперт музыковед и продюсер. Анализируй музыкальные произведения профессионально.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(apiKey: string, model: string, prompt: string) {
  const response = await fetch(AI_PROVIDERS.anthropic.url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      messages: [
        { role: 'user', content: prompt }
      ],
      system: 'Ты эксперт музыковед и продюсер. Анализируй музыкальные произведения профессионально.',
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callDeepSeek(apiKey: string, model: string, prompt: string) {
  const response = await fetch(AI_PROVIDERS.deepseek.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'Ты эксперт музыковед и продюсер. Анализируй музыкальные произведения профессионально.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reference_title, reference_artist, analysis_type = 'full', provider = 'openai', model } = await req.json();

    if (!reference_title || !reference_artist) {
      return new Response(JSON.stringify({ error: 'Требуются название и артист референса' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Select AI provider and get API key
    const selectedProvider = AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS];
    if (!selectedProvider) {
      return new Response(JSON.stringify({ error: 'Неподдерживаемый провайдер ИИ' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get(selectedProvider.key);
    if (!apiKey) {
      return new Response(JSON.stringify({ error: `API ключ для ${provider} не настроен` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enhanced prompt for music analysis
    const analysisPrompt = `
Проанализируй музыкальное произведение "${reference_title}" исполнителя "${reference_artist}".

Проведи детальный музыковедческий анализ по следующим параметрам:

**СТРУКТУРНЫЕ ЭЛЕМЕНТЫ:**
- Форма композиции (куплет-припев, AABA, рондо и т.д.)
- Размер и темп (BPM)
- Тональность и гармонические прогрессии
- Ритмические паттерны и грув

**ЗВУКОВАЯ ПАЛИТРА:**
- Инструментальный состав
- Звукозапись и микширование
- Использование эффектов и обработок
- Пространственные характеристики (реверб, дилэй)

**МЕЛОДИЧЕСКИЕ И ГАРМОНИЧЕСКИЕ ОСОБЕННОСТИ:**
- Мелодические ходы и фразировка
- Вокальный стиль (если есть)
- Аккордовые прогрессии
- Модуляции и тональные сдвиги

**ЖАНРОВЫЕ И СТИЛИСТИЧЕСКИЕ ХАРАКТЕРИСТИКИ:**
- Основной жанр и поджанры
- Влияния других стилей
- Эпоха и региональные особенности
- Уникальные элементы

**ПРОДАКШН И АРАНЖИРОВКА:**
- Особенности продакшена
- Динамика и драматургия
- Переходы между частями
- Использование пауз и акцентов

**ЭМОЦИОНАЛЬНОЕ ВОЗДЕЙСТВИЕ:**
- Настроение и атмосфера
- Энергетика произведения
- Психоакустические особенности

**РЕКОМЕНДАЦИИ ДЛЯ ВДОХНОВЕНИЯ:**
- Ключевые элементы для заимствования
- Способы адаптации стиля
- Современные интерпретации
- Технические приемы для повторения

Ответ должен быть структурированным, профессиональным и содержать конкретные музыкальные термины.
Формат ответа: JSON со всеми указанными разделами.
`;

    let analysisResult: string;
    const selectedModel = model || selectedProvider.model;

    switch (provider) {
      case 'openai':
        analysisResult = await callOpenAI(apiKey, selectedModel, analysisPrompt);
        break;
      case 'anthropic':
        analysisResult = await callAnthropic(apiKey, selectedModel, analysisPrompt);
        break;
      case 'deepseek':
        analysisResult = await callDeepSeek(apiKey, selectedModel, analysisPrompt);
        break;
      default:
        throw new Error('Неподдерживаемый провайдер');
    }

    // Parse the AI response
    let parsedAnalysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = analysisResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedAnalysis = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, structure the text response
        parsedAnalysis = {
          raw_analysis: analysisResult,
          structure: { form: "Не определено", tempo: "Не определено" },
          sound_palette: { instruments: "Не определено", effects: "Не определено" },
          melodic_elements: { style: "Не определено", progressions: "Не определено" },
          genre_characteristics: { main_genre: "Не определено", influences: "Не определено" },
          production: { style: "Не определено", dynamics: "Не определено" },
          emotional_impact: { mood: "Не определено", energy: "Не определено" },
          recommendations: { key_elements: "Не определено", adaptation_methods: "Не определено" }
        };
      }
    } catch (parseError) {
      console.error('Ошибка парсинга ответа ИИ:', parseError);
      parsedAnalysis = {
        raw_analysis: analysisResult,
        error: 'Не удалось структурировать ответ'
      };
    }

    const response = {
      reference_title,
      reference_artist,
      analysis: parsedAnalysis,
      analysis_type,
      provider,
      model: selectedModel,
      timestamp: new Date().toISOString()
    };

    console.log('Анализ референса завершен:', { reference_title, reference_artist, provider });

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Ошибка в analyze-reference function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});