import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== SUNO API CONNECTION TEST ===");

    // Get API credentials
    const sunoApiKey = Deno.env.get('SUNOAPI_ORG_TOKEN') || Deno.env.get('SUNOAPI_ORG_KEY');
    const sunoApiUrl = Deno.env.get('SUNO_API_URL') || 'https://api.sunoapi.org';

    console.log('API URL:', sunoApiUrl);
    console.log('API Key available:', !!sunoApiKey);
    console.log('API Key length:', sunoApiKey?.length || 0);

    if (!sunoApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'No API key found',
          checked_vars: ['SUNOAPI_ORG_TOKEN', 'SUNOAPI_ORG_KEY'],
          success: false
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Test 1: Check credits endpoint
    console.log("Testing credits endpoint...");
    const creditsResponse = await fetch(`${sunoApiUrl}/api/v1/generate/credit`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Credits endpoint status:', creditsResponse.status);
    
    let creditsData = null;
    try {
      creditsData = await creditsResponse.json();
      console.log('Credits response:', creditsData);
    } catch (e) {
      console.error('Failed to parse credits response:', e);
    }

    // Test 2: Test generation endpoint structure
    console.log("Testing generation endpoint structure...");
    const testPayload = {
      prompt: "Test connection",
      customMode: true,
      model: "V3_5",
      title: "Connection Test",
      instrumental: false
    };

    const generationResponse = await fetch(`${sunoApiUrl}/api/v1/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    console.log('Generation endpoint status:', generationResponse.status);
    
    let generationData = null;
    let generationError = null;
    
    try {
      const responseText = await generationResponse.text();
      console.log('Generation raw response:', responseText);
      
      if (responseText) {
        generationData = JSON.parse(responseText);
        console.log('Generation parsed response:', generationData);
      }
    } catch (e) {
      console.error('Failed to parse generation response:', e);
      generationError = e.message;
    }

    const result = {
      success: true,
      suno_api_url: sunoApiUrl,
      api_key_configured: !!sunoApiKey,
      api_key_length: sunoApiKey?.length || 0,
      tests: {
        credits: {
          status: creditsResponse.status,
          success: creditsResponse.ok,
          data: creditsData,
          endpoint: `${sunoApiUrl}/api/v1/generate/credit`
        },
        generation: {
          status: generationResponse.status,
          success: generationResponse.ok,
          data: generationData,
          error: generationError,
          endpoint: `${sunoApiUrl}/api/v1/generate`,
          test_payload: testPayload
        }
      },
      timestamp: new Date().toISOString()
    };

    console.log("=== TEST COMPLETED ===");
    console.log("Result summary:", {
      credits_ok: creditsResponse.ok,
      generation_tested: true,
      api_configured: !!sunoApiKey
    });

    return new Response(
      JSON.stringify(result, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in test-suno-connection:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});