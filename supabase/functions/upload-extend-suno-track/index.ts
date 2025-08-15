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
      uploadUrl,
      continueAt,
      prompt,
      style,
      title,
      model = 'V3_5',
      defaultParamFlag = true,
      instrumental = true,
      negativeTags,
      vocalGender,
      styleWeight,
      weirdnessConstraint,
      audioWeight,
      projectId,
      artistId
    } = await req.json();

    console.log('Upload and extend track:', { uploadUrl, continueAt, model, instrumental });

    // Validate required fields
    if (!uploadUrl) {
      return new Response(
        JSON.stringify({ error: 'Upload URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate audio duration (should be <= 120 seconds)
    if (continueAt && continueAt > 120) {
      return new Response(
        JSON.stringify({ error: 'Upload audio cannot exceed 2 minutes (120 seconds)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare Suno API request
    const requestBody: any = {
      uploadUrl,
      defaultParamFlag,
      instrumental,
      model,
      callBackUrl: `${supabaseUrl}/functions/v1/suno-callback`
    };

    if (defaultParamFlag) {
      requestBody.style = style || 'Ambient';
      requestBody.title = title || 'Extended Audio Track';
      
      if (continueAt) requestBody.continueAt = continueAt;
      if (prompt) requestBody.prompt = prompt;
      if (negativeTags) requestBody.negativeTags = negativeTags;
      if (vocalGender) requestBody.vocalGender = vocalGender;
      if (styleWeight !== undefined) requestBody.styleWeight = styleWeight;
      if (weirdnessConstraint !== undefined) requestBody.weirdnessConstraint = weirdnessConstraint;
      if (audioWeight !== undefined) requestBody.audioWeight = audioWeight;
    }

    console.log('Suno Upload-Extend API request:', requestBody);

    // Call Suno API
    const response = await fetch('https://api.sunoapi.org/api/v1/generate/upload-extend', {
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
        user_id: (await supabase.auth.getUser()).data.user?.id,
        service: 'suno',
        external_id: taskId,
        prompt: requestBody.prompt || 'Upload and extend audio',
        status: 'pending',
        parameters: {
          type: 'upload-extend',
          uploadUrl,
          continueAt,
          model,
          defaultParamFlag,
          instrumental,
          ...requestBody
        },
        metadata: {
          operationType: 'upload_extend',
          uploadSource: 'user_file',
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
        message: 'Upload and extend started successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in upload-extend-suno-track function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});