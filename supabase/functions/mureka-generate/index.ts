import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Независимая интеграция Mureka AI
 * Полностью отдельная от Suno унификации
 * 
 * @version 1.0.0
 * @author Claude AI Assistant
 */

// ==========================================
// КОНФИГУРАЦИЯ И КОНСТАНТЫ
// ==========================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Конфигурация для Mureka API
const MUREKA_API_BASE = 'https://api.mureka.ai/v1';
const POLLING_INTERVAL = 3000; // 3 секунды
const MAX_POLLING_ATTEMPTS = 100; // 5 минут максимум
const API_TIMEOUT = 30000; // 30 секунд

// Поддерживаемые модели Mureka 2025
const MUREKA_MODELS = {
  'auto': 'auto',
  'V7': 'mureka-7',
  'O1': 'mureka-o1',
  'V6': 'mureka-6'
} as const;

// ==========================================
// ТИПЫ И ИНТЕРФЕЙСЫ
// ==========================================

interface MurekaGenerateRequest {
  lyrics?: string;
  title?: string;
  style?: string;
  model?: keyof typeof MUREKA_MODELS;
  instrumental?: boolean;
  projectId?: string;
  artistId?: string;
  inputType?: 'lyrics' | 'description';
  prompt?: string;
  genre?: string;
  mood?: string;
  useInbox?: boolean;
}

interface MurekaAPIResponse {
  task_id: string;
  status: 'processing' | 'completed' | 'failed';
  songs?: Array<{
    id: string;
    title: string;
    lyrics: string;
    audio_url: string;
    instrumental_url?: string;
    duration: number;
    created_at: string;
  }>;
  error?: string;
}

interface ProcessedTrack {
  id: string;
  title: string;
  lyrics: string;
  audio_url: string;
  instrumental_url?: string;
  duration: number;
  metadata: Record<string, any>;
}

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

/**
 * Извлечение User ID из JWT токена
 */
function extractUserId(authHeader: string | null): string {
  if (!authHeader) return 'anonymous';
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) return 'anonymous';
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || 'anonymous';
  } catch (error) {
    console.error('[AUTH] Error parsing JWT:', error);
    return 'anonymous';
  }
}

/**
 * Выполняет fetch с timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout = API_TIMEOUT): Promise<Response> {
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
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Подготавливает запрос для Mureka API
 */
function prepareMurekaRequest(request: MurekaGenerateRequest): any {
  const { lyrics, title, style, model, instrumental, inputType, prompt, genre, mood } = request;
  
  console.log('[MUREKA] Preparing request:', {
    inputType,
    hasLyrics: !!lyrics,
    hasPrompt: !!prompt,
    instrumental,
    model
  });
  
  // Формируем стиль из доступных параметров
  const stylePrompt = [genre, mood, style].filter(Boolean).join(', ') || 'pop, energetic';
  
  let finalLyrics = '';
  let finalTitle = title || '';
  
  if (inputType === 'lyrics' && lyrics) {
    // Пользователь предоставил готовые lyrics
    finalLyrics = lyrics.trim();
    if (!finalTitle) {
      // Генерируем название из первой строки lyrics
      const firstLine = lyrics.split('\n')[0]?.trim();
      finalTitle = firstLine?.length > 2 ? firstLine.slice(0, 50) : 'AI Generated Song';
    }
  } else if (inputType === 'description' && prompt) {
    // Пользователь дал описание - Mureka сам создаст lyrics
    finalLyrics = ''; // Пустые lyrics означают автогенерацию
    if (!finalTitle) {
      // Генерируем название из описания
      const words = prompt.split(' ').slice(0, 4).join(' ');
      finalTitle = words || 'AI Generated Song';
    }
  } else {
    // Fallback
    finalLyrics = '';
    finalTitle = finalTitle || 'Mureka AI Song';
  }
  
  const murekaPayload = {
    lyrics: finalLyrics,
    model: MUREKA_MODELS[model || 'auto'],
    prompt: stylePrompt,
    stream: false
  };
  
  console.log('[MUREKA] Final API payload:', murekaPayload);
  return murekaPayload;
}

/**
 * Создает запрос к Mureka API
 */
async function callMurekaAPI(payload: any, apiKey: string): Promise<MurekaAPIResponse> {
  const url = `${MUREKA_API_BASE}/song/generate`;
  
  console.log('[API] Calling Mureka:', { url, hasPayload: !!payload });
  
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[API] Mureka API error:', response.status, errorText);
    throw new Error(`Mureka API error: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log('[API] Mureka response:', result);
  return result;
}

/**
 * Polling статуса генерации
 */
async function pollMurekaStatus(taskId: string, apiKey: string): Promise<MurekaAPIResponse> {
  console.log('[POLLING] Starting for task:', taskId);
  
  for (let attempt = 0; attempt < MAX_POLLING_ATTEMPTS; attempt++) {
    try {
      const response = await fetchWithTimeout(`${MUREKA_API_BASE}/song/query/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data: MurekaAPIResponse = await response.json();
        console.log(`[POLLING] Attempt ${attempt + 1}: status = ${data.status}`);
        
        if (data.status === 'completed' || data.status === 'failed') {
          console.log('[POLLING] Generation finished:', data.status);
          return data;
        }
      }
    } catch (error) {
      console.error(`[POLLING] Error on attempt ${attempt + 1}:`, error);
    }
    
    // Ждём перед следующей попыткой
    if (attempt < MAX_POLLING_ATTEMPTS - 1) {
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    }
  }
  
  throw new Error(`Polling timeout after ${MAX_POLLING_ATTEMPTS * POLLING_INTERVAL / 1000} seconds`);
}

/**
 * Сохраняет треки в базу данных
 */
async function saveTracksToDatabase(
  songs: ProcessedTrack[], 
  generationId: string, 
  projectId: string | null,
  userId: string,
  supabase: any
): Promise<any[]> {
  
  console.log(`[DB] Saving ${songs.length} tracks for user ${userId}`);
  
  const savedTracks = [];
  
  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    
    try {
      // Создаем трек через RPC функцию
      const { data: trackId, error: trackError } = await supabase.rpc(
        'create_mureka_track',
        {
          p_generation_id: generationId,
          p_project_id: projectId,
          p_title: song.title,
          p_audio_url: song.audio_url,
          p_lyrics: song.lyrics,
          p_duration: song.duration,
          p_metadata: song.metadata
        }
      );
      
      if (trackError) {
        console.error(`[DB] Error creating track ${i + 1}:`, trackError);
        continue;
      }
      
      console.log(`[DB] Track ${i + 1} saved with ID:`, trackId);
      savedTracks.push({ id: trackId, ...song });
      
      // Запускаем background download
      supabase.functions.invoke('download-and-save-track', {
        body: {
          generation_id: generationId,
          external_url: song.audio_url,
          track_id: trackId,
          filename: `mureka_${trackId}.mp3`
        }
      }).catch((error: any) => {
        console.error('[DB] Background download failed:', error);
      });
      
    } catch (error) {
      console.error(`[DB] Exception saving track ${i + 1}:`, error);
    }
  }
  
  return savedTracks;
}

// ==========================================
// ОСНОВНАЯ ФУНКЦИЯ EDGE FUNCTION
// ==========================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const startTime = Date.now();
  
  try {
    // ====================================
    // 1. АУТЕНТИФИКАЦИЯ И ВАЛИДАЦИЯ
    // ====================================
    const authHeader = req.headers.get('Authorization');
    const userId = extractUserId(authHeader);
    
    console.log(`[REQUEST] New Mureka generation request from user: ${userId}`);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    let requestBody: MurekaGenerateRequest;
    try {
      requestBody = await req.json();
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
    
    console.log('[REQUEST] Body:', requestBody);
    
    // ====================================
    // 2. ПОЛУЧЕНИЕ API КЛЮЧА
    // ====================================
    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    if (!murekaApiKey) {
      throw new Error('Mureka API key not configured');
    }
    
    // ====================================
    // 3. ОБРАБОТКА INBOX ЛОГИКИ
    // ====================================
    let finalProjectId = requestBody.projectId;
    if (requestBody.useInbox && userId !== 'anonymous') {
      const { data: inboxId } = await supabase.rpc('ensure_user_inbox', { 
        p_user_id: userId 
      });
      finalProjectId = inboxId;
    }
    
    // ====================================
    // 4. СОЗДАНИЕ ЗАПИСИ AI GENERATION
    // ====================================
    const { data: generation, error: genError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: userId !== 'anonymous' ? userId : null,
        service: 'mureka',
        prompt: requestBody.prompt || requestBody.lyrics?.substring(0, 500) || '',
        status: 'processing',
        metadata: {
          original_request: requestBody,
          model: MUREKA_MODELS[requestBody.model || 'auto'],
          input_type: requestBody.inputType,
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();
    
    if (genError) {
      console.error('[DB] Error creating generation:', genError);
      throw new Error('Failed to create generation record');
    }
    
    const generationId = generation.id;
    console.log('[DB] Generation created:', generationId);
    
    // ====================================
    // 5. ВЫЗОВ MUREKA API
    // ====================================
    const payload = prepareMurekaRequest(requestBody);
    
    let murekaResponse: MurekaAPIResponse;
    try {
      murekaResponse = await callMurekaAPI(payload, murekaApiKey);
    } catch (error: any) {
      console.error('[API] Mureka API call failed:', error);
      
      // Обновляем статус generation
      await supabase
        .from('ai_generations')
        .update({ 
          status: 'failed',
          metadata: { 
            ...generation.metadata,
            error: error.message,
            failed_at: new Date().toISOString()
          }
        })
        .eq('id', generationId);
      
      throw error;
    }
    
    // ====================================
    // 6. POLLING ДЛЯ ПОЛУЧЕНИЯ РЕЗУЛЬТАТА
    // ====================================
    let finalResponse = murekaResponse;
    
    if (murekaResponse.status === 'processing') {
      console.log('[POLLING] Generation in progress, starting polling...');
      
      try {
        finalResponse = await pollMurekaStatus(murekaResponse.task_id, murekaApiKey);
      } catch (pollingError: any) {
        console.error('[POLLING] Polling failed:', pollingError);
        
        await supabase
          .from('ai_generations')
          .update({ 
            status: 'failed',
            metadata: { 
              ...generation.metadata,
              polling_error: pollingError.message,
              failed_at: new Date().toISOString()
            }
          })
          .eq('id', generationId);
        
        throw pollingError;
      }
    }
    
    // ====================================
    // 7. ОБРАБОТКА РЕЗУЛЬТАТОВ
    // ====================================
    if (finalResponse.status === 'failed') {
      throw new Error(finalResponse.error || 'Mureka generation failed');
    }
    
    if (!finalResponse.songs || finalResponse.songs.length === 0) {
      throw new Error('No songs generated by Mureka');
    }
    
    console.log(`[RESULT] Generated ${finalResponse.songs.length} songs`);
    
    // Обрабатываем треки
    const processedTracks: ProcessedTrack[] = finalResponse.songs.map((song, index) => ({
      id: song.id,
      title: song.title || `Mureka Track ${index + 1}`,
      lyrics: song.lyrics || '',
      audio_url: song.audio_url,
      instrumental_url: song.instrumental_url,
      duration: song.duration || 120,
      metadata: {
        mureka_song_id: song.id,
        generation_id: generationId,
        service: 'mureka',
        model: MUREKA_MODELS[requestBody.model || 'auto'],
        created_at: song.created_at,
        original_request: requestBody,
        track_index: index
      }
    }));
    
    // ====================================
    // 8. СОХРАНЕНИЕ В БАЗУ ДАННЫХ
    // ====================================
    const savedTracks = await saveTracksToDatabase(
      processedTracks, 
      generationId, 
      finalProjectId,
      userId,
      supabase
    );
    
    // Обновляем generation статус
    await supabase
      .from('ai_generations')
      .update({
        status: 'completed',
        result_url: processedTracks[0]?.audio_url,
        completed_at: new Date().toISOString(),
        metadata: {
          ...generation.metadata,
          mureka_task_id: finalResponse.task_id,
          tracks_generated: processedTracks.length,
          tracks_saved: savedTracks.length,
          completed_at: new Date().toISOString()
        }
      })
      .eq('id', generationId);
    
    // ====================================
    // 9. ФОРМИРОВАНИЕ ОТВЕТА
    // ====================================
    const processingTime = Date.now() - startTime;
    
    console.log(`[SUCCESS] Request processed in ${processingTime}ms`);
    
    return new Response(JSON.stringify({
      success: true,
      message: `Successfully generated ${savedTracks.length} tracks`,
      data: {
        generation_id: generationId,
        task_id: finalResponse.task_id,
        tracks: savedTracks,
        processing_time: processingTime
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    
    console.error('[ERROR] Request failed:', {
      message: error.message,
      processing_time: processingTime
    });
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      processing_time: processingTime,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});