import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Базовый in-memory rate limiter (per function instance)
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 10; // 10 requests per window для Mureka
const rateMap = new Map<string, { count: number; reset: number }>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MurekaGenerationRequest {
  prompt: string;
  style?: string;
  duration?: number; // seconds
  genre?: string;
  mood?: string;
  instruments?: string[];
  tempo?: 'slow' | 'medium' | 'fast';
  key?: string; // musical key
}

interface MurekaResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  audio_url?: string;
  title?: string;
  duration?: number;
  created_at: string;
  metadata?: {
    genre?: string;
    mood?: string;
    tempo?: string;
    key?: string;
    instruments?: string[];
  };
}

// T-059: Edge Function для генерации треков через Mureka AI
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
    return new Response(JSON.stringify({ 
      error: 'Rate limit exceeded. Mureka AI generation limited to 10 requests per 15 minutes.',
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

    const { 
      prompt,
      style = "",
      duration = 30, // Default 30 seconds для быстрой генерации
      genre = "electronic",
      mood = "energetic", 
      instruments = [],
      tempo = "medium",
      key = "C",
      trackId = null,
      projectId = null,
      artistId = null,
      title = ""
    } = await req.json();

    console.log('Generating Mureka track with params:', { 
      prompt: prompt.substring(0, 100) + '...', 
      style, 
      duration,
      genre,
      mood,
      tempo
    });

    // Получаем Mureka API ключи
    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    const murekaApiUrl = Deno.env.get('MUREKA_API_URL') || 'https://api.mureka.com';

    if (!murekaApiKey) {
      throw new Error('MUREKA_API_KEY not configured');
    }

    // Подготавливаем данные для Mureka API
    const murekaRequest: MurekaGenerationRequest = {
      prompt,
      style,
      duration,
      genre,
      mood,
      instruments,
      tempo,
      key
    };

    console.log('Making request to Mureka API:', murekaApiUrl);
    
    // Вызов Mureka API для создания трека
    const murekaResponse = await fetch(`${murekaApiUrl}/v1/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${murekaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(murekaRequest),
    });

    if (!murekaResponse.ok) {
      const errorText = await murekaResponse.text();
      console.error('Mureka API Error:', errorText);
      throw new Error(`Mureka API error: ${murekaResponse.status} ${errorText}`);
    }

    const murekaData: MurekaResponse = await murekaResponse.json();
    console.log('Mureka API Response received:', murekaData.id, murekaData.status);

    if (!murekaData || !murekaData.id) {
      throw new Error('Invalid response from Mureka AI');
    }

    // Если генерация в процессе, запускаем polling
    let finalTrack = murekaData;
    if (murekaData.status === 'processing') {
      console.log('Track is processing, starting polling...');
      
      // Polling до завершения (максимум 5 минут)
      const maxAttempts = 60; // 60 попыток по 5 секунд = 5 минут
      let attempts = 0;
      
      while (attempts < maxAttempts && finalTrack.status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 секунд
        
        const statusResponse = await fetch(`${murekaApiUrl}/v1/status/${murekaData.id}`, {
          headers: {
            'Authorization': `Bearer ${murekaApiKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (statusResponse.ok) {
          finalTrack = await statusResponse.json();
          console.log(`Polling attempt ${attempts + 1}:`, finalTrack.status);
        }
        
        attempts++;
      }
    }

    // Создаем или обновляем лирику с Mureka-специфическими тегами
    const processedLyrics = `[Generated by Mureka AI]
${prompt}

[Style: ${style}]
[Genre: ${genre}]
[Mood: ${mood}]
[Tempo: ${tempo}]
[Key: ${key}]
${instruments.length > 0 ? `[Instruments: ${instruments.join(', ')}]` : ''}

{mureka_generation}
Трек создан с помощью искусственного интеллекта Mureka
Продолжительность: ${duration} секунд
{/mureka_generation}`;

    // Сохраняем информацию о генерации в базе данных
    let trackRecord = null;
    let generationRecord = null;

    // Создаем запись в ai_generations
    const { data: generation, error: genError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: userId,
        prompt,
        service: 'mureka',
        status: finalTrack.status === 'completed' ? 'completed' : 'processing',
        result_url: finalTrack.audio_url,
        metadata: {
          mureka_id: finalTrack.id,
          duration: duration,
          genre: genre,
          mood: mood,
          tempo: tempo,
          key: key,
          instruments: instruments,
          style: style,
          mureka_response: finalTrack
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
          audio_url: finalTrack.audio_url,
          duration: finalTrack.duration || duration,
          metadata: {
            mureka_id: finalTrack.id,
            mureka_response: finalTrack,
            generation_id: generation?.id,
            genre: genre,
            mood: mood,
            tempo: tempo,
            key: key,
            instruments: instruments
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
          title: title || finalTrack.title || `AI Track ${genre.charAt(0).toUpperCase()}${genre.slice(1)}`,
          lyrics: processedLyrics,
          description: `Mureka AI generated ${genre} track in ${key} key with ${mood} mood`,
          audio_url: finalTrack.audio_url,
          duration: finalTrack.duration || duration,
          genre_tags: [genre, mood, tempo].filter(Boolean),
          style_prompt: style,
          project_id: projectId,
          artist_id: artistId,
          metadata: {
            mureka_id: finalTrack.id,
            mureka_response: finalTrack,
            generation_id: generation?.id,
            genre: genre,
            mood: mood,
            tempo: tempo,
            key: key,
            instruments: instruments
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

    // Возвращаем результат
    return new Response(JSON.stringify({
      success: true,
      data: {
        mureka: finalTrack,
        track: trackRecord,
        generation: generationRecord,
        audio_url: finalTrack.audio_url,
        title: finalTrack.title || title,
        duration: finalTrack.duration || duration,
        lyrics: processedLyrics,
        status: finalTrack.status
      },
      metadata: {
        service: 'mureka',
        genre: genre,
        mood: mood,
        tempo: tempo,
        key: key,
        instruments: instruments,
        generatedAt: new Date().toISOString(),
        processingTime: finalTrack.status === 'completed' ? 'immediate' : `polled_${Math.floor((Date.now() - now) / 1000)}s`
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-mureka-track function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      service: 'mureka',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});