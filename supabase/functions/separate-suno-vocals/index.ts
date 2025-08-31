import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    const { taskId, audioId, type = 'separate_vocal' } = await req.json();
    
    console.log('Separating Suno vocals:', { taskId, audioId, type });
    
    if (!taskId || !audioId) {
      throw new Error('taskId and audioId are required');
    }

    const sunoApiKey = Deno.env.get('SUNOAPI_ORG_TOKEN');
    if (!sunoApiKey) {
      throw new Error('SUNOAPI_ORG_TOKEN not configured');
    }

    // Create callback URL for this project
    const callBackUrl = 'https://zwbhlfhwymbmvioaikvs.supabase.co/functions/v1/suno-callback';

    const response = await fetch('https://api.sunoapi.org/api/v1/vocal-removal/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        audioId,
        type,
        callBackUrl
      }),
    });

    const data = await response.json();
    console.log('Suno vocal separation response:', data);

    if (!response.ok || data.code !== 200) {
      throw new Error(data.msg || 'Failed to start vocal separation');
    }

    return new Response(JSON.stringify({
      success: true,
      taskId: data.data.taskId,
      separationType: type
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in separate-suno-vocals function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});