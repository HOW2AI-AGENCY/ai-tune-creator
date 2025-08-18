import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface MurekaGenerationRequest {
  generationId?: string;
  taskId: string;
  trackData: {
    url: string;
    duration: number;
    lyrics_sections?: any[];
    id: string;
  };
  title: string;
  prompt: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestData: MurekaGenerationRequest = await req.json();

    console.log('Saving Mureka generation:', {
      taskId: requestData.taskId,
      generationId: requestData.generationId,
      url: requestData.trackData.url,
      flac_url: requestData.trackData.flac_url,
      provider_urls: {
        mp3: requestData.trackData.url,
        flac: requestData.trackData.flac_url
      }
    });

    const { generationId, taskId, trackData, title, prompt, userId } = requestData;

    // Check if generation record exists
    let generation;
    if (generationId) {
      const { data: existingGeneration } = await supabase
        .from('ai_generations')
        .select('*')
        .eq('id', generationId)
        .single();
      
      generation = existingGeneration;
    }

    // Create or update generation record
    if (generation) {
      // Update existing generation
      const { error: updateError } = await supabase
        .from('ai_generations')
        .update({
          status: 'completed',
          result_url: trackData.url,
          completed_at: new Date().toISOString(),
          metadata: {
            ...generation.metadata,
            mureka_task_id: taskId,
            mureka_track_id: trackData.id,
            duration: trackData.duration,
            mureka_status: 'succeeded',
            provider_urls: {
              mp3: trackData.url,
              flac: trackData.flac_url
            },
            instant_playback_url: trackData.url
          }
        })
        .eq('id', generationId);

      if (updateError) {
        console.error('Error updating generation:', updateError);
        throw updateError;
      }

      console.log('Updated existing generation:', generationId);
    } else {
      // Create new generation record
      const { data: newGeneration, error: insertError } = await supabase
        .from('ai_generations')
        .insert([{
          user_id: userId,
          service: 'mureka',
          status: 'completed',
          external_id: taskId,
          prompt: prompt,
          result_url: trackData.url,
          completed_at: new Date().toISOString(),
          metadata: {
            mode: 'quick',
            mureka_task_id: taskId,
            mureka_track_id: trackData.id,
            duration: trackData.duration,
            mureka_status: 'succeeded',
            title: title,
            provider_urls: {
              mp3: trackData.url,
              flac: trackData.flac_url
            },
            instant_playback_url: trackData.url
          },
          parameters: {
            model: 'mureka-7',
            service: 'mureka'
          }
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating generation:', insertError);
        throw insertError;
      }

      generation = newGeneration;
      console.log('Created new generation:', generation.id);
    }

    // Trigger track sync
    try {
      await supabase.functions.invoke('sync-generated-tracks');
      console.log('Triggered track sync');
    } catch (syncError) {
      console.error('Error triggering sync:', syncError);
      // Don't fail the whole operation if sync fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        generation: generation,
        message: 'Mureka generation saved successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in save-mureka-generation function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});