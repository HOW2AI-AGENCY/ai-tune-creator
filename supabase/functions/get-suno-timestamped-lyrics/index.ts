import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sunoApiToken = Deno.env.get('SUNOAPI_ORG_TOKEN');

interface TimestampedLyricsRequest {
  taskId: string;
  audioId?: string;
  musicIndex?: number;
}

interface AlignedWord {
  word: string;
  success: boolean;
  start_s: number;
  end_s: number;
  p_align: number;
}

interface TimestampedLyricsResponse {
  alignedWords: AlignedWord[];
  waveformData: number[];
  hootCer: number;
  isStreamed: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Expected POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    let requestData: TimestampedLyricsRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { taskId, audioId, musicIndex } = requestData;

    console.log('Getting timestamped lyrics for:', { taskId, audioId, musicIndex });

    // Validate required fields
    if (!taskId) {
      return new Response(
        JSON.stringify({ error: 'taskId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!sunoApiToken) {
      console.error('SUNOAPI_ORG_TOKEN is not configured');
      return new Response(
        JSON.stringify({ error: 'Suno API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare request body for Suno API
    const requestBody: any = { taskId };
    
    if (audioId) {
      requestBody.audioId = audioId;
    }
    
    if (musicIndex !== undefined) {
      requestBody.musicIndex = musicIndex;
    }

    console.log('Suno Timestamped Lyrics API request:', requestBody);

    // Call Suno API
    const response = await fetch('https://api.sunoapi.org/api/v1/generate/get-timestamped-lyrics', {
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
        JSON.stringify({ 
          error: `Suno API error: ${response.status}`,
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sunoResult = await response.json();
    console.log('Suno API response received');

    if (sunoResult.code !== 200) {
      console.error('Suno API returned error:', sunoResult.msg);
      return new Response(
        JSON.stringify({ 
          error: sunoResult.msg || 'Unknown Suno API error',
          code: sunoResult.code 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lyricsData: TimestampedLyricsResponse = sunoResult.data;

    // Return the timestamped lyrics data
    return new Response(
      JSON.stringify({
        success: true,
        data: lyricsData,
        message: 'Timestamped lyrics retrieved successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in get-suno-timestamped-lyrics function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});