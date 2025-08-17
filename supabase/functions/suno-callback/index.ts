import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SunoCallbackData {
  code: number;
  msg: string;
  data: {
    callbackType: string;
    task_id: string;
    data: SunoTrackData[];
  };
}

interface SunoTrackData {
  id: string;
  audio_url: string;
  source_audio_url?: string;
  title: string;
  duration: number;
  model_name: string;
  createTime: string;
  lyric?: string;
  image_url?: string;
  video_url?: string;
  style?: string;
  tags?: string;
  prompt?: string;
}

// Функция для фоновой загрузки трека
async function downloadTrackInBackground(generationId: string, externalUrl: string, trackId?: string) {
  try {
    console.log('Starting background download for generation:', generationId);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Вызываем функцию загрузки трека
    const { data, error } = await supabase.functions.invoke('download-and-save-track', {
      body: {
        generation_id: generationId,
        external_url: externalUrl,
        track_id: trackId
      }
    });

    if (error) {
      console.error('Background download error:', error);
      return;
    }

    console.log('Background download completed for generation:', generationId);
  } catch (error) {
    console.error('Error in background download:', error);
  }
}

// Edge Function для обработки колбэков от SunoAPI
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed. Expected POST.' 
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Используем service role для записи
    );

    let callbackData: SunoCallbackData;
    try {
      callbackData = await req.json();
    } catch (parseError) {
      console.error('Failed to parse callback body:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON in callback body' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Suno callback received:', JSON.stringify(callbackData, null, 2));

    // Валидация основных полей
    if (!callbackData.data || !callbackData.data.task_id) {
      console.error('Invalid callback: missing task_id');
      return new Response(JSON.stringify({ 
        error: 'Invalid callback: missing task_id' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { code, msg, data } = callbackData;
    const { callbackType, task_id, data: tracks } = data;

    // Ищем соответствующую запись ai_generations по task_id
    const { data: generation, error: findError } = await supabase
      .from('ai_generations')
      .select('id, track_id, user_id, metadata')
      .eq('service', 'suno')
      .eq('external_id', task_id)
      .single();

    if (findError || !generation) {
      console.error('Generation not found for task_id:', task_id, findError);
      // Всё равно возвращаем 200, чтобы не вызывать повторные колбэки
      return new Response(JSON.stringify({ 
        status: 'received',
        warning: `Generation not found for task_id: ${task_id}`
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Обрабатываем успешную генерацию
    if (code === 200 && callbackType === 'complete' && tracks && tracks.length > 0) {
      console.log(`Processing ${tracks.length} completed tracks for task ${task_id}`);

      // Обрабатываем все треки в массиве, а не только первый
      for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
        const track = tracks[trackIndex];
        
        console.log(`Processing track ${trackIndex + 1}/${tracks.length}:`, track.id);

        // Для первого трека обновляем оригинальную генерацию
        if (trackIndex === 0) {
          // Обновляем статус генерации
          const { error: updateGenError } = await supabase
            .from('ai_generations')
            .update({
              status: 'completed',
              result_url: track.audio_url,
              metadata: {
                ...generation.metadata,
                suno_track_data: track,
                all_tracks: tracks, // Сохраняем все треки в metadata
                total_tracks: tracks.length,
                completed_at: new Date().toISOString(),
                callback_received: true
              }
            })
            .eq('id', generation.id);

          if (updateGenError) {
            console.error('Error updating generation:', updateGenError);
          } else {
            console.log('Generation updated successfully:', generation.id);
          }
        }

        // Для первого трека обновляем существующий track_id
        if (trackIndex === 0 && generation.track_id) {
          // Обновляем существующий трек
          const { error: updateTrackError } = await supabase
            .from('tracks')
            .update({
              title: track.title,
              audio_url: track.audio_url,
              duration: track.duration,
              lyrics: track.prompt || track.lyric || null,
              metadata: {
                ...generation.metadata,
                suno_track_id: track.id,
                suno_model: track.model_name,
                suno_track_data: track,
                track_variant: trackIndex + 1,
                total_variants: tracks.length,
                completed_at: new Date().toISOString(),
                external_audio_url: track.audio_url
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', generation.track_id);

          if (updateTrackError) {
            console.error('Error updating track:', updateTrackError);
          } else {
            console.log('Track updated successfully:', generation.track_id);
            
            // Запускаем фоновую загрузку трека в Supabase Storage
            EdgeRuntime.waitUntil(downloadTrackInBackground(generation.id, track.audio_url, generation.track_id));
          }
        } else {
          // Создаем треки для всех вариантов (включая первый, если у него нет track_id)
          // Генерируем smart title из лирики если нужно
          let smartTitle = track.title;
          if (track.title === 'AI Generated Track 17.08.2025' || !track.title) {
            const lyrics = track.prompt || track.lyric;
            if (lyrics) {
              // Ищем первую строку после [Куплет], [Verse], [Intro] и т.д.
              const lyricsMatch = lyrics.match(/\[(?:Куплет|Verse|Intro|Интро|Припев|Chorus)\s*\d*\]?\s*\n(.+)/i);
              if (lyricsMatch && lyricsMatch[1]) {
                smartTitle = lyricsMatch[1].trim().slice(0, 50);
              } else {
                // Используем первую содержательную строку
                const lines = lyrics.split('\n').filter(line => 
                  line.trim() && 
                  !line.includes('[') && 
                  !line.toLowerCase().includes('создай') &&
                  line.length > 10
                );
                if (lines.length > 0) {
                  smartTitle = lines[0].trim().slice(0, 50);
                }
              }
            }
          }

          // Для дополнительных треков добавляем номер варианта
          if (trackIndex > 0) {
            smartTitle = `${smartTitle} (вариант ${trackIndex + 1})`;
          }

          // Дедуплицируем название трека
          let finalTitle = smartTitle;
          if (projectId) {
            const { data: dedupedTitle, error: dedupError } = await supabase
              .rpc('dedupe_track_title', { 
                p_project_id: projectId, 
                p_title: smartTitle 
              });
            
            if (!dedupError && dedupedTitle) {
              finalTitle = dedupedTitle;
            }
          }

          // Получаем следующий номер трека
          let trackNumber = 1;
          if (projectId) {
            const { data: nextNumber, error: numberError } = await supabase
              .rpc('get_next_track_number', { p_project_id: projectId });
            
            if (!numberError && nextNumber) {
              trackNumber = nextNumber;
            }
          }
          
          // Создаем новый трек
          const { data: newTrack, error: createTrackError } = await supabase
            .from('tracks')
            .insert({
              title: finalTitle,
              track_number: trackNumber,
              audio_url: track.audio_url,
              duration: track.duration,
              lyrics: track.prompt || track.lyric || '',
              description: track.prompt || `Generated with ${track.model_name}`,
              genre_tags: track.tags ? track.tags.split(', ').filter(Boolean) : [],
              style_prompt: track.style || '',
              project_id: projectId,
              metadata: {
                suno_task_id: task_id,
                suno_track_id: track.id,
                suno_model: track.model_name,
                suno_track_data: track,
                generation_id: generation.id,
                track_variant: trackIndex + 1,
                total_variants: tracks.length,
                is_primary: trackIndex === 0,
                completed_at: new Date().toISOString(),
                external_audio_url: track.audio_url,
                auto_inbox: !generation.metadata?.project_id
              }
            })
            .select()
            .single();

          if (createTrackError) {
            console.error(`Error creating track variant ${trackIndex + 1}:`, createTrackError);
          } else {
            console.log(`Track variant ${trackIndex + 1} created successfully:`, newTrack.id);
            
            // Обновляем generation с track_id только для первого трека
            if (trackIndex === 0) {
              await supabase
                .from('ai_generations')
                .update({ track_id: newTrack.id })
                .eq('id', generation.id);
            }
              
            // Запускаем фоновую загрузку трека в Supabase Storage
            EdgeRuntime.waitUntil(downloadTrackInBackground(generation.id, track.audio_url, newTrack.id));
          }
        }
      } // Конец цикла по трекам

    } else if (code !== 200) {
      // Обрабатываем ошибку генерации
      console.error('Generation failed:', msg);
      
      const { error: updateError } = await supabase
        .from('ai_generations')
        .update({
          status: 'failed',
          metadata: {
            ...generation.metadata,
            error_message: msg,
            failed_at: new Date().toISOString(),
            callback_received: true
          }
        })
        .eq('id', generation.id);

      if (updateError) {
        console.error('Error updating failed generation:', updateError);
      }
    }

    // Всегда возвращаем 200 для успешной обработки колбэка
    return new Response(JSON.stringify({ 
      status: 'received',
      task_id: task_id,
      processed_at: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error processing Suno callback:', error);
    
    // Возвращаем 200 даже при ошибке, чтобы избежать повторных колбэков
    return new Response(JSON.stringify({ 
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 200, // 200 чтобы избежать ретраев
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});