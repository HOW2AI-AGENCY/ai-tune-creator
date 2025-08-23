import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Edge Function для автоматической синхронизации треков в хранилище
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Invalid authentication token'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Получаем треки требующие загрузки в хранилище
    const { data: tracksToSync, error: syncError } = await supabase.rpc(
      'get_tracks_needing_storage_upload',
      { p_user_id: user.id }
    );

    if (syncError) {
      console.error('Error getting tracks needing storage upload:', syncError);
      throw new Error(`Failed to get tracks: ${syncError.message}`);
    }

    const results = {
      total: (tracksToSync || []).length,
      successes: 0,
      failures: 0,
      processed: [] as any[]
    };

    console.log(`Found ${results.total} tracks needing storage upload`);

    for (const track of tracksToSync || []) {
      try {
        // Обновляем статус на 'downloading'
        await supabase.rpc('update_track_storage_status', {
          p_track_id: track.track_id,
          p_status: 'downloading'
        });

        // Вызываем download-and-save-track для каждого трека
        const { data: downloadResult, error: downloadError } = await supabase.functions.invoke(
          'download-and-save-track', 
          {
            body: {
              generation_id: track.generation_id,
              external_url: track.external_url,
              filename: track.title || `${track.service}-${track.external_id}`,
              taskId: track.external_id
            }
          }
        );

        if (downloadError || !downloadResult?.success) {
          console.error(`Failed to download track ${track.track_id}:`, downloadError || downloadResult);
          
          // Обновляем статус на 'failed'
          await supabase.rpc('update_track_storage_status', {
            p_track_id: track.track_id,
            p_status: 'failed',
            p_storage_metadata: { 
              error: downloadError?.message || 'Download failed',
              failed_at: new Date().toISOString()
            }
          });
          
          results.failures++;
        } else {
          console.log(`Successfully downloaded track ${track.track_id}`);
          
          // Обновляем статус на 'completed'
          await supabase.rpc('update_track_storage_status', {
            p_track_id: track.track_id,
            p_status: 'completed',
            p_storage_path: downloadResult.data?.storage_path,
            p_storage_metadata: {
              completed_at: new Date().toISOString(),
              file_size: downloadResult.data?.file_size,
              storage_url: downloadResult.data?.local_audio_url
            }
          });
          
          results.successes++;
        }

        results.processed.push({
          track_id: track.track_id,
          title: track.title,
          success: !downloadError && downloadResult?.success
        });

      } catch (trackError) {
        console.error(`Error processing track ${track.track_id}:`, trackError);
        results.failures++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in sync-track-storage function:', error);
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