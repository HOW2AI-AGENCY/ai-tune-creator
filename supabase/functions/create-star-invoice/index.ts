import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InvoiceRequest {
  title: string;
  description: string;
  payload: string;
  amount: number; // Amount in the smallest units of the currency (e.g., cents for USD, or single stars)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, description, payload, amount }: InvoiceRequest = await req.json();
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');

    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set');
    }

    if (!title || !description || !payload || !amount) {
      return new Response(JSON.stringify({ error: 'Missing required invoice parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiUrl = `https://api.telegram.org/bot${botToken}/createInvoiceLink`;

    const invoiceDetails = {
      title,
      description,
      payload,
      currency: 'XTR', // XTR is the currency code for Telegram Stars
      prices: JSON.stringify([{ label: title, amount }]),
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invoiceDetails),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram API error:', data);
      throw new Error(`Telegram API error: ${data.description}`);
    }

    return new Response(JSON.stringify({ invoiceLink: data.result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating star invoice:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
