import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { taskId, audioId } = await req.json();

    if (!taskId && !audioId) {
      return new Response(
        JSON.stringify({ error: 'Either taskId or audioId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Converting to WAV:', { taskId, audioId });

    // Prepare request body
    const requestBody: any = {
      callBackUrl: `${supabaseUrl}/functions/v1/suno-callback`
    };

    if (taskId) requestBody.taskId = taskId;
    if (audioId) requestBody.audioId = audioId;

    // Call Suno API to convert to WAV
    const response = await fetch('https://api.sunoapi.org/api/v1/wav/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
    console.log('Suno WAV conversion response:', sunoResult);

    if (sunoResult.code !== 200) {
      console.error('Suno API returned error:', sunoResult);
      return new Response(
        JSON.stringify({ error: sunoResult.msg || 'Unknown Suno API error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wavTaskId = sunoResult.data?.taskId;
    if (!wavTaskId) {
      console.error('No WAV taskId in Suno response:', sunoResult);
      return new Response(
        JSON.stringify({ error: 'No WAV task ID received from Suno' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create AI generation record for WAV conversion
    const { data: generation, error: genError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        service: 'suno',
        external_id: wavTaskId,
        prompt: 'WAV format conversion',
        status: 'pending',
        parameters: {
          type: 'wav_conversion',
          originalTaskId: taskId,
          originalAudioId: audioId,
          operationType: 'wav_conversion'
        },
        metadata: {
          operationType: 'wav_conversion',
          sourceTaskId: taskId,
          sourceAudioId: audioId
        }
      })
      .select()
      .single();

    if (genError) {
      console.error('Failed to create WAV conversion record:', genError);
    }

    return new Response(
      JSON.stringify({
        wavTaskId,
        originalTaskId: taskId,
        originalAudioId: audioId,
        generationId: generation?.id,
        message: 'WAV conversion started successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in convert-suno-to-wav function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});