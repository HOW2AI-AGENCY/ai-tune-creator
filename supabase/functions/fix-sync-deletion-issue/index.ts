import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { user_id } = await req.json()

    console.log(`[SYNC_CLEANUP] Starting sync cleanup for user: ${user_id}`)

    // 1. Найти все мягко удаленные треки без блокировки синхронизации
    const { data: deletedTracks } = await supabase
      .from('tracks')
      .select(`
        id, metadata,
        projects!inner(
          artist_id,
          artists!inner(user_id)
        )
      `)
      .eq('projects.artists.user_id', user_id)
      .eq('metadata->deleted', true)
      .not('metadata->prevent_sync_restore', 'eq', true)

    console.log(`[SYNC_CLEANUP] Found ${deletedTracks?.length || 0} deleted tracks without sync block`)

    // 2. Обновить их метаданные для блокировки синхронизации
    for (const track of deletedTracks || []) {
      await supabase
        .from('tracks')
        .update({
          metadata: {
            ...(track.metadata || {}),
            prevent_sync_restore: true,
            sync_cleanup_applied: true,
            sync_cleanup_at: new Date().toISOString()
          }
        })
        .eq('id', track.id)

      console.log(`[SYNC_CLEANUP] Added sync block to track ${track.id}`)
    }

    // 3. Найти все генерации связанные с удаленными треками
    const { data: linkedGenerations } = await supabase
      .from('ai_generations')
      .select('id, track_id, metadata')
      .eq('user_id', user_id)
      .in('track_id', (deletedTracks || []).map(t => t.id))

    console.log(`[SYNC_CLEANUP] Found ${linkedGenerations?.length || 0} generations linked to deleted tracks`)

    // 4. Пометить генерации как не подлежащие синхронизации
    for (const gen of linkedGenerations || []) {
      await supabase
        .from('ai_generations')
        .update({
          metadata: {
            ...(gen.metadata || {}),
            skip_sync: true,
            track_deleted: true,
            deleted_by_user: true,
            sync_cleanup_applied: true,
            deleted_at: new Date().toISOString()
          }
        })
        .eq('id', gen.id)

      console.log(`[SYNC_CLEANUP] Marked generation ${gen.id} as skip_sync`)
    }

    // 5. Найти генерации без треков, но с метаданными удаленных треков
    const { data: orphanGenerations } = await supabase
      .from('ai_generations')
      .select('id, external_id, metadata')
      .eq('user_id', user_id)
      .is('track_id', null)
      .eq('status', 'completed')
      .not('metadata->skip_sync', 'eq', true)

    let orphansMarked = 0
    for (const gen of orphanGenerations || []) {
      // Проверить если есть удаленный трек с тем же external_id
      const { data: deletedWithSameId } = await supabase
        .from('tracks')
        .select(`
          id, metadata,
          projects!inner(
            artist_id,
            artists!inner(user_id)
          )
        `)
        .eq('projects.artists.user_id', user_id)
        .eq('metadata->deleted', true)
        .eq('metadata->external_id', gen.external_id)

      if (deletedWithSameId && deletedWithSameId.length > 0) {
        await supabase
          .from('ai_generations')
          .update({
            metadata: {
              ...(gen.metadata || {}),
              skip_sync: true,
              track_deleted: true,
              deleted_by_user: true,
              orphan_cleanup: true,
              deleted_at: new Date().toISOString()
            }
          })
          .eq('id', gen.id)

        orphansMarked++
        console.log(`[SYNC_CLEANUP] Marked orphan generation ${gen.id} as skip_sync`)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Sync cleanup completed',
      stats: {
        deleted_tracks_updated: deletedTracks?.length || 0,
        linked_generations_marked: linkedGenerations?.length || 0,
        orphan_generations_marked: orphansMarked
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[SYNC_CLEANUP] Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})