/**
 * @fileoverview Get WAV conversion info from Suno API
 * @version 0.01.036
 * @author Claude Code Assistant
 * 
 * This function polls the Suno API to check the status of WAV conversion tasks.
 * Based on the documentation, Suno provides WAV conversion for high-quality audio output.
 */

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
    const sunoApiKey = Deno.env.get('SUNOAPI_ORG_TOKEN');
    if (!sunoApiKey) {
      throw new Error('SUNOAPI_ORG_TOKEN not configured');
    }

    let taskId: string;

    // Extract taskId from request body or query params
    if (req.method === 'POST') {
      const { taskId: bodyTaskId } = await req.json();
      taskId = bodyTaskId;
    } else {
      const url = new URL(req.url);
      taskId = url.searchParams.get('taskId') || '';
    }

    if (!taskId) {
      return new Response(JSON.stringify({
        error: 'Missing taskId parameter'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Checking WAV conversion status for taskId:', taskId);

    // Call Suno API to get WAV conversion info
    const response = await fetch(`https://api.sunoapi.org/api/v1/wav/record-info?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Suno API Error:', response.status, errorText);
      throw new Error(`Suno API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Suno WAV conversion response:', data);

    // Check if request was successful according to API documentation
    if (data.code !== 200) {
      console.error('Suno API returned error:', data);
      return new Response(
        JSON.stringify({ error: data.msg || 'Unknown Suno API error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform Suno response to our format based on API documentation
    const responseData = data.data;
    const transformedData = {
      taskId: responseData.taskId,
      musicId: responseData.musicId,
      callbackUrl: responseData.callbackUrl,
      completeTime: responseData.completeTime,
      createTime: responseData.createTime,
      
      // WAV file URL from response
      wavUrl: responseData.response?.audio_wav_url || null,
      
      // Status mapping based on API documentation
      status: responseData.status,
      isCompleted: responseData.status === 'SUCCESS',
      isFailed: ['CREATE_TASK_FAILED', 'GENERATE_WAV_FAILED', 'CALLBACK_EXCEPTION'].includes(responseData.status),
      isPending: responseData.status === 'PENDING',
      
      // Error information
      errorCode: responseData.errorCode,
      errorMessage: responseData.errorMessage,
      
      // Additional metadata
      metadata: {
        originalCode: data.code,
        originalMessage: data.msg,
      }
    };

    return new Response(JSON.stringify(transformedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in get-suno-wav-info function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      taskId: null,
      completed: false,
      failed: true,
      pending: false,
      progress: 0,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});