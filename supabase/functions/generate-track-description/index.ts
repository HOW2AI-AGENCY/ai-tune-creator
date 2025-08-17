import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Edge Function для генерации коротких описаний треков
 * 
 * Этот Edge Function создает краткие, привлекательные описания для AI-генерируемых треков
 * на основе стиля, жанра и других музыкальных параметров.
 * 
 * @version 1.0.0
 * @author AI Music Platform Team
 */

// CORS заголовки для обеспечения кросс-доменных запросов
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Интерфейс для входящего запроса на генерацию описания
 */
interface DescriptionRequest {
  style?: string;          // Стиль музыки (pop, rock, electronic, etc.)
  genre?: string[];        // Жанры и теги
  mood?: string;           // Настроение (energetic, calm, dark, etc.)
  tempo?: string;          // Темп (fast, medium, slow)
  key?: string;            // Музыкальная тональность
  instruments?: string[];  // Инструменты
  provider?: string;       // AI провайдер (для настройки стиля генерации)
  model?: string;          // Модель AI
  temperature?: number;    // Творческость (0.0-1.0)
  maxTokens?: number;      // Максимальная длина описания
  language?: string;       // Язык описания (ru, en)
  trackTitle?: string;     // Название трека (если есть)
  artistInfo?: any;        // Информация об артисте для контекста
  projectInfo?: any;       // Информация о проекте для контекста
}

/**
 * Интерфейс для ответа с описанием
 */
interface DescriptionResponse {
  success: boolean;
  data?: {
    description: string;
    short_description: string;
    keywords: string[];
    mood_description: string;
    style_summary: string;
  };
  error?: string;
  metadata?: {
    provider: string;
    model: string;
    language: string;
    generatedAt: string;
    tokensUsed?: number;
  };
}

/**
 * Генерирует описание через OpenAI API
 * 
 * @param request - Параметры для генерации описания
 * @param apiKey - API ключ OpenAI
 * @returns Сгенерированное описание
 */
async function generateWithOpenAI(request: DescriptionRequest, apiKey: string): Promise<any> {
  const prompt = buildPrompt(request);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: request.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(request.language || 'ru')
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 200,
      response_format: { type: 'json_object' }
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }
  
  const data = await response.json();
  
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Пустой ответ от OpenAI');
  }
  
  try {
    const result = JSON.parse(data.choices[0].message.content);
    return {
      ...result,
      tokensUsed: data.usage?.total_tokens
    };
  } catch (error) {
    throw new Error('Ошибка парсинга JSON ответа от OpenAI');
  }
}

/**
 * Создает системный промпт для генерации описаний
 * 
 * @param language - Язык для генерации
 * @returns Системный промпт
 */
function getSystemPrompt(language: string): string {
  if (language === 'en') {
    return `You are a professional music curator and marketing expert specializing in AI-generated music.
    
Your task is to create compelling, concise track descriptions based on musical parameters.
The descriptions should be:
- Professional but accessible
- Emotionally engaging
- Suitable for music platforms and marketing
- 2-3 sentences maximum for main description
- Include technical details naturally

Always respond with valid JSON containing:
{
  "description": "Main track description (2-3 sentences)",
  "short_description": "One sentence summary",
  "keywords": ["relevant", "keywords", "array"],
  "mood_description": "Emotional/atmospheric description", 
  "style_summary": "Genre and style summary"
}`;
  }
  
  return `Ты - профессиональный музыкальный куратор и маркетинговый эксперт, специализирующийся на AI-генерируемой музыке.

Твоя задача - создавать привлекательные, краткие описания треков на основе музыкальных параметров.
Описания должны быть:
- Профессиональными, но доступными
- Эмоционально вовлекающими  
- Подходящими для музыкальных платформ и маркетинга
- Максимум 2-3 предложения для основного описания
- Естественно включать технические детали

Всегда отвечай в формате JSON:
{
  "description": "Основное описание трека (2-3 предложения)",
  "short_description": "Краткое описание одним предложением",
  "keywords": ["релевантные", "ключевые", "слова"],
  "mood_description": "Описание настроения и атмосферы",
  "style_summary": "Краткое описание жанра и стиля"
}`;
}

/**
 * Строит промпт для генерации описания на основе параметров трека
 * 
 * @param request - Параметры трека
 * @returns Сформированный промпт
 */
function buildPrompt(request: DescriptionRequest): string {
  const parts: string[] = [];
  
  if (request.trackTitle) {
    parts.push(`Название трека: "${request.trackTitle}"`);
  }
  
  if (request.style) {
    parts.push(`Стиль: ${request.style}`);
  }
  
  if (request.genre && request.genre.length > 0) {
    parts.push(`Жанры: ${request.genre.join(', ')}`);
  }
  
  if (request.mood) {
    parts.push(`Настроение: ${request.mood}`);
  }
  
  if (request.tempo) {
    parts.push(`Темп: ${request.tempo}`);
  }
  
  if (request.key) {
    parts.push(`Тональность: ${request.key}`);
  }
  
  if (request.instruments && request.instruments.length > 0) {
    parts.push(`Инструменты: ${request.instruments.join(', ')}`);
  }
  
  if (request.artistInfo?.name) {
    parts.push(`Артист: ${request.artistInfo.name}`);
  }
  
  if (request.projectInfo?.name) {
    parts.push(`Проект: ${request.projectInfo.name}`);
  }
  
  if (parts.length === 0) {
    parts.push('Универсальный AI-генерированный трек');
  }
  
  const basePrompt = `Создай привлекательное описание для музыкального трека с следующими характеристиками:\n\n${parts.join('\n')}`;
  
  return basePrompt + '\n\nОписание должно быть профессиональным, привлекательным и подходящим для музыкальных платформ.';
}

/**
 * Валидация входящего запроса
 * 
 * @param request - Объект запроса для валидации
 * @throws Error если валидация не пройдена
 */
function validateRequest(request: DescriptionRequest): void {
  // Проверяем, что есть хотя бы один параметр для описания
  const hasParameters = request.style || 
                       request.genre?.length || 
                       request.mood || 
                       request.trackTitle ||
                       request.artistInfo ||
                       request.projectInfo;
  
  if (!hasParameters) {
    throw new Error('Необходимо указать хотя бы один параметр для генерации описания');
  }
  
  // Проверяем диапазоны значений
  if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 1)) {
    throw new Error('Temperature должен быть между 0 и 1');
  }
  
  if (request.maxTokens !== undefined && (request.maxTokens < 50 || request.maxTokens > 1000)) {
    throw new Error('maxTokens должен быть между 50 и 1000');
  }
  
  // Проверяем поддерживаемые языки
  if (request.language && !['ru', 'en'].includes(request.language)) {
    throw new Error('Поддерживаемые языки: ru, en');
  }
}

/**
 * Создает fallback описание без использования AI
 * 
 * @param request - Параметры трека
 * @returns Базовое описание
 */
function createFallbackDescription(request: DescriptionRequest): any {
  const language = request.language || 'ru';
  
  if (language === 'en') {
    const style = request.style || 'AI-generated';
    const mood = request.mood || 'dynamic';
    
    return {
      description: `An engaging ${style} track with ${mood} energy, created using advanced AI technology. Perfect for modern listening experiences.`,
      short_description: `${style} track with ${mood} vibes`,
      keywords: [style, mood, 'AI-generated', 'modern'],
      mood_description: `${mood.charAt(0).toUpperCase() + mood.slice(1)} and engaging`,
      style_summary: `${style} with AI-enhanced production`
    };
  }
  
  const style = request.style || 'AI-генерированный';
  const mood = request.mood || 'динамичный';
  
  return {
    description: `Увлекательный ${style} трек с ${mood} энергетикой, созданный с использованием передовых технологий ИИ. Идеально подходит для современного прослушивания.`,
    short_description: `${style} трек с ${mood} атмосферой`,
    keywords: [style, mood, 'ИИ-генерация', 'современный'],
    mood_description: `${mood.charAt(0).toUpperCase() + mood.slice(1)} и захватывающий`,
    style_summary: `${style} с AI-улучшенным продакшеном`
  };
}

// ==========================================
// ОСНОВНАЯ ФУНКЦИЯ EDGE FUNCTION
// ==========================================

serve(async (req) => {
  // Обработка CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const startTime = Date.now();
  
  try {
    // Парсинг запроса
    let requestBody: DescriptionRequest;
    
    try {
      requestBody = await req.json();
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Невалидный JSON в теле запроса'
      } as DescriptionResponse), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Валидация запроса
    try {
      validateRequest(requestBody);
    } catch (error: any) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message
      } as DescriptionResponse), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('[TRACK-DESCRIPTION] Генерируем описание для:', {
      style: requestBody.style,
      genre: requestBody.genre,
      mood: requestBody.mood,
      provider: requestBody.provider || 'openai'
    });
    
    let result: any;
    let tokensUsed: number | undefined;
    
    // Пытаемся сгенерировать через AI
    const provider = requestBody.provider || 'openai';
    
    if (provider === 'openai') {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      
      if (openaiApiKey) {
        try {
          const aiResult = await generateWithOpenAI(requestBody, openaiApiKey);
          result = aiResult;
          tokensUsed = aiResult.tokensUsed;
          console.log('[TRACK-DESCRIPTION] Описание сгенерировано через OpenAI');
        } catch (error) {
          console.warn('[TRACK-DESCRIPTION] Ошибка OpenAI, используем fallback:', error);
          result = createFallbackDescription(requestBody);
        }
      } else {
        console.warn('[TRACK-DESCRIPTION] OpenAI API key не найден, используем fallback');
        result = createFallbackDescription(requestBody);
      }
    } else {
      // Для других провайдеров пока используем fallback
      console.log('[TRACK-DESCRIPTION] Неподдерживаемый провайдер, используем fallback');
      result = createFallbackDescription(requestBody);
    }
    
    const processingTime = Date.now() - startTime;
    
    // Формируем успешный ответ
    const response: DescriptionResponse = {
      success: true,
      data: {
        description: result.description,
        short_description: result.short_description,
        keywords: result.keywords || [],
        mood_description: result.mood_description,
        style_summary: result.style_summary
      },
      metadata: {
        provider: provider,
        model: requestBody.model || 'gpt-3.5-turbo',
        language: requestBody.language || 'ru',
        generatedAt: new Date().toISOString(),
        tokensUsed
      }
    };
    
    console.log(`[TRACK-DESCRIPTION] Описание успешно создано за ${processingTime}ms`);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error('[TRACK-DESCRIPTION] Глобальная ошибка:', {
      message: error.message,
      stack: error.stack,
      processingTime
    });
    
    const errorResponse: DescriptionResponse = {
      success: false,
      error: 'Внутренняя ошибка сервера при генерации описания',
      metadata: {
        provider: 'unknown',
        model: 'unknown', 
        language: 'ru',
        generatedAt: new Date().toISOString()
      }
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});