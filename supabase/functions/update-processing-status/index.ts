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
          console.log(`Checking Suno status for ${generation.external_id}`);
          
          // Check Suno status via edge function
          const { data: statusResult, error: statusError } = await supabase.functions.invoke(
            'get-suno-record-info',
            { 
              body: { 
                taskId: generation.external_id,
                generationId: generation.id 
              } 
            }
          );

          if (statusError) {
            console.error(`Error checking Suno status for ${generation.external_id}:`, statusError);
            continue;
          }

          if (statusResult) {
            console.log(`Suno status for ${generation.external_id}:`, statusResult);
            
            if (statusResult.completed && statusResult.tracks && statusResult.tracks.length > 0) {
              const firstTrack = statusResult.tracks[0];
              if (firstTrack.audio_url) {
                // Update to completed
                const { error: updateError } = await supabase
                  .from('ai_generations')
                  .update({
                    status: 'completed',
                    result_url: firstTrack.audio_url,
                    completed_at: new Date().toISOString(),
                    metadata: {
                      ...generation.metadata,
                      suno_completion_data: statusResult,
                      track_data: firstTrack
                    }
                  })
                  .eq('id', generation.id);

                if (!updateError) {
                  updatedCount++;
                  console.log(`Updated generation ${generation.id} to completed`);
                  
                  // Create track if it doesn't exist
                  if (!generation.metadata?.track_created) {
                    try {
                      const { data: trackData, error: trackError } = await supabase
                        .from('tracks')
                        .insert({
                          title: firstTrack.title || generation.metadata?.title || 'AI Generated Track',
                          audio_url: firstTrack.audio_url,
                          lyrics: firstTrack.lyric,
                          duration: firstTrack.duration || null,
                          project_id: generation.metadata?.project_id,
                          track_number: 1,
                          metadata: {
                            generated_by_ai: true,
                            suno_data: firstTrack,
                            generation_id: generation.id
                          }
                        })
                        .select()
                        .single();

                      if (!trackError && trackData) {
                        // Link track to generation
                        await supabase
                          .from('ai_generations')
                          .update({ track_id: trackData.id })
                          .eq('id', generation.id);
                        
                        console.log(`Created track ${trackData.id} for generation ${generation.id}`);
                      }
                    } catch (trackCreateError) {
                      console.error(`Error creating track for generation ${generation.id}:`, trackCreateError);
                    }
                  }
                }
              }
            } else if (statusResult.failed) {
              // Update to failed
              const { error: updateError } = await supabase
                .from('ai_generations')
                .update({
                  status: 'failed',
                  error_message: statusResult.errorMessage || 'Generation failed',
                  completed_at: new Date().toISOString()
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
                error_message: 'Generation timeout - exceeded 1 hour processing time',
                completed_at: new Date().toISOString()
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