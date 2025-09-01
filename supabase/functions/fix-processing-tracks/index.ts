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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('Starting to fix tracks with processing status...');

    // Получаем треки со статусом "processing" но с готовыми аудио URL
    const { data: processingTracks, error: fetchError } = await supabase
      .from('tracks')
      .select('id, title, audio_url, metadata, created_at')
      .or('metadata->>processing_status.eq.processing,metadata->>processing_status.eq.pending')
      .not('audio_url', 'is', null)
      .neq('audio_url', '');

    if (fetchError) {
      console.error('Error fetching processing tracks:', fetchError);
      throw fetchError;
    }

    if (!processingTracks || processingTracks.length === 0) {
      console.log('No processing tracks found with audio URLs');
      return new Response(JSON.stringify({
        success: true,
        message: 'No tracks need fixing',
        fixed_count: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${processingTracks.length} tracks to fix`);

    let fixedCount = 0;
    const errors = [];

    for (const track of processingTracks) {
      try {
        // Обновляем статус на completed для треков с готовыми URL
        const updatedMetadata = {
          ...track.metadata,
          processing_status: 'completed',
          fixed_at: new Date().toISOString(),
          fixed_reason: 'Had audio_url but was still marked as processing'
        };

        const { error: updateError } = await supabase
          .from('tracks')
          .update({
            metadata: updatedMetadata,
            updated_at: new Date().toISOString()
          })
          .eq('id', track.id);

        if (updateError) {
          console.error(`Error updating track ${track.id}:`, updateError);
          errors.push({ track_id: track.id, error: updateError.message });
        } else {
          console.log(`Fixed track ${track.id}: "${track.title}"`);
          fixedCount++;
        }
      } catch (error) {
        console.error(`Exception while fixing track ${track.id}:`, error);
        errors.push({ track_id: track.id, error: error.message });
      }
    }

    // Также исправляем треки со старыми статусами в ai_generations
    const { data: oldGenerations, error: genError } = await supabase
      .from('ai_generations')
      .select('id, status, result_url, track_id')
      .in('status', ['processing', 'pending'])
      .not('result_url', 'is', null)
      .neq('result_url', '');

    if (!genError && oldGenerations && oldGenerations.length > 0) {
      console.log(`Found ${oldGenerations.length} old generations to fix`);
      
      for (const gen of oldGenerations) {
        try {
          const { error: genUpdateError } = await supabase
            .from('ai_generations')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', gen.id);

          if (!genUpdateError) {
            console.log(`Fixed generation ${gen.id}`);
            fixedCount++;
          }
        } catch (error) {
          console.error(`Error fixing generation ${gen.id}:`, error);
        }
      }
    }

    console.log(`Fixed ${fixedCount} items total`);

    return new Response(JSON.stringify({
      success: true,
      message: `Fixed ${fixedCount} tracks/generations`,
      fixed_count: fixedCount,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in fix-processing-tracks function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});