import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Edge Function для проверки статуса генерации Suno AI
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed. Expected POST.' 
    }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }

    const { task_id } = requestBody;

    if (!task_id) {
      throw new Error('task_id is required');
    }

    console.log('Checking status for task_id:', task_id);

    // Ищем генерацию по task_id
    const { data: generation, error: findError } = await supabase
      .from('ai_generations')
      .select(`
        id,
        status,
        result_url,
        created_at,
        metadata,
        track_id,
        tracks(
          id,
          title,
          audio_url,
          duration,
          lyrics,
          metadata
        )
      `)
      .eq('service', 'suno')
      .contains('metadata', { suno_task_id: task_id })
      .single();

    if (findError || !generation) {
      console.error('Generation not found for task_id:', task_id, findError);
      throw new Error(`Generation not found for task_id: ${task_id}`);
    }

    // Проверяем статус у SunoAPI, если локальный статус не "completed"
    let sunoApiStatus = null;
    if (generation.status !== 'completed') {
      try {
        const sunoApiKey = Deno.env.get('SUNOAPI_ORG_KEY');
        const sunoApiUrl = Deno.env.get('SUNO_API_URL') || 'https://api.sunoapi.org';

        if (sunoApiKey) {
          console.log('Checking status with SunoAPI...');
          
          // Здесь должен быть endpoint для проверки статуса
          // Пока используем mock, нужно найти правильный endpoint в документации
          const statusResponse = await fetch(`${sunoApiUrl}/api/v1/status/${task_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${sunoApiKey}`,
              'Content-Type': 'application/json',
            },
          });

          if (statusResponse.ok) {
            sunoApiStatus = await statusResponse.json();
            console.log('SunoAPI status response:', sunoApiStatus);
          } else {
            console.log('SunoAPI status check failed:', statusResponse.status);
          }
        }
      } catch (apiError) {
        console.error('Error checking SunoAPI status:', apiError);
        // Продолжаем с локальными данными
      }
    }

    // Формируем ответ
    const response = {
      success: true,
      data: {
        task_id: task_id,
        status: generation.status,
        generation_id: generation.id,
        track_id: generation.track_id,
        created_at: generation.created_at,
        result_url: generation.result_url,
        track: generation.tracks || null,
        metadata: generation.metadata,
        suno_api_status: sunoApiStatus
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error checking Suno status:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});