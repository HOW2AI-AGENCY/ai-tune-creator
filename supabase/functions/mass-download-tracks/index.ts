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

    console.log('[MASS_DOWNLOAD] Starting mass download for user:', user_id)

    // 1. Найти все треки пользователя с внешними URL
    const { data: tracks, error: fetchError } = await supabase
      .from('tracks')
      .select(`
        id, title, audio_url, metadata,
        project_id,
        projects!inner(
          artist_id,
          artists!inner(user_id)
        )
      `)
      .eq('projects.artists.user_id', user_id)
      .not('audio_url', 'is', null)
      .neq('audio_url', '')
      .not('metadata->deleted', 'eq', true)

    if (fetchError) {
      console.error('[MASS_DOWNLOAD] Error fetching tracks:', fetchError)
      throw fetchError
    }

    console.log(`[MASS_DOWNLOAD] Found ${tracks?.length || 0} tracks to process`)

    // 2. Фильтровать треки с внешними URL (не из Supabase Storage)
    const externalTracks = tracks?.filter(track => {
      const url = track.audio_url
      return url && !url.includes('supabase.co/storage')
    }) || []

    console.log(`[MASS_DOWNLOAD] ${externalTracks.length} tracks have external URLs`)

    // 3. Найти соответствующие ai_generations
    const downloadsToStart = []
    
    for (const track of externalTracks) {
      const generationId = track.metadata?.generation_id
      
      if (generationId) {
        // Проверить статус генерации
        const { data: generation } = await supabase
          .from('ai_generations')
          .select('id, external_id, result_url, metadata')
          .eq('id', generationId)
          .single()

        if (generation && generation.result_url) {
          downloadsToStart.push({
            generation_id: generationId,
            external_url: generation.result_url,
            track_title: track.title
          })
        }
      }
    }

    console.log(`[MASS_DOWNLOAD] ${downloadsToStart.length} downloads to start`)

    // 4. Запустить загрузки порциями по 5
    const batchSize = 5
    const results = []
    
    for (let i = 0; i < downloadsToStart.length; i += batchSize) {
      const batch = downloadsToStart.slice(i, i + batchSize)
      console.log(`[MASS_DOWNLOAD] Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(downloadsToStart.length/batchSize)}`)

      const batchPromises = batch.map(async (download) => {
        try {
          const response = await supabase.functions.invoke('download-and-save-track', {
            body: {
              generation_id: download.generation_id,
              external_url: download.external_url
            }
          })

          if (response.error) {
            console.error(`[MASS_DOWNLOAD] Error downloading ${download.track_title}:`, response.error)
            return { 
              track_title: download.track_title, 
              success: false, 
              error: response.error.message 
            }
          }

          console.log(`[MASS_DOWNLOAD] Started download for: ${download.track_title}`)
          return { 
            track_title: download.track_title, 
            success: true 
          }
        } catch (error) {
          console.error(`[MASS_DOWNLOAD] Exception downloading ${download.track_title}:`, error)
          return { 
            track_title: download.track_title, 
            success: false, 
            error: error.message 
          }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)

      // Пауза между батчами
      if (i + batchSize < downloadsToStart.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return new Response(JSON.stringify({
      success: true,
      message: `Mass download initiated`,
      details: {
        total_tracks: tracks?.length || 0,
        external_tracks: externalTracks.length,
        downloads_started: successful,
        downloads_failed: failed,
        results: results
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('[MASS_DOWNLOAD] Error:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})