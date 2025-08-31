import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MurekaCoverRequest {
  originalUrl: string;
  style: string;
  preserveVocals?: boolean;
  model?: 'V7' | 'V8' | 'O1';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' }
        }
      }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const request: MurekaCoverRequest = await req.json();
    
    if (!request.originalUrl || !request.style) {
      return new Response(JSON.stringify({ error: 'Original URL and style are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    if (!murekaApiKey) {
      throw new Error('Mureka API key not configured');
    }

    // Call Mureka API for cover generation
    const murekaResponse = await fetch('https://api.mureka.ai/v1/song/cover', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${murekaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original_url: request.originalUrl,
        style_prompt: request.style,
        preserve_vocals: request.preserveVocals ?? true,
        model: request.model || 'V8',
        quality: 'high'
      })
    });

    if (!murekaResponse.ok) {
      const errorText = await murekaResponse.text();
      console.error('Mureka API error:', errorText);
      throw new Error(`Mureka API error: ${murekaResponse.status}`);
    }

    const result = await murekaResponse.json();

    // Save to database
    const { data: generation, error: dbError } = await supabase
      .from('ai_generations')
      .insert({
        user_id: user.id,
        service: 'mureka',
        type: 'cover',
        status: 'processing',
        metadata: {
          task_id: result.id,
          original_url: request.originalUrl,
          style: request.style,
          model: request.model || 'V8'
        }
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(JSON.stringify({
      success: true,
      taskId: result.id,
      generationId: generation.id,
      status: result.status,
      estimatedTime: 60
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in mureka-create-cover:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});