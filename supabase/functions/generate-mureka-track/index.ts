import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Mureka AI Track Generation Edge Function
 * 
 * Этот Edge Function обеспечивает интеграцию с Mureka AI API для генерации музыкальных треков.
 * Включает в себя полноценную обработку ошибок, retry логику, rate limiting и мониторинг.
 * 
 * @version 2.0.0
 * @author AI Music Platform Team
 */

// ==========================================
// КОНФИГУРАЦИЯ И КОНСТАНТЫ
// ==========================================

// CORS заголовки для обеспечения кросс-доменных запросов
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://zwbhlfhwymbmvioaikvs.supabase.co',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Конфигурация Rate Limiting
// Mureka имеет более высокие лимиты, чем Suno
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 минут
const RATE_LIMIT_MAX = 10; // 10 запросов на окно
const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000; // Очистка каждые 5 минут

// Конфигурация Retry логики
const MAX_RETRY_ATTEMPTS = 3; // Максимум 3 попытки
const INITIAL_RETRY_DELAY = 1000; // Начальная задержка 1 секунда
const MAX_RETRY_DELAY = 10000; // Максимальная задержка 10 секунд

// Конфигурация Polling для отслеживания статуса генерации
const POLLING_INTERVAL = 3000; // Проверка каждые 3 секунды
const MAX_POLLING_ATTEMPTS = 100; // Максимум 100 попыток (5 минут)

// Конфигурация Timeouts
const API_TIMEOUT = 30000; // 30 секунд для API вызовов
const DB_TIMEOUT = 10000; // 10 секунд для операций с БД
const AUTH_TIMEOUT = 5000; // 5 секунд для проверки аутентификации

// Поддерживаемые модели Mureka (UI -> API mapping)
// Обновлено 21.08.2025: V7 по умолчанию, старые модели перенаправляются на V7
const SUPPORTED_MODELS = ['auto', 'V7', 'O1', 'V6'] as const;
const MODEL_MAPPING: Record<string, string> = {
  'auto': 'V7', // Изменено: auto теперь по умолчанию V7
  'V7': 'mureka-7',
  'O1': 'mureka-7', // Изменено: устаревшие модели перенаправляются на V7
  'V6': 'mureka-7'  // Изменено: устаревшие модели перенаправляются на V7
};

// ==========================================
// ТИПЫ И ИНТЕРФЕЙСЫ
// ==========================================

/**
 * Интерфейс для входящего запроса на генерацию трека
 */
interface TrackGenerationRequest {
  prompt?: string;
  lyrics?: string;
  inputType?: 'description' | 'lyrics'; // Тип входного контента
  model?: typeof SUPPORTED_MODELS[number];
  style?: string;
  duration?: number;
  genre?: string;
  mood?: string;
  instruments?: string[];
  tempo?: string;
  key?: string;
  trackId?: string | null;
  projectId?: string | null;
  artistId?: string | null;
  title?: string;
  mode?: 'quick' | 'custom' | 'advanced';
  custom_lyrics?: string;
  instrumental?: boolean;
  language?: string;
  reference_id?: string | null;
  vocal_id?: string | null;
  melody_id?: string | null;
  stream?: boolean;
  useInbox?: boolean;
}

/**
 * Интерфейс для запроса к Mureka API
 */
interface MurekaAPIRequest {
  lyrics: string;
  model?: typeof SUPPORTED_MODELS[number];
  prompt?: string;
  reference_id?: string;
  vocal_id?: string;
  melody_id?: string;
  stream?: boolean;
}

/**
 * Интерфейс для ответа от Mureka API
 */
interface MurekaAPIResponse {
  id: string;
  created_at: number;
  finished_at?: number;
  model: string;
  status: 'preparing' | 'queued' | 'running' | 'streaming' | 'succeeded' | 'failed' | 'timeouted' | 'cancelled';
  failed_reason?: string;
  choices?: Array<{
    audio_url: string;
    duration: number;
    title?: string;
  }>;
}

/**
 * Интерфейс для rate limiting записи
 */
interface RateLimitEntry {
  count: number;
  reset: number;
  lastCleanup?: number;
}

// ==========================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И СОСТОЯНИЕ
// ==========================================

// Map для хранения rate limit данных по пользователям
// Использует in-memory хранилище для быстрого доступа
const rateLimitMap = new Map<string, RateLimitEntry>();

// Последняя очистка устаревших записей
let lastGlobalCleanup = Date.now();

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

/**
 * Очистка устаревших записей rate limiting для оптимизации памяти
 * Удаляет записи, срок действия которых истек
 */
function cleanupRateLimitMap(): void {
  const now = Date.now();
  
  // Выполняем глобальную очистку только раз в RATE_LIMIT_CLEANUP_INTERVAL
  if (now - lastGlobalCleanup < RATE_LIMIT_CLEANUP_INTERVAL) {
    return;
  }
  
  console.log(`[CLEANUP] Очистка rate limit map. Текущий размер: ${rateLimitMap.size}`);
  
  let cleaned = 0;
  for (const [userId, entry] of rateLimitMap.entries()) {
    if (now > entry.reset) {
      rateLimitMap.delete(userId);
      cleaned++;
    }
  }
  
  console.log(`[CLEANUP] Удалено ${cleaned} устаревших записей. Новый размер: ${rateLimitMap.size}`);
  lastGlobalCleanup = now;
}

/**
 * Проверка rate limit для пользователя
 * Возвращает true если лимит не превышен, false если превышен
 * 
 * @param userId - ID пользователя для проверки
 * @returns Объект с результатом проверки и временем до сброса
 */
function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  cleanupRateLimitMap();
  
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  
  if (!entry || now > entry.reset) {
    // Создаем новую запись или сбрасываем существующую
    rateLimitMap.set(userId, { 
      count: 1, 
      reset: now + RATE_LIMIT_WINDOW,
      lastCleanup: now 
    });
    return { allowed: true };
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    // Лимит превышен
    const retryAfter = Math.ceil((entry.reset - now) / 1000);
    console.log(`[RATE_LIMIT] Пользователь ${userId} превысил лимит. Retry after: ${retryAfter}s`);
    return { allowed: false, retryAfter };
  }
  
  // Увеличиваем счетчик
  entry.count++;
  return { allowed: true };
}

/**
 * Secure authentication verification using Supabase auth
 * SECURITY FIX: Replaces unsafe JWT parsing with proper verification
 * 
 * @param authHeader - Authorization header
 * @param supabase - Supabase client instance
 * @returns Verified user ID or throws error
 */
async function verifyAuthentication(authHeader: string | null, supabase: any): Promise<string> {
  if (!authHeader) {
    throw new Error('Authentication required');
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    if (error || !user) {
      console.error('[AUTH] Authentication failed:', error?.message);
      throw new Error('Invalid authentication token');
    }
    
    console.log('[AUTH] User verified:', user.id);
    return user.id;
  } catch (error) {
    console.error('[AUTH] Authentication error:', error);
    throw new Error('Authentication failed');
  }
}

/**
 * Определяет, является ли ошибка временной и можно ли повторить запрос
 * 
 * @param error - Объект ошибки или статус код
 * @returns true если ошибка временная
 */
function isRetryableError(error: any): boolean {
  // Статус коды, при которых имеет смысл повторить запрос
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  
  if (typeof error === 'number') {
    return retryableStatusCodes.includes(error);
  }
  
  if (error?.status) {
    return retryableStatusCodes.includes(error.status);
  }
  
  // Сетевые ошибки также считаем временными
  const errorMessage = error?.message?.toLowerCase() || '';
  return errorMessage.includes('network') || 
         errorMessage.includes('timeout') ||
         errorMessage.includes('fetch');
}

/**
 * Вычисляет задержку для retry с exponential backoff и jitter
 * 
 * @param attempt - Номер попытки (начиная с 0)
 * @returns Задержка в миллисекундах
 */
function calculateRetryDelay(attempt: number): number {
  // Exponential backoff: delay = min(initial * 2^attempt, maxDelay)
  const exponentialDelay = Math.min(
    INITIAL_RETRY_DELAY * Math.pow(2, attempt),
    MAX_RETRY_DELAY
  );
  
  // Добавляем jitter для предотвращения "thundering herd"
  const jitter = Math.random() * 0.3 * exponentialDelay;
  
  return Math.floor(exponentialDelay + jitter);
}

/**
 * Выполняет fetch запрос с timeout
 * 
 * @param url - URL для запроса
 * @param options - Опции fetch
 * @param timeout - Timeout в миллисекундах
 * @returns Response или ошибка timeout
 */
async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeout: number = API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Запрос превысил timeout в ${timeout}ms`);
    }
    
    throw error;
  }
}

/**
 * Валидация входящего запроса на генерацию
 * Проверяет обязательные поля и корректность данных
 * 
 * @param request - Объект запроса
 * @throws Error если валидация не пройдена
 */
function validateRequest(request: TrackGenerationRequest): void {
  // Проверка модели
  if (request.model && !SUPPORTED_MODELS.includes(request.model)) {
    throw new Error(`Неподдерживаемая модель: ${request.model}. Доступны: ${SUPPORTED_MODELS.join(', ')}`);
  }
  
  // Проверка длительности
  if (request.duration && (request.duration < 10 || request.duration > 480)) {
    throw new Error('Длительность должна быть от 10 до 480 секунд');
  }
  
  // Проверка режима
  if (request.mode && !['quick', 'custom', 'advanced'].includes(request.mode)) {
    throw new Error('Неверный режим. Доступны: quick, custom, advanced');
  }
  
  // Проверка взаимоисключающих параметров
  const controlParams = [request.reference_id, request.vocal_id, request.melody_id].filter(Boolean);
  if (controlParams.length > 1) {
    throw new Error('Можно использовать только один из параметров: reference_id, vocal_id, melody_id');
  }
  
  // Проверка наличия контента для генерации
  const hasContent = request.prompt || request.lyrics || request.custom_lyrics || request.instrumental;
  if (!hasContent && !controlParams.length) {
    throw new Error('Необходимо указать prompt, lyrics, custom_lyrics или установить instrumental=true');
  }
  
  // Проверка длины текстов
  if (request.prompt && request.prompt.length > 2000) {
    throw new Error('Prompt не должен превышать 2000 символов');
  }
  
  if (request.lyrics && request.lyrics.length > 5000) {
    throw new Error('Lyrics не должны превышать 5000 символов');
  }
  
  if (request.custom_lyrics && request.custom_lyrics.length > 5000) {
    throw new Error('Custom lyrics не должны превышать 5000 символов');
  }
}

/**
 * Определяет, содержит ли текст структуру лирики
 * 
 * @param text - Текст для проверки
 * @returns true если текст похож на лирику
 */
function looksLikeLyrics(text?: string): boolean {
  if (!text) return false;
  
  const lowerText = text.toLowerCase();
  
  // Проверяем, что это не команда генерации
  if (lowerText.includes('создай') || 
      lowerText.includes('сгенерируй') || 
      lowerText.includes('generate') ||
      lowerText.includes('create')) {
    return false;
  }
  
  // Проверяем наличие структурных элементов лирики
  const hasStructure = /\[?(verse|chorus|bridge|intro|outro|куплет|припев|бридж)\]?/i.test(text);
  const hasNewlines = /\n/.test(text);
  const wordCount = text.split(/\s+/).length;
  
  return hasStructure || hasNewlines || wordCount > 12;
}

/**
 * TODO: CRITICAL FIX - В Mureka передается промпт вместо лирики!
 * FIXME: Исправить логику определения типа контента (lyrics vs prompt)
 * 
 * Подготавливает данные для запроса к Mureka API
 * Разделяет prompt и lyrics, обрабатывает различные режимы
 * 
 * @param request - Входящий запрос
 * @returns Объект с разделенными lyrics и prompt
 */
function prepareMurekaContent(request: TrackGenerationRequest): { lyrics: string; prompt: string } {
  let lyrics = '';
  let prompt = '';
  
  // TODO: Добавить более умную логику определения типа контента
  // FIXME: Сейчас все интерпретируется как промпт для генерации лирики
  
  // Формируем базовый prompt из параметров стиля
  const stylePrompt = request.style || 
    `${request.genre || 'electronic'}, ${request.mood || 'energetic'}, ${request.tempo || 'medium'}`;
  
  console.log('[PREPARE] Processing content for Mureka generation:', {
    hasCustomLyrics: !!request.custom_lyrics,
    hasLyrics: !!request.lyrics,
    hasPrompt: !!request.prompt,
    isInstrumental: request.instrumental,
    style: request.style,
    promptType: typeof request.prompt,
    lyricsType: typeof request.lyrics,
    inputType: request.inputType  // TODO: Использовать inputType для различения
  });
  
  // ИСПРАВЛЕНО: Правильная логика обработки контента для Mureka
  
  // Обработка входящих данных - преобразуем объекты в строки
  const safePrompt = typeof request.prompt === 'string' ? request.prompt : 
                     typeof request.prompt === 'object' ? JSON.stringify(request.prompt) : '';
  const safeLyrics = typeof request.lyrics === 'string' ? request.lyrics : 
                     typeof request.lyrics === 'object' ? JSON.stringify(request.lyrics) : '';
  const safeCustomLyrics = typeof request.custom_lyrics === 'string' ? request.custom_lyrics : 
                           typeof request.custom_lyrics === 'object' ? JSON.stringify(request.custom_lyrics) : '';
  
  // ИСПРАВЛЕНО: Первоочередная проверка inputType
  if (request.inputType === 'lyrics') {
    // Пользователь ввел готовые lyrics - используем как есть
    lyrics = safePrompt || safeLyrics || safeCustomLyrics || '[No lyrics provided]';
    prompt = stylePrompt; // Стиль идет в prompt для Mureka
    console.log('[PREPARE] InputType=lyrics: Using provided text as lyrics');
  } else if (request.inputType === 'description') {
    // Пользователь ввел описание - НЕ ГЕНЕРИРУЕМ LYRICS, а передаем описание в prompt
    lyrics = '[Auto-generated lyrics]'; // Пустая лирика для автогенерации
    prompt = safePrompt || safeLyrics || stylePrompt; // Описание идет в prompt
    console.log('[PREPARE] InputType=description: Using description as prompt for AI');
  } else if (request.instrumental) {
    // Инструментальный трек
    lyrics = '[Instrumental]';
    prompt = safePrompt || stylePrompt;
    console.log('[PREPARE] Creating instrumental track');
  } else if (safeCustomLyrics && safeCustomLyrics.trim().length > 0) {
    // Пользователь предоставил явную лирику в custom_lyrics
    lyrics = safeCustomLyrics.trim();
    prompt = stylePrompt;
    console.log('[PREPARE] Using custom lyrics');
  } else if (safeLyrics && safeLyrics.trim().length > 0 && looksLikeLyrics(safeLyrics)) {
    // Поле lyrics содержит лирику (структурированный текст)
    lyrics = safeLyrics.trim();
    prompt = stylePrompt;
    console.log('[PREPARE] Using lyrics field as lyrics');
  } else if (safePrompt && looksLikeLyrics(safePrompt)) {
    // Поле prompt содержит лирику
    lyrics = safePrompt;
    prompt = stylePrompt;
    console.log('[PREPARE] Using prompt field as lyrics');
  } else {
    // Дефолт: используем описание в prompt, позволяем AI сгенерировать lyrics
    lyrics = '[Auto-generated lyrics]';
    prompt = safePrompt || safeLyrics || stylePrompt;
    console.log('[PREPARE] Using description as prompt, letting AI generate lyrics');
  }
  
  console.log('[PREPARE] Final content prepared:', {
    lyricsLength: lyrics.length,
    promptLength: prompt.length,
    lyricsPreview: lyrics.substring(0, 100) + '...',
    actualInputType: request.inputType,
    detectedAsLyrics: looksLikeLyrics(lyrics)
  });
  
  return { lyrics, prompt };
}

/**
 * Генерирует правильное название трека
 */
function generateTrackTitle(request: TrackGenerationRequest, choice: any, index: number): string {
  // Пробуем различные поля из choice и request
  let baseTitle = request.title || 
                  choice.title || 
                  choice.display_name || 
                  choice.name ||
                  choice.track_title;
  
  // Если название не найдено, генерируем из prompt/lyrics
  if (!baseTitle) {
    if (request.prompt && request.prompt.length > 0 && !request.prompt.includes('[Auto-generated]')) {
      // Используем первые слова prompt как название
      baseTitle = request.prompt
        .split(' ')
        .slice(0, 4)
        .join(' ')
        .replace(/[^a-zA-Zа-яА-Я0-9\s]/g, '')
        .trim();
    } else if (request.style || request.genre || request.mood) {
      // Генерируем название из стиля/жанра/настроения
      const styleParts = [request.genre, request.mood, request.style].filter(Boolean);
      baseTitle = styleParts.length > 0 
        ? `${styleParts.join(' ')} Track`
        : `AI Generated Track`;
    } else {
      baseTitle = `Mureka Track ${new Date().toLocaleDateString('ru-RU')}`;
    }
  }
  
  return index === 0 ? baseTitle : `${baseTitle} (вариант ${index + 1})`;
}

/**
 * Извлекает лирику из choice объекта
 */
function extractChoiceLyrics(choice: any, fallbackLyrics: string): string {
  console.log('[LYRICS] Extracting lyrics from choice:', {
    hasLyricsSections: !!choice.lyrics_sections,
    hasLyrics: !!choice.lyrics,
    hasLyricsField: !!choice.lyrics_field,
    fallbackLength: fallbackLyrics?.length || 0
  });
  
  // Пробуем различные поля с лирикой
  if (choice.lyrics_sections && Array.isArray(choice.lyrics_sections)) {
    const extractedLyrics = choice.lyrics_sections.map((section: any) => {
      if (section.lines && Array.isArray(section.lines)) {
        return section.lines.map((line: any) => 
          typeof line === 'string' ? line : (line.text || line.content || '')
        ).join('\n');
      }
      return section.text || section.content || '';
    }).join('\n\n');
    
    if (extractedLyrics.trim()) {
      console.log('[LYRICS] Extracted from lyrics_sections, length:', extractedLyrics.length);
      return extractedLyrics;
    }
  }
  
  if (choice.lyrics && typeof choice.lyrics === 'string') {
    console.log('[LYRICS] Using choice.lyrics, length:', choice.lyrics.length);
    return choice.lyrics;
  }
  
  if (choice.lyrics_field && typeof choice.lyrics_field === 'string') {
    console.log('[LYRICS] Using choice.lyrics_field, length:', choice.lyrics_field.length);
    return choice.lyrics_field;
  }
  
  console.log('[LYRICS] Using fallback lyrics, length:', fallbackLyrics?.length || 0);
  return fallbackLyrics || '';
}

/**
 * Генерирует теги жанра на основе запроса
 */
function generateGenreTags(request: TrackGenerationRequest): string[] {
  const tags = ['ai-generated', 'mureka'];
  
  if (request.genre) tags.push(request.genre.toLowerCase());
  if (request.mood) tags.push(request.mood.toLowerCase());
  if (request.tempo) tags.push(request.tempo.toLowerCase());
  if (request.instrumental) tags.push('instrumental');
  
  return tags;
}

/**
 * Создает форматированную лирику с метаданными Mureka
 * 
 * @param request - Входящий запрос
 * @param lyrics - Обработанная лирика
 * @param response - Ответ от Mureka API
 * @returns Форматированная строка с лирикой и метаданными
 */
function formatLyricsWithMetadata(
  request: TrackGenerationRequest,
  lyrics: string,
  response: MurekaAPIResponse
): string {
  const metadata = [
    `[Generated by Mureka AI - Model: ${response.model}]`,
    request.instrumental ? '[Instrumental Track]' : lyrics,
    '',
    '[Metadata]',
    `[Model: ${response.model}]`,
    `[Style: ${request.style || 'Default'}]`,
    `[Genre: ${request.genre || 'electronic'}]`,
    `[Mood: ${request.mood || 'energetic'}]`,
    `[Tempo: ${request.tempo || 'medium'}]`,
    `[Key: ${request.key || 'C'}]`
  ];
  
  if (request.instruments?.length) {
    metadata.push(`[Instruments: ${request.instruments.join(', ')}]`);
  }
  
  if (request.instrumental) {
    metadata.push('[Instrumental: Yes]');
  }
  
  if (request.language && request.language !== 'ru') {
    metadata.push(`[Language: ${request.language}]`);
  }
  
  if (request.reference_id) {
    metadata.push(`[Reference ID: ${request.reference_id}]`);
  }
  
  if (request.vocal_id) {
    metadata.push(`[Vocal ID: ${request.vocal_id}]`);
  }
  
  if (request.melody_id) {
    metadata.push(`[Melody ID: ${request.melody_id}]`);
  }
  
  if (request.stream) {
    metadata.push('[Streaming Enabled]');
  }
  
  metadata.push(
    '',
    '{mureka_generation}',
    'Track created with Mureka AI using official API v1',
    `Model: ${response.model}`,
    `Task ID: ${response.id}`,
    `Status: ${response.status}`,
    '{/mureka_generation}'
  );
  
  return metadata.join('\n');
}

/**
 * Выполняет запрос к Mureka API с retry логикой
 * 
 * @param requestBody - Тело запроса для Mureka API
 * @param apiKey - API ключ
 * @returns Ответ от Mureka API
 */
async function callMurekaAPIWithRetry(
  requestBody: MurekaAPIRequest,
  apiKey: string
): Promise<MurekaAPIResponse> {
  let lastError: any;
  
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`[API] Попытка ${attempt + 1}/${MAX_RETRY_ATTEMPTS} вызова Mureka API`);
      
      const response = await fetchWithTimeout(
        'https://api.mureka.ai/v1/song/generate',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        },
        API_TIMEOUT
      );
      
      // Логируем статус ответа
      console.log(`[API] Получен ответ со статусом: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[API] Успешно создана задача: ${data.id}`);
        return data;
      }
      
      // Обработка ошибок API
      const errorText = await response.text();
      console.error(`[API] Ошибка от Mureka API: ${response.status} - ${errorText}`);
      
      // Проверяем, стоит ли повторять запрос
      if (!isRetryableError(response.status)) {
        throw new Error(`Mureka API error: ${response.status} - ${errorText}`);
      }
      
      lastError = new Error(`HTTP ${response.status}: ${errorText}`);
      
    } catch (error: any) {
      console.error(`[API] Ошибка при вызове Mureka API:`, error.message);
      lastError = error;
      
      // Если это не временная ошибка, прекращаем попытки
      if (!isRetryableError(error)) {
        throw error;
      }
    }
    
    // Вычисляем задержку перед следующей попыткой
    if (attempt < MAX_RETRY_ATTEMPTS - 1) {
      const delay = calculateRetryDelay(attempt);
      console.log(`[RETRY] Ожидание ${delay}ms перед следующей попыткой...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Все попытки исчерпаны
  throw lastError || new Error('Не удалось выполнить запрос к Mureka API после всех попыток');
}

/**
 * Выполняет polling для отслеживания статуса генерации
 * 
 * @param taskId - ID задачи для отслеживания
 * @param apiKey - API ключ
 * @returns Финальный статус задачи
 */
async function pollMurekaStatus(
  taskId: string,
  apiKey: string
): Promise<MurekaAPIResponse> {
  const pendingStatuses = ['preparing', 'queued', 'running', 'streaming'];
  let attempts = 0;
  
  console.log(`[POLLING] Начинаем отслеживание статуса задачи: ${taskId}`);
  
  while (attempts < MAX_POLLING_ATTEMPTS) {
    attempts++;
    
    try {
      const response = await fetchWithTimeout(
        `https://api.mureka.ai/v1/song/query/${taskId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
        API_TIMEOUT
      );
      
      if (response.ok) {
        const data: MurekaAPIResponse = await response.json();
        console.log(`[POLLING] Попытка ${attempts}/${MAX_POLLING_ATTEMPTS}: статус = ${data.status}`);
        
        // Проверяем, завершена ли генерация
        if (!pendingStatuses.includes(data.status)) {
          console.log(`[POLLING] Генерация завершена со статусом: ${data.status}`);
          return data;
        }
      } else {
        console.warn(`[POLLING] Ошибка получения статуса: ${response.status}`);
      }
    } catch (error) {
      console.error(`[POLLING] Ошибка при проверке статуса:`, error);
    }
    
    // Ждем перед следующей попыткой
    await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
  }
  
  throw new Error(`Превышено время ожидания генерации (${MAX_POLLING_ATTEMPTS * POLLING_INTERVAL / 1000} секунд)`);
}

// ==========================================
// ОСНОВНАЯ ФУНКЦИЯ EDGE FUNCTION
// ==========================================

serve(async (req) => {
  // ====================================
  // 1. ОБРАБОТКА CORS
  // ====================================
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const startTime = Date.now();
  
  try {
    // ====================================
    // 2. АУТЕНТИФИКАЦИЯ И ВАЛИДАЦИЯ
    // ====================================
    const authHeader = req.headers.get('Authorization');
    
    // Initialize Supabase first for authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase конфигурация не найдена');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // SECURITY FIX: Proper authentication verification
    const userId = await verifyAuthentication(authHeader, supabase);
    
    console.log(`[REQUEST] Новый запрос от верифицированного пользователя: ${userId}`);
    
    // Проверка rate limit
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Превышен лимит запросов',
        message: `Mureka AI генерация ограничена ${RATE_LIMIT_MAX} запросами за ${RATE_LIMIT_WINDOW / 60000} минут`,
        retryAfter: rateLimitCheck.retryAfter,
        service: 'mureka'
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimitCheck.retryAfter)
        },
      });
    }
    
    // ====================================
    // 3. ПАРСИНГ И ВАЛИДАЦИЯ ЗАПРОСА
    // ====================================
    let requestBody: TrackGenerationRequest;
    
    try {
      requestBody = await req.json();
    } catch (error) {
      console.error('[PARSE] Ошибка парсинга JSON:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Невалидный JSON в теле запроса',
        service: 'mureka'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Валидация входных данных
    try {
      validateRequest(requestBody);
    } catch (error: any) {
      console.error('[VALIDATION] Ошибка валидации:', error.message);
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        service: 'mureka'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // ====================================
    // 4. SUPABASE КЛИЕНТ УЖЕ ИНИЦИАЛИЗИРОВАН
    // ====================================
    // Supabase client already initialized above for authentication
    
    // ====================================
    // 5. ОБРАБОТКА INBOX ЛОГИКИ
    // ====================================
    let finalProjectId = requestBody.projectId;
    let finalArtistId = requestBody.artistId;
    
    if (requestBody.useInbox || (!requestBody.projectId && !requestBody.artistId)) {
      console.log('[INBOX] Используем inbox логику');
      
      try {
        const { data: inboxProjectId, error: inboxError } = await supabase
          .rpc('ensure_user_inbox', { p_user_id: userId });
        
        if (inboxError) {
          console.error('[INBOX] Ошибка создания inbox:', inboxError);
          throw new Error('Не удалось создать inbox проект');
        }
        
        finalProjectId = inboxProjectId;
        console.log(`[INBOX] Используем inbox проект: ${finalProjectId}`);
      } catch (error) {
        console.error('[INBOX] Критическая ошибка:', error);
        throw new Error('Ошибка при работе с inbox');
      }
    }
    
    // ====================================
    // 6. ПОЛУЧЕНИЕ API КЛЮЧА MUREKA
    // ====================================
    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    
    if (!murekaApiKey) {
      console.error('[CONFIG] MUREKA_API_KEY не настроен');
      throw new Error('Mureka API не сконфигурирован');
    }
    
    // ====================================
    // 7. ПОДГОТОВКА ДАННЫХ ДЛЯ MUREKA API
    // ====================================
    const { lyrics: requestLyrics, prompt: requestPrompt } = prepareMurekaContent(requestBody);
    
    console.log('[PREPARE] Подготовленные данные:', {
      lyricsLength: requestLyrics.length,
      promptLength: requestPrompt.length,
      model: requestBody.model || 'auto',
      instrumental: requestBody.instrumental
    });
    
    // Формируем запрос к Mureka API с правильным маппингом модели
    const selectedModel = requestBody.model || 'auto';
    const mappedModel = MODEL_MAPPING[selectedModel] || 'mureka-7'; // Дефолт V7
    
    console.log(`[MODEL] UI модель: ${selectedModel} -> API модель: ${mappedModel}`);
    
    const murekaRequest: MurekaAPIRequest = {
      lyrics: requestLyrics,
      model: mappedModel as any,
      stream: requestBody.stream || false
    };
    
    // Добавляем control параметры (взаимоисключающие)
    if (requestBody.reference_id) {
      murekaRequest.reference_id = requestBody.reference_id;
    } else if (requestBody.vocal_id) {
      murekaRequest.vocal_id = requestBody.vocal_id;
    } else if (requestBody.melody_id) {
      murekaRequest.melody_id = requestBody.melody_id;
    } else {
      murekaRequest.prompt = requestPrompt;
    }
    
    // ====================================
    // 8. ВЫЗОВ MUREKA API С RETRY ЛОГИКОЙ
    // ====================================
    console.log('[API] Вызываем Mureka API для создания трека');
    
    let murekaResponse: MurekaAPIResponse;
    
    try {
      murekaResponse = await callMurekaAPIWithRetry(murekaRequest, murekaApiKey);
    } catch (error: any) {
      console.error('[API] Не удалось вызвать Mureka API:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'Ошибка при обращении к Mureka AI',
        message: error.message,
        service: 'mureka',
        timestamp: new Date().toISOString()
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // ====================================
    // 9. POLLING ДЛЯ ПОЛУЧЕНИЯ РЕЗУЛЬТАТА
    // ====================================
    let finalTrack = murekaResponse;
    
    console.log('[DEBUG] Initial Mureka response:', {
      id: murekaResponse.id,
      status: murekaResponse.status,
      hasChoices: !!murekaResponse.choices?.length,
      choicesCount: murekaResponse.choices?.length || 0,
      firstChoiceUrl: murekaResponse.choices?.[0]?.url || murekaResponse.choices?.[0]?.audio_url,
      firstChoiceTitle: murekaResponse.choices?.[0]?.title
    });
    
    if (['preparing', 'queued', 'running', 'streaming'].includes(murekaResponse.status)) {
      console.log('[POLLING] Трек в процессе генерации, начинаем polling');
      
      try {
        finalTrack = await pollMurekaStatus(murekaResponse.id, murekaApiKey);
        console.log('[DEBUG] Final track after polling:', {
          id: finalTrack.id,
          status: finalTrack.status,
          hasChoices: !!finalTrack.choices?.length,
          choicesCount: finalTrack.choices?.length || 0,
          firstChoiceUrl: finalTrack.choices?.[0]?.url || finalTrack.choices?.[0]?.audio_url,
          firstChoiceTitle: finalTrack.choices?.[0]?.title
        });
      } catch (error: any) {
        console.error('[POLLING] Ошибка при polling:', error);
        console.log('[DEBUG] Using initial response due to polling error');
        // Продолжаем с текущим статусом
      }
    } else {
      console.log('[DEBUG] Track already completed, no polling needed');
    }
    
    // ====================================
    // 10. ФОРМАТИРОВАНИЕ ЛИРИКИ С МЕТАДАННЫМИ
    // ====================================
    const processedLyrics = formatLyricsWithMetadata(requestBody, requestLyrics, finalTrack);
    
    // ====================================
    // 11. СОХРАНЕНИЕ В БАЗУ ДАННЫХ
    // ====================================
    let trackRecord = null;
    let generationRecord = null;
    
    // Создаем authenticated supabase client с service role для обхода RLS
    const authSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    // Создаем запись в ai_generations только если у нас есть валидный userId UUID
    try {
      // Проверяем, что userId это валидный UUID, а не 'anonymous'
      const isValidUUID = userId !== 'anonymous' && 
                         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      
      if (isValidUUID) {
        const { data: generation, error: genError } = await authSupabase
          .from('ai_generations')
          .insert({
            user_id: userId,
            prompt: requestBody.prompt || requestLyrics.substring(0, 500),
            service: 'mureka',
            status: finalTrack.status === 'succeeded' ? 'completed' : 
                    finalTrack.status === 'failed' ? 'failed' : 'processing',
            result_url: finalTrack.choices?.[0]?.audio_url,
            external_id: finalTrack.id,
            metadata: {
              mureka_task_id: finalTrack.id,
              model: finalTrack.model,
              service: 'mureka',
              created_at: finalTrack.created_at,
              finished_at: finalTrack.finished_at,
              failed_reason: finalTrack.failed_reason,
              duration: finalTrack.choices?.[0]?.duration || requestBody.duration,
              title: finalTrack.choices?.[0]?.title,
              genre: requestBody.genre,
              mood: requestBody.mood,
              tempo: requestBody.tempo,
              key: requestBody.key,
              instruments: requestBody.instruments,
              style: requestBody.style,
              mode: requestBody.mode,
              custom_lyrics: requestBody.custom_lyrics,
              lyrics: requestLyrics,
              instrumental: requestBody.instrumental,
              language: requestBody.language,
              reference_id: requestBody.reference_id,
              vocal_id: requestBody.vocal_id,
              melody_id: requestBody.melody_id,
              stream: requestBody.stream,
              mureka_response: finalTrack,
              project_id: finalProjectId,
              artist_id: finalArtistId
            },
            parameters: requestBody,
            track_id: requestBody.trackId || null
          })
          .select()
          .single();
        
        if (genError) {
          console.error('[DB] Ошибка сохранения generation:', genError);
        } else {
          generationRecord = generation;
          console.log(`[DB] Generation сохранен: ${generation.id}`);
        }
      } else {
        console.warn(`[DB] Пропускаем создание ai_generation для невалидного userId: ${userId}`);
      }
    } catch (error) {
      console.error('[DB] Критическая ошибка при сохранении generation:', error);
    }
    
    // Обработка трека (обновление или создание)
    if (requestBody.trackId) {
      // Обновляем существующий трек
      try {
        const { data: updatedTrack, error: trackError } = await supabase
          .from('tracks')
          .update({
            audio_url: finalTrack.choices?.[0]?.audio_url,
            duration: finalTrack.choices?.[0]?.duration || requestBody.duration,
            metadata: {
              mureka_task_id: finalTrack.id,
              model: finalTrack.model,
              mureka_response: finalTrack,
              generation_id: generationRecord?.id,
              genre: requestBody.genre,
              mood: requestBody.mood,
              tempo: requestBody.tempo,
              key: requestBody.key,
              instruments: requestBody.instruments,
              mode: requestBody.mode,
              custom_lyrics: requestBody.custom_lyrics,
              lyrics: requestLyrics,
              instrumental: requestBody.instrumental,
              language: requestBody.language,
              reference_id: requestBody.reference_id,
              vocal_id: requestBody.vocal_id,
              melody_id: requestBody.melody_id,
              stream: requestBody.stream
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', requestBody.trackId)
          .select()
          .single();
        
        if (trackError) {
          console.error('[DB] Ошибка обновления трека:', trackError);
        } else {
          trackRecord = updatedTrack;
          console.log(`[DB] Трек обновлен: ${updatedTrack.id}`);
        }
      } catch (error) {
        console.error('[DB] Критическая ошибка при обновлении трека:', error);
      }
    } else if (finalProjectId && generationRecord?.id) {
      // Создаем новый трек через RPC функцию для обхода RLS
      try {
        const { data: trackId, error: trackError } = await authSupabase
          .rpc('create_or_update_track_from_generation', {
            p_generation_id: generationRecord.id,
            p_project_id: finalProjectId
          });
        
        if (trackError) {
          console.error('[DB] Ошибка создания трека через RPC:', trackError);
        } else {
          console.log(`[DB] Трек создан через RPC: ${trackId}`);
          // Получаем созданный трек
          const { data: track } = await authSupabase
            .from('tracks')
            .select('*')
            .eq('id', trackId)
            .single();
          trackRecord = track;
        }
      } catch (error) {
        console.error('[DB] Критическая ошибка при создании трека через RPC:', error);
      }
    }
    
    // ====================================
    // 12. СОХРАНЕНИЕ ВСЕХ ТРЕКОВ ИЗ CHOICES
    // ====================================
    let allSavedTracks = [];
    
    // Сохраняем все треки из choices через save-mureka-generation
    if (finalTrack.choices && finalTrack.choices.length > 0) {
      console.log(`[MULTI-TRACK] Найдено ${finalTrack.choices.length} треков, сохраняем все`);
      
      for (let i = 0; i < finalTrack.choices.length; i++) {
        const choice = finalTrack.choices[i];
        
        try {
          console.log(`[MULTI-TRACK] Сохраняем трек ${i + 1}/${finalTrack.choices.length}`);
          
          const additionalTrackResponse = await supabase.functions.invoke('save-mureka-generation', {
            body: {
              generationId: generationRecord?.id,
              trackData: {
                title: generateTrackTitle(requestBody, choice, i),
                audio_url: choice.url || choice.audio_url,
                duration: Math.round((choice.duration || 120000) / 1000),
                lyrics: extractChoiceLyrics(choice, processedLyrics),
                model: finalTrack.model || mappedModel,
                service: 'mureka',
                mureka_choice_id: choice.id,
                track_variant: i + 1,
                total_variants: finalTrack.choices.length,
                genre_tags: generateGenreTags(requestBody),
                style_prompt: requestPrompt
              },
              projectId: finalProjectId,
              artistId: finalArtistId
            }
          });
          
          if (additionalTrackResponse.error) {
            console.error(`[MULTI-TRACK] Ошибка сохранения трека ${i + 1}:`, additionalTrackResponse.error);
          } else {
            allSavedTracks.push(additionalTrackResponse.data);
            console.log(`[MULTI-TRACK] Трек ${i + 1} сохранен:`, additionalTrackResponse.data?.track?.id);
          }
        } catch (trackError) {
          console.error(`[MULTI-TRACK] Критическая ошибка сохранения трека ${i + 1}:`, trackError);
        }
      }
    }
    
    // ====================================
    // 13. ФОРМИРОВАНИЕ УСПЕШНОГО ОТВЕТА
    // ====================================
    const processingTime = Date.now() - startTime;
    
    console.log(`[SUCCESS] Запрос обработан за ${processingTime}ms`);
    
    // Получаем правильные URL для фронтенда
    const primaryAudioUrl = finalTrack.choices?.[0]?.url || finalTrack.choices?.[0]?.audio_url;
    const primaryTitle = finalTrack.choices?.[0]?.title || generateTrackTitle(requestBody, finalTrack.choices?.[0] || {}, 0);
    
    console.log('[RESPONSE] Preparing final response:', {
      hasChoices: !!finalTrack.choices?.length,
      primaryAudioUrl,
      primaryTitle,
      status: finalTrack.status,
      taskId: finalTrack.id
    });
    
    return new Response(JSON.stringify({
      success: true,
      message: allSavedTracks.length > 0 
        ? `Успешно сгенерированы и сохранены ${allSavedTracks.length + 1} треков` 
        : 'Трек успешно сгенерирован и сохранен',
      data: {
        mureka: {
          ...finalTrack,
          choices: finalTrack.choices?.map(choice => ({
            ...choice,
            url: choice.url || choice.audio_url, // Обеспечиваем наличие url поля
            audio_url: choice.audio_url || choice.url // И обратное соответствие
          }))
        },
        track: trackRecord,
        generation: generationRecord,
        audio_url: primaryAudioUrl,
        title: primaryTitle,
        duration: finalTrack.choices?.[0]?.duration || requestBody.duration,
        lyrics: processedLyrics,
        status: finalTrack.status,
        taskId: finalTrack.id,
        task_id: finalTrack.id, // Важно для polling
        model: finalTrack.model,
        total_tracks: allSavedTracks.length + 1,
        additional_tracks: allSavedTracks
      },
      metadata: {
        service: 'mureka',
        model: finalTrack.model,
        genre: requestBody.genre,
        mood: requestBody.mood,
        tempo: requestBody.tempo,
        key: requestBody.key,
        instruments: requestBody.instruments,
        reference_id: requestBody.reference_id,
        vocal_id: requestBody.vocal_id,
        melody_id: requestBody.melody_id,
        stream: requestBody.stream,
        generation_prompt: requestPrompt,
        auto_saved: true,
        generatedAt: new Date().toISOString(),
        processingTime: `${processingTime}ms`,
        pollingAttempts: finalTrack.status !== murekaResponse.status ? 'completed' : 'none'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    // ====================================
    // ОБРАБОТКА ГЛОБАЛЬНЫХ ОШИБОК
    // ====================================
    const processingTime = Date.now() - startTime;
    
    console.error('[ERROR] Глобальная ошибка в Edge Function:', {
      message: error.message,
      stack: error.stack,
      processingTime
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: error.message || 'Неизвестная ошибка',
      service: 'mureka',
      timestamp: new Date().toISOString(),
      debug: {
        errorType: error.constructor.name,
        errorMessage: error.message,
        processingTime: `${processingTime}ms`
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});