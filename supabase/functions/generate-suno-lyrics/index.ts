/**
 * @fileoverview Generate lyrics using Suno API
 * @version 0.01.037
 * @author Claude Code Assistant
 * 
 * This function generates lyrics using the Suno lyrics generation API.
 * Based on official Suno API documentation.
 * 
 * TODO: Future enhancements:
 * - Add style and genre parameters when supported
 * - Support for multi-language lyrics generation
 * - Lyrics templates and structure control
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
    const { prompt, style, title } = await req.json();
    
    console.log('Generating Suno lyrics:', { prompt, style, title });
    
    if (!prompt) {
      throw new Error('prompt is required');
    }

    const sunoApiKey = Deno.env.get('SUNOAPI_ORG_TOKEN');
    if (!sunoApiKey) {
      throw new Error('SUNOAPI_ORG_TOKEN not configured');
    }

    // Create callback URL for this project
    const callBackUrl = `https://zwbhlfhwymbmvioaikvs.supabase.co/functions/v1/suno-callback`;

    // Call Suno API to generate lyrics
    const response = await fetch('https://api.sunoapi.org/api/v1/lyrics/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        ...(style && { style }),
        ...(title && { title }),
        callBackUrl
      }),
    });

    const data = await response.json();
    console.log('Suno lyrics generation response:', data);

    if (!response.ok || data.code !== 200) {
      throw new Error(data.msg || 'Failed to start lyrics generation');
    }

    return new Response(JSON.stringify({
      success: true,
      taskId: data.data.taskId,
      message: 'Lyrics generation started',
      estimatedTime: '10-30 seconds', // Based on typical generation times
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-suno-lyrics function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});