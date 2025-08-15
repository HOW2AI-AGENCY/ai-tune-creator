import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SaveTrackRequest {
  generation_id: string;
  audio_url: string;
  title?: string;
  duration?: number;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { generation_id, audio_url, title, duration, metadata } = await req.json() as SaveTrackRequest;

    if (!generation_id || !audio_url) {
      return new Response(JSON.stringify({ 
        error: 'generation_id and audio_url are required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Saving Mureka track:', generation_id, audio_url);

    // Extract user ID from JWT token
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const jwtPayload = token.split('.')[1];
    const userId = jwtPayload ? JSON.parse(atob(jwtPayload)).sub as string : null;

    if (!userId) {
      return new Response(JSON.stringify({ 
        error: 'User authentication required' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get generation record to check if track already exists
    const { data: generation, error: genError } = await supabase
      .from('ai_generations')
      .select('id, track_id, metadata, prompt')
      .eq('id', generation_id)
      .eq('user_id', userId)
      .single();

    if (genError) {
      console.error('Error fetching generation:', genError);
      return new Response(JSON.stringify({ 
        error: 'Generation not found' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If track already exists, update it
    if (generation.track_id) {
      const { data: updatedTrack, error: updateError } = await supabase
        .from('tracks')
        .update({
          audio_url: audio_url,
          duration: duration,
          updated_at: new Date().toISOString()
        })
        .eq('id', generation.track_id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating track:', updateError);
        return new Response(JSON.stringify({ 
          error: 'Failed to update track' 
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Track updated:', updatedTrack.id);

      return new Response(JSON.stringify({
        success: true,
        data: {
          track: updatedTrack,
          action: 'updated'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Получаем project_id из metadata или создаем Inbox
    let projectId = generation.metadata?.project_id;
    
    if (!projectId) {
      // Создаем Inbox для пользователя
      const { data: inboxData, error: inboxError } = await supabase
        .rpc('ensure_user_inbox', { p_user_id: userId });
      
      if (inboxError) {
        console.error('Error creating inbox:', inboxError);
        projectId = null;
      } else {
        projectId = inboxData;
        console.log('Created/found inbox project:', projectId);
      }
    }

    // Create new track
    const trackTitle = title || `AI Track ${new Date().toLocaleDateString('ru-RU')}`;
    const trackMetadata = metadata || generation.metadata || {};
    
    // Дедуплицируем название трека
    let finalTitle = trackTitle;
    if (projectId) {
      const { data: dedupedTitle, error: dedupError } = await supabase
        .rpc('dedupe_track_title', { 
          p_project_id: projectId, 
          p_title: trackTitle 
        });
      
      if (!dedupError && dedupedTitle) {
        finalTitle = dedupedTitle;
      }
    }

    // Получаем следующий номер трека
    let trackNumber = 1;
    if (projectId) {
      const { data: nextNumber, error: numberError } = await supabase
        .rpc('get_next_track_number', { p_project_id: projectId });
      
      if (!numberError && nextNumber) {
        trackNumber = nextNumber;
      }
    }
    
    const { data: newTrack, error: trackError } = await supabase
      .from('tracks')
      .insert({
        title: finalTitle,
        track_number: trackNumber,
        audio_url: audio_url,
        duration: duration,
        lyrics: generation.prompt || 'AI Generated Track',
        description: `Generated with Mureka AI`,
        genre_tags: trackMetadata.genre ? [trackMetadata.genre] : ['ai-generated'],
        project_id: projectId,
        metadata: {
          ...trackMetadata,
          generation_id: generation_id,
          service: 'mureka',
          saved_at: new Date().toISOString(),
          auto_inbox: !generation.metadata?.project_id
        }
      })
      .select()
      .single();

    if (trackError) {
      console.error('Error creating track:', trackError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create track' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update generation with track_id
    const { error: updateGenError } = await supabase
      .from('ai_generations')
      .update({ 
        track_id: newTrack.id,
        status: 'completed',
        result_url: audio_url
      })
      .eq('id', generation_id);

    if (updateGenError) {
      console.error('Error updating generation:', updateGenError);
    }

    console.log('Track created and linked:', newTrack.id);

    return new Response(JSON.stringify({
      success: true,
      data: {
        track: newTrack,
        action: 'created'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in save-mureka-track function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});