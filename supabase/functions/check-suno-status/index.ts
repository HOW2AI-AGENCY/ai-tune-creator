import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://zwbhlfhwymbmvioaikvs.supabase.co',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SunoCreditsResponse {
  credits_remaining: number;
  credits_total: number;
  subscription_type: string;
  rate_limit?: {
    remaining: number;
    reset_time: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sunoApiKey = Deno.env.get('SUNOAPI_ORG_TOKEN');
    
    if (!sunoApiKey) {
      console.error('SUNOAPI_ORG_TOKEN not found');
      return new Response(JSON.stringify({
        status: 'offline',
        error: 'API key not configured'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Проверяем статус и кредиты через Suno API
    console.log('Checking Suno API with endpoint: https://api.sunoapi.org/api/v1/generate/credit');
    console.log('Using API key length:', sunoApiKey?.length || 0);
    
    const response = await fetch('https://api.sunoapi.org/api/v1/generate/credit', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Suno API error:', response.status, response.statusText);
      
      let errorMessage = 'API недоступен';
      if (response.status === 401) {
        errorMessage = 'Неверный API ключ';
      } else if (response.status === 429) {
        errorMessage = 'Превышен лимит запросов';
      } else if (response.status >= 500) {
        errorMessage = 'Сервер недоступен';
      }

      return new Response(JSON.stringify({
        status: response.status === 429 ? 'limited' : 'offline',
        error: errorMessage
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const apiResponse = await response.json();
    console.log('Suno API Response:', apiResponse);
    
    // Проверяем успешность запроса
    if (apiResponse.code !== 200) {
      console.error('Suno API returned error code:', apiResponse.code, apiResponse.msg);
      return new Response(JSON.stringify({
        status: 'offline',
        error: apiResponse.msg || 'API вернул ошибку'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const creditsRemaining = apiResponse.data;
    
    // Определяем статус на основе оставшихся кредитов
    let status = 'online';
    if (creditsRemaining <= 0) {
      status = 'limited';
    } else if (creditsRemaining <= 5) {
      status = 'limited';
    }

    const result = {
      status,
      creditsRemaining,
      creditsTotal: null, // API не возвращает общее количество
      subscriptionType: null,
      rateLimit: undefined
    };

    console.log('Suno status check result:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error checking Suno status:', error);
    
    return new Response(JSON.stringify({
      status: 'offline',
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});