/**
 * @fileoverview Edge Function для трансформации аудио треков через Suno AI API.
 * @description Позволяет загрузить аудиофайл и "наложить" на него новый стиль.
 *
 * Endpoint: /api/v1/generate/upload-cover
 *
 * @author Jules
 * @version 1.0.0
 * @last_updated 2025-08-25
 */

/**
 * @fileoverview Edge Function для трансформации аудио треков (Cover) через Suno AI API.
 * @description Принимает URL аудиофайла и текстовый промпт, чтобы создать новую
 *              музыкальную композицию в указанном стиле.
 *
 * @author Jules
 * @version 1.1.0
 * @last_updated 2025-08-25
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

// --- КОНФИГУРАЦИЯ ---
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// --- СХЕМЫ ВАЛИДАЦИИ ---
/**
 * @description Схема для валидации тела входящего запроса.
 * Гарантирует, что все необходимые поля присутствуют и имеют правильный формат.
 */
const RequestBodySchema = z.object({
  audio_url: z.string().url("Неверный формат URL аудиофайла."),
  prompt: z.string().min(1, "Промпт не может быть пустым.").max(500, "Промпт слишком длинный."),
  title: z.string().optional(),
  tags: z.string().optional(),
  model: z.enum(['V3_5', 'V4', 'V4_5', 'V4_5PLUS']).optional().default('V4_5PLUS'),
  projectId: z.string().uuid().optional(),
  artistId: z.string().uuid().optional(),
});

// --- ОСНОВНАЯ ЛОГИКА ---
/**
 * @description Основной обработчик HTTP-запросов.
 * @param {Request} req - Входящий HTTP-запрос.
 * @returns {Response} - HTTP-ответ.
 */
serve(async (req: Request): Promise<Response> => {
  console.log('=== UPLOAD-COVER-SUNO-TRACK START ===');
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    // 1. Инициализация и Авторизация
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth Error:', authError);
      return new Response(JSON.stringify({ code: 401, error: 'Требуется авторизация.' }), { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }
    console.log('User authorized:', user.id);

    // 2. Парсинг и Валидация
    const body = await req.json();
    console.log('Received body:', body);
    const validationResult = RequestBodySchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation Error:', validationResult.error.flatten());
      return new Response(JSON.stringify({ code: 400, error: 'Ошибка валидации.', details: validationResult.error.flatten() }), { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }
    const { audio_url, prompt, title, tags, model, projectId, artistId } = validationResult.data;
    console.log('Validation successful.');

    // 3. Подготовка запроса к Suno API
    const sunoApiKey = Deno.env.get('SUNOAPI_ORG_TOKEN');
    if (!sunoApiKey) {
      throw new Error('Переменная окружения SUNOAPI_ORG_TOKEN не настроена.');
    }

    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/suno-callback`;

    const sunoRequestBody = {
      audioUrl: audio_url,
      prompt: prompt,
      title: title || 'Audio Cover',
      model: model,
      callBackUrl: callbackUrl,
    };
    console.log('Prepared Suno API request:', sunoRequestBody);

    // 4. Вызов Suno API
    // Эндпоинт /api/v1/generate/upload-cover подтвержден анализом других функций
    const sunoApiUrl = 'https://api.sunoapi.org/api/v1/generate/upload-cover';
    console.log('Calling Suno API at:', sunoApiUrl);

    const sunoResponse = await fetch(sunoApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sunoRequestBody),
    });

    console.log('Suno API response status:', sunoResponse.status);
    if (!sunoResponse.ok) {
      const errorBody = await sunoResponse.text();
      console.error('Suno API Error Body:', errorBody);
      throw new Error(`Ошибка от Suno API: ${sunoResponse.status} ${errorBody}`);
    }

    const sunoData = await sunoResponse.json();
    console.log('Suno API response data:', sunoData);

    if (sunoData.code !== 200 || !sunoData.data?.taskId) {
        throw new Error(`Некорректный ответ от Suno API: ${sunoData.msg || 'В ответе отсутствует taskId'}`);
    }

    const taskId = sunoData.data.taskId;
    console.log('Suno task ID:', taskId);

    // 5. Сохранение в БД
    const generationRecord = {
      user_id: user.id,
      prompt: prompt,
      service: 'suno',
      status: 'processing',
      external_id: taskId,
      metadata: {
        suno_task_id: taskId,
        operation_type: 'upload-cover',
        original_audio_url: audio_url,
        model: model,
        suno_request: sunoRequestBody,
        suno_response: sunoData,
        project_id: projectId,
        artist_id: artistId,
        initiated_at: new Date().toISOString()
      },
      parameters: { prompt, audio_url, title, tags, model, projectId, artistId },
    };

    const { data: generation, error: genError } = await supabase
      .from('ai_generations')
      .insert(generationRecord)
      .select()
      .single();

    if (genError) {
      // SECURITY: Логируем полную ошибку, но не показываем детали пользователю
      console.error('DB Insert Error:', genError);
      // Не прерываем выполнение, так как генерация уже запущена
    } else {
      console.log('Generation record saved with ID:', generation.id);
    }

    // 6. Формирование ответа
    const responsePayload = {
      success: true,
      message: 'Задача трансформации аудио успешно создана.',
      taskId: taskId,
      generationId: generation?.id,
    };

    console.log('Sending success response:', responsePayload);
    const executionTime = Date.now() - startTime;
    console.log(`Execution time: ${executionTime}ms`);

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`Critical error in upload-cover-suno-track after ${executionTime}ms:`, error);
    return new Response(JSON.stringify({
        code: 500,
        error: 'Внутренняя ошибка сервера.',
        details: error.message
    }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
