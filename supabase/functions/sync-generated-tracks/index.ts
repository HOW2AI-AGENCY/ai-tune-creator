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

    // Helper function to extract audio URL from generation
    const getAudioUrl = (gen: any) => {
      // Check direct result_url first
      if (gen.result_url) return gen.result_url;
      
      // Service-specific extraction
      if (gen.service === 'suno') {
        // Extract from Suno metadata
        const sunoData = gen.metadata?.suno_track_data || gen.metadata?.sunoData;
        if (sunoData?.tracks && Array.isArray(sunoData.tracks)) {
          return sunoData.tracks[0]?.audio_url;
        }
        if (sunoData?.all_tracks && Array.isArray(sunoData.all_tracks)) {
          return sunoData.all_tracks[0]?.audio_url;
        }
      } else if (gen.service === 'mureka') {
        // Extract from Mureka metadata
        const murekaData = gen.metadata?.mureka || gen.metadata?.mureka_result;
        if (murekaData?.choices && Array.isArray(murekaData.choices)) {
          return murekaData.choices[0]?.url;
        }
        // Also check data.choices for different response format
        if (gen.metadata?.data?.choices && Array.isArray(gen.metadata.data.choices)) {
          return gen.metadata.data.choices[0]?.url;
        }
      }
      
      // No valid URL found
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
        } else if (audioUrl && audioUrl !== "missing" && !gen.metadata?.local_storage_path) {
          // Existing track but needs download
          toDownload.push({
            generation_id: gen.id,
            external_url: audioUrl,
            service: gen.service
          });
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