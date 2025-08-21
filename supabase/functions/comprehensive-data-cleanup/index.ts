import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CleanupStats {
  tracks_removed: number
  generations_removed: number
  orphaned_generations: number
  invalid_tracks: number
  storage_files_removed: number
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, deep_clean = false } = await req.json()

    console.log(`[CLEANUP] Starting comprehensive cleanup for user: ${user_id}, deep_clean: ${deep_clean}`)

    const stats: CleanupStats = {
      tracks_removed: 0,
      generations_removed: 0,
      orphaned_generations: 0,
      invalid_tracks: 0,
      storage_files_removed: 0
    }

    // 1. Найти все треки пользователя
    const { data: userTracks, error: tracksError } = await supabase
      .from('tracks')
      .select(`
        id, title, audio_url, metadata, project_id,
        projects!inner(
          artist_id,
          artists!inner(user_id)
        )
      `)
      .eq('projects.artists.user_id', user_id)

    if (tracksError) {
      console.error('[CLEANUP] Error fetching user tracks:', tracksError)
      throw tracksError
    }

    console.log(`[CLEANUP] Found ${userTracks?.length || 0} tracks for user`)

    // 2. Найти все генерации пользователя
    const { data: userGenerations, error: generationsError } = await supabase
      .from('ai_generations')
      .select('id, track_id, result_url, status, external_id')
      .eq('user_id', user_id)

    if (generationsError) {
      console.error('[CLEANUP] Error fetching user generations:', generationsError)
      throw generationsError
    }

    console.log(`[CLEANUP] Found ${userGenerations?.length || 0} generations for user`)

    // 3. Определить проблемные треки
    const problematicTracks = userTracks?.filter(track => {
      const hasAudio = track.audio_url && track.audio_url.trim() !== ''
      const isDeleted = track.metadata?.deleted === true
      const hasGenerationId = track.metadata?.generation_id
      
      // Трек проблематичный если:
      // - Нет audio_url
      // - Помечен как удаленный
      // - Нет связи с генерацией и нет валидного audio_url
      return !hasAudio || isDeleted || (!hasGenerationId && !hasAudio)
    }) || []

    console.log(`[CLEANUP] Found ${problematicTracks.length} problematic tracks`)

    // 4. Определить проблемные генерации
    const problematicGenerations = userGenerations?.filter(gen => {
      const hasResult = gen.result_url && gen.result_url.trim() !== ''
      const isCompleted = gen.status === 'completed'
      const hasTrackLink = gen.track_id
      
      // Генерация проблематичная если:
      // - Нет result_url но статус completed
      // - Нет связи с треком но есть result_url
      return (!hasResult && isCompleted) || (!hasTrackLink && hasResult)
    }) || []

    console.log(`[CLEANUP] Found ${problematicGenerations.length} problematic generations`)

    // 5. Удалить проблемные треки с правильной блокировкой синхронизации
    for (const track of problematicTracks) {
      // Пометить связанную генерацию как не подлежащую синхронизации
      if (track.metadata?.generation_id) {
        await supabase
          .from('ai_generations')
          .update({
            metadata: {
              skip_sync: true,
              track_deleted: true,
              deleted_by_cleanup: true,
              deleted_at: new Date().toISOString()
            }
          })
          .eq('id', track.metadata.generation_id)
      }
      
      // Сначала удалить связанные записи
      await supabase.from('track_assets').delete().eq('track_id', track.id)
      await supabase.from('track_versions').delete().eq('track_id', track.id)
      
      // Затем сам трек
      const { error: deleteError } = await supabase
        .from('tracks')
        .delete()
        .eq('id', track.id)

      if (deleteError) {
        console.error(`[CLEANUP] Error deleting track ${track.id}:`, deleteError)
      } else {
        stats.tracks_removed++
        console.log(`[CLEANUP] Deleted track: ${track.title}`)
      }
    }

    // 6. Удалить проблемные генерации
    for (const generation of problematicGenerations) {
      const { error: deleteError } = await supabase
        .from('ai_generations')
        .delete()
        .eq('id', generation.id)

      if (deleteError) {
        console.error(`[CLEANUP] Error deleting generation ${generation.id}:`, deleteError)
      } else {
        stats.generations_removed++
        console.log(`[CLEANUP] Deleted generation: ${generation.id}`)
      }
    }

    // 7. Найти и почистить орфанные генерации (генерации без треков)
    const { data: orphanedGens } = await supabase
      .from('ai_generations')
      .select('id, track_id')
      .eq('user_id', user_id)
      .not('track_id', 'is', null)

    if (orphanedGens) {
      for (const gen of orphanedGens) {
        // Проверить существует ли трек
        const { data: trackExists } = await supabase
          .from('tracks')
          .select('id')
          .eq('id', gen.track_id)
          .single()

        if (!trackExists) {
          // Трек не существует, удалить генерацию
          await supabase.from('ai_generations').delete().eq('id', gen.id)
          stats.orphaned_generations++
          console.log(`[CLEANUP] Removed orphaned generation: ${gen.id}`)
        }
      }
    }

    // 8. Глубокая очистка (если запрошена)
    if (deep_clean) {
      console.log('[CLEANUP] Performing deep clean...')
      
      // Очистить все логи пользователя старше 30 дней
      await supabase
        .from('logs')
        .delete()
        .eq('user_id', user_id)
        .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      // Очистить старые уведомления
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user_id)
        .eq('is_read', true)
        .lt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

      // Очистить неактивные сессии
      await supabase
        .from('sessions')
        .delete()
        .eq('user_id', user_id)
        .eq('is_active', false)
    }

    // 9. Валидировать оставшиеся данные
    const { data: remainingTracks } = await supabase
      .from('tracks')
      .select(`
        id, title, audio_url, metadata,
        projects!inner(
          artist_id,
          artists!inner(user_id)
        )
      `)
      .eq('projects.artists.user_id', user_id)
      .not('metadata->deleted', 'eq', true)

    const { data: remainingGenerations } = await supabase
      .from('ai_generations')
      .select('id, track_id, result_url, status')
      .eq('user_id', user_id)

    console.log(`[CLEANUP] After cleanup: ${remainingTracks?.length || 0} tracks, ${remainingGenerations?.length || 0} generations`)

    return new Response(JSON.stringify({
      success: true,
      message: 'Comprehensive cleanup completed',
      stats,
      remaining: {
        tracks: remainingTracks?.length || 0,
        generations: remainingGenerations?.length || 0
      },
      cleaned_items: {
        problematic_tracks: problematicTracks.length,
        problematic_generations: problematicGenerations.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[CLEANUP] Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})