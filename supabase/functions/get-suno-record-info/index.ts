import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sunoApiToken = Deno.env.get('SUNOAPI_ORG_TOKEN');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Support JSON body and query param fallback
    let taskId = '' as string;
    let generationId: string | undefined;
    try {
      const parsed = await req.json();
      taskId = parsed?.taskId || '';
      generationId = parsed?.generationId;
    } catch (_) {
      // ignore JSON parse error, may use query params
    }
    if (!taskId) {
      const url = new URL(req.url);
      taskId = url.searchParams.get('taskId') || url.searchParams.get('id') || '';
      generationId = generationId || url.searchParams.get('generationId') || undefined;
    }

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'Task ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Getting record info for task:', taskId);

    // Call Suno API to get record info
    const response = await fetch(`https://api.sunoapi.org/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sunoApiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Suno API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Suno API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sunoResult = await response.json();
    console.log('Suno record info response:', sunoResult);

    if (sunoResult.code !== 200) {
      console.error('Suno API returned error:', sunoResult);
      return new Response(
        JSON.stringify({ error: sunoResult.msg || 'Unknown Suno API error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform the response to a more usable format
    const data = sunoResult.data;
    const isCompleted = data.status === 'SUCCESS';
    const isFailed = data.status?.includes('FAILED') || data.status === 'SENSITIVE_WORD_ERROR';
    const isPending = data.status === 'PENDING' || data.status === 'TEXT_SUCCESS' || data.status === 'FIRST_SUCCESS';
    
    const transformedData = {
      taskId: data.taskId,
      parentMusicId: data.parentMusicId,
      status: data.status,
      type: data.type,
      operationType: data.operationType,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      parameters: data.param ? JSON.parse(data.param) : null,
      tracks: data.response?.sunoData || [],
      isCompleted,
      isFailed,
      isPending,
      completed: isCompleted,
      failed: isFailed
    };

    // Update database if we have a generation ID
    if (generationId) {
      try {
        if (isCompleted) {
          const tracks = data.response?.sunoData || [];
          const firstTrack = tracks[0];
          
          if (firstTrack?.audio_url) {
            console.log('Updating generation to completed:', generationId);
            await supabase
              .from('ai_generations')
              .update({
                status: 'completed',
                result_url: firstTrack.audio_url,
                completed_at: new Date().toISOString(),
                metadata: {
                  ...data.response,
                  suno_status: data.status,
                  tracks_count: tracks.length
                }
              })
              .eq('id', generationId);
          }
        } else if (isFailed) {
          console.log('Updating generation to failed:', generationId);
          await supabase
            .from('ai_generations')
            .update({
              status: 'failed',
              error_message: data.errorMessage || 'Generation failed',
              completed_at: new Date().toISOString()
            })
            .eq('id', generationId);
        }
      } catch (dbError) {
        console.error('Database update error:', dbError);
      }
    }

    return new Response(
      JSON.stringify({
        code: 200,
        msg: 'success',
        data: transformedData.tracks,
        ...transformedData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in get-suno-record-info function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});