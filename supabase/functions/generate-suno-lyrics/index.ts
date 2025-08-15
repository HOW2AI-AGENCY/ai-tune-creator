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

    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate prompt length (max 200 words)
    const wordCount = prompt.trim().split(/\s+/).length;
    if (wordCount > 200) {
      return new Response(
        JSON.stringify({ error: 'Prompt exceeds 200 word limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating lyrics with prompt:', prompt);

    // Call Suno API to generate lyrics
    const response = await fetch('https://api.sunoapi.org/api/v1/lyrics', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
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
    console.log('Suno lyrics generation response:', sunoResult);

    if (sunoResult.code !== 200) {
      console.error('Suno API returned error:', sunoResult);
      return new Response(
        JSON.stringify({ error: sunoResult.msg || 'Unknown Suno API error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const taskId = sunoResult.data?.taskId;
    if (!taskId) {
      console.error('No taskId in Suno response:', sunoResult);
      return new Response(
        JSON.stringify({ error: 'No task ID received from Suno' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create AI generation record for lyrics generation
    const { data: generation, error: genError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        service: 'suno',
        external_id: taskId,
        prompt,
        status: 'pending',
        parameters: {
          type: 'lyrics',
          operationType: 'lyrics_generation',
          wordCount
        },
        metadata: {
          operationType: 'lyrics',
          promptWordCount: wordCount
        }
      })
      .select()
      .single();

    if (genError) {
      console.error('Failed to create lyrics generation record:', genError);
    }

    return new Response(
      JSON.stringify({
        taskId,
        generationId: generation?.id,
        message: 'Lyrics generation started successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in generate-suno-lyrics function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});