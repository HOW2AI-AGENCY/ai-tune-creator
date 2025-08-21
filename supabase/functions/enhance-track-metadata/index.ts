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

    const { track_id, metadata_updates } = await req.json();

    if (!track_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'track_id is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[METADATA] Enhancing metadata for track: ${track_id}`);

    // Get current track
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', track_id)
      .single();

    if (trackError || !track) {
      console.error('[METADATA] Track not found:', trackError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Track not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get generation data if available
    const { data: generation } = await supabase
      .from('ai_generations')
      .select('*')
      .eq('track_id', track_id)
      .single();

    // Enhance metadata with generation info
    const enhancedMetadata = {
      ...track.metadata,
      ...metadata_updates,
      // Add generation metadata if available
      ...(generation && {
        generation_info: {
          service: generation.service,
          prompt: generation.prompt,
          created_at: generation.created_at,
          external_id: generation.external_id,
          parameters: generation.parameters,
          generation_metadata: generation.metadata
        }
      }),
      // Add audio analysis placeholders
      audio_analysis: {
        duration: track.duration,
        format: track.audio_url?.includes('.mp3') ? 'mp3' : 'unknown',
        quality: 'high',
        has_vocals: !generation?.metadata?.instrumental,
        estimated_bpm: null,
        key_signature: null,
        energy_level: null
      },
      // Content metadata
      content_info: {
        has_lyrics: !!track.lyrics,
        language: generation?.metadata?.language || 'auto',
        genre_tags: track.genre_tags || [],
        style: generation?.metadata?.style || 'Unknown',
        mood: null,
        instruments: []
      },
      // Storage info
      storage_info: {
        has_local_copy: !!track.metadata?.local_storage_path,
        original_url: track.audio_url,
        local_path: track.metadata?.local_storage_path,
        file_size: track.metadata?.file_size,
        last_verified: new Date().toISOString()
      },
      // Version tracking
      version_info: {
        metadata_version: '2.0.0',
        last_enhanced: new Date().toISOString(),
        enhancement_count: (track.metadata?.version_info?.enhancement_count || 0) + 1
      }
    };

    // Update track with enhanced metadata
    const { error: updateError } = await supabase
      .from('tracks')
      .update({
        metadata: enhancedMetadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', track_id);

    if (updateError) {
      console.error('[METADATA] Failed to update track:', updateError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Update failed: ${updateError.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[METADATA] Successfully enhanced metadata for track ${track_id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Track metadata enhanced successfully',
      enhanced_fields: Object.keys(enhancedMetadata),
      version: enhancedMetadata.version_info.metadata_version
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[METADATA] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});