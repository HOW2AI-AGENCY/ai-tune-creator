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

    const {
      trackId,
      continueAt,
      prompt,
      style,
      title,
      model = 'V3_5',
      defaultParamFlag = true,
      negativeTags,
      vocalGender,
      styleWeight,
      weirdnessConstraint,
      audioWeight
    } = await req.json();

    console.log('Extending track:', { trackId, continueAt, model });

    // Get the original track to find its external_id
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      console.error('Track not found:', trackError);
      return new Response(
        JSON.stringify({ error: 'Track not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if track has external_id (Suno ID)
    const audioId = track.metadata?.external_id || track.metadata?.suno_id;
    if (!audioId) {
      console.error('Track missing external_id:', track.id);
      return new Response(
        JSON.stringify({ error: 'Track not generated with Suno or missing external ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate continueAt parameter
    if (continueAt <= 0 || (track.duration && continueAt >= track.duration)) {
      return new Response(
        JSON.stringify({ error: 'Invalid continueAt time point' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare Suno API request
    const requestBody: any = {
      defaultParamFlag,
      audioId,
      model,
      callBackUrl: `${supabaseUrl}/functions/v1/suno-callback`
    };

    if (defaultParamFlag) {
      requestBody.continueAt = continueAt;
      requestBody.prompt = prompt || `Extend the music from ${continueAt} seconds`;
      requestBody.style = style || track.style_prompt;
      requestBody.title = title || `${track.title} (Extended)`;
      
      if (negativeTags) requestBody.negativeTags = negativeTags;
      if (vocalGender) requestBody.vocalGender = vocalGender;
      if (styleWeight !== undefined) requestBody.styleWeight = styleWeight;
      if (weirdnessConstraint !== undefined) requestBody.weirdnessConstraint = weirdnessConstraint;
      if (audioWeight !== undefined) requestBody.audioWeight = audioWeight;
    }

    console.log('Suno API request:', requestBody);

    // Call Suno API
    const response = await fetch('https://api.sunoapi.org/api/v1/generate/extend', {
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
    console.log('Suno API response:', sunoResult);

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

    // Create AI generation record
    const { data: generation, error: genError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: track.user_id || (await supabase.auth.getUser()).data.user?.id,
        service: 'suno',
        external_id: taskId,
        prompt: requestBody.prompt,
        status: 'pending',
        track_id: trackId,
        parameters: {
          type: 'extend',
          originalTrackId: trackId,
          continueAt,
          model,
          defaultParamFlag,
          ...requestBody
        },
        metadata: {
          originalTitle: track.title,
          originalDuration: track.duration,
          extensionPoint: continueAt
        }
      })
      .select()
      .single();

    if (genError) {
      console.error('Failed to create generation record:', genError);
    }

    return new Response(
      JSON.stringify({
        taskId,
        generationId: generation?.id,
        message: 'Track extension started successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in extend-suno-track function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});