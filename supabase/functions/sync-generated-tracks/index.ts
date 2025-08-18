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

    // Find all completed generations with result_url that need track creation/update
    const { data: generations, error: fetchError } = await supabase
      .from('ai_generations')
      .select(`
        id,
        user_id,
        service,
        status,
        result_url,
        external_id,
        metadata,
        track_id,
        prompt,
        created_at,
        completed_at
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('result_url', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(50); // Process recent generations first

    if (fetchError) {
      throw new Error(`Failed to fetch generations: ${fetchError.message}`);
    }

    console.log(`Found ${generations?.length || 0} completed generations to process`);

    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      downloaded: 0,
      errors: [] as any[]
    };

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
        .maybeSingle();

      console.log(`Generation ${gen.id} existing track:`, existingTrack, trackError?.message);

      // If no existing track, proceed to create it

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

    // Create/update tracks using the new transactional function
    for (const gen of toCreateTracks) {
      try {
        results.processed++;
        
        console.log(`Processing generation ${gen.id} with transactional function`);
        
        // Use transactional function for atomic track creation/update
        const { data: trackId, error: rpcError } = await supabase.rpc(
          'create_or_update_track_from_generation', 
          {
            p_generation_id: gen.id,
            p_project_id: null // Will use user's inbox automatically
          }
        );

        if (rpcError) {
          console.error(`RPC error for generation ${gen.id}:`, rpcError);
          results.errors.push({
            generation_id: gen.id,
            error: rpcError.message
          });
          continue;
        }

        if (gen.existing_track_id) {
          results.updated++;
          console.log(`Updated track ${trackId} for generation ${gen.id}`);
        } else {
          results.created++;
          console.log(`Created track ${trackId} for generation ${gen.id}`);
        }

      } catch (error: any) {
        console.error(`Error processing generation ${gen.id}:`, error);
        results.errors.push({
          generation_id: gen.id,
          error: error.message
        });
      }
    }

    // Download tracks in batches to avoid timeouts (external URLs only)
    const batchSize = 3;
    for (let i = 0; i < toDownload.length; i += batchSize) {
      const batch = toDownload.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (gen) => {
        try {
          console.log(`Downloading track for generation ${gen.id}`);
          
          // Call download function with locking
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

          results.downloaded++;
          return {
            generation_id: gen.id,
            success: true,
            action: 'downloaded',
            result: downloadResult
          };
        } catch (error: any) {
          console.error(`Error downloading track for generation ${gen.id}:`, error);
          results.errors.push({
            generation_id: gen.id,
            error: error.message
          });
          return {
            generation_id: gen.id,
            success: false,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      syncResults.push(...batchResults);

      // Small pause between batches
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

    // Statistics
    const successful = syncResults.filter(r => r.success).length;
    const failed = results.errors.length;

    console.log(`Sync completed. Created: ${results.created}, Updated: ${results.updated}, Downloaded: ${results.downloaded}, Failed: ${failed}`);

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
          tracks_created: results.created,
          tracks_updated: results.updated,
          needed_download: toDownload.length,
          successful_downloads: results.downloaded,
          failed_operations: results.errors.length,
          errors: results.errors
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