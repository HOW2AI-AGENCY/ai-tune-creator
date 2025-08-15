import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sunoApiToken = Deno.env.get('SUNOAPI_ORG_TOKEN');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskId } = await req.json();

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'Task ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Getting cover info for task:', taskId);

    // Call Suno API to get cover record info
    const response = await fetch(`https://api.sunoapi.org/api/v1/suno/cover/record-info?taskId=${encodeURIComponent(taskId)}`, {
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
    console.log('Suno cover info response:', sunoResult);

    if (sunoResult.code !== 200) {
      console.error('Suno API returned error:', sunoResult);
      return new Response(
        JSON.stringify({ error: sunoResult.msg || 'Unknown Suno API error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform the response to a more usable format
    const data = sunoResult.data;
    const transformedData = {
      taskId: data.taskId,
      parentTaskId: data.parentTaskId,
      callbackUrl: data.callbackUrl,
      completeTime: data.completeTime,
      createTime: data.createTime,
      images: data.response?.images || [],
      successFlag: data.successFlag,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      isCompleted: data.successFlag === 1,
      isFailed: data.successFlag === 3,
      isGenerating: data.successFlag === 2,
      isPending: data.successFlag === 0
    };

    return new Response(
      JSON.stringify(transformedData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in get-suno-cover-info function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});