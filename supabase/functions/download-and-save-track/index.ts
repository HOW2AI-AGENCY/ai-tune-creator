import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DownloadTrackRequest {
  generation_id: string;
  external_url: string;
  filename?: string;
  track_id?: string;
}

// Edge Function для загрузки и сохранения треков в Supabase Storage
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let requestBody: DownloadTrackRequest;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }

    const { generation_id, external_url, filename, track_id } = requestBody;

    if (!generation_id || !external_url) {
      throw new Error('generation_id and external_url are required');
    }

    console.log('Starting download for generation:', generation_id);
    console.log('External URL:', external_url);

    // Получаем информацию о генерации
    const { data: generation, error: genError } = await supabase
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

    if (genError || !generation) {
      throw new Error(`Generation not found: ${generation_id}`);
    }

    // Определяем имя файла
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const service = generation.service || 'unknown';
    const baseFileName = filename || 
      `${service}-track-${generation_id.slice(0, 8)}-${timestamp}`;
    
    // Добавляем расширение если его нет
    const audioFileName = baseFileName.includes('.') ? baseFileName : `${baseFileName}.mp3`;
    
    // Путь в storage: user_id/service/filename
    const storagePath = `${generation.user_id}/${service}/${audioFileName}`;

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

    // Сохраняем файл в Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('albert-tracks')
      .upload(storagePath, audioUint8Array, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw new Error(`Failed to upload to storage: ${uploadError.message}`);
    }

    console.log('File uploaded to storage:', uploadData.path);

    // Получаем публичный URL
    const { data: publicUrlData } = supabase.storage
      .from('albert-tracks')
      .getPublicUrl(storagePath);

    const localAudioUrl = publicUrlData.publicUrl;

    // Обновляем generation с локальной ссылкой
    const { error: updateGenError } = await supabase
      .from('ai_generations')
      .update({
        result_url: localAudioUrl,
        metadata: {
          ...generation.metadata,
          local_storage_path: storagePath,
          original_external_url: external_url,
          downloaded_at: new Date().toISOString(),
          file_size: audioUint8Array.length
        }
      })
      .eq('id', generation_id);

    if (updateGenError) {
      console.error('Error updating generation:', updateGenError);
    }

    // Создаем или обновляем трек с локальной ссылкой
    let finalTrackId = track_id || generation.track_id;
    
    if (finalTrackId) {
      // Обновляем существующий трек
      const { error: updateTrackError } = await supabase
        .from('tracks')
        .update({
          audio_url: localAudioUrl,
          metadata: {
            ...((generation.tracks as any)?.metadata || {}),
            local_storage_path: storagePath,
            original_external_url: external_url,
            downloaded_at: new Date().toISOString(),
            file_size: audioUint8Array.length
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', finalTrackId);

      if (updateTrackError) {
        console.error('Error updating track:', updateTrackError);
      } else {
        console.log('Track updated with local URL:', finalTrackId);
      }
    } else {
      // Создаем новый трек если его нет
      const trackTitle = generation.metadata?.suno_track_data?.title || 
                        generation.metadata?.title || 
                        `Generated Track ${new Date().toLocaleDateString()}`;

      const { data: newTrack, error: createTrackError } = await supabase
        .from('tracks')
        .insert({
          title: trackTitle,
          audio_url: localAudioUrl,
          duration: (() => { const d = Number(generation.metadata?.suno_track_data?.duration); return Number.isFinite(d) ? Math.round(d) : null; })(),
          lyrics: generation.metadata?.suno_track_data?.lyric || '',
          description: `Generated with ${generation.service}`,
          genre_tags: [],
          metadata: {
            generation_id: generation_id,
            service: generation.service,
            local_storage_path: storagePath,
            original_external_url: external_url,
            downloaded_at: new Date().toISOString(),
            file_size: audioUint8Array.length,
            ...generation.metadata
          }
        })
        .select()
        .single();

      if (createTrackError) {
        console.error('Error creating track:', createTrackError);
      } else {
        console.log('New track created:', newTrack.id);
        finalTrackId = newTrack.id;

        // Обновляем generation с новым track_id
        await supabase
          .from('ai_generations')
          .update({ track_id: finalTrackId })
          .eq('id', generation_id);
      }
    }

    const response = {
      success: true,
      data: {
        generation_id,
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

  } catch (error: any) {
    console.error('Error downloading and saving track:', error);
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