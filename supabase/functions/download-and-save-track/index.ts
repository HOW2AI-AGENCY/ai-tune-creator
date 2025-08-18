import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DownloadTrackRequest {
  generation_id?: string;
  external_url: string;
  filename?: string;
  track_id?: string;
  taskId?: string;
  task_id?: string;
}

// Edge Function для загрузки и сохранения треков в Supabase Storage с идемпотентностью
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
    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: authHeader ? {
            Authorization: authHeader
          } : {}
        }
      }
    );

    let requestBody: DownloadTrackRequest;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }

    const { generation_id, external_url, filename, track_id, taskId, task_id } = requestBody;

    console.log('Request parameters:', { 
      generation_id: generation_id || 'missing', 
      taskId: taskId || task_id || 'missing',
      external_url: external_url || 'missing',
      filename,
      track_id 
    });

    if (!generation_id && !(taskId || task_id)) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'generation_id or taskId is required',
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!external_url) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'external_url is required',
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const incomingTaskId = taskId || task_id || null;
    const lockKey = `download:${generation_id || incomingTaskId}`;

    console.log('Starting download for generation/task:', generation_id || incomingTaskId);
    console.log('External URL (provider):', external_url);
    console.log('Provider domain:', new URL(external_url).hostname);

    // Try to acquire lock for idempotency
    const { data: lockAcquired } = await supabase.rpc('acquire_operation_lock', {
      p_key: lockKey,
      p_ttl_seconds: 120
    });

    if (!lockAcquired) {
      console.log('Download already in progress or completed for:', generation_id || incomingTaskId);
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Download already in progress or completed',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Получаем информацию о генерации по generation_id или taskId
    let generation: any | null = null;
    let genError: any = null;

    if (generation_id) {
      const result = await supabase
        .from('ai_generations')
        .select(`
          id,
          user_id,
          service,
          status,
          metadata,
          track_id,
          tracks(id, title, project_id, projects(id, title, artist_id))
        `)
        .eq('id', generation_id)
        .single();
      generation = result.data;
      genError = result.error;
    } else if (incomingTaskId) {
      // Попытка №1: поиск по столбцу task_id
      let res = await supabase
        .from('ai_generations')
        .select(`
          id,
          user_id,
          service,
          status,
          metadata,
          track_id,
          tracks(id, title, project_id, projects(id, title, artist_id))
        `)
        .eq('task_id', incomingTaskId)
        .maybeSingle();
      generation = res.data;
      genError = res.error;

      // Попытка №2: поиск по metadata.taskId (если столбца task_id нет или запись не найдена)
      if ((!generation || genError) && !generation) {
        const resMeta = await supabase
          .from('ai_generations')
          .select(`
            id,
            user_id,
            service,
            status,
            metadata,
            track_id,
            tracks(id, title, project_id, projects(id, title, artist_id))
          `)
          .contains('metadata', { taskId: incomingTaskId })
          .maybeSingle();
        generation = resMeta.data;
        genError = resMeta.error;
      }
    }

    if (genError || !generation) {
      console.error('Generation lookup error:', { generation_id, incomingTaskId, error: genError });
      await supabase.rpc('release_operation_lock', { p_key: lockKey });
      return new Response(JSON.stringify({ 
        success: false,
        error: `Generation not found by ${generation_id ? 'generation_id' : 'taskId'}: ${generation_id || incomingTaskId}`,
        timestamp: new Date().toISOString()
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if already downloaded (idempotency)
    if (generation.metadata?.local_storage_path) {
      console.log('File already downloaded:', generation.metadata.local_storage_path);
      await supabase.rpc('release_operation_lock', { p_key: lockKey });
      return new Response(JSON.stringify({ 
        success: true,
        data: {
          generation_id: generation.id,
          track_id: generation.track_id,
          local_audio_url: generation.result_url,
          storage_path: generation.metadata.local_storage_path,
          already_downloaded: true
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resolvedGenerationId = generation.id;

    // Build safe storage path using constants and helper
    const BUCKET_AUDIO = Deno.env.get('AUDIO_BUCKET_NAME') || 'albert-tracks';
    const service = generation.service || 'unknown';
    const taskIdForPath = incomingTaskId || resolvedGenerationId.slice(0, 8);
    
    // Build unique path to prevent collisions
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const baseFileName = filename || `${service}-track-${taskIdForPath}`;
    const audioFileName = baseFileName.includes('.') ? baseFileName : `${baseFileName}.mp3`;
    const uniqueFileName = `${timestamp}-${random}-${audioFileName}`;
    
    // Storage path: user_id/service/taskId/unique-filename
    const storagePath = `${generation.user_id}/${service}/${taskIdForPath}/${uniqueFileName}`;

    console.log('Downloading audio file from:', external_url);

    // Загружаем файл с внешнего URL
    const audioResponse = await fetch(external_url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Supabase-Edge-Function/1.0'
      }
    });

    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
    }

    const audioBlob = await audioResponse.blob();
    const audioArrayBuffer = await audioBlob.arrayBuffer();
    const audioUint8Array = new Uint8Array(audioArrayBuffer);

    console.log('Audio file downloaded, size:', audioUint8Array.length, 'bytes');

    // Save file to Supabase Storage with proper configuration
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_AUDIO)
      .upload(storagePath, audioUint8Array, {
        contentType: 'audio/mpeg',
        cacheControl: 'public, max-age=31536000, immutable',
        upsert: false // Prevent overwrites due to unique path
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    console.log('File uploaded to storage:', uploadData.path);
    console.log('Provider URL preserved for debugging:', external_url);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_AUDIO)
      .getPublicUrl(storagePath);

    const localAudioUrl = publicUrlData.publicUrl;
    
    // Update generation with local storage info BEFORE creating/updating track
    const { error: genUpdateError } = await supabase
      .from('ai_generations')
      .update({
        result_url: localAudioUrl,
        metadata: {
          ...(generation.metadata || {}),
          local_storage_path: storagePath,
          provider_url: external_url,
          file_size: audioUint8Array.length,
          downloaded_at: new Date().toISOString()
        }
      })
      .eq('id', resolvedGenerationId);
    
    if (genUpdateError) {
      console.error('Failed to update ai_generations with local URL:', genUpdateError);
      throw new Error(`Failed to update generation with local URL: ${genUpdateError.message}`);
    }

    try {
      // Use transactional function to create/update track atomically
      const { data: finalTrackId, error: rpcError } = await supabase.rpc(
        'create_or_update_track_from_generation', 
        {
          p_generation_id: resolvedGenerationId,
          p_project_id: generation.tracks?.project_id || null
        }
      );

      if (rpcError) {
        console.error('Error in transactional track creation:', rpcError);
        throw new Error(`Failed to create/update track: ${rpcError.message}`);
      }

      console.log('Track created/updated successfully:', finalTrackId);

      // Release lock
      await supabase.rpc('release_operation_lock', { p_key: lockKey });
      const response = {
        success: true,
        data: {
          generation_id: resolvedGenerationId,
          track_id: finalTrackId,
          local_audio_url: localAudioUrl,
          storage_path: storagePath,
          file_size: audioUint8Array.length,
          downloaded_at: new Date().toISOString()
        }
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (transactionError) {
      console.error('Transaction error:', transactionError);
      await supabase.rpc('release_operation_lock', { p_key: lockKey });
      throw transactionError;
    }

  } catch (error: any) {
    console.error('Error downloading and saving track:', error);
    
    // Ensure lock is released on any error
    try {
      const lockKey = `download:${generation_id || (taskId || task_id)}`;
      await supabase.rpc('release_operation_lock', { p_key: lockKey });
    } catch (lockError) {
      console.error('Error releasing lock:', lockError);
    }
    
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