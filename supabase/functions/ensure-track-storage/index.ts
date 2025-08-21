import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {}
        }
      }
    );

    const { track_id } = await req.json();

    if (!track_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'track_id is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[STORAGE] Ensuring storage for track: ${track_id}`);

    // Get track details
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', track_id)
      .single();

    if (trackError || !track) {
      console.error('[STORAGE] Track not found:', trackError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Track not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if track already has local storage
    if (track.metadata?.local_storage_path) {
      console.log(`[STORAGE] Track ${track_id} already has local storage`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Track already has local storage',
        local_path: track.metadata.local_storage_path
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if track has external URL to download
    if (!track.audio_url) {
      console.log(`[STORAGE] Track ${track_id} has no audio URL`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Track has no audio URL to download' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If external URL, trigger download
    if (track.audio_url.startsWith('http')) {
      console.log(`[STORAGE] Downloading external audio for track ${track_id}: ${track.audio_url}`);
      
      const { data: downloadResult, error: downloadError } = await supabase.functions.invoke('download-and-save-track', {
        body: {
          track_id: track_id,
          external_url: track.audio_url,
          filename: `track-${track_id}.mp3`
        }
      });

      if (downloadError) {
        console.error('[STORAGE] Download failed:', downloadError);
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Download failed: ${downloadError.message}` 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[STORAGE] Download completed for track ${track_id}`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Track downloaded to storage',
        download_result: downloadResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Track already has local storage path' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[STORAGE] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});