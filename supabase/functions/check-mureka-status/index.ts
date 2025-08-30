import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://zwbhlfhwymbmvioaikvs.supabase.co',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MurekaBillingResponse {
  account_id: number;
  balance: number; // in cents
  total_recharge: number; // in cents
  total_spending: number; // in cents
  concurrent_request_limit: number;
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
    console.log('Checking Mureka API with endpoint: https://api.mureka.ai/v1/account/billing');
    console.log('Using API key length:', murekaApiKey?.length || 0);
    
    const response = await fetch('https://api.mureka.ai/v1/account/billing', {
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

    const data: MurekaBillingResponse = await response.json();
    console.log('Mureka API Response:', data);
    
    // Определяем статус на основе баланса (в центах)
    const balanceInCents = data.balance || 0;
    const balanceInDollars = balanceInCents / 100;
    
    let status = 'online';
    if (balanceInCents <= 0) {
      status = 'limited';
    } else if (balanceInDollars <= 1) { // Менее $1
      status = 'limited';
    }

    const result = {
      status,
      creditsRemaining: balanceInDollars,
      creditsTotal: data.total_recharge ? data.total_recharge / 100 : null,
      subscriptionType: null,
      rateLimit: data.concurrent_request_limit ? {
        remaining: data.concurrent_request_limit,
        resetTime: null
      } : undefined
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