import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LyricsExtensionRequest {
  lyrics: string;
}

interface MurekaLyricsExtensionResponse {
  lyrics: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { lyrics } = await req.json() as LyricsExtensionRequest;

    if (!lyrics || typeof lyrics !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Lyrics are required and must be a string' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    if (!murekaApiKey) {
      throw new Error('MUREKA_API_KEY not configured');
    }

    console.log('Extending lyrics with Mureka API, input length:', lyrics.length);

    const response = await fetch('https://api.mureka.ai/v1/lyrics/extend', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${murekaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ lyrics }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mureka API Error:', response.status, errorText);
      throw new Error(`Mureka API error: ${response.status} ${errorText}`);
    }

    const extendedData: MurekaLyricsExtensionResponse = await response.json();
    console.log('Lyrics extended successfully, output length:', extendedData.lyrics.length);

    // Extract user ID from JWT token
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const jwtPayload = token.split('.')[1];
    const userId = jwtPayload ? JSON.parse(atob(jwtPayload)).sub as string : null;

    // Save generation record
    if (userId) {
      const { error: genError } = await supabase
        .from('ai_generations')
        .insert({
          user_id: userId,
          prompt: lyrics.substring(0, 500) + '...', // First 500 chars as prompt
          service: 'mureka',
          status: 'completed',
          result_url: null,
          metadata: {
            type: 'lyrics_extension',
            original_lyrics: lyrics,
            extended_lyrics: extendedData.lyrics
          }
        });

      if (genError) {
        console.error('Error saving lyrics extension:', genError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: extendedData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in extend-mureka-lyrics function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});