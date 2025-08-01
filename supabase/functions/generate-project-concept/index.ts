import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateProjectRequest {
  artistName: string;
  artistInfo?: string;
  projectIdea: string;
  projectType: 'album' | 'single' | 'ep';
  additionalContext?: string;
  provider?: 'openai' | 'anthropic' | 'deepseek';
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface GeneratedProjectConcept {
  title: string;
  description: string;
  concept: string;
  genre: string;
  mood: string;
  target_audience: string;
  suggested_tracks: string[];
  marketing_angle: string;
}

// AI Provider configurations
const AI_PROVIDERS = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    keyEnv: 'OPENAI_API_KEY'
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-haiku-20240307',
    keyEnv: 'ANTHROPIC_API_KEY'
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
    keyEnv: 'DEEPSEEK_API_KEY'
  }
};

async function callOpenAI(apiKey: string, model: string, messages: any[], temperature: number, maxTokens: number) {
  const response = await fetch(AI_PROVIDERS.openai.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('OpenAI API error:', errorData);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(apiKey: string, model: string, messages: any[], temperature: number, maxTokens: number) {
  const systemMessage = messages.find(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch(AI_PROVIDERS.anthropic.url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemMessage?.content || '',
      messages: userMessages,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Anthropic API error:', errorData);
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

async function callDeepseek(apiKey: string, model: string, messages: any[], temperature: number, maxTokens: number) {
  const response = await fetch(AI_PROVIDERS.deepseek.url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('DeepSeek API error:', errorData);
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      artistName,
      artistInfo,
      projectIdea,
      projectType,
      additionalContext,
      provider = 'openai', 
      model, 
      temperature = 0.8, 
      maxTokens = 1500
    }: GenerateProjectRequest = await req.json();

    const providerConfig = AI_PROVIDERS[provider];
    if (!providerConfig) {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    const apiKey = Deno.env.get(providerConfig.keyEnv);
    if (!apiKey) {
      throw new Error(`${providerConfig.keyEnv} not configured`);
    }

    const selectedModel = model || providerConfig.defaultModel;

    if (!artistName || !projectIdea) {
      throw new Error('Artist name and project idea are required');
    }

    const projectTypeRu = {
      'album': 'альбом',
      'single': 'сингл', 
      'ep': 'EP'
    }[projectType] || projectType;

    const systemPrompt = `Ты профессиональный музыкальный продюсер и A&R менеджер с многолетним опытом в музыкальной индустрии. 
Твоя задача - создавать детальные концепции музыкальных проектов, которые будут коммерчески успешными и артистически ценными.

Анализируй музыкальные тренды, жанровые особенности, и создавай концепции с учетом:
- Современных звуковых технологий и продакшен-техник
- Психоакустики и эмоционального воздействия музыки
- Маркетингового позиционирования в стриминговых сервисах
- Кросс-культурного потенциала и глобальных трендов
- Технических требований для различных платформ (TikTok, Spotify, радио)

ОБЯЗАТЕЛЬНО используй профессиональную музыкальную терминологию:
- BPM, тональности, аккордовые прогрессии
- Описания тембров, текстур, пространственных характеристик
- Жанровые микс-техники и гибридные стили
- Современные продакшен-приемы (sidechain, pitch-shifting, granular synthesis)

Верни JSON объект с следующими полями:
- title: креативное название проекта
- description: краткое описание проекта с техническими деталями (2-3 предложения)
- concept: подробная концепция с музыкальными терминами и техническими аспектами
- genre: основной жанр с поджанрами и фьюжн-элементами
- mood: настроение с BPM диапазоном и тональными характеристиками
- target_audience: целевая аудитория с демографическими и психографическими данными
- suggested_tracks: массив названий треков с техническими пометками (для альбома 8-12, для EP 4-6, для сингла 1-2)
- marketing_angle: маркетинговый подход с фокусом на музыкальные особенности и платформы

Отвечай только валидным JSON без дополнительного текста.`;

    const userPrompt = `Создай концепцию для ${projectTypeRu} проекта:

АРТИСТ: ${artistName}
${artistInfo ? `ИНФОРМАЦИЯ ОБ АРТИСТЕ: ${artistInfo}` : ''}

ИДЕЯ ПРОЕКТА: ${projectIdea}

ТИП: ${projectTypeRu}
${additionalContext ? `ДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ: ${additionalContext}` : ''}

Создай уникальную и вдохновляющую концепцию, которая соответствует стилю артиста и заданной идее.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    let generatedContent: string;

    switch (provider) {
      case 'openai':
        generatedContent = await callOpenAI(apiKey, selectedModel, messages, temperature, maxTokens);
        break;
      case 'anthropic':
        generatedContent = await callAnthropic(apiKey, selectedModel, messages, temperature, maxTokens);
        break;
      case 'deepseek':
        generatedContent = await callDeepseek(apiKey, selectedModel, messages, temperature, maxTokens);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    console.log('Generated content:', generatedContent);

    let projectConcept: GeneratedProjectConcept;
    try {
      // Remove markdown code blocks if present
      const cleanContent = generatedContent
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      
      projectConcept = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse generated content:', generatedContent);
      throw new Error('Invalid response format from AI');
    }

    return new Response(JSON.stringify({ 
      projectConcept,
      metadata: {
        provider,
        model: selectedModel,
        temperature,
        maxTokens,
        generatedAt: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-project-concept function:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});