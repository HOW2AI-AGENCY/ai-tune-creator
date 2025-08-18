import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Функция для полного сброса данных пользователя:
 * - Удаление всех зависших генераций
 * - Удаление треков без аудио
 * - Очистка истории генераций
 */
serve(async (req) => {
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

    // Получаем пользователя
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    console.log('Starting user data reset for user:', user.id);

    const results = {
      deleted_generations: 0,
      deleted_tracks: 0,
      deleted_track_assets: 0,
      deleted_track_versions: 0,
      errors: [] as any[]
    };

    try {
      // 1. Удаляем все зависшие и неудачные генерации
      console.log('Deleting problematic AI generations...');
      const { data: problematicGenerations, error: genError } = await supabase
        .from('ai_generations')
        .select('id, status, external_id, service, track_id')
        .eq('user_id', user.id)
        .in('status', ['pending', 'processing', 'failed', 'error']);

      if (genError) {
        console.error('Error fetching problematic generations:', genError);
        results.errors.push({ step: 'fetch_generations', error: genError.message });
      } else {
        console.log(`Found ${problematicGenerations?.length || 0} problematic generations`);
        
        if (problematicGenerations && problematicGenerations.length > 0) {
          const generationIds = problematicGenerations.map(g => g.id);
          
          const { error: deleteGenError } = await supabase
            .from('ai_generations')
            .delete()
            .in('id', generationIds);

          if (deleteGenError) {
            console.error('Error deleting generations:', deleteGenError);
            results.errors.push({ step: 'delete_generations', error: deleteGenError.message });
          } else {
            results.deleted_generations = generationIds.length;
            console.log(`Deleted ${generationIds.length} problematic generations`);
          }
        }
      }

      // 2. Удаляем треки без аудио или с проблемами
      console.log('Deleting problematic tracks...');
      const { data: problematicTracks, error: tracksError } = await supabase
        .from('tracks')
        .select(`
          id,
          title,
          audio_url,
          metadata,
          projects!inner(
            id,
            artist_id,
            artists!inner(
              id,
              user_id
            )
          )
        `)
        .eq('projects.artists.user_id', user.id)
        .or('audio_url.is.null,audio_url.eq.,metadata->deleted.eq.true');

      if (tracksError) {
        console.error('Error fetching problematic tracks:', tracksError);
        results.errors.push({ step: 'fetch_tracks', error: tracksError.message });
      } else {
        console.log(`Found ${problematicTracks?.length || 0} problematic tracks`);
        
        if (problematicTracks && problematicTracks.length > 0) {
          const trackIds = problematicTracks.map(t => t.id);
          
          // Удаляем связанные данные треков
          const { error: assetsError } = await supabase
            .from('track_assets')
            .delete()
            .in('track_id', trackIds);

          if (assetsError) {
            console.error('Error deleting track assets:', assetsError);
            results.errors.push({ step: 'delete_assets', error: assetsError.message });
          } else {
            results.deleted_track_assets++;
            console.log('Deleted track assets');
          }

          const { error: versionsError } = await supabase
            .from('track_versions')
            .delete()
            .in('track_id', trackIds);

          if (versionsError) {
            console.error('Error deleting track versions:', versionsError);
            results.errors.push({ step: 'delete_versions', error: versionsError.message });
          } else {
            results.deleted_track_versions++;
            console.log('Deleted track versions');
          }

          // Обновляем генерации, убирая связи с треками
          const { error: updateGenError } = await supabase
            .from('ai_generations')
            .update({ track_id: null })
            .in('track_id', trackIds);

          if (updateGenError) {
            console.error('Error updating generations:', updateGenError);
            results.errors.push({ step: 'update_generations', error: updateGenError.message });
          }

          // Удаляем сами треки
          const { error: deleteTracksError } = await supabase
            .from('tracks')
            .delete()
            .in('id', trackIds);

          if (deleteTracksError) {
            console.error('Error deleting tracks:', deleteTracksError);
            results.errors.push({ step: 'delete_tracks', error: deleteTracksError.message });
          } else {
            results.deleted_tracks = trackIds.length;
            console.log(`Deleted ${trackIds.length} problematic tracks`);
          }
        }
      }

      // 3. Очищаем старые генерации старше 7 дней
      console.log('Cleaning old generations...');
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: oldGenerations, error: oldGenError } = await supabase
        .from('ai_generations')
        .select('id')
        .eq('user_id', user.id)
        .lt('created_at', sevenDaysAgo.toISOString())
        .is('track_id', null);

      if (oldGenError) {
        console.error('Error fetching old generations:', oldGenError);
        results.errors.push({ step: 'fetch_old_generations', error: oldGenError.message });
      } else if (oldGenerations && oldGenerations.length > 0) {
        const { error: deleteOldError } = await supabase
          .from('ai_generations')
          .delete()
          .in('id', oldGenerations.map(g => g.id));

        if (deleteOldError) {
          console.error('Error deleting old generations:', deleteOldError);
          results.errors.push({ step: 'delete_old_generations', error: deleteOldError.message });
        } else {
          results.deleted_generations += oldGenerations.length;
          console.log(`Deleted ${oldGenerations.length} old generations`);
        }
      }

      // Создаём лог активности
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action: 'user_data_reset',
          description: `Reset user data: ${results.deleted_generations} generations, ${results.deleted_tracks} tracks`,
          entity_type: 'system',
          status: 'completed',
          metadata: {
            results,
            timestamp: new Date().toISOString()
          }
        });

      if (logError) {
        console.error('Error creating activity log:', logError);
        results.errors.push({ step: 'create_log', error: logError.message });
      }

    } catch (error: any) {
      console.error('Error during cleanup operations:', error);
      results.errors.push({ step: 'cleanup_operations', error: error.message });
    }

    console.log('=== User Data Reset Results ===');
    console.log(`Deleted generations: ${results.deleted_generations}`);
    console.log(`Deleted tracks: ${results.deleted_tracks}`);
    console.log(`Deleted track assets: ${results.deleted_track_assets}`);
    console.log(`Deleted track versions: ${results.deleted_track_versions}`);
    console.log(`Errors: ${results.errors.length}`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        summary: {
          total_deleted_generations: results.deleted_generations,
          total_deleted_tracks: results.deleted_tracks,
          total_deleted_assets: results.deleted_track_assets,
          total_deleted_versions: results.deleted_track_versions,
          errors_count: results.errors.length
        },
        errors: results.errors,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in user data reset:', error);
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