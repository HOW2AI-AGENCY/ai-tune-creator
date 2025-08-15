import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskId } = await req.json();
    
    console.log('Getting Suno vocal separation info for taskId:', taskId);
    
    if (!taskId) {
      throw new Error('taskId is required');
    }

    const sunoApiKey = Deno.env.get('SUNOAPI_ORG_TOKEN');
    if (!sunoApiKey) {
      throw new Error('SUNOAPI_ORG_TOKEN not configured');
    }

    const response = await fetch(`https://api.sunoapi.org/api/v1/vocal-removal/record-info?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Suno vocal separation info response:', data);

    if (!response.ok || data.code !== 200) {
      throw new Error(data.msg || 'Failed to get vocal separation info');
    }

    const info = data.data;
    
    // Map status to our standard format
    const isCompleted = info.successFlag === 'SUCCESS';
    const isFailed = ['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION'].includes(info.successFlag);
    
    return new Response(JSON.stringify({
      success: true,
      taskId: info.taskId,
      musicId: info.musicId,
      status: isCompleted ? 'completed' : isFailed ? 'failed' : 'processing',
      isCompleted,
      isFailed,
      completeTime: info.completeTime,
      createTime: info.createTime,
      stems: info.response ? {
        original: info.response.originUrl,
        vocals: info.response.vocalUrl,
        instrumental: info.response.instrumentalUrl,
        backingVocals: info.response.backingVocalsUrl,
        drums: info.response.drumsUrl,
        bass: info.response.bassUrl,
        guitar: info.response.guitarUrl,
        keyboard: info.response.keyboardUrl,
        percussion: info.response.percussionUrl,
        strings: info.response.stringsUrl,
        synth: info.response.synthUrl,
        fx: info.response.fxUrl,
        brass: info.response.brassUrl,
        woodwinds: info.response.woodwindsUrl
      } : null,
      errorCode: info.errorCode,
      errorMessage: info.errorMessage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-suno-vocal-separation-info function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});