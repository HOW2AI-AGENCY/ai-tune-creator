import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadCreationRequest {
  upload_name: string;
  purpose: 'fine-tuning';
  bytes?: number;
}

interface MurekaUploadResponse {
  id: string;
  upload_name: string;
  purpose: string;
  bytes?: number;
  created_at: number;
  expires_at: number;
  status: 'pending' | 'completed' | 'cancelled';
  parts?: string[];
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

    const { upload_name, purpose, bytes } = await req.json() as UploadCreationRequest;

    if (!upload_name || typeof upload_name !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'upload_name is required and must be a string' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (purpose !== 'fine-tuning') {
      return new Response(JSON.stringify({ 
        error: 'purpose must be "fine-tuning"' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    if (!murekaApiKey) {
      throw new Error('MUREKA_API_KEY not configured');
    }

    console.log('Creating upload with Mureka API:', { upload_name, purpose, bytes });

    const requestBody: UploadCreationRequest = {
      upload_name,
      purpose
    };

    if (bytes) {
      requestBody.bytes = bytes;
    }

    const response = await fetch('https://api.mureka.ai/v1/uploads/create', {
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

    const uploadData: MurekaUploadResponse = await response.json();
    console.log('Upload created successfully:', uploadData.id);

    // Extract user ID from JWT token
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const jwtPayload = token.split('.')[1];
    const userId = jwtPayload ? JSON.parse(atob(jwtPayload)).sub as string : null;

    // Save upload record
    if (userId) {
      const { error: uploadError } = await supabase
        .from('ai_generations')
        .insert({
          user_id: userId,
          prompt: `File upload: ${upload_name}`,
          service: 'mureka',
          status: 'processing',
          result_url: null,
          metadata: {
            type: 'file_upload',
            upload_id: uploadData.id,
            upload_name,
            purpose,
            bytes,
            created_at: uploadData.created_at,
            expires_at: uploadData.expires_at,
            mureka_response: uploadData
          }
        });

      if (uploadError) {
        console.error('Error saving upload record:', uploadError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: uploadData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in create-mureka-upload function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});