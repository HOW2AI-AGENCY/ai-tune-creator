import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LLMRequest {
  prompt: string;
  provider: 'openai' | 'anthropic' | 'groq' | 'deepseek' | 'gemini';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

const getAPIKey = (provider: string): string => {
  const keys = {
    openai: Deno.env.get('OPENAI_API_KEY'),
    anthropic: Deno.env.get('ANTHROPIC_API_KEY'), 
    groq: Deno.env.get('GROQ_API_KEY'),
    deepseek: Deno.env.get('DEEPSEEK_API_KEY'),
    gemini: Deno.env.get('GEMINI_API_KEY')
  };
  
  const key = keys[provider as keyof typeof keys];
  if (!key) {
    throw new Error(`API ключ для ${provider} не найден`);
  }
  return key;
};

const getDefaultModel = (provider: string): string => {
  const models = {
    openai: 'gpt-4.1-2025-04-14',
    anthropic: 'claude-sonnet-4-20250514',
    groq: 'llama-3.3-70b-versatile',
    deepseek: 'deepseek-chat',
    gemini: 'gemini-1.5-pro'
  };
  return models[provider as keyof typeof models] || 'gpt-4.1-2025-04-14';
};

const callOpenAI = async (request: LLMRequest, apiKey: string): Promise<LLMResponse> => {
  const model = request.model || getDefaultModel('openai');
  
  const messages = [];
  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt });
  }
  messages.push({ role: 'user', content: request.prompt });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_completion_tokens: request.maxTokens || 2000,
      ...(model.startsWith('gpt-4o') ? { temperature: request.temperature || 0.7 } : {})
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API ошибка: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    provider: 'openai',
    model,
    usage: {
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens
    }
  };
};

const callAnthropic = async (request: LLMRequest, apiKey: string): Promise<LLMResponse> => {
  const model = request.model || getDefaultModel('anthropic');
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: request.maxTokens || 2000,
      messages: [{ role: 'user', content: request.prompt }],
      ...(request.systemPrompt ? { system: request.systemPrompt } : {})
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API ошибка: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.content[0].text,
    provider: 'anthropic',
    model,
    usage: {
      promptTokens: data.usage?.input_tokens,
      completionTokens: data.usage?.output_tokens,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
    }
  };
};

const callGroq = async (request: LLMRequest, apiKey: string): Promise<LLMResponse> => {
  const model = request.model || getDefaultModel('groq');
  
  const messages = [];
  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt });
  }
  messages.push({ role: 'user', content: request.prompt });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: request.maxTokens || 2000,
      temperature: request.temperature || 0.7
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API ошибка: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    provider: 'groq',
    model,
    usage: {
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens
    }
  };
};

const callDeepSeek = async (request: LLMRequest, apiKey: string): Promise<LLMResponse> => {
  const model = request.model || getDefaultModel('deepseek');
  
  const messages = [];
  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt });
  }
  messages.push({ role: 'user', content: request.prompt });

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: request.maxTokens || 2000,
      temperature: request.temperature || 0.7
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DeepSeek API ошибка: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    provider: 'deepseek',
    model,
    usage: {
      promptTokens: data.usage?.prompt_tokens,
      completionTokens: data.usage?.completion_tokens,
      totalTokens: data.usage?.total_tokens
    }
  };
};

const callGemini = async (request: LLMRequest, apiKey: string): Promise<LLMResponse> => {
  const model = request.model || getDefaultModel('gemini');
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: request.systemPrompt ? `${request.systemPrompt}\n\n${request.prompt}` : request.prompt }]
      }],
      generationConfig: {
        maxOutputTokens: request.maxTokens || 2000,
        temperature: request.temperature || 0.7
      }
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API ошибка: ${error}`);
  }

  const data = await response.json();
  return {
    content: data.candidates[0].content.parts[0].text,
    provider: 'gemini',
    model,
    usage: {
      promptTokens: data.usageMetadata?.promptTokenCount,
      completionTokens: data.usageMetadata?.candidatesTokenCount,
      totalTokens: data.usageMetadata?.totalTokenCount
    }
  };
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Получен запрос к LLM функции');
    
    const requestData: LLMRequest = await req.json();
    console.log('Данные запроса:', { 
      provider: requestData.provider, 
      model: requestData.model,
      promptLength: requestData.prompt?.length 
    });

    const { prompt, provider, model, temperature, maxTokens, systemPrompt } = requestData;

    if (!prompt?.trim()) {
      throw new Error('Prompt обязателен');
    }

    if (!provider) {
      throw new Error('Provider обязателен');
    }

    const apiKey = getAPIKey(provider);
    console.log(`Используется ${provider} с API ключом длиной: ${apiKey.length}`);

    let result: LLMResponse;

    switch (provider) {
      case 'openai':
        result = await callOpenAI(requestData, apiKey);
        break;
      case 'anthropic':
        result = await callAnthropic(requestData, apiKey);
        break;
      case 'groq':
        result = await callGroq(requestData, apiKey);
        break;
      case 'deepseek':
        result = await callDeepSeek(requestData, apiKey);
        break;
      case 'gemini':
        result = await callGemini(requestData, apiKey);
        break;
      default:
        throw new Error(`Неподдерживаемый провайдер: ${provider}`);
    }

    console.log('LLM запрос выполнен успешно:', {
      provider: result.provider,
      model: result.model,
      contentLength: result.content?.length,
      usage: result.usage
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Ошибка в LLM функции:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Внутренняя ошибка сервера',
      provider: 'unknown'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});