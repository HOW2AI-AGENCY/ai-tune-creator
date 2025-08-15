import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SongExtensionRequest {
  song_id?: string;
  upload_audio_id?: string;
  lyrics: string;
  extend_at: number; // milliseconds
}

interface MurekaTaskResponse {
  id: string;
  created_at: number;
  finished_at?: number;
  model: string;
  status: 'preparing' | 'queued' | 'running' | 'streaming' | 'succeeded' | 'failed' | 'timeouted' | 'cancelled';
  failed_reason?: string;
  choices?: Array<{
    audio_url: string;
    duration: number;
    title?: string;
  }>;
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

    const { song_id, upload_audio_id, lyrics, extend_at } = await req.json() as SongExtensionRequest;

    // Validation
    if (!lyrics || typeof lyrics !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Lyrics are required and must be a string' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!extend_at || typeof extend_at !== 'number') {
      return new Response(JSON.stringify({ 
        error: 'extend_at is required and must be a number (milliseconds)' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (extend_at < 8000 || extend_at > 420000) {
      return new Response(JSON.stringify({ 
        error: 'extend_at must be between 8000 and 420000 milliseconds' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!song_id && !upload_audio_id) {
      return new Response(JSON.stringify({ 
        error: 'Either song_id or upload_audio_id is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (song_id && upload_audio_id) {
      return new Response(JSON.stringify({ 
        error: 'song_id and upload_audio_id are mutually exclusive' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    if (!murekaApiKey) {
      throw new Error('MUREKA_API_KEY not configured');
    }

    console.log('Extending song with Mureka API:', { 
      song_id, 
      upload_audio_id, 
      extend_at,
      lyrics_length: lyrics.length 
    });

    const requestBody: SongExtensionRequest = {
      lyrics,
      extend_at
    };

    if (song_id) {
      requestBody.song_id = song_id;
    } else {
      requestBody.upload_audio_id = upload_audio_id;
    }

    const response = await fetch('https://api.mureka.ai/v1/song/extend', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${murekaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mureka API Error:', response.status, errorText);
      throw new Error(`Mureka API error: ${response.status} ${errorText}`);
    }

    const extensionData: MurekaTaskResponse = await response.json();
    console.log('Song extension task created:', extensionData.id);

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
          status: 'processing',
          result_url: null,
          metadata: {
            type: 'song_extension',
            task_id: extensionData.id,
            song_id,
            upload_audio_id,
            lyrics,
            extend_at,
            model: extensionData.model,
            created_at: extensionData.created_at,
            mureka_response: extensionData
          }
        });

      if (genError) {
        console.error('Error saving song extension:', genError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: extensionData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in extend-mureka-song function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});