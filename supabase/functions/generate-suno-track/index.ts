import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Базовый in-memory rate limiter (per function instance)
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 5; // 5 requests per window для Suno
const rateMap = new Map<string, { count: number; reset: number }>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerationRequest {
  prompt: string;
  style?: string;
  title?: string;
  tags?: string;
  make_instrumental?: boolean;
  wait_audio?: boolean;
  model?: string; // chirp-v3-5 or chirp-v3-0
  mode?: 'quick' | 'custom';
  custom_lyrics?: string;
  voice_style?: string;
  language?: string;
  tempo?: string;
}

interface SunoResponse {
  id: string;
  title?: string;
  image_url?: string;
  lyric?: string;
  audio_url?: string;
  video_url?: string;
  created_at?: string;
  model_name?: string;
  status?: string;
  gpt_description_prompt?: string;
  prompt?: string;
  type?: string;
  tags?: string;
}

// T-058: Edge Function для генерации треков через Suno AI
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

  // Rate limit per user (stricter for music generation)
  const now = Date.now();
  const rl = rateMap.get(userId);
  if (!rl || now > rl.reset) {
    rateMap.set(userId, { count: 1, reset: now + RATE_LIMIT_WINDOW });
  } else if (rl.count >= RATE_LIMIT_MAX) {
    return new Response(JSON.stringify({ 
      error: 'Rate limit exceeded. Suno AI generation limited to 5 requests per 10 minutes.',
      retryAfter: Math.ceil((rl.reset - now) / 1000)
    }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } else {
    rl.count++;
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }

    const { 
      prompt,
      style = "",
      title = "",
      tags = "energetic, creative, viral",
      make_instrumental = false,
      wait_audio = true,
      model = "chirp-v3-5",
      trackId = null,
      projectId = null,
      artistId = null,
      mode = "quick",
      custom_lyrics = "",
      voice_style = "",
      language = "ru",
      tempo = ""
    } = requestBody;

    // Валидация обязательных полей в зависимости от режима
    if (mode === 'custom' && custom_lyrics && custom_lyrics.trim().length > 0) {
      // В кастомном режиме с пользовательской лирикой prompt может быть пустым
    } else if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required and cannot be empty');
    }

    console.log('Generating Suno track with params:', { 
      prompt: prompt ? prompt.substring(0, 100) + '...' : '[using custom lyrics]',
      style, 
      title,
      model,
      make_instrumental,
      mode,
      custom_lyrics: custom_lyrics ? custom_lyrics.substring(0, 50) + '...' : '',
      voice_style,
      language,
      tempo
    });

    // Получаем Suno API ключ
    const sunoApiKey = Deno.env.get('SUNOAPI_ORG_KEY');
    const sunoApiUrl = Deno.env.get('SUNO_API_URL') || 'https://api.sunoapi.org';

    if (!sunoApiKey) {
      throw new Error('SUNOAPI_ORG_KEY not configured');
    }

    // Подготавливаем данные согласно официальной документации SunoAPI.org
    let requestPrompt = prompt;
    
    // В кастомном режиме используем пользовательскую лирику если есть
    if (mode === 'custom' && custom_lyrics && custom_lyrics.trim().length > 0) {
      requestPrompt = custom_lyrics;
    }
    
    const sunoRequest: any = {
      prompt: requestPrompt || prompt,
      style: style || 'Pop, Electronic',
      title: title || `AI Generated ${new Date().toLocaleDateString('ru-RU')}`,
      customMode: true, // Используем Custom Mode для контроля
      instrumental: make_instrumental,
      model: model.replace('chirp-v', 'V').replace('-', '_'), // chirp-v3-5 -> V3_5
      callBackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/suno-callback` // Наш callback endpoint
    };

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

    console.log('Making request to Suno API:', sunoApiUrl);
    
    // Вызов SunoAPI.org с правильным эндпоинтом из документации
    console.log('Making request with body:', JSON.stringify(sunoRequest, null, 2));
    
    const endpoint = '/api/v1/generate'; // Правильный эндпоинт из документации
    console.log('Using correct endpoint:', `${sunoApiUrl}${endpoint}`);
    
    const sunoResponse = await fetch(`${sunoApiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(sunoRequest),
    });

    console.log('Suno API Response status:', sunoResponse.status);
    console.log('Suno API Response headers:', Object.fromEntries(sunoResponse.headers.entries()));

    if (!sunoResponse.ok) {
      const errorText = await sunoResponse.text();
      console.error('Suno API Error Response:', errorText);
      console.error('Request URL:', `${sunoApiUrl}${endpoint}`);
      console.error('Request Headers:', {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
      });
      throw new Error(`Suno API error: ${sunoResponse.status} ${errorText}`);
    }

    const sunoData = await sunoResponse.json();
    console.log('Suno API Response received:', sunoData);

    if (!sunoData || sunoData.code !== 200) {
      throw new Error(`Suno API error: ${sunoData.msg || 'Unknown error'}`);
    }

    if (!sunoData.data || !sunoData.data.taskId) {
      throw new Error('No task ID received from Suno AI');
    }

    // SunoAPI возвращает taskId, а не готовый трек
    const taskId = sunoData.data.taskId;
    console.log('Generation task started with ID:', taskId);

    // Создаем mock response для совместимости с существующим кодом
    const generatedTrack = {
      id: taskId,
      title: sunoRequest.title,
      status: 'processing',
      // audio_url будет получен позже через polling или callback
      metadata: {
        task_id: taskId,
        model: sunoRequest.model,
        custom_mode: sunoRequest.customMode
      }
    };

    // Сохраняем информацию о генерации в базе данных
    let trackRecord = null;
    let generationRecord = null;

    // Создаем запись в ai_generations
    const { data: generation, error: genError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: userId,
        prompt,
        service: 'suno',
        status: generatedTrack.status || 'completed',
        result_url: generatedTrack.audio_url,
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
          suno_response: sunoData
        },
        track_id: trackId
      })
      .select()
      .single();

    if (genError) {
      console.error('Error saving generation:', genError);
    } else {
      generationRecord = generation;
      console.log('Generation saved:', generation.id);
    }

    // Если есть trackId, обновляем существующий трек
    if (trackId) {
      const { data: updatedTrack, error: trackError } = await supabase
        .from('tracks')
        .update({
          audio_url: generatedTrack.audio_url,
          metadata: {
            suno_task_id: taskId,
            suno_id: generatedTrack.id,
            suno_response: sunoData,
            generation_id: generation?.id,
            model: sunoRequest.model,
            custom_mode: sunoRequest.customMode,
            mode,
            custom_lyrics: mode === 'custom' ? custom_lyrics : null,
            voice_style: sunoRequest.voiceStyle || null,
            language: sunoRequest.language || null,
            tempo: sunoRequest.tempo || null
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', trackId)
        .select()
        .single();

      if (trackError) {
        console.error('Error updating track:', trackError);
      } else {
        trackRecord = updatedTrack;
        console.log('Track updated:', updatedTrack.id);
      }
    } else {
      // Создаем новый трек если trackId не указан
      const { data: newTrack, error: trackError } = await supabase
        .from('tracks')
        .insert({
          title: generatedTrack.title || title || 'AI Generated Track',
          lyrics: generatedTrack.lyric || (mode === 'custom' && custom_lyrics ? custom_lyrics : prompt),
          description: generatedTrack.gpt_description_prompt || prompt,
          audio_url: generatedTrack.audio_url,
          genre_tags: tags.split(', ').filter(Boolean),
          style_prompt: style,
          project_id: projectId,
          artist_id: artistId,
          metadata: {
            suno_task_id: taskId,
            suno_id: generatedTrack.id,
            suno_response: sunoData,
            generation_id: generation?.id,
            model: sunoRequest.model,
            custom_mode: sunoRequest.customMode,
            mode,
            custom_lyrics: mode === 'custom' ? custom_lyrics : null,
            voice_style: sunoRequest.voiceStyle || null,
            language: sunoRequest.language || null,
            tempo: sunoRequest.tempo || null
          }
        })
        .select()
        .single();

      if (trackError) {
        console.error('Error creating track:', trackError);
      } else {
        trackRecord = newTrack;
        console.log('Track created:', newTrack.id);

        // Обновляем generation с track_id
        if (generation?.id) {
          await supabase
            .from('ai_generations')
            .update({ track_id: newTrack.id })
            .eq('id', generation.id);
        }
      }
    }

    // Возвращаем результат с task ID для polling
    return new Response(JSON.stringify({
      success: true,
      data: {
        suno: generatedTrack,
        track: trackRecord,
        generation: generationRecord,
        task_id: taskId,
        status: 'processing',
        title: generatedTrack.title || title,
        message: `Track generation started. Use task ID ${taskId} to check status.`
      },
      metadata: {
        service: 'suno',
        model: sunoRequest.model,
        custom_mode: sunoRequest.customMode,
        generatedAt: new Date().toISOString(),
        processingType: 'async_with_task_id'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-suno-track function:', error);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      service: 'suno',
      timestamp: new Date().toISOString(),
      debug: {
        errorType: error.name,
        errorStack: error.stack?.slice(0, 500) // Первые 500 символов stack trace
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});