import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Edge Function для синхронизации всех сгенерированных треков
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Получаем пользователя из заголовка авторизации
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    console.log('Syncing generated tracks for user:', user.id);

    // Находим все completed генерации с result_url, которые еще не имеют соответствующих треков
    const { data: generations, error: fetchError } = await supabase
      .from('ai_generations')
      .select(`
        id,
        user_id,
        service,
        status,
        result_url,
        metadata,
        track_id,
        created_at,
        prompt,
        parameters
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('result_url', 'is', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch generations: ${fetchError.message}`);
    }

    console.log(`Found ${generations?.length || 0} completed generations`);

    const syncResults = [];
    const toCreateTracks = [];
    const toDownload = [];

    // Получаем inbox проект для пользователя
    const { data: inboxProject, error: inboxError } = await supabase.rpc('ensure_user_inbox', {
      p_user_id: user.id
    });

    if (inboxError) {
      console.error('Error ensuring inbox project:', inboxError);
      throw new Error(`Failed to ensure inbox project: ${inboxError.message}`);
    }

    // Проверяем какие генерации нуждаются в создании треков
    for (const gen of generations || []) {
      console.log(`Checking generation ${gen.id}: ${gen.metadata?.title || gen.prompt?.slice(0, 30)}`);
      
      // Проверяем есть ли уже трек для этой генерации
      const { data: existingTrack, error: trackError } = await supabase
        .from('tracks')
        .select('id, audio_url')
        .eq('metadata->>generation_id', gen.id)
        .single();

      console.log(`Generation ${gen.id} existing track:`, existingTrack, trackError?.message);

      if (!existingTrack && !trackError?.message?.includes('not found')) {
        console.error(`Error checking track for generation ${gen.id}:`, trackError);
        continue;
      }

      if (!existingTrack) {
        // Нет трека - нужно создать
        console.log(`Generation ${gen.id} needs track creation`);
        toCreateTracks.push(gen);
        
        // Если URL внешний и не скачан - добавляем в очередь на скачивание
        const isExternalUrl = gen.result_url && (
          gen.result_url.includes('sunoapi.org') ||
          gen.result_url.includes('mureka.ai') ||
          gen.result_url.includes('suno.com') ||
          !gen.result_url.includes(Deno.env.get('SUPABASE_URL') || '')
        );

        const needsDownload = isExternalUrl && !gen.metadata?.local_storage_path;
        
        if (needsDownload) {
          toDownload.push(gen);
        }
      } else if (!existingTrack.audio_url && gen.result_url) {
        // Трек есть, но без audio_url - нужно обновить
        console.log(`Generation ${gen.id} needs track update (missing audio_url)`);
        toCreateTracks.push({ ...gen, existing_track_id: existingTrack.id });
      } else {
        console.log(`Generation ${gen.id} already has track with audio_url`);
      }
    }

    console.log(`Found ${toCreateTracks.length} tracks to create/update`);
    console.log(`Track actions needed:`, toCreateTracks.map(t => ({ 
      id: t.id, 
      title: t.metadata?.title || t.prompt?.slice(0, 30),
      action: t.existing_track_id ? 'update' : 'create',
      has_result_url: !!t.result_url
    })));
    console.log(`Found ${toDownload.length} tracks to download`);

    // Создаем/обновляем треки в базе данных
    for (const gen of toCreateTracks) {
      try {
        
        // Извлекаем лирику из Suno track data - проверяем все треки
        const sunoTrackData = gen.metadata?.suno_track_data;
        const allTracks = gen.metadata?.all_tracks || [sunoTrackData].filter(Boolean);
        const primaryTrack = allTracks[0] || sunoTrackData;
        const extractedLyrics = primaryTrack?.prompt || primaryTrack?.lyric || null;
        
        
        // Генерируем умное название из лирики или используем из Suno
        let smartTitle = gen.metadata?.title || 'Сгенерированный трек';
        if (primaryTrack?.title && primaryTrack.title !== 'AI Generated Track 17.08.2025') {
          smartTitle = primaryTrack.title;
        } else if (extractedLyrics) {
          // Извлекаем первую строку после [Куплет] или [Verse] как название
          const lyricsMatch = extractedLyrics.match(/\[(?:Куплет|Verse|Intro|Интро)\s*\d*\]?\s*\n(.+)/i);
          if (lyricsMatch && lyricsMatch[1]) {
            smartTitle = lyricsMatch[1].trim().slice(0, 50);
          } else {
            // Используем первую осмысленную строку
            const lines = extractedLyrics.split('\n').filter(line => 
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

        const trackData = {
          title: smartTitle,
          description: gen.prompt || null,
          lyrics: extractedLyrics, // ← КРИТИЧЕСКИ ВАЖНО: сохраняем лирику!
          audio_url: gen.result_url,
          project_id: inboxProject,
          track_number: await getNextTrackNumber(supabase, inboxProject),
          metadata: {
            ...gen.metadata,
            generation_id: gen.id,
            service: gen.service,
            generated_by_ai: true,
            ai_service: gen.service,
            suno_id: gen.metadata?.suno_id || gen.external_id,
            suno_task_id: gen.metadata?.suno_task_id || gen.external_id,
            image_url: primaryTrack?.image_url || primaryTrack?.sourceImageUrl, // Обложка
            total_tracks_available: allTracks.length, // Информация о доступных вариантах
            original_title_generated: smartTitle !== (gen.metadata?.title || 'Сгенерированный трек')
          },
          genre_tags: gen.metadata?.tags || [],
          style_prompt: gen.metadata?.style || null,
          duration: gen.metadata?.duration || null
        };

        let trackResult;
        if (gen.existing_track_id) {
          // Обновляем существующий трек
          const { data, error } = await supabase
            .from('tracks')
            .update(trackData)
            .eq('id', gen.existing_track_id)
            .select()
            .single();
            
          trackResult = { data, error };
        } else {
          // Создаем новый трек
          const { data, error } = await supabase
            .from('tracks')
            .insert(trackData)
            .select()
            .single();
            
          trackResult = { data, error };
        }

        if (trackResult.error) {
          throw trackResult.error;
        }

        // Обновляем генерацию с ссылкой на трек
        if (!gen.existing_track_id) {
          await supabase
            .from('ai_generations')
            .update({ track_id: trackResult.data.id })
            .eq('id', gen.id);
        }

        syncResults.push({
          generation_id: gen.id,
          success: true,
          action: gen.existing_track_id ? 'updated' : 'created',
          track_id: trackResult.data.id
        });

        console.log(`Successfully ${gen.existing_track_id ? 'updated' : 'created'} track for generation ${gen.id}`);
        
      } catch (error: any) {
        console.error(`Error creating/updating track for generation ${gen.id}:`, error);
        syncResults.push({
          generation_id: gen.id,
          success: false,
          error: error.message
        });
      }
    }

    // Загружаем треки порциями для избежания таймаутов (только для внешних URL)
    const batchSize = 3;
    for (let i = 0; i < toDownload.length; i += batchSize) {
      const batch = toDownload.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (gen) => {
        try {
          console.log(`Downloading track for generation ${gen.id}`);
          
          // Вызываем функцию загрузки трека
          const { data: downloadResult, error: downloadError } = await supabase.functions.invoke(
            'download-and-save-track',
            {
              body: {
                generation_id: gen.id,
                external_url: gen.result_url,
                track_id: gen.track_id
              }
            }
          );

          if (downloadError) {
            throw downloadError;
          }

          return {
            generation_id: gen.id,
            success: true,
            result: downloadResult
          };
        } catch (error: any) {
          console.error(`Error downloading track for generation ${gen.id}:`, error);
          return {
            generation_id: gen.id,
            success: false,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      syncResults.push(...batchResults);

      // Небольшая пауза между батчами
      if (i + batchSize < toDownload.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Вспомогательная функция для получения следующего номера трека
    async function getNextTrackNumber(supabase: any, projectId: string) {
      const { data } = await supabase.rpc('get_next_track_number', {
        p_project_id: projectId
      });
      return data || 1;
    }

    // Статистика
    const successful = syncResults.filter(r => r.success).length;
    const failed = syncResults.filter(r => !r.success).length;
    const created = syncResults.filter(r => r.success && r.action === 'created').length;
    const updated = syncResults.filter(r => r.success && r.action === 'updated').length;
    const downloaded = syncResults.filter(r => r.success && r.result).length;

    console.log(`Sync completed. Created: ${created}, Updated: ${updated}, Downloaded: ${downloaded}, Failed: ${failed}`);

    // Получаем обновленный список треков
    const { data: updatedTracks, error: tracksError } = await supabase
      .from('tracks')
      .select(`
        id,
        title,
        track_number,
        duration,
        audio_url,
        created_at,
        project_id,
        projects(title, artist_id, artists(name))
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (tracksError) {
      console.error('Error fetching updated tracks:', tracksError);
    }

    const response = {
      success: true,
      data: {
        sync_results: syncResults,
        summary: {
          total_checked: generations?.length || 0,
          tracks_to_create: toCreateTracks.length,
          tracks_created: created,
          tracks_updated: updated,
          needed_download: toDownload.length,
          successful_downloads: downloaded,
          failed_operations: failed
        },
        tracks: updatedTracks || []
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error syncing generated tracks:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});