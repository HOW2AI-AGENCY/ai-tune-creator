import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MurekaTaskResponse {
  task_id: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  audio_urls?: string[];
  lyrics?: string;
  error?: string;
  progress?: number;
  estimated_time?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract task ID from URL query parameters
    const url = new URL(req.url);
    const taskId = url.searchParams.get('taskId');

    if (!taskId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'taskId parameter is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Mureka API key
    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    
    if (!murekaApiKey) {
      console.error('MUREKA_API_KEY not configured');
      return new Response(JSON.stringify({
        success: false,
        error: 'Mureka API not configured'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[MUREKA STATUS] Checking status for task: ${taskId}`);

    // Query Mureka API for task status
    const response = await fetch(`https://api.mureka.ai/v1/song/query/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${murekaApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MUREKA STATUS] API error:`, errorText);
      
      return new Response(JSON.stringify({
        success: false,
        error: `Mureka API error: ${response.status}`,
        details: errorText
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const murekaData: MurekaTaskResponse = await response.json();
    console.log(`[MUREKA STATUS] Task ${taskId} status: ${murekaData.status}`);

    // Transform status to our format
    let transformedStatus = murekaData.status;
    let progress = 0;

    switch (murekaData.status) {
      case 'pending':
        progress = 25;
        break;
      case 'running':
        progress = 50;
        break;
      case 'succeeded':
        progress = 100;
        transformedStatus = 'completed';
        break;
      case 'failed':
        progress = 0;
        transformedStatus = 'failed';
        break;
      default:
        progress = 0;
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        taskId: taskId,
        status: transformedStatus,
        progress: progress,
        audio_urls: murekaData.audio_urls || [],
        lyrics: murekaData.lyrics,
        error: murekaData.error,
        estimated_time: murekaData.estimated_time,
        isCompleted: murekaData.status === 'succeeded',
        isFailed: murekaData.status === 'failed',
        isPending: ['pending', 'running'].includes(murekaData.status)
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[MUREKA STATUS] Unexpected error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});