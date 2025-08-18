import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SunoTrackInfo {
  id: string;
  title: string;
  audio_url: string;
  image_url?: string;
  lyrics?: string;
  duration?: number;
  model_name?: string;
  tags?: string;
  createTime?: number;
  status?: string;
}

/**
 * Функция для восстановления незагруженных Suno треков
 * Использует Suno API для получения актуальной информации о треках
 */
serve(async (req) => {
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

    // Получаем пользователя
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    console.log('Starting Suno track recovery for user:', user.id);

    // Получаем API ключи Suno
    const sunoApiKey = Deno.env.get('SUNOAPI_ORG_TOKEN');
    if (!sunoApiKey) {
      throw new Error('SUNOAPI_ORG_TOKEN not configured');
    }

    // Ищем проблемные Suno генерации
    const { data: problematicGenerations, error: fetchError } = await supabase
      .from('ai_generations')
      .select(`
        id,
        user_id,
        external_id,
        status,
        result_url,
        track_id,
        metadata,
        prompt,
        created_at,
        completed_at
      `)
      .eq('user_id', user.id)
      .eq('service', 'suno')
      .not('external_id', 'is', null)
      .or('result_url.is.null,track_id.is.null')
      .order('created_at', { ascending: false })
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch problematic generations: ${fetchError.message}`);
    }

    console.log(`Found ${problematicGenerations?.length || 0} problematic Suno generations`);

    const results = {
      checked: 0,
      recovered: 0,
      failed: 0,
      created_tracks: 0,
      downloaded: 0,
      errors: [] as any[]
    };

    // Получаем inbox проект
    const { data: inboxProjectId, error: inboxError } = await supabase.rpc('ensure_user_inbox', {
      p_user_id: user.id
    });

    if (inboxError) {
      throw new Error(`Failed to ensure inbox project: ${inboxError.message}`);
    }

    // Обрабатываем каждую проблемную генерацию
    for (const gen of problematicGenerations || []) {
      try {
        results.checked++;
        console.log(`\n[${results.checked}/${problematicGenerations?.length}] Checking generation ${gen.id} with external_id: ${gen.external_id}`);

        // Запрашиваем информацию о треке через Suno API
        const trackInfo = await getSunoTrackInfo(gen.external_id, sunoApiKey);
        
        if (!trackInfo) {
          console.log(`No track info found for external_id: ${gen.external_id}`);
          results.failed++;
          results.errors.push({
            generation_id: gen.id,
            external_id: gen.external_id,
            error: 'Track not found in Suno API'
          });
          continue;
        }

        console.log(`Found track info for ${gen.external_id}:`, {
          title: trackInfo.title,
          status: trackInfo.status,
          has_audio: !!trackInfo.audio_url,
          duration: trackInfo.duration
        });

        // Обновляем генерацию с новой информацией
        const updatedMetadata = {
          ...gen.metadata,
          suno_track_data: trackInfo,
          title: trackInfo.title,
          duration: trackInfo.duration,
          recovered_at: new Date().toISOString(),
          recovery_source: 'suno_api'
        };

        const { error: updateGenError } = await supabase
          .from('ai_generations')
          .update({
            result_url: trackInfo.audio_url,
            status: trackInfo.status === 'complete' ? 'completed' : gen.status,
            metadata: updatedMetadata,
            completed_at: trackInfo.status === 'complete' && !gen.completed_at 
              ? new Date().toISOString() 
              : gen.completed_at
          })
          .eq('id', gen.id);

        if (updateGenError) {
          console.error(`Failed to update generation ${gen.id}:`, updateGenError);
          results.errors.push({
            generation_id: gen.id,
            error: `Failed to update generation: ${updateGenError.message}`
          });
          continue;
        }

        results.recovered++;
        console.log(`✅ Recovered generation ${gen.id}`);

        // Если нет трека, создаем его
        if (!gen.track_id && trackInfo.audio_url) {
          try {
            const { data: trackId, error: createTrackError } = await supabase.rpc(
              'create_or_update_track_from_generation',
              {
                p_generation_id: gen.id,
                p_project_id: inboxProjectId
              }
            );

            if (createTrackError) {
              console.error(`Failed to create track for generation ${gen.id}:`, createTrackError);
              results.errors.push({
                generation_id: gen.id,
                error: `Failed to create track: ${createTrackError.message}`
              });
            } else {
              results.created_tracks++;
              console.log(`✅ Created track ${trackId} for generation ${gen.id}`);

              // Если URL внешний, планируем скачивание
              if (trackInfo.audio_url && !trackInfo.audio_url.includes(Deno.env.get('SUPABASE_URL') || '')) {
                try {
                  const { error: downloadError } = await supabase.functions.invoke(
                    'download-and-save-track',
                    {
                      body: {
                        generation_id: gen.id,
                        external_url: trackInfo.audio_url,
                        track_id: trackId
                      }
                    }
                  );

                  if (downloadError) {
                    console.error(`Failed to download track for generation ${gen.id}:`, downloadError);
                    results.errors.push({
                      generation_id: gen.id,
                      error: `Failed to download: ${downloadError.message}`
                    });
                  } else {
                    results.downloaded++;
                    console.log(`✅ Downloaded track for generation ${gen.id}`);
                  }
                } catch (downloadError: any) {
                  console.error(`Download error for generation ${gen.id}:`, downloadError);
                  results.errors.push({
                    generation_id: gen.id,
                    error: `Download failed: ${downloadError.message}`
                  });
                }
              }
            }
          } catch (trackError: any) {
            console.error(`Track creation error for generation ${gen.id}:`, trackError);
            results.errors.push({
              generation_id: gen.id,
              error: `Track creation failed: ${trackError.message}`
            });
          }
        }

        // Небольшая пауза между запросами к API
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error: any) {
        console.error(`Error processing generation ${gen.id}:`, error);
        results.failed++;
        results.errors.push({
          generation_id: gen.id,
          external_id: gen.external_id,
          error: error.message
        });
      }
    }

    console.log('\n=== Recovery Results ===');
    console.log(`Checked: ${results.checked}`);
    console.log(`Recovered: ${results.recovered}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Created tracks: ${results.created_tracks}`);
    console.log(`Downloaded: ${results.downloaded}`);
    console.log(`Errors: ${results.errors.length}`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        summary: {
          total_checked: results.checked,
          recovered_generations: results.recovered,
          failed_recoveries: results.failed,
          tracks_created: results.created_tracks,
          tracks_downloaded: results.downloaded,
          errors_count: results.errors.length
        },
        errors: results.errors,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in Suno track recovery:', error);
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

/**
 * Получает информацию о треке через Suno API
 */
async function getSunoTrackInfo(externalId: string, apiKey: string): Promise<SunoTrackInfo | null> {
  try {
    console.log(`Requesting track info for ID: ${externalId}`);
    
    const response = await fetch(`https://api.sunoapi.org/api/v1/generate/detail?id=${externalId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Suno API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`Suno API response for ${externalId}:`, data);

    if (data.code !== 200 || !data.data) {
      console.error(`Suno API returned error:`, data);
      return null;
    }

    const trackData = Array.isArray(data.data) ? data.data[0] : data.data;
    
    return {
      id: trackData.id,
      title: trackData.title || 'Untitled',
      audio_url: trackData.audio_url,
      image_url: trackData.image_url,
      lyrics: trackData.prompt || trackData.lyrics,
      duration: trackData.duration,
      model_name: trackData.model_name,
      tags: trackData.tags,
      createTime: trackData.createTime,
      status: trackData.status
    };

  } catch (error: any) {
    console.error(`Error fetching track info for ${externalId}:`, error);
    return null;
  }
}