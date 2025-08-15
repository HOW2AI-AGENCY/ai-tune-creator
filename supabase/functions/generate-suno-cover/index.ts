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

    const { taskId } = await req.json();

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'Task ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating cover for task:', taskId);

    // Call Suno API to generate cover
    const response = await fetch('https://api.sunoapi.org/api/v1/suno/cover/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        callBackUrl: `${supabaseUrl}/functions/v1/suno-callback`
      }),
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
    console.log('Suno cover generation response:', sunoResult);

    if (sunoResult.code !== 200) {
      console.error('Suno API returned error:', sunoResult);
      return new Response(
        JSON.stringify({ error: sunoResult.msg || 'Unknown Suno API error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const coverTaskId = sunoResult.data?.taskId;
    if (!coverTaskId) {
      console.error('No cover taskId in Suno response:', sunoResult);
      return new Response(
        JSON.stringify({ error: 'No cover task ID received from Suno' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create AI generation record for cover generation
    const { data: generation, error: genError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        service: 'suno',
        external_id: coverTaskId,
        prompt: 'Cover image generation',
        status: 'pending',
        parameters: {
          type: 'cover',
          originalTaskId: taskId,
          operationType: 'cover_generation'
        },
        metadata: {
          parentTaskId: taskId,
          operationType: 'cover'
        }
      })
      .select()
      .single();

    if (genError) {
      console.error('Failed to create cover generation record:', genError);
    }

    return new Response(
      JSON.stringify({
        coverTaskId,
        originalTaskId: taskId,
        generationId: generation?.id,
        message: 'Cover generation started successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in generate-suno-cover function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});