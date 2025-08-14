import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
    const response = await fetch('https://api.sunoapi.org/api/v1/account/credits', {
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

    const data: SunoCreditsResponse = await response.json();
    
    // Определяем статус на основе оставшихся кредитов
    let status = 'online';
    if (data.credits_remaining <= 0) {
      status = 'limited';
    } else if (data.credits_remaining <= 5) {
      status = 'limited';
    }

    const result = {
      status,
      creditsRemaining: data.credits_remaining,
      creditsTotal: data.credits_total,
      subscriptionType: data.subscription_type,
      rateLimit: data.rate_limit ? {
        remaining: data.rate_limit.remaining,
        resetTime: data.rate_limit.reset_time
      } : undefined
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