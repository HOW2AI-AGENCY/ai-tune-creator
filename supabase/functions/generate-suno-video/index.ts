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
    const { taskId, audioId, author, domainName } = await req.json();
    
    console.log('Generating Suno video:', { taskId, audioId, author, domainName });
    
    if (!taskId || !audioId) {
      throw new Error('taskId and audioId are required');
    }

    const sunoApiKey = Deno.env.get('SUNOAPI_ORG_TOKEN');
    if (!sunoApiKey) {
      throw new Error('SUNOAPI_ORG_TOKEN not configured');
    }

    // Create callback URL for this project
    const callBackUrl = `https://zwbhlfhwymbmvioaikvs.supabase.co/functions/v1/suno-callback`;

    const requestBody: any = {
      taskId,
      audioId,
      callBackUrl
    };

    // Add optional parameters if provided
    if (author) {
      requestBody.author = author.substring(0, 50); // Max 50 characters
    }
    if (domainName) {
      requestBody.domainName = domainName.substring(0, 50); // Max 50 characters
    }

    const response = await fetch('https://api.sunoapi.org/api/v1/mp4/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();
    console.log('Suno video generation response:', data);

    if (!response.ok || data.code !== 200) {
      throw new Error(data.msg || 'Failed to start video generation');
    }

    return new Response(JSON.stringify({
      success: true,
      taskId: data.data.taskId,
      author,
      domainName
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-suno-video function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});