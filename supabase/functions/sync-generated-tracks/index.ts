import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Edge Function для синхронизации всех сгенерированных треков
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Получаем пользователя из заголовка авторизации
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    console.log('Syncing generated tracks for user:', user.id);

    // Находим все completed генерации с external URLs, которые еще не загружены локально
    const { data: generations, error: fetchError } = await supabase
      .from('ai_generations')
      .select(`
        id,
        user_id,
        service,
        status,
        result_url,
        metadata,
        track_id,
        created_at,
        tracks(id, title, audio_url)
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('result_url', 'is', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch generations: ${fetchError.message}`);
    }

    console.log(`Found ${generations?.length || 0} completed generations`);

    const syncResults = [];
    const toDownload = [];

    // Фильтруем генерации, которые нуждаются в загрузке
    for (const gen of generations || []) {
      const isExternalUrl = gen.result_url && (
        gen.result_url.includes('sunoapi.org') ||
        gen.result_url.includes('mureka.ai') ||
        gen.result_url.includes('suno.com') ||
        !gen.result_url.includes(Deno.env.get('SUPABASE_URL') || '')
      );

      const needsDownload = isExternalUrl && !gen.metadata?.local_storage_path;

      if (needsDownload) {
        toDownload.push(gen);
      }
    }

    console.log(`Found ${toDownload.length} tracks to download`);

    // Загружаем треки порциями для избежания таймаутов
    const batchSize = 3;
    for (let i = 0; i < toDownload.length; i += batchSize) {
      const batch = toDownload.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (gen) => {
        try {
          console.log(`Downloading track for generation ${gen.id}`);
          
          // Вызываем функцию загрузки трека
          const { data: downloadResult, error: downloadError } = await supabase.functions.invoke(
            'download-and-save-track',
            {
              body: {
                generation_id: gen.id,
                external_url: gen.result_url,
                track_id: gen.track_id
              }
            }
          );

          if (downloadError) {
            throw downloadError;
          }

          return {
            generation_id: gen.id,
            success: true,
            result: downloadResult
          };
        } catch (error: any) {
          console.error(`Error downloading track for generation ${gen.id}:`, error);
          return {
            generation_id: gen.id,
            success: false,
            error: error.message
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      syncResults.push(...batchResults);

      // Небольшая пауза между батчами
      if (i + batchSize < toDownload.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Статистика
    const successful = syncResults.filter(r => r.success).length;
    const failed = syncResults.filter(r => !r.success).length;

    console.log(`Sync completed. Downloaded: ${successful}, Failed: ${failed}`);

    // Получаем обновленный список треков
    const { data: updatedTracks, error: tracksError } = await supabase
      .from('tracks')
      .select(`
        id,
        title,
        track_number,
        duration,
        audio_url,
        created_at,
        project_id,
        projects(title, artist_id, artists(name))
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (tracksError) {
      console.error('Error fetching updated tracks:', tracksError);
    }

    const response = {
      success: true,
      data: {
        sync_results: syncResults,
        summary: {
          total_checked: generations?.length || 0,
          needed_download: toDownload.length,
          successful_downloads: successful,
          failed_downloads: failed
        },
        tracks: updatedTracks || []
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error syncing generated tracks:', error);
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