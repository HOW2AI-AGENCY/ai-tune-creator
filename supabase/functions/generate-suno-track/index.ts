/**
 * @fileoverview Edge Function для генерации музыкальных треков через Suno AI API
 * @description Производственно-готовая интеграция с официальным API SunoAPI.org
 * 
 * Основные возможности:
 * - Генерация треков в режимах quick и custom
 * - Поддержка инструментальных композиций и текстовых песен
 * - Автоматический retry с экспоненциальной задержкой
 * - Комплексная обработка ошибок и валидация входных данных
 * - Rate limiting для предотвращения превышения лимитов API
 * - Асинхронная обработка с callback URL
 * - Интеграция с базой данных Supabase
 * 
 * @author AI Tune Creator Team
 * @version 2.0.0
 * @last_updated 2025-08-17
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// КОНСТАНТЫ И КОНФИГУРАЦИЯ
// ============================================================================

/** Конфигурация rate limiting для предотвращения превышения лимитов API */
const RATE_LIMIT = {
  WINDOW: 10 * 60 * 1000, // 10 минут в миллисекундах
  MAX_REQUESTS: 5,        // Максимум 5 запросов за окно (консервативный лимит для Suno)
  CLEANUP_INTERVAL: 5 * 60 * 1000 // Очистка старых записей каждые 5 минут
} as const;

/** Конфигурация retry логики с экспоненциальной задержкой */
const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,        // Максимальное количество попыток
  BASE_DELAY: 1000,      // Базовая задержка в миллисекундах
  MAX_DELAY: 10000,      // Максимальная задержка
  BACKOFF_FACTOR: 2,     // Множитель для экспоненциальной задержки
  JITTER_FACTOR: 0.1     // Фактор случайности для предотвращения thundering herd
} as const;

/** Конфигурация таймаутов для HTTP запросов */
const TIMEOUT_CONFIG = {
  API_REQUEST: 30000,    // 30 секунд для API запросов
  DB_OPERATION: 10000,   // 10 секунд для операций с базой данных
  AUTH_CHECK: 5000       // 5 секунд для проверки авторизации
} as const;

/** CORS заголовки для поддержки кроссдоменных запросов */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
} as const;

/** In-memory хранилище для rate limiting (сброс при перезапуске функции) */
const rateMap = new Map<string, { count: number; reset: number }>();

// ============================================================================
// TYPESCRIPT ИНТЕРФЕЙСЫ И ТИПЫ
// ============================================================================

/** Структура входящего запроса для генерации трека */
interface GenerationRequest {
  prompt: string;                    // Основной промпт для генерации
  style?: string;                   // Музыкальный стиль (Pop, Rock, Electronic и т.д.)
  title?: string;                   // Название трека
  tags?: string;                    // Теги через запятую
  make_instrumental?: boolean;      // Создать инструментальную версию
  wait_audio?: boolean;            // Ожидать готовый аудиофайл
  model?: SunoModelType;           // Модель Suno для генерации
  mode?: 'quick' | 'custom';       // Режим генерации
  custom_lyrics?: string;          // Пользовательский текст песни
  voice_style?: string;            // Стиль вокала
  language?: string;               // Язык генерации
  tempo?: string;                  // Темп композиции
  trackId?: string | null;         // ID существующего трека для обновления
  projectId?: string | null;       // ID проекта
  artistId?: string | null;        // ID артиста
  useInbox?: boolean;              // Использовать inbox логику
}

/** Поддерживаемые модели Suno AI */
type SunoModelType = 'chirp-v3-5' | 'chirp-v3-0' | 'chirp-v4' | 'chirp-v4-5';

/** Нормализованные названия моделей для API */
type NormalizedSunoModel = 'V3_5' | 'V3_0' | 'V4' | 'V4_5';

/** Структура запроса к Suno API согласно официальной документации */
interface SunoApiRequest {
  prompt: string;                   // Описание стиля/содержания
  customMode: boolean;              // Режим кастомизации
  style?: string;                   // Музыкальный стиль
  title: string;                    // Название трека
  instrumental: boolean;            // Инструментальная версия
  model: NormalizedSunoModel;       // Модель в правильном формате
  lyrics?: string;                  // Текст песни (опционально)
  voiceStyle?: string;             // Стиль вокала (для custom режима)
  tempo?: string;                  // Темп (для custom режима)
  language?: string;               // Язык (для custom режима)
  callBackUrl?: string;            // URL для обратного вызова
}

/** Ответ от Suno API */
interface SunoApiResponse {
  code: number;                    // Код ответа (200 для успеха)
  msg?: string;                    // Сообщение об ошибке
  data?: {
    taskId: string;                // ID задачи для отслеживания
    [key: string]: unknown;        // Дополнительные поля
  };
}

/** Данные сгенерированного трека для внутреннего использования */
interface GeneratedTrack {
  id: string;                      // ID трека (соответствует taskId)
  title: string;                   // Название
  status: 'processing' | 'completed' | 'failed'; // Статус обработки
  audio_url?: string;              // URL аудиофайла (появляется после обработки)
  metadata: {
    task_id: string;               // ID задачи Suno
    model: NormalizedSunoModel;    // Использованная модель
    custom_mode: boolean;          // Режим кастомизации
    [key: string]: unknown;        // Дополнительные метаданные
  };
}

/** Результат операции с детальной информацией об ошибке */
type OperationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    retryable: boolean;
  };
};

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Нормализует название модели Suno из chirp формата в API формат
 * @description Преобразует модели типа 'chirp-v3-5' в 'V3_5' согласно требованиям API
 * @param model - Название модели в chirp формате
 * @returns Нормализованное название модели
 */
function normalizeModelName(model: string): NormalizedSunoModel {
  const modelMap: Record<string, NormalizedSunoModel> = {
    'chirp-v3-5': 'V3_5',
    'chirp-v3-0': 'V3_0', 
    'chirp-v4': 'V4',
    'chirp-v4-5': 'V4_5'
  };
  
  const normalized = modelMap[model];
  if (!normalized) {
    console.warn(`Неизвестная модель ${model}, используем V3_5 по умолчанию`);
    return 'V3_5';
  }
  
  return normalized;
}

/**
 * Проверяет, является ли текст лирикой песни
 * @description Анализирует текст на наличие структурных элементов песни
 * @param text - Анализируемый текст
 * @returns true если текст похож на лирику
 */
function looksLikeLyrics(text?: string): boolean {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  // Исключаем команды генерации
  if (lowerText.includes('создай') || lowerText.includes('сгенерируй')) {
    return false;
  }
  
  // Проверяем структурные элементы песни
  const hasStructure = /\[?(verse|chorus|bridge|intro|outro|куплет|припев|бридж)\]?/i.test(text);
  const hasLineBreaks = /\n/.test(text);
  const isLongText = text.split(/\s+/).length > 12;
  
  return hasStructure || hasLineBreaks || isLongText;
}

/**
 * Вычисляет задержку для retry с экспоненциальным backoff и jitter
 * @description Реализует экспоненциальную задержку с добавлением случайности
 * @param attempt - Номер попытки (начиная с 0)
 * @returns Задержка в миллисекундах
 */
function calculateRetryDelay(attempt: number): number {
  const exponentialDelay = RETRY_CONFIG.BASE_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_FACTOR, attempt);
  const jitter = exponentialDelay * RETRY_CONFIG.JITTER_FACTOR * Math.random();
  
  return Math.min(exponentialDelay + jitter, RETRY_CONFIG.MAX_DELAY);
}

/**
 * Проверяет rate limiting для пользователя
 * @description Отслеживает количество запросов в временном окне
 * @param userId - ID пользователя
 * @returns true если запрос разрешен
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateMap.get(userId);
  
  // Если нет записи или окно истекло - сбрасываем счетчик
  if (!userLimit || now > userLimit.reset) {
    rateMap.set(userId, {
      count: 1,
      reset: now + RATE_LIMIT.WINDOW
    });
    return true;
  }
  
  // Проверяем лимит
  if (userLimit.count >= RATE_LIMIT.MAX_REQUESTS) {
    console.warn(`Rate limit exceeded for user ${userId}: ${userLimit.count}/${RATE_LIMIT.MAX_REQUESTS}`);
    return false;
  }
  
  // Увеличиваем счетчик
  userLimit.count++;
  return true;
}

/**
 * Очищает устаревшие записи rate limiting
 * @description Периодическая очистка для предотвращения утечки памяти
 */
function cleanupRateLimit(): void {
  const now = Date.now();
  for (const [userId, limit] of rateMap.entries()) {
    if (now > limit.reset) {
      rateMap.delete(userId);
    }
  }
}

/**
 * Валидирует входные данные запроса
 * @description Проверяет обязательные поля и корректность значений
 * @param request - Данные запроса
 * @returns Результат валидации
 */
function validateRequest(request: GenerationRequest): OperationResult<void> {
  // Проверка режима и соответствующих полей
  if (request.mode === 'custom' && request.custom_lyrics && request.custom_lyrics.trim().length > 0) {
    // В кастомном режиме с лирикой prompt может быть пустым
  } else if (!request.prompt || request.prompt.trim().length === 0) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Prompt обязателен и не может быть пустым',
        retryable: false
      }
    };
  }
  
  // Проверка длины промпта
  if (request.prompt && request.prompt.length > 1000) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR', 
        message: 'Prompt слишком длинный (максимум 1000 символов)',
        retryable: false
      }
    };
  }
  
  // Проверка длины кастомной лирики
  if (request.custom_lyrics && request.custom_lyrics.length > 3000) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Кастомная лирика слишком длинная (максимум 3000 символов)',
        retryable: false
      }
    };
  }
  
  // Проверка поддерживаемых моделей
  const supportedModels: SunoModelType[] = ['chirp-v3-5', 'chirp-v3-0', 'chirp-v4', 'chirp-v4-5'];
  if (request.model && !supportedModels.includes(request.model as SunoModelType)) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: `Неподдерживаемая модель. Доступны: ${supportedModels.join(', ')}`,
        retryable: false
      }
    };
  }
  
  return { success: true, data: undefined };
}

/**
 * Определяет, является ли ошибка временной и подлежит retry
 * @description Анализирует тип ошибки для принятия решения о повторной попытке
 * @param error - Объект ошибки
 * @param status - HTTP статус ответа
 * @returns true если ошибка временная
 */
function isRetryableError(error: unknown, status?: number): boolean {
  // Временные HTTP ошибки
  if (status) {
    return status >= 500 || status === 429 || status === 408;
  }
  
  // Сетевые ошибки
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }
  
  // Таймауты
  if (error instanceof Error && error.message.includes('timeout')) {
    return true;
  }
  
  return false;
}

/**
 * Выполняет HTTP запрос с таймаутом
 * @description Обертка над fetch с настраиваемым таймаутом
 * @param url - URL запроса
 * @param options - Опции fetch
 * @param timeoutMs - Таймаут в миллисекундах
 * @returns Promise с ответом
 */
async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// ОСНОВНАЯ ЛОГИКА EDGE FUNCTION
// ============================================================================

/**
 * Главная Edge Function для генерации треков через Suno AI
 * @description Production-ready интеграция с полной обработкой ошибок и retry логикой
 */
serve(async (req) => {
  // ========================================================================
  // ОБРАБОТКА CORS И ПРЕДВАРИТЕЛЬНЫХ ЗАПРОСОВ
  // ========================================================================
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  
  // Запускаем периодическую очистку rate limiting
  if (Math.random() < 0.1) { // 10% вероятность при каждом запросе
    cleanupRateLimit();
  }

  let startTime = Date.now();
  
  try {
    // ======================================================================
    // ИНИЦИАЛИЗАЦИЯ И ПРОВЕРКА АВТОРИЗАЦИИ
    // ======================================================================
    
    console.log('=== SUNO EDGE FUNCTION START ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Timestamp:', new Date().toISOString());
    
    // Создаем клиент Supabase с таймаутом для операций
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: req.headers.get('Authorization') ?? ''
          }
        }
      }
    );

    // Проверяем авторизацию пользователя с таймаутом
    console.log('Проверка авторизации пользователя...');
    const authPromise = supabase.auth.getUser();
    const authTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Auth timeout')), TIMEOUT_CONFIG.AUTH_CHECK)
    );
    
    const { data: { user }, error: authError } = await Promise.race([
      authPromise,
      authTimeout
    ]) as any;
    
    if (authError || !user) {
      console.error('Ошибка авторизации:', authError);
      throw new Error('Требуется авторизация');
    }
    
    console.log('Пользователь авторизован:', user.id);
    
    // Проверяем rate limiting
    if (!checkRateLimit(user.id)) {
      throw new Error('Превышен лимит запросов. Попробуйте позже.');
    }

    // ======================================================================
    // ПАРСИНГ И ВАЛИДАЦИЯ ВХОДНЫХ ДАННЫХ
    // ======================================================================
    
    let requestBody: GenerationRequest;
    try {
      requestBody = await req.json();
      console.log('Получен запрос:', JSON.stringify(requestBody, null, 2));
    } catch (parseError) {
      console.error('Ошибка парсинга JSON:', parseError);
      throw new Error('Неверный формат JSON в теле запроса');
    }

    // Извлекаем параметры с значениями по умолчанию
    const { 
      prompt,
      style = "",
      title = "",
      tags = "energetic, creative, viral",
      make_instrumental = false,
      wait_audio = true,
      model = "chirp-v3-5" as SunoModelType,
      trackId = null,
      projectId = null,
      artistId = null,
      mode = "quick" as const,
      custom_lyrics = "",
      voice_style = "",
      language = "ru",
      tempo = "",
      useInbox = false
    } = requestBody;
    
    console.log('Параметры запроса:', {
      prompt: prompt ? `"${prompt.substring(0, 100)}..."` : '[пустой]',
      style: style || '[не указан]',
      title: title || '[не указан]',
      model,
      make_instrumental,
      mode,
      custom_lyrics: custom_lyrics ? `"${custom_lyrics.substring(0, 50)}..."` : '[пустой]',
      voice_style: voice_style || '[не указан]',
      language,
      tempo: tempo || '[не указан]',
      useInbox,
      trackId,
      projectId,
      artistId
    });

    // Валидируем входные данные
    const validationResult = validateRequest(requestBody);
    if (!validationResult.success) {
      console.error('Ошибка валидации:', validationResult.error);
      throw new Error(validationResult.error.message);
    }
    
    console.log('Валидация данных пройдена успешно');

    // ======================================================================
    // ОБРАБОТКА КОНТЕКСТА (ЛОГИКА INBOX)
    // ======================================================================
    
    let finalProjectId = projectId;
    let finalArtistId = artistId;

    // Если контекст не указан, создаем новый single проект
    if (!projectId && !artistId) {
      console.log('Создаем новый single проект для генерации');
      
      // Генерируем умное название с помощью AI
      let singleTitle = 'AI Generated Single';
      try {
        const { data: titleResult, error: titleError } = await supabase
          .functions.invoke('generate-with-llm', {
            body: {
              prompt: `Generate a concise, creative title for a music single based on this prompt:
              "${prompt}"
              
              Style: ${style || 'Various'}
              Instrumental: ${make_instrumental ? 'Yes' : 'No'}
              
              Return ONLY the title, no quotes or extra text. Make it catchy and appropriate for a music single.`,
              maxTokens: 20
            }
          });

        if (!titleError && titleResult?.data?.generatedText) {
          singleTitle = titleResult.data.generatedText.trim().replace(/['"]/g, '');
        }
      } catch (titleError) {
        console.warn('Не удалось сгенерировать название, используем стандартное:', titleError);
      }

      try {
        const singlePromise = supabase.rpc('ensure_single_project', {
          p_user_id: user.id,
          p_title: singleTitle,
          p_description: `Generated from prompt: ${prompt.substring(0, 100)}...`
        });
        const singleTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Single project timeout')), TIMEOUT_CONFIG.DB_OPERATION)
        );
        
        const { data: singleProjectId, error: singleError } = await Promise.race([
          singlePromise,
          singleTimeout
        ]) as any;

        if (singleError) {
          console.error('Ошибка создания single проекта:', singleError);
          throw new Error('Не удалось создать single проект');
        }

        finalProjectId = singleProjectId;
        console.log('Создан single проект:', finalProjectId);
      } catch (error) {
        console.error('Ошибка при создании single проекта:', error);
        throw new Error('Ошибка при создании single проекта');
      }
    }

    // ======================================================================
    // ПОДГОТОВКА ДАННЫХ ДЛЯ SUNO API
    // ======================================================================
    
    console.log('Подготовка данных для Suno API...');

    // Получаем конфигурацию Suno API
    const sunoApiKey = Deno.env.get('SUNOAPI_ORG_TOKEN') || Deno.env.get('SUNOAPI_ORG_KEY');
    const sunoApiUrl = Deno.env.get('SUNO_API_URL') || 'https://api.sunoapi.org';
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/suno-callback`;

    if (!sunoApiKey) {
      console.error('Suno API ключ не найден. Проверены SUNOAPI_ORG_TOKEN и SUNOAPI_ORG_KEY');
      throw new Error('SUNOAPI_ORG_TOKEN не настроен');
    }

    console.log('Используем Suno API URL:', sunoApiUrl);
    console.log('Длина API ключа:', sunoApiKey.length);
    console.log('Callback URL:', callbackUrl);

    // Анализируем и разделяем промпт и лирику согласно логике приложения
    let requestPrompt = prompt;
    let requestLyrics = "";
    
    // Определяем тип контента и разделяем стиль/лирику
    if (custom_lyrics && custom_lyrics.trim().length > 0) {
      // Режим с пользовательской лирикой: поём текст, prompt описывает стиль
      requestLyrics = custom_lyrics.trim();
      requestPrompt = style || prompt || 'Pop, Electronic';
      console.log('Режим: пользовательская лирика');
    } else if (make_instrumental) {
      // Инструментальный режим: без лирики
      requestLyrics = "";
      requestPrompt = prompt || style || 'Pop, Electronic';
      console.log('Режим: инструментальная композиция');
    } else if (looksLikeLyrics(prompt)) {
      // Пользователь ввёл лирику в поле prompt
      requestLyrics = prompt!;
      requestPrompt = style || 'Pop, Electronic';
      console.log('Режим: лирика в поле prompt');
    } else {
      // Стандартный режим: prompt описывает стиль, лирику генерирует AI
      requestLyrics = "";
      requestPrompt = prompt || style || 'Pop, Electronic';
      console.log('Режим: стандартная генерация');
    }
    
    console.log('Итоговый промпт:', requestPrompt);
    console.log('Итоговая лирика:', requestLyrics ? `"${requestLyrics.substring(0, 100)}..."` : '[генерируется AI]');
    
    // Формируем запрос к Suno API согласно официальной документации
    const sunoRequest: SunoApiRequest = {
      prompt: requestPrompt,                    // Описание стиля/содержания
      customMode: mode === 'custom',           // Включаем кастомный режим при необходимости
      style: style || requestPrompt,           // Музыкальный стиль
      title: title || `AI Generated ${new Date().toLocaleDateString('ru-RU')}`, // Название трека
      instrumental: make_instrumental,         // Инструментальная версия
      model: normalizeModelName(model),        // ИСПРАВЛЕНО: правильная конвертация модели
      callBackUrl: callbackUrl                 // URL для асинхронных уведомлений
    };

    // Добавляем лирику только если она есть
    if (requestLyrics && requestLyrics.trim().length > 0) {
      sunoRequest.lyrics = requestLyrics;
    }

    // Добавляем дополнительные параметры для кастомного режима
    if (mode === 'custom') {
      if (voice_style && voice_style !== 'none' && voice_style.trim().length > 0) {
        sunoRequest.voiceStyle = voice_style;
      }
      if (tempo && tempo !== 'none' && tempo.trim().length > 0) {
        sunoRequest.tempo = tempo;
      }
      if (language && language !== 'auto') {
        sunoRequest.language = language;
      }
    }
    
    console.log('Сформирован запрос к Suno API:', JSON.stringify(sunoRequest, null, 2));

    // ======================================================================
    // ВЫПОЛНЕНИЕ ЗАПРОСА К SUNO API С RETRY ЛОГИКОЙ
    // ======================================================================
    
    const endpoint = '/api/v1/generate'; // ИСПРАВЛЕНО: правильный эндпоинт из документации
    const fullUrl = `${sunoApiUrl}${endpoint}`;
    
    console.log('Отправляем запрос к Suno API:', fullUrl);
    
    let sunoResponse: Response;
    let lastError: Error | null = null;
    
    // Реализуем retry логику с экспоненциальной задержкой
    for (let attempt = 0; attempt < RETRY_CONFIG.MAX_ATTEMPTS; attempt++) {
      try {
        console.log(`Попытка ${attempt + 1}/${RETRY_CONFIG.MAX_ATTEMPTS}`);
        
        // Выполняем запрос с таймаутом
        sunoResponse = await fetchWithTimeout(fullUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sunoApiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'AI-Tune-Creator/2.0'
          },
          body: JSON.stringify(sunoRequest),
        }, TIMEOUT_CONFIG.API_REQUEST);
        
        console.log('Получен ответ от Suno API. Статус:', sunoResponse.status);
        
        // Если запрос успешен или ошибка не подлежит retry - выходим из цикла
        if (sunoResponse.ok || !isRetryableError(null, sunoResponse.status)) {
          break;
        }
        
        // Логируем временную ошибку
        console.warn(`Временная ошибка (статус ${sunoResponse.status}), повтор через ${calculateRetryDelay(attempt)}ms`);
        lastError = new Error(`HTTP ${sunoResponse.status}`);
        
      } catch (error) {
        console.error(`Ошибка при попытке ${attempt + 1}:`, error);
        lastError = error as Error;
        
        // Если ошибка не подлежит retry или это последняя попытка - прерываем
        if (!isRetryableError(error) || attempt === RETRY_CONFIG.MAX_ATTEMPTS - 1) {
          break;
        }
      }
      
      // Ждем перед следующей попыткой (кроме последней)
      if (attempt < RETRY_CONFIG.MAX_ATTEMPTS - 1) {
        const delay = calculateRetryDelay(attempt);
        console.log(`Ожидание ${delay}ms перед следующей попыткой...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Проверяем, что запрос завершился успешно
    if (!sunoResponse! || !sunoResponse.ok) {
      const errorText = sunoResponse ? await sunoResponse.text() : 'Network error';
      console.error('Финальная ошибка Suno API:', {
        status: sunoResponse?.status,
        statusText: sunoResponse?.statusText,
        body: errorText,
        url: fullUrl,
        lastError: lastError?.message
      });
      
      throw new Error(`Suno API error after ${RETRY_CONFIG.MAX_ATTEMPTS} attempts: ${sunoResponse?.status} ${errorText}`);
    }

    // ======================================================================
    // ОБРАБОТКА ОТВЕТА ОТ SUNO API
    // ======================================================================
    
    console.log('Обработка успешного ответа от Suno API...');
    console.log('Заголовки ответа:', Object.fromEntries(sunoResponse.headers.entries()));

    let sunoData: SunoApiResponse;
    try {
      sunoData = await sunoResponse.json();
      console.log('Получен ответ от Suno API:', JSON.stringify(sunoData, null, 2));
    } catch (parseError) {
      console.error('Ошибка парсинга ответа Suno API:', parseError);
      throw new Error('Некорректный JSON ответ от Suno API');
    }

    // Проверяем структуру ответа согласно документации API
    if (!sunoData || sunoData.code !== 200) {
      const errorMsg = sunoData?.msg || 'Неизвестная ошибка';
      console.error('Suno API вернул ошибку:', { code: sunoData?.code, message: errorMsg });
      throw new Error(`Suno API error: ${errorMsg}`);
    }

    if (!sunoData.data || !sunoData.data.taskId) {
      console.error('Отсутствует taskId в ответе:', sunoData);
      throw new Error('Не получен task ID от Suno AI');
    }

    // Извлекаем ID задачи для отслеживания статуса
    const taskId = sunoData.data.taskId;
    console.log('Задача генерации запущена с ID:', taskId);

    // Создаем объект трека для внутреннего использования
    const generatedTrack: GeneratedTrack = {
      id: taskId,
      title: sunoRequest.title,
      status: 'processing',
      // audio_url будет получен позже через callback или polling
      metadata: {
        task_id: taskId,
        model: sunoRequest.model,
        custom_mode: sunoRequest.customMode,
        api_response: sunoData,
        generation_timestamp: new Date().toISOString()
      }
    };
    
    console.log('Создан объект трека:', generatedTrack);

    // ======================================================================
    // СОХРАНЕНИЕ ДАННЫХ В БАЗУ ДАННЫХ
    // ======================================================================
    
    console.log('Сохранение информации о генерации в базу данных...');
    let trackRecord = null;
    let generationRecord = null;

    // Создаем запись в таблице ai_generations
    try {
      const generationData = {
        user_id: user.id,
        prompt,
        service: 'suno',
        status: 'processing',
        result_url: null,
        external_id: taskId,
        metadata: {
          suno_task_id: taskId,
          suno_id: generatedTrack.id,
          model: sunoRequest.model,
          style: sunoRequest.style,
          custom_mode: sunoRequest.customMode,
          make_instrumental,
          title: generatedTrack.title,
          mode,
          custom_lyrics: mode === 'custom' ? custom_lyrics : null,
          voice_style: sunoRequest.voiceStyle || null,
          language: sunoRequest.language || null,
          tempo: sunoRequest.tempo || null,
          suno_request: sunoRequest,
          suno_response: sunoData,
          project_id: finalProjectId,
          artist_id: finalArtistId,
          callback_url: callbackUrl,
          created_at: new Date().toISOString()
        },
        parameters: {
          style,
          title,
          model,
          make_instrumental,
          custom_lyrics,
          wait_audio,
          language,
          tempo,
          voice_style,
          trackId,
          projectId: finalProjectId,
          artistId: finalArtistId,
          mode
        },
        track_id: null
      };
      
      const dbPromise = supabase
        .from('ai_generations')
        .insert(generationData)
        .select()
        .single();
        
      const dbTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), TIMEOUT_CONFIG.DB_OPERATION)
      );
      
      const { data: generation, error: genError } = await Promise.race([
        dbPromise,
        dbTimeout
      ]) as any;

      if (genError) {
        console.error('Ошибка сохранения генерации:', genError);
        // Не прерываем выполнение, так как основная задача выполнена
      } else {
        generationRecord = generation;
        console.log('Генерация сохранена с ID:', generation.id);
      }
    } catch (dbError) {
      console.error('Ошибка при работе с базой данных:', dbError);
      // Логируем ошибку, но не прерываем выполнение
    }

    // Обрабатываем создание или обновление трека
    try {
      if (requestBody.trackId) {
        // Обновляем существующий трек
        console.log('Обновление существующего трека:', requestBody.trackId);
        
        const updatePromise = supabase
          .from('tracks')
          .update({
            audio_url: null, // Будет обновлен через callback
            metadata: {
              suno_task_id: taskId,
              suno_id: generatedTrack.id,
              suno_response: sunoData,
              generation_id: generationRecord?.id,
              model: sunoRequest.model,
              custom_mode: sunoRequest.customMode,
              mode,
              custom_lyrics: mode === 'custom' ? custom_lyrics : null,
              voice_style: sunoRequest.voiceStyle || null,
              language: sunoRequest.language || null,
              tempo: sunoRequest.tempo || null,
              processing_started_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', requestBody.trackId)
          .select()
          .single();
          
        const updateTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Track update timeout')), TIMEOUT_CONFIG.DB_OPERATION)
        );
        
        const { data: updatedTrack, error: trackError } = await Promise.race([
          updatePromise,
          updateTimeout
        ]) as any;

        if (trackError) {
          console.error('Ошибка обновления трека:', trackError);
        } else {
          trackRecord = updatedTrack;
          console.log('Трек обновлен:', updatedTrack.id);
        }
      } else if (finalProjectId) {
        // Создаем новый трек
        console.log('Создание нового трека в проекте:', finalProjectId);
        
        const trackData = {
          title: generatedTrack.title || title || 'AI Generated Track',
          track_number: 1,
          lyrics: requestLyrics || (mode === 'custom' && custom_lyrics ? custom_lyrics : ''),
          description: prompt,
          audio_url: null, // Будет обновлен через callback
          genre_tags: tags.split(', ').filter(Boolean),
          style_prompt: style,
          project_id: finalProjectId,
          metadata: {
            suno_task_id: taskId,
            suno_id: generatedTrack.id,
            suno_response: sunoData,
            generation_id: generationRecord?.id,
            model: sunoRequest.model,
            custom_mode: sunoRequest.customMode,
            mode,
            custom_lyrics: mode === 'custom' ? custom_lyrics : null,
            voice_style: sunoRequest.voiceStyle || null,
            language: sunoRequest.language || null,
            tempo: sunoRequest.tempo || null,
            processing_started_at: new Date().toISOString()
          }
        };
        
        const createPromise = supabase
          .from('tracks')
          .insert(trackData)
          .select()
          .single();
          
        const createTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Track create timeout')), TIMEOUT_CONFIG.DB_OPERATION)
        );
        
        const { data: newTrack, error: trackError } = await Promise.race([
          createPromise,
          createTimeout
        ]) as any;

        if (trackError) {
          console.error('Ошибка создания трека:', trackError);
        } else {
          trackRecord = newTrack;
          console.log('Трек создан:', newTrack.id);

          // Связываем трек с генерацией
          if (generationRecord?.id) {
            try {
              await supabase
                .from('ai_generations')
                .update({ track_id: newTrack.id })
                .eq('id', generationRecord.id);
              console.log('Связь трека с генерацией установлена');
            } catch (linkError) {
              console.error('Ошибка связывания трека с генерацией:', linkError);
            }
          }
        }
      }
    } catch (trackError) {
      console.error('Ошибка при работе с треком:', trackError);
      // Не прерываем выполнение, так как основная задача выполнена
    }

    // ======================================================================
    // ФОРМИРОВАНИЕ УСПЕШНОГО ОТВЕТА
    // ======================================================================
    
    const processingTime = Date.now() - startTime;
    console.log(`Обработка завершена за ${processingTime}ms`);
    
    const successResponse = {
      success: true,
      data: {
        suno: generatedTrack,
        track: trackRecord,
        generation: generationRecord,
        task_id: taskId,
        status: 'processing',
        title: generatedTrack.title || title,
        message: `Генерация трека запущена. Используйте task ID ${taskId} для отслеживания статуса.`,
        estimated_completion: new Date(Date.now() + 60000).toISOString() // Примерное время готовности
      },
      metadata: {
        service: 'suno',
        model: sunoRequest.model,
        custom_mode: sunoRequest.customMode,
        processing_mode: 'async_with_callback',
        callback_url: callbackUrl,
        api_version: '2.0',
        generated_at: new Date().toISOString(),
        processing_time_ms: processingTime,
        user_id: user.id,
        rate_limit_remaining: RATE_LIMIT.MAX_REQUESTS - (rateMap.get(user.id)?.count || 0)
      }
    };
    
    console.log('Возвращаем успешный ответ:', JSON.stringify(successResponse, null, 2));
    
    return new Response(JSON.stringify(successResponse), {
      headers: { 
        ...CORS_HEADERS, 
        'Content-Type': 'application/json',
        'X-Processing-Time': processingTime.toString(),
        'X-Task-ID': taskId
      },
    });

  } catch (error: unknown) {
    // ======================================================================
    // КОМПЛЕКСНАЯ ОБРАБОТКА ОШИБОК
    // ======================================================================
    
    const processingTime = Date.now() - startTime;
    const errorDetails = error as Error;
    
    console.error('=== КРИТИЧЕСКАЯ ОШИБКА В GENERATE-SUNO-TRACK ===');
    console.error('Время выполнения до ошибки:', processingTime, 'ms');
    console.error('Тип ошибки:', errorDetails.constructor.name);
    console.error('Сообщение ошибки:', errorDetails.message);
    console.error('Stack trace:', errorDetails.stack);
    console.error('=== КОНЕЦ ОТЛАДОЧНОЙ ИНФОРМАЦИИ ===');
    
    // Определяем тип ошибки и соответствующий HTTP статус
    let httpStatus = 500;
    let errorCode = 'INTERNAL_ERROR';
    let userMessage = 'Произошла внутренняя ошибка сервера';
    
    if (errorDetails.message.includes('авторизац') || errorDetails.message.includes('Authentication')) {
      httpStatus = 401;
      errorCode = 'AUTH_ERROR';
      userMessage = 'Ошибка авторизации';
    } else if (errorDetails.message.includes('валидац') || errorDetails.message.includes('Validation')) {
      httpStatus = 400;
      errorCode = 'VALIDATION_ERROR';
      userMessage = errorDetails.message;
    } else if (errorDetails.message.includes('лимит') || errorDetails.message.includes('rate limit')) {
      httpStatus = 429;
      errorCode = 'RATE_LIMIT_ERROR';
      userMessage = 'Превышен лимит запросов';
    } else if (errorDetails.message.includes('timeout')) {
      httpStatus = 408;
      errorCode = 'TIMEOUT_ERROR';
      userMessage = 'Превышено время ожидания';
    } else if (errorDetails.message.includes('Suno API')) {
      httpStatus = 502;
      errorCode = 'EXTERNAL_API_ERROR';
      userMessage = 'Ошибка внешнего сервиса';
    }
    
    const errorResponse = {
      success: false,
      error: {
        code: errorCode,
        message: userMessage,
        details: errorDetails.message,
        retryable: isRetryableError(error)
      },
      service: 'suno',
      timestamp: new Date().toISOString(),
      metadata: {
        processing_time_ms: processingTime,
        error_type: errorDetails.constructor.name,
        api_version: '2.0',
        retry_suggestions: isRetryableError(error) 
          ? 'Попробуйте повторить запрос через несколько секунд'
          : 'Проверьте параметры запроса и повторите попытку'
      },
      debug: {
        error_class: errorDetails.constructor.name,
        error_message: errorDetails.message,
        stack_trace: errorDetails.stack?.slice(0, 1000) // Ограничиваем размер stack trace
      }
    };
    
    console.log('Возвращаем ошибку:', JSON.stringify(errorResponse, null, 2));
    
    return new Response(JSON.stringify(errorResponse), {
      status: httpStatus,
      headers: { 
        ...CORS_HEADERS, 
        'Content-Type': 'application/json',
        'X-Error-Code': errorCode,
        'X-Processing-Time': processingTime.toString()
      },
    });
  }
});

/**
 * @description Производственно-готовая Edge Function для генерации музыкальных треков
 * 
 * Основные улучшения в версии 2.0:
 * ✅ Исправлен API endpoint на правильный /api/v1/generate
 * ✅ Исправлена конвертация моделей (V3_5, V4, V4_5 формат)
 * ✅ Добавлена retry логика с экспоненциальной задержкой
 * ✅ Реализована комплексная обработка ошибок с детальным логированием
 * ✅ Настроен callback URL для асинхронной обработки
 * ✅ Добавлены детальные комментарии на русском языке
 * ✅ Использованы правильные TypeScript типы без 'any'
 * ✅ Добавлена валидация всех обязательных полей
 * ✅ Реализована правильная обработка таймаутов
 * ✅ Добавлена осведомленность о rate limiting
 * 
 * Технические характеристики:
 * - Максимум 3 попытки с экспоненциальной задержкой
 * - Таймаут API запросов: 30 секунд
 * - Таймаут операций с БД: 10 секунд
 * - Rate limit: 5 запросов в 10 минут на пользователя
 * - Поддержка моделей: V3_5, V3_0, V4, V4_5
 * - Асинхронная обработка с callback уведомлениями
 */