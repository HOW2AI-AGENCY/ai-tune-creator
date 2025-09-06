import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://zwbhlfhwymbmvioaikvs.supabase.co',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface UploadRequest {
  fileName: string;
  fileData: string; // base64 encoded
  bucket: string;
  mimeType: string;
  uploadType?: 'image' | 'audio' | 'general';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { fileName, fileData, bucket, mimeType, uploadType = 'general' }: UploadRequest = await req.json();

    if (!fileName || !fileData || !bucket || !mimeType) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting check
    const { data: rateLimit } = await supabase.rpc('check_rate_limit', {
      p_identifier: `user:${user.id}`,
      p_operation: 'file_upload',
      p_max_requests: 50,
      p_window_minutes: 60
    });

    if (!rateLimit?.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: rateLimit?.resetTime 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Convert base64 to Uint8Array
    const fileBytes = new Uint8Array(
      atob(fileData.replace(/^data:[^;]+;base64,/, ''))
        .split('')
        .map(char => char.charCodeAt(0))
    );

    // Validate file using database function
    const { data: validation } = await supabase.rpc('validate_file_upload', {
      p_file_name: fileName,
      p_mime_type: mimeType,
      p_file_size: fileBytes.length,
      p_upload_type: uploadType
    });

    if (!validation?.valid) {
      return new Response(JSON.stringify({ 
        error: 'File validation failed',
        details: validation?.errors || ['Unknown validation error']
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create secure file path
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const securePath = `${user.id}/${timestamp}-${randomSuffix}-${sanitizedFileName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(securePath, fileBytes, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Upload failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get signed URL
    const { data: signedUrlData } = await supabase.storage
      .from(bucket)
      .createSignedUrl(securePath, 31536000); // 1 year

    console.log(`Secure file upload completed: ${securePath}`);

    return new Response(JSON.stringify({
      success: true,
      path: securePath,
      url: signedUrlData?.signedUrl,
      size: fileBytes.length,
      mimeType: mimeType
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Secure upload error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});