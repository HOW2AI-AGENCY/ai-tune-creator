import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InstrumentalGenerationRequest {
  model?: 'auto' | 'mureka-6' | 'mureka-7';
  prompt?: string;
  instrumental_id?: string;
  stream?: boolean;
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

    const { 
      model = 'auto', 
      prompt, 
      instrumental_id, 
      stream = false 
    } = await req.json() as InstrumentalGenerationRequest;

    // Validation - prompt and instrumental_id are mutually exclusive
    if (!prompt && !instrumental_id) {
      return new Response(JSON.stringify({ 
        error: 'Either prompt or instrumental_id is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (prompt && instrumental_id) {
      return new Response(JSON.stringify({ 
        error: 'prompt and instrumental_id are mutually exclusive' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    if (!murekaApiKey) {
      throw new Error('MUREKA_API_KEY not configured');
    }

    console.log('Generating instrumental with Mureka API:', { 
      model, 
      prompt: prompt?.substring(0, 100), 
      instrumental_id,
      stream 
    });

    const requestBody: InstrumentalGenerationRequest = {
      model,
      stream
    };

    if (prompt) {
      requestBody.prompt = prompt;
    } else {
      requestBody.instrumental_id = instrumental_id;
    }

    const response = await fetch('https://api.mureka.ai/v1/instrumental/generate', {
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

    const instrumentalData: MurekaTaskResponse = await response.json();
    console.log('Instrumental generation task created:', instrumentalData.id);

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
          prompt: prompt || `Instrumental generation with ID: ${instrumental_id}`,
          service: 'mureka',
          status: 'processing',
          result_url: null,
          metadata: {
            type: 'instrumental_generation',
            task_id: instrumentalData.id,
            model: instrumentalData.model,
            prompt,
            instrumental_id,
            stream,
            created_at: instrumentalData.created_at,
            mureka_response: instrumentalData
          }
        });

      if (genError) {
        console.error('Error saving instrumental generation:', genError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: instrumentalData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-mureka-instrumental function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});