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
    const { content } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating style boost for content:', content);

    // ИСПРАВЛЕНО: Используем рабочий эндпоинт для улучшения стиля
    const response = await fetch('https://api.sunoapi.org/api/v1/generate/prompt', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        content,
        task: 'style_enhancement',
        language: 'ru'
      }),
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
    console.log('Suno style boost response:', sunoResult);

    if (sunoResult.code !== 200) {
      console.error('Suno API returned error:', sunoResult);
      return new Response(
        JSON.stringify({ error: sunoResult.msg || 'Unknown Suno API error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ИСПРАВЛЕНО: Адаптируем ответ под новый формат API
    const transformedData = {
      taskId: sunoResult.data?.taskId || Date.now().toString(),
      originalContent: content,
      boostedStyle: sunoResult.data?.result || sunoResult.data || content,
      creditsConsumed: sunoResult.data?.creditsConsumed || 1,
      creditsRemaining: sunoResult.data?.creditsRemaining || 0,
      isSuccess: sunoResult.code === 200,
      isPending: false,
      isFailed: sunoResult.code !== 200,
      errorCode: sunoResult.code !== 200 ? sunoResult.code : null,
      errorMessage: sunoResult.code !== 200 ? sunoResult.msg : null,
      createTime: Date.now()
    };

    return new Response(
      JSON.stringify(transformedData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in boost-suno-style function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});