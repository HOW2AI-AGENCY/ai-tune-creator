import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Basic in-memory rate limiter (per function instance)
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 60; // 60 requests per window
const rateMap = new Map<string, { count: number; reset: number }>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateArtistInfoRequest {
  name: string;
  prompt?: string;
  context?: string;
  provider?: 'openai' | 'anthropic' | 'deepseek';
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface GeneratedArtistInfo {
  description: string;
  genre: string;
  location: string;
  background: string;
  style: string;
  influences: string[];
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
    const { 
      name, 
      prompt, 
      context, 
      provider = 'openai', 
      model, 
      temperature = 0.8, 
      maxTokens = 1000 
    }: GenerateArtistInfoRequest = await req.json();

    const providerConfig = AI_PROVIDERS[provider];
    if (!providerConfig) {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    const apiKey = Deno.env.get(providerConfig.keyEnv);
    if (!apiKey) {
      throw new Error(`${providerConfig.keyEnv} not configured`);
    }

    const selectedModel = model || providerConfig.defaultModel;

    if (!name) {
      throw new Error('Artist name is required');
    }

    const systemPrompt = `Ты помощник для создания концепций музыкальных проектов. Создай детальную концепцию проекта на основе описания.

Верни JSON объект с следующими полями:
- description: название и краткое описание проекта (2-3 предложения)
- genre: жанр музыки проекта
- location: не используй это поле
- background: детальная концепция и история проекта
- style: описание музыкального стиля проекта
- influences: массив тем или вдохновений для треков (3-5 элементов)

Отвечай только валидным JSON без дополнительного текста.`;

    const userPrompt = `Создай концепцию музыкального проекта на основе следующей информации:
${context ? `Контекст: ${context}` : ''}
${prompt ? `Описание проекта: ${prompt}` : `Проект: ${name}`}

Создай креативную и вдохновляющую концепцию проекта, которая будет полезна для создания музыки.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    let generatedContent: string;

    // Call appropriate AI provider
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

    let artistInfo: GeneratedArtistInfo;
    try {
      artistInfo = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse generated content:', generatedContent);
      throw new Error('Invalid response format from AI');
    }

    return new Response(JSON.stringify({ 
      artistInfo,
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
    console.error('Error in generate-artist-info function:', error);
    
    // Get provider from request if available
    let requestProvider = 'unknown';
    try {
      const { provider } = await req.clone().json();
      requestProvider = provider || 'unknown';
    } catch (e) {
      // Ignore error, use default
    }
    
    // Return detailed error information for debugging
    const errorResponse = {
      error: error.message || 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      provider: requestProvider,
      ...(Deno.env.get('DENO_ENV') === 'development' && { stack: error.stack })
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});