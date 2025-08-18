import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, dryRun = true } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'userId is required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[CLEANUP] Starting tracks cleanup for user ${userId} (dry run: ${dryRun})`);

    // Получаем треки пользователя с проблемами
    const { data: problematicTracks, error: tracksError } = await supabase
      .from('tracks')
      .select(`
        id,
        title,
        audio_url,
        lyrics,
        duration,
        metadata,
        project_id,
        created_at,
        projects!inner(
          id,
          title,
          artist_id,
          artists!inner(
            id,
            user_id
          )
        )
      `)
      .eq('projects.artists.user_id', userId);

    if (tracksError) {
      console.error('[CLEANUP] Error fetching tracks:', tracksError);
      throw tracksError;
    }

    const cleanupCriteria = {
      noAudio: [] as any[],
      noMetadata: [] as any[],
      emptyTitle: [] as any[],
      softDeleted: [] as any[],
      oldIncomplete: [] as any[]
    };

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 дней назад

    for (const track of problematicTracks || []) {
      const trackDate = new Date(track.created_at);
      const isOld = trackDate < cutoffDate;
      
      // Треки без аудио
      if (!track.audio_url || track.audio_url.trim() === '') {
        cleanupCriteria.noAudio.push(track);
      }
      
      // Треки с пустым заголовком или только дефолтным
      if (!track.title || track.title.trim() === '' || 
          track.title === 'Untitled Track' || 
          track.title.startsWith('AI Generated Track')) {
        cleanupCriteria.emptyTitle.push(track);
      }
      
      // Треки без метаданных или с пустыми метаданными
      if (!track.metadata || 
          Object.keys(track.metadata).length === 0 ||
          (track.metadata && Object.values(track.metadata).every(v => !v))) {
        cleanupCriteria.noMetadata.push(track);
      }
      
      // Треки помеченные как удаленные
      if (track.metadata?.deleted === true) {
        cleanupCriteria.softDeleted.push(track);
      }
      
      // Старые неполные треки (без аудио и метаданных, старше 7 дней)
      if (isOld && !track.audio_url && (!track.metadata || Object.keys(track.metadata).length === 0)) {
        cleanupCriteria.oldIncomplete.push(track);
      }
    }

    const summary = {
      total_tracks: problematicTracks?.length || 0,
      tracks_without_audio: cleanupCriteria.noAudio.length,
      tracks_without_metadata: cleanupCriteria.noMetadata.length,
      tracks_with_empty_titles: cleanupCriteria.emptyTitle.length,
      soft_deleted_tracks: cleanupCriteria.softDeleted.length,
      old_incomplete_tracks: cleanupCriteria.oldIncomplete.length
    };

    console.log('[CLEANUP] Analysis complete:', summary);

    let deletedCount = 0;
    const deletedIds: string[] = [];

    if (!dryRun) {
      // Удаляем soft deleted треки
      for (const track of cleanupCriteria.softDeleted) {
        console.log(`[CLEANUP] Permanently deleting soft-deleted track: ${track.id}`);
        
        // Удаляем связанные записи
        await supabase.from('track_assets').delete().eq('track_id', track.id);
        await supabase.from('track_versions').delete().eq('track_id', track.id);
        await supabase.from('ai_generations').delete().eq('track_id', track.id);
        
        const { error: deleteError } = await supabase
          .from('tracks')
          .delete()
          .eq('id', track.id);
          
        if (!deleteError) {
          deletedCount++;
          deletedIds.push(track.id);
        } else {
          console.error(`[CLEANUP] Failed to delete track ${track.id}:`, deleteError);
        }
      }

      // Удаляем старые неполные треки
      for (const track of cleanupCriteria.oldIncomplete) {
        console.log(`[CLEANUP] Deleting old incomplete track: ${track.id}`);
        
        // Удаляем связанные записи
        await supabase.from('track_assets').delete().eq('track_id', track.id);
        await supabase.from('track_versions').delete().eq('track_id', track.id);
        await supabase.from('ai_generations').delete().eq('track_id', track.id);
        
        const { error: deleteError } = await supabase
          .from('tracks')
          .delete()
          .eq('id', track.id);
          
        if (!deleteError) {
          deletedCount++;
          deletedIds.push(track.id);
        } else {
          console.error(`[CLEANUP] Failed to delete track ${track.id}:`, deleteError);
        }
      }

      // Создаём лог активности
      const { error: logError } = await supabase
        .from('activity_logs')
        .insert({
          user_id: userId,
          action: 'tracks_cleanup',
          description: `Cleaned up ${deletedCount} problematic tracks`,
          entity_type: 'cleanup',
          status: 'completed',
          metadata: {
            deleted_count: deletedCount,
            deleted_track_ids: deletedIds,
            summary
          }
        });

      if (logError) {
        console.error('[CLEANUP] Error creating activity log:', logError);
      }
    }

    const result = {
      success: true,
      dry_run: dryRun,
      summary,
      details: {
        tracks_to_cleanup: {
          soft_deleted: cleanupCriteria.softDeleted.map(t => ({ id: t.id, title: t.title })),
          old_incomplete: cleanupCriteria.oldIncomplete.map(t => ({ id: t.id, title: t.title, created_at: t.created_at }))
        }
      },
      ...(dryRun ? {} : { 
        deleted_count: deletedCount, 
        deleted_track_ids: deletedIds 
      })
    };

    console.log(`[CLEANUP] Cleanup ${dryRun ? 'analysis' : 'execution'} completed. ${dryRun ? 'Would delete' : 'Deleted'} ${dryRun ? cleanupCriteria.softDeleted.length + cleanupCriteria.oldIncomplete.length : deletedCount} tracks.`);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in cleanup-tracks function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});