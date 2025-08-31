import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSecureCorsHeaders, authenticateUser } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getSecureCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Require user authentication
  const { user, error: authError } = await authenticateUser(req);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      p_generation_id,
      p_project_id,
      p_title,
      p_audio_url,
      p_lyrics,
      p_duration,
      p_metadata
    } = await req.json();

    console.log('Creating Mureka track:', {
      generation_id: p_generation_id,
      project_id: p_project_id,
      title: p_title
    });

    // Get generation data to find user
    const { data: generation } = await supabase
      .from('ai_generations')
      .select('user_id')
      .eq('id', p_generation_id)
      .single();

    if (!generation) {
      throw new Error('Generation not found');
    }

    // Ensure project exists or use inbox
    let finalProjectId = p_project_id;
    if (!finalProjectId) {
      const { data: inboxId } = await supabase.rpc('ensure_user_inbox', {
        p_user_id: generation.user_id
      });
      finalProjectId = inboxId;
    }

    // Get next track number
    const { data: trackNumber } = await supabase.rpc('get_next_track_number', {
      p_project_id: finalProjectId
    });

    // Create track
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .insert({
        project_id: finalProjectId,
        title: p_title,
        track_number: trackNumber,
        audio_url: p_audio_url,
        lyrics: p_lyrics,
        duration: p_duration,
        metadata: {
          ...p_metadata,
          service: 'mureka',
          generation_id: p_generation_id
        }
      })
      .select()
      .single();

    if (trackError) {
      console.error('Error creating track:', trackError);
      throw trackError;
    }

    // Update generation with track_id
    await supabase
      .from('ai_generations')
      .update({ track_id: track.id })
      .eq('id', p_generation_id);

    console.log('Track created successfully:', track.id);

    return new Response(JSON.stringify({
      success: true,
      track_id: track.id,
      track: track
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in create-mureka-track-rpc:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});