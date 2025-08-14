import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MurekaStatusResponse {
  credits: {
    balance: number;
    total_spent: number;
    plan_limit: number;
  };
  api_status: string;
  rate_limits: {
    remaining: number;
    reset_at: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    
    if (!murekaApiKey) {
      console.error('MUREKA_API_KEY not found');
      return new Response(JSON.stringify({
        status: 'offline',
        error: 'API key not configured'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Проверяем статус и кредиты через Mureka API
    const response = await fetch('https://api.mureka.ai/v1/account/status', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${murekaApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Mureka API error:', response.status, response.statusText);
      
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

    const data: MurekaStatusResponse = await response.json();
    
    // Определяем статус на основе баланса кредитов
    let status = 'online';
    if (data.credits.balance <= 0) {
      status = 'limited';
    } else if (data.credits.balance <= 10) {
      status = 'limited';
    }

    // Если API сообщает о проблемах
    if (data.api_status !== 'operational') {
      status = 'limited';
    }

    const result = {
      status,
      creditsRemaining: Math.floor(data.credits.balance),
      creditsTotal: data.credits.plan_limit,
      apiStatus: data.api_status,
      rateLimit: {
        remaining: data.rate_limits.remaining,
        resetTime: data.rate_limits.reset_at
      }
    };

    console.log('Mureka status check result:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error checking Mureka status:', error);
    
    return new Response(JSON.stringify({
      status: 'offline',
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});