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

    // Find all completed generations that need track creation/update
    // Exclude generations that are marked as deleted or archived
    console.log('[SYNC] Fetching completed generations...')
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
      .not('metadata->skip_sync', 'eq', true) // Skip syncing if marked
      .not('metadata->deleted', 'eq', true)   // Skip deleted generations
      .not('metadata->track_deleted', 'eq', true) // Skip if track was deleted by user
      .not('metadata->deleted_by_user', 'eq', true) // Skip if explicitly deleted by user
      .order('completed_at', { ascending: false })
      .limit(50); // Process recent generations first

    if (fetchError) {
      throw new Error(`Failed to fetch generations: ${fetchError.message}`);
    }

    console.log(`[SYNC] Found ${generations?.length || 0} completed generations to process`)
    
    // Log generation metadata for debugging
    for (const gen of generations?.slice(0, 3) || []) {
      console.log(`[SYNC] Generation ${gen.id}: track_id=${gen.track_id}, skip_sync=${gen.metadata?.skip_sync}, track_deleted=${gen.metadata?.track_deleted}`)
    }

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

    // Helper function to extract audio URL from generation
    const getAudioUrl = (gen: any) => {
      // Direct result_url first
      if (gen.result_url && gen.result_url !== 'missing') return gen.result_url;
      // Suno sources
      if (gen.service === 'suno') {
        const tr = gen.metadata?.suno_track_data;
        if (tr?.audio_url) return tr.audio_url;
        const respTracks = gen.metadata?.response?.sunoData;
        if (Array.isArray(respTracks) && respTracks[0]?.audio_url) return respTracks[0].audio_url;
        const all = gen.metadata?.all_tracks;
        if (Array.isArray(all) && all[0]?.audio_url) return all[0].audio_url;
      }
      // Mureka sources
      if (gen.service === 'mureka') {
        const choicesUrl = gen.metadata?.mureka?.choices?.[0]?.url || gen.metadata?.mureka_result?.choices?.[0]?.url;
        if (choicesUrl) return choicesUrl;
        const dataChoices = gen.metadata?.data?.choices?.[0]?.url;
        if (dataChoices) return dataChoices;
        const providerMp3 = gen.metadata?.provider_urls?.mp3;
        if (providerMp3) return providerMp3;
      }
      return null;
    };
    // Process each generation
    for (const gen of generations || []) {
      try {
        results.processed++;
        
        // Ensure service metadata is set
        if (!gen.metadata?.service) {
          await supabase
            .from('ai_generations')
            .update({
              metadata: {
                ...(gen.metadata || {}),
                service: gen.service
              }
            })
            .eq('id', gen.id);
        }
        
        // Try to extract audio URL
        const audioUrl = getAudioUrl(gen);
        
        // Determine if we need to create/update track
        if (!gen.track_id) {
          // Проверяем, не была ли связанная генерация помечена как удаленная пользователем
          if (gen.metadata?.track_deleted || gen.metadata?.deleted_by_user) {
            console.log(`Skipping track creation for generation ${gen.id} - marked as deleted by user`);
            continue;
          }
          
          // Create new track
          try {
            const { data: trackId, error: rpcError } = await supabase.rpc(
              'create_or_update_track_from_generation',
              { 
                p_generation_id: gen.id,
                p_project_id: null, // Will use inbox
                p_artist_id: null   // Will use default artist
              }
            );
            
            if (rpcError) {
              throw new Error(`RPC error: ${rpcError.message}`);
            }
            
            results.created++;
            syncResults.push({
              generationId: gen.id,
              action: 'created',
              trackId,
              service: gen.service
            });
            
            // Schedule download if we have a valid URL
            if (audioUrl && audioUrl !== "missing") {
              toDownload.push({
                generation_id: gen.id,
                external_url: audioUrl,
                service: gen.service
              });
            }
          } catch (trackError: any) {
            console.error(`Error creating track for generation ${gen.id}:`, trackError);
            results.errors.push({
              generationId: gen.id,
              error: trackError.message,
              action: 'create_track'
            });
          }
        } else {
          // Проверяем, не был ли существующий трек удален пользователем
          console.log(`[SYNC] Checking existing track ${gen.track_id} for generation ${gen.id}`)
          const { data: existingTrack } = await supabase
            .from('tracks')
            .select('id, metadata')
            .eq('id', gen.track_id)
            .single();
            
          if (!existingTrack) {
            console.log(`[SYNC] Track ${gen.track_id} no longer exists, unlinking from generation ${gen.id}`)
            // Трек больше не существует, отвязать от генерации
            await supabase
              .from('ai_generations')
              .update({ track_id: null })
              .eq('id', gen.id);
            continue;
          }
            
          if (existingTrack?.metadata?.prevent_sync_restore || existingTrack?.metadata?.deleted) {
            console.log(`[SYNC] Skipping sync for generation ${gen.id} - associated track marked as deleted (prevent_sync_restore: ${existingTrack.metadata?.prevent_sync_restore}, deleted: ${existingTrack.metadata?.deleted})`)
            // Помечаем генерацию как не подлежащую синхронизации
            await supabase
              .from('ai_generations')
              .update({
                metadata: {
                  ...(gen.metadata || {}),
                  skip_sync: true,
                  track_deleted: true,
                  deleted_by_user: true,
                  deleted_at: new Date().toISOString()
                }
              })
              .eq('id', gen.id);
            continue;
          }
          
          // Existing track but needs download
          if (audioUrl && audioUrl !== "missing" && !gen.metadata?.local_storage_path) {
            toDownload.push({
              generation_id: gen.id,
              external_url: audioUrl,
              service: gen.service
            });
          }
        }
        
      } catch (error: any) {
        console.error(`Error processing generation ${gen.id}:`, error);
        results.errors.push({
          generationId: gen.id,
          error: error.message,
          action: 'process'
        });
      }
    }

    // Download tracks in batches with proper validation
    console.log(`Found ${toDownload.length} tracks to download`);
    
    const batchSize = 3;
    for (let i = 0; i < toDownload.length; i += batchSize) {
      const batch = toDownload.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        try {
          console.log(`Downloading track for generation ${item.generation_id}`);
          
          // Validate URL before download
          if (!item.external_url || item.external_url === "missing") {
            throw new Error(`Invalid external_url: ${item.external_url}`);
          }
          
          // Call download function
          const { data: downloadResult, error: downloadError } = await supabase.functions.invoke(
            'download-and-save-track',
            {
              body: {
                generation_id: item.generation_id,
                external_url: item.external_url
              }
            }
          );

          if (downloadError) {
            throw downloadError;
          }

          results.downloaded++;
          return {
            generation_id: item.generation_id,
            success: true,
            action: 'downloaded',
            result: downloadResult
          };
        } catch (error: any) {
          console.error(`Error downloading track for generation ${item.generation_id}:`, error);
          results.errors.push({
            generationId: item.generation_id,
            error: error.message,
            action: 'download'
          });
          return {
            generation_id: item.generation_id,
            success: false,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Small pause between batches
      if (i + batchSize < toDownload.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Final statistics
    const successful = results.created + results.updated + results.downloaded;
    const failed = results.errors.length;

    console.log(`Sync completed. Created: ${results.created}, Updated: ${results.updated}, Downloaded: ${results.downloaded}, Failed: ${failed}`);

    const response = {
      success: true,
      data: {
        sync_results: syncResults,
        summary: {
          total_checked: generations?.length || 0,
          tracks_created: results.created,
          tracks_updated: results.updated,
          successful_downloads: results.downloaded,
          failed_operations: results.errors.length,
          errors: results.errors
        }
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