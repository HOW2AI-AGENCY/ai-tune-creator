import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define types for better readability and maintenance
interface TrackData {
  title?: string;
  audio_url: string;
  duration?: number;
  lyrics?: string;
  genre_tags?: string[];
  style_prompt?: string;
  model?: string;
  mureka_choice_id?: string;
  track_variant?: number;
  total_variants?: number;
}

interface GenerationMetadata {
  [key: string]: any; // Allow other properties
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Gets the next available track number for a given project.
 * Note: It's better to use the `get_next_track_number` RPC function in the database if it exists.
 */
async function getNextTrackNumber(supabase: SupabaseClient, projectId: string | null): Promise<number> {
  if (!projectId) {
    console.log('[TRACK_NUMBER] No project_id provided, defaulting to 1.');
    return 1;
  }

  const { data, error } = await supabase
    .from('tracks')
    .select('track_number')
    .eq('project_id', projectId)
    .order('track_number', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // Ignore 'range not found' for empty projects
    console.error(`[TRACK_NUMBER] Error fetching max track number for project ${projectId}:`, error);
    // Fallback to 1 in case of error
    return 1;
  }

  const nextNumber = (data?.track_number || 0) + 1;
  console.log(`[TRACK_NUMBER] Next track number for project ${projectId} is ${nextNumber}.`);
  return nextNumber;
}


/**
 * Initiates a background download of the track from the external URL.
 */
async function startBackgroundDownload(supabase: SupabaseClient, generationId: string, trackId: string, audioUrl: string) {
  try {
    console.log(`[DOWNLOAD] Invoking 'download-and-save-track' for track ${trackId}`);
    const { data, error } = await supabase.functions.invoke('download-and-save-track', {
      body: {
        generation_id: generationId,
        external_url: audioUrl,
        filename: `mureka_${generationId.slice(0, 8)}.mp3`,
        track_id: trackId
      }
    });

    if (error) {
      console.error(`[DOWNLOAD] Background download failed for track ${trackId}:`, error);
    } else {
      console.log(`[DOWNLOAD] Background download successful for track ${trackId}:`, data);
    }
  } catch (e) {
    console.error(`[DOWNLOAD] Background download exception for track ${trackId}:`, e.message);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { generationId, trackData, projectId, artistId }: {
      generationId: string;
      trackData: TrackData;
      projectId?: string;
      artistId?: string;
    } = await req.json();

    console.log('Processing Mureka generation save request:', { generationId });

    // 1. Get generation details
    const { data: generation, error: genError } = await supabase
      .from('ai_generations')
      .select('user_id, prompt, metadata')
      .eq('id', generationId)
      .single();

    if (genError || !generation) {
      console.error('Error fetching generation record:', genError);
      return new Response(JSON.stringify({ error: 'Generation not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Determine the project to save the track to.
    // This logic for finding the inbox project can be complex and error-prone.
    // A dedicated database function `get_user_inbox_project(user_id)` would be a more robust solution.
    let targetProjectId = projectId;
    if (!targetProjectId) {
      console.log('[PROJECT] Finding Inbox project');
      let finalArtistId = artistId;
      if (!finalArtistId) {
        const { data: userArtist } = await supabase.from('artists').select('id').eq('user_id', generation.user_id).single();
        finalArtistId = userArtist?.id;
        console.log('[PROJECT] Artist ID found');
      }
      
      if (finalArtistId) {
        const { data: inboxProject } = await supabase.from('projects').select('id').eq('is_inbox', true).eq('artist_id', finalArtistId).single();
        targetProjectId = inboxProject?.id;
        console.log(`[PROJECT] Inbox project found: ${targetProjectId}`);
      }
    }

    // 3. Create the new track record
    const trackRecord = {
      id: crypto.randomUUID(),
      project_id: targetProjectId,
      title: trackData.title || 'AI Generated Track',
      audio_url: trackData.audio_url,
      duration: trackData.duration || 120,
      lyrics: trackData.lyrics || '',
      genre_tags: trackData.genre_tags || ['ai-generated', 'mureka'],
      track_number: await getNextTrackNumber(supabase, targetProjectId || null),
      style_prompt: trackData.style_prompt || generation.prompt,
      metadata: {
        service: 'mureka',
        model: trackData.model || 'auto',
        prompt: generation.prompt,
        style_prompt: trackData.style_prompt,
        generated_at: new Date().toISOString(),
        generation_id: generationId,
        external_audio_url: trackData.audio_url,
        mureka_choice_id: trackData.mureka_choice_id,
        track_variant: trackData.track_variant || 1,
        total_variants: trackData.total_variants || 1,
        original_data: trackData,
      }
    };

    const { data: savedTrack, error: trackError } = await supabase.from('tracks').insert(trackRecord).select().single();

    if (trackError) {
      console.error('Error inserting new track:', trackError);
      return new Response(JSON.stringify({ error: 'Failed to save track', details: trackError }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 4. Update the generation status
    const updatedMetadata: GenerationMetadata = {
      ...(generation.metadata as GenerationMetadata || {}),
      ...trackData,
      saved_track_id: savedTrack.id,
      track_saved: true,
      skip_sync: true
    };

    const { error: updateError } = await supabase
      .from('ai_generations')
      .update({
        status: 'completed',
        result_url: trackData.audio_url,
        track_id: savedTrack.id,
        completed_at: new Date().toISOString(),
        metadata: updatedMetadata,
      })
      .eq('id', generationId);

    if (updateError) {
      // Log the error but don't fail the request, as the track was saved.
      console.error('Error updating generation status:', updateError);
    }

    // 5. Start background download
    if (trackData.audio_url && trackData.audio_url.startsWith('http')) {
      // Use waitUntil if available in the environment
      if (typeof Deno.waitUntil === 'function') {
         Deno.waitUntil(startBackgroundDownload(supabase, generationId, savedTrack.id, trackData.audio_url));
      } else {
         startBackgroundDownload(supabase, generationId, savedTrack.id, trackData.audio_url);
      }
      console.log(`[DOWNLOAD] Background download initiated for track ${savedTrack.id}.`);
    } else {
      console.warn(`[DOWNLOAD] Invalid or missing audio URL for track ${savedTrack.id}, skipping download.`);
    }

    console.log(`Mureka track saved successfully with ID: ${savedTrack.id}`);

    return new Response(JSON.stringify({ success: true, track: savedTrack, message: 'Track saved successfully' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Critical error in save-mureka-generation handler:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})