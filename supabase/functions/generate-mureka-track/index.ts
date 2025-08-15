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
  lyrics: string;
  model?: 'auto' | 'mureka-6' | 'mureka-7' | 'mureka-o1';
  prompt?: string;
  reference_id?: string;
  vocal_id?: string;
  melody_id?: string;
  stream?: boolean;
}

interface MurekaTaskResponse {
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
      lyrics,
      model = "auto",
      style = "",
      duration = 120, // Default 120 seconds (2 minutes)
      genre = "electronic",
      mood = "energetic", 
      instruments = [],
      tempo = "medium",
      key = "C",
      trackId = null,
      projectId = null,
      artistId = null,
      title = "",
      mode = "quick",
      custom_lyrics = "",
      instrumental = false,
      language = "ru",
      reference_id = null,
      vocal_id = null,
      melody_id = null,
      stream = false,
      useInbox = false
    } = await req.json();

    // Handle context (inbox logic)
    let finalProjectId = projectId;
    let finalArtistId = artistId;

    // If useInbox is true or no context provided, use inbox logic
    if (useInbox || (!projectId && !artistId)) {
      console.log('Using inbox logic, useInbox:', useInbox);
      
      const { data: inboxProjectId, error: inboxError } = await supabase
        .rpc('ensure_user_inbox', { p_user_id: userId });

      if (inboxError) {
        console.error('Failed to ensure inbox:', inboxError);
        throw new Error('Failed to create inbox project');
      }

      finalProjectId = inboxProjectId;
      console.log('Using inbox project:', finalProjectId);
    }

    console.log('Generating Mureka track with params:', { 
      prompt: prompt ? prompt.substring(0, 100) + '...' : '[using custom lyrics]',
      style, 
      duration,
      genre,
      mood,
      tempo,
      mode,
      custom_lyrics: custom_lyrics ? custom_lyrics.substring(0, 50) + '...' : '',
      instrumental,
      language,
      useInbox,
      finalProjectId,
      finalArtistId
    });

    // Получаем Mureka API ключи
    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    const murekaApiUrl = Deno.env.get('MUREKA_API_URL') || 'https://api.mureka.com';

    if (!murekaApiKey) {
      throw new Error('MUREKA_API_KEY not configured');
    }

    // Fix: Separate lyrics and prompt handling
    let requestLyrics = '';
    let requestPrompt = '';

    const looksLikeLyrics = (text?: string) => {
      if (!text) return false;
      const t = text.toLowerCase();
      if (t.includes('создай') || t.includes('сгенерируй')) return false;
      return /\[?(verse|chorus|bridge|intro|outro|куплет|припев|бридж)\]?/i.test(text) || /\n/.test(text) || text.split(/\s+/).length > 12;
    };
    
    if (custom_lyrics && custom_lyrics.trim().length > 0) {
      // User provided explicit lyrics
      requestLyrics = custom_lyrics;
      requestPrompt = style || `${genre}, ${mood}, ${tempo}`;
    } else if (lyrics && lyrics.trim().length > 0) {
      // User provided lyrics in lyrics field
      requestLyrics = lyrics;
      requestPrompt = style || `${genre}, ${mood}, ${tempo}`;
    } else if (instrumental) {
      // Instrumental track - no lyrics needed
      requestLyrics = '';
      requestPrompt = prompt || style || `${genre}, ${mood}, ${tempo}`;
    } else if (looksLikeLyrics(prompt)) {
      // The prompt field actually contains lyrics
      requestLyrics = prompt!;
      requestPrompt = style || `${genre}, ${mood}, ${tempo}`;
    } else {
      // No lyrics provided, keep lyrics empty to let service generate its own
      requestLyrics = '';
      requestPrompt = prompt || style || `${genre}, ${mood}, ${tempo}`;
    }
    
    const murekaRequest: MurekaGenerationRequest = {
      lyrics: requestLyrics,
      model,
      prompt: requestPrompt,
      stream
    };

    // Add control options (mutually exclusive)
    if (reference_id) {
      murekaRequest.reference_id = reference_id;
      delete murekaRequest.prompt; // Cannot use prompt with reference_id
    } else if (vocal_id) {
      murekaRequest.vocal_id = vocal_id;
      delete murekaRequest.prompt; // Cannot use prompt with vocal_id
    } else if (melody_id) {
      murekaRequest.melody_id = melody_id;
      delete murekaRequest.prompt; // Cannot use prompt with melody_id
    }

    console.log('Making request to Mureka API with official endpoint');
    
    // Call Mureka API to create track using official endpoint
    const murekaResponse = await fetch('https://api.mureka.ai/v1/song/generate', {
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

    const murekaData: MurekaTaskResponse = await murekaResponse.json();
    console.log('Mureka API Response received:', murekaData.id, murekaData.status);

    if (!murekaData || !murekaData.id) {
      throw new Error('Invalid response from Mureka AI');
    }

    // Poll for completion using official endpoint
    let finalTrack = murekaData;
    if (['preparing', 'queued', 'running', 'streaming'].includes(murekaData.status)) {
      console.log('Track is processing, starting polling...');
      
      // Polling until completion (max 5 minutes)
      const maxAttempts = 60; // 60 attempts every 5 seconds = 5 minutes
      let attempts = 0;
      
      while (attempts < maxAttempts && ['preparing', 'queued', 'running', 'streaming'].includes(finalTrack.status)) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds
        
        const statusResponse = await fetch(`https://api.mureka.ai/v1/song/query/${murekaData.id}`, {
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

    // Create processed lyrics with Mureka-specific metadata
    const processedLyrics = instrumental ? 
      `[Generated by Mureka AI - Model: ${model}]
[Instrumental Track]

[Generation Prompt: ${prompt}]

[Metadata]
[Model: ${model}]
[Style: ${requestPrompt}]
[Genre: ${genre}]
[Mood: ${mood}]
[Tempo: ${tempo}]
[Key: ${key}]
${instruments.length > 0 ? `[Instruments: ${instruments.join(', ')}]` : ''}
[Instrumental: Yes]
${language !== 'ru' ? `[Language: ${language}]` : ''}
${reference_id ? `[Reference ID: ${reference_id}]` : ''}
${vocal_id ? `[Vocal ID: ${vocal_id}]` : ''}
${melody_id ? `[Melody ID: ${melody_id}]` : ''}
${stream ? '[Streaming Enabled]' : ''}

{mureka_generation}
Track created with Mureka AI using official API v1
Model: ${model}
Task ID: ${finalTrack.id}
Status: ${finalTrack.status}
{/mureka_generation}` :
      `[Generated by Mureka AI - Model: ${model}]
${requestLyrics}

[Metadata]
[Model: ${model}]
[Style: ${requestPrompt}]
[Genre: ${genre}]
[Mood: ${mood}]
[Tempo: ${tempo}]
[Key: ${key}]
${instruments.length > 0 ? `[Instruments: ${instruments.join(', ')}]` : ''}
${language !== 'ru' ? `[Language: ${language}]` : ''}
${reference_id ? `[Reference ID: ${reference_id}]` : ''}
${vocal_id ? `[Vocal ID: ${vocal_id}]` : ''}
${melody_id ? `[Melody ID: ${melody_id}]` : ''}
${stream ? '[Streaming Enabled]' : ''}

{mureka_generation}
Track created with Mureka AI using official API v1
Model: ${model}
Task ID: ${finalTrack.id}
Status: ${finalTrack.status}
{/mureka_generation}`;

    // Сохраняем информацию о генерации в базе данных
    let trackRecord = null;
    let generationRecord = null;

    // Создаем запись в ai_generations
    const { data: generation, error: genError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: userId,
        prompt: prompt || requestLyrics.substring(0, 500),
        service: 'mureka',
        status: finalTrack.status === 'succeeded' ? 'completed' : finalTrack.status === 'failed' ? 'failed' : 'processing',
        result_url: finalTrack.choices?.[0]?.audio_url,
        metadata: {
          mureka_task_id: finalTrack.id,
          model: finalTrack.model,
          created_at: finalTrack.created_at,
          finished_at: finalTrack.finished_at,
          failed_reason: finalTrack.failed_reason,
          duration: finalTrack.choices?.[0]?.duration || duration,
          title: finalTrack.choices?.[0]?.title,
          genre: genre,
          mood: mood,
          tempo: tempo,
          key: key,
          instruments: instruments,
          style: style,
          mode,
          custom_lyrics: custom_lyrics,
          lyrics: requestLyrics,
          instrumental,
          language,
          reference_id,
          vocal_id,
          melody_id,
          stream,
          mureka_response: finalTrack,
          project_id: finalProjectId,
          artist_id: finalArtistId
        },
        parameters: {
          prompt,
          lyrics,
          model,
          style,
          duration,
          genre,
          mood,
          instruments,
          tempo,
          key,
          trackId,
          projectId: finalProjectId,
          artistId: finalArtistId,
          title,
          mode,
          custom_lyrics,
          instrumental,
          language,
          reference_id,
          vocal_id,
          melody_id,
          stream
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
          audio_url: finalTrack.choices?.[0]?.audio_url,
          duration: finalTrack.choices?.[0]?.duration || duration,
          metadata: {
            mureka_task_id: finalTrack.id,
            model: finalTrack.model,
            mureka_response: finalTrack,
            generation_id: generation?.id,
            genre: genre,
            mood: mood,
            tempo: tempo,
            key: key,
            instruments: instruments,
            mode,
            custom_lyrics: custom_lyrics,
            lyrics: requestLyrics,
            instrumental,
            language,
            reference_id,
            vocal_id,
            melody_id,
            stream
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
          title: title || finalTrack.choices?.[0]?.title || `AI Track ${genre.charAt(0).toUpperCase()}${genre.slice(1)}`,
          lyrics: processedLyrics,
          description: `Mureka AI generated ${genre} track using ${model} model with ${mood} mood`,
          audio_url: finalTrack.choices?.[0]?.url,
          duration: finalTrack.choices?.[0]?.duration || duration,
          genre_tags: [genre, mood, tempo].filter(Boolean),
          style_prompt: style,
          project_id: finalProjectId,
          track_number: 1,
          metadata: {
            mureka_task_id: finalTrack.id,
            model: finalTrack.model,
            mureka_response: finalTrack,
            generation_id: generationRecord?.id,
            genre: genre,
            mood: mood,
            tempo: tempo,
            key: key,
            instruments: instruments,
            mode,
            custom_lyrics: custom_lyrics,
            lyrics: requestLyrics,
            instrumental,
            language,
            reference_id,
            vocal_id,
            melody_id,
            stream
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
        if (generationRecord?.id) {
          await supabase
            .from('ai_generations')
            .update({ track_id: newTrack.id })
            .eq('id', generationRecord.id);
        }
      }
    }

    // Return result
    return new Response(JSON.stringify({
      success: true,
      data: {
        mureka: finalTrack,
        track: trackRecord,
        generation: generationRecord,
        audio_url: finalTrack.choices?.[0]?.url,
        title: finalTrack.choices?.[0]?.title || title,
        duration: finalTrack.choices?.[0]?.duration || duration,
        lyrics: processedLyrics,
        status: finalTrack.status,
        taskId: finalTrack.id,
        model: finalTrack.model
      },
      metadata: {
        service: 'mureka',
        model: finalTrack.model,
        genre: genre,
        mood: mood,
        tempo: tempo,
        key: key,
        instruments: instruments,
        reference_id,
        vocal_id,
        melody_id,
        stream,
        generatedAt: new Date().toISOString(),
        processingTime: finalTrack.status === 'succeeded' ? 'immediate' : `polled_${Math.floor((Date.now() - now) / 1000)}s`
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