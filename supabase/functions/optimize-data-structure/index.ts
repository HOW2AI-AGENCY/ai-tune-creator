import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OptimizationStats {
  tracks_optimized: number
  generations_linked: number
  metadata_cleaned: number
  duplicates_merged: number
  storage_optimized: number
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

    console.log(`[OPTIMIZE] Starting data structure optimization for user: ${user_id}`)

    const stats: OptimizationStats = {
      tracks_optimized: 0,
      generations_linked: 0,
      metadata_cleaned: 0,
      duplicates_merged: 0,
      storage_optimized: 0
    }

    // 1. Оптимизировать метаданные треков
    const { data: tracks } = await supabase
      .from('tracks')
      .select(`
        id, title, metadata, audio_url,
        projects!inner(
          artist_id,
          artists!inner(user_id)
        )
      `)
      .eq('projects.artists.user_id', user_id)

    console.log(`[OPTIMIZE] Processing ${tracks?.length || 0} tracks`)

    for (const track of tracks || []) {
      let needsUpdate = false
      const optimizedMetadata = { ...(track.metadata || {}) }

      // Очистить ненужные поля метаданных
      const fieldsToRemove = ['temp_data', 'debug_info', 'old_id', 'legacy_data']
      fieldsToRemove.forEach(field => {
        if (optimizedMetadata[field]) {
          delete optimizedMetadata[field]
          needsUpdate = true
        }
      })

      // Стандартизировать поля
      if (optimizedMetadata.service && typeof optimizedMetadata.service !== 'string') {
        optimizedMetadata.service = String(optimizedMetadata.service)
        needsUpdate = true
      }

      if (optimizedMetadata.processing_status && !['pending', 'processing', 'completed', 'failed'].includes(optimizedMetadata.processing_status)) {
        optimizedMetadata.processing_status = 'completed'
        needsUpdate = true
      }

      // Убедиться что deleted это boolean
      if (optimizedMetadata.deleted && typeof optimizedMetadata.deleted !== 'boolean') {
        optimizedMetadata.deleted = optimizedMetadata.deleted === 'true' || optimizedMetadata.deleted === true
        needsUpdate = true
      }

      if (needsUpdate) {
        await supabase
          .from('tracks')
          .update({ metadata: optimizedMetadata })
          .eq('id', track.id)

        stats.metadata_cleaned++
        console.log(`[OPTIMIZE] Cleaned metadata for track: ${track.title}`)
      }

      stats.tracks_optimized++
    }

    // 2. Связать несвязанные генерации с треками
    const { data: unlinkedGenerations } = await supabase
      .from('ai_generations')
      .select('id, external_id, result_url, metadata, prompt')
      .eq('user_id', user_id)
      .is('track_id', null)
      .eq('status', 'completed')
      .not('result_url', 'is', null)

    console.log(`[OPTIMIZE] Found ${unlinkedGenerations?.length || 0} unlinked generations`)

    for (const generation of unlinkedGenerations || []) {
      // Попробовать найти трек по external_id или URL
      const { data: matchingTracks } = await supabase
        .from('tracks')
        .select(`
          id, audio_url, metadata,
          projects!inner(
            artist_id,
            artists!inner(user_id)
          )
        `)
        .eq('projects.artists.user_id', user_id)
        .or(`audio_url.eq.${generation.result_url},metadata->>external_id.eq.${generation.external_id}`)

      if (matchingTracks && matchingTracks.length === 1) {
        // Связать генерацию с треком
        await supabase
          .from('ai_generations')
          .update({ track_id: matchingTracks[0].id })
          .eq('id', generation.id)

        // Обновить метаданные трека
        const updatedMetadata = {
          ...(matchingTracks[0].metadata || {}),
          generation_id: generation.id,
          external_id: generation.external_id
        }

        await supabase
          .from('tracks')
          .update({ metadata: updatedMetadata })
          .eq('id', matchingTracks[0].id)

        stats.generations_linked++
        console.log(`[OPTIMIZE] Linked generation ${generation.id} to track ${matchingTracks[0].id}`)
      }
    }

    // 3. Найти и объединить дубликаты треков
    const { data: allUserTracks } = await supabase
      .from('tracks')
      .select(`
        id, title, audio_url, metadata, created_at,
        projects!inner(
          artist_id,
          artists!inner(user_id)
        )
      `)
      .eq('projects.artists.user_id', user_id)
      .order('created_at', { ascending: true })

    // Группировать по названию и audio_url
    const trackGroups: { [key: string]: any[] } = {}
    
    for (const track of allUserTracks || []) {
      const key = `${track.title}|${track.audio_url || 'no-audio'}`
      if (!trackGroups[key]) {
        trackGroups[key] = []
      }
      trackGroups[key].push(track)
    }

    // Обработать дубликаты
    for (const [key, tracks] of Object.entries(trackGroups)) {
      if (tracks.length > 1) {
        console.log(`[OPTIMIZE] Found ${tracks.length} duplicate tracks for: ${tracks[0].title}`)
        
        // Оставить самый старый, удалить остальные
        const keepTrack = tracks[0]
        const duplicates = tracks.slice(1)

        for (const duplicate of duplicates) {
          // Перенести ассеты и версии на основной трек
          await supabase
            .from('track_assets')
            .update({ track_id: keepTrack.id })
            .eq('track_id', duplicate.id)

          await supabase
            .from('track_versions')
            .update({ track_id: keepTrack.id })
            .eq('track_id', duplicate.id)

          // Обновить генерации
          await supabase
            .from('ai_generations')
            .update({ track_id: keepTrack.id })
            .eq('track_id', duplicate.id)

          // Удалить дубликат
          await supabase
            .from('tracks')
            .delete()
            .eq('id', duplicate.id)

          stats.duplicates_merged++
        }
      }
    }

    // 4. Оптимизировать inbox проекты
    const { data: userArtists } = await supabase
      .from('artists')
      .select('id, user_id')
      .eq('user_id', user_id)

    for (const artist of userArtists || []) {
      // Убедиться что у артиста есть только один inbox
      const { data: inboxProjects } = await supabase
        .from('projects')
        .select('id, title, created_at')
        .eq('artist_id', artist.id)
        .eq('is_inbox', true)
        .order('created_at', { ascending: true })

      if (inboxProjects && inboxProjects.length > 1) {
        console.log(`[OPTIMIZE] Found ${inboxProjects.length} inbox projects for artist ${artist.id}`)
        
        // Оставить самый старый inbox
        const keepInbox = inboxProjects[0]
        const extraInboxes = inboxProjects.slice(1)

        // Перенести все треки в основной inbox
        for (const extraInbox of extraInboxes) {
          await supabase
            .from('tracks')
            .update({ project_id: keepInbox.id })
            .eq('project_id', extraInbox.id)

          // Удалить лишний inbox
          await supabase
            .from('projects')
            .delete()
            .eq('id', extraInbox.id)
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Data structure optimization completed',
      stats,
      optimizations: {
        metadata_standardized: stats.metadata_cleaned > 0,
        generations_linked: stats.generations_linked > 0,
        duplicates_handled: stats.duplicates_merged > 0,
        inbox_consolidated: true
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[OPTIMIZE] Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})