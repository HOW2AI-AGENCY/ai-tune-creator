import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerationRecord {
  id: string;
  external_id: string;
  service: string;
  status: string;
  created_at: string;
  metadata: any;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log("Starting processing status update...");

    // Get all processing generations older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: processingGenerations, error: fetchError } = await supabase
      .from('ai_generations')
      .select('id, external_id, service, status, created_at, metadata')
      .eq('status', 'processing')
      .lt('created_at', fiveMinutesAgo);

    if (fetchError) {
      console.error('Error fetching processing generations:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${processingGenerations?.length || 0} old processing generations`);

    if (!processingGenerations || processingGenerations.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No old processing generations found',
          updated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let updatedCount = 0;

    // Process each generation
    for (const generation of processingGenerations) {
      try {
        if (generation.service === 'suno') {
          // Check Suno status via edge function
          const { data: statusResult, error: statusError } = await supabase.functions.invoke(
            'get-suno-record-info',
            { body: { taskId: generation.external_id } }
          );

          if (!statusError && statusResult) {
            console.log(`Suno status for ${generation.external_id}:`, statusResult);
            
            if (statusResult.status === 'completed' && statusResult.audio_url) {
              // Update to completed
              const { error: updateError } = await supabase
                .from('ai_generations')
                .update({
                  status: 'completed',
                  result_url: statusResult.audio_url,
                  metadata: {
                    ...generation.metadata,
                    suno_completion_data: statusResult
                  }
                })
                .eq('id', generation.id);

              if (!updateError) {
                updatedCount++;
                console.log(`Updated generation ${generation.id} to completed`);
              }
            } else if (statusResult.status === 'failed') {
              // Update to failed
              const { error: updateError } = await supabase
                .from('ai_generations')
                .update({
                  status: 'failed',
                  error_message: statusResult.error || 'Generation failed'
                })
                .eq('id', generation.id);

              if (!updateError) {
                updatedCount++;
                console.log(`Updated generation ${generation.id} to failed`);
              }
            }
          }
        } else if (generation.service === 'mureka') {
          // For Mureka, check if it's been too long and mark as failed
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          
          if (generation.created_at < oneHourAgo) {
            const { error: updateError } = await supabase
              .from('ai_generations')
              .update({
                status: 'failed',
                error_message: 'Generation timeout - exceeded 1 hour processing time'
              })
              .eq('id', generation.id);

            if (!updateError) {
              updatedCount++;
              console.log(`Updated old Mureka generation ${generation.id} to failed`);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing generation ${generation.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${updatedCount} generations`,
        updated: updatedCount,
        total_checked: processingGenerations.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in update-processing-status:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});