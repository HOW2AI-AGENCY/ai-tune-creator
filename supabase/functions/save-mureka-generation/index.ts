import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { generationId, trackData, projectId, artistId } = await req.json()

    console.log('Saving Mureka generation:', { generationId, trackData })

    // TODO: КРИТИЧЕСКАЯ ОШИБКА - колонка title не существует в ai_generations
    // FIXME: Использовать правильные колонки из схемы БД
    
    // Get user from generation record
    const { data: generation, error: genError } = await supabase
      .from('ai_generations')
      .select('user_id, prompt, metadata')  // FIXME: убрал несуществующую колонку title
      .eq('id', generationId)
      .single()

    if (genError || !generation) {
      console.error('Error getting generation:', genError)
      return new Response(
        JSON.stringify({ success: false, error: 'Generation not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // TODO: ИСПРАВИТЬ - проблема с поиском проекта и artist_id
    // FIXME: Улучшить логику поиска Inbox проекта
    
    // Найти проект для сохранения трека
    let targetProjectId = projectId;
    if (!targetProjectId) {
      console.log('[PROJECT] Поиск Inbox проекта для пользователя:', generation.user_id);
      
      // Сначала найти artist пользователя, если не передан
      let finalArtistId = artistId;
      if (!finalArtistId) {
        const { data: userArtist } = await supabase
          .from('artists')
          .select('id')
          .eq('user_id', generation.user_id)
          .limit(1)
          .single();
        
        finalArtistId = userArtist?.id;
        console.log('[PROJECT] Найден artist пользователя:', finalArtistId);
      }
      
      if (finalArtistId) {
        // Получить проект Inbox пользователя
        const { data: inboxProject } = await supabase
          .from('projects')
          .select('id')
          .eq('is_inbox', true)
          .eq('artist_id', finalArtistId)
          .single();
        
        targetProjectId = inboxProject?.id;
        console.log('[PROJECT] Найден Inbox проект:', targetProjectId);
      }
    }

    // Create track record with immediate audio URL
    const trackRecord = {
      id: crypto.randomUUID(),
      project_id: targetProjectId,
      title: trackData.title || 'AI Generated Track',
      audio_url: trackData.audio_url, // Direct audio URL from Mureka
      duration: trackData.duration || 120,
      lyrics: trackData.lyrics || '',
      genre_tags: trackData.genre_tags || ['ai-generated', 'mureka'],
      track_number: await getNextTrackNumber(targetProjectId),
      style_prompt: trackData.style_prompt || generation.prompt,
      metadata: {
        service: 'mureka',
        model: trackData.model || 'auto',
        prompt: generation.prompt,
        style_prompt: trackData.style_prompt,
        generated_at: new Date().toISOString(),
        generation_id: generationId,
        external_audio_url: trackData.audio_url,
        mureka_choice_id: trackData.mureka_choice_id,
        track_variant: trackData.track_variant || 1,
        total_variants: trackData.total_variants || 1,
        original_data: trackData
      }
    }

    // TODO: Вынести функцию из тела основной функции
    // FIXME: Использовать существующую функцию get_next_track_number из БД
    
    // Функция для получения следующего номера трека
    async function getNextTrackNumber(projectId: string) {
      if (!projectId) {
        console.log('[TRACK_NUMBER] Нет project_id, используем номер 1');
        return 1;
      }
      
      const { data } = await supabase
        .from('tracks')
        .select('track_number')
        .eq('project_id', projectId)
        .order('track_number', { ascending: false })
        .limit(1);
      
      const nextNumber = (data?.[0]?.track_number || 0) + 1;
      console.log('[TRACK_NUMBER] Следующий номер трека:', nextNumber);
      return nextNumber;
    }

    // Save track to database
    const { data: savedTrack, error: trackError } = await supabase
      .from('tracks')
      .insert(trackRecord)
      .select()
      .single()

    if (trackError) {
      console.error('Error saving track:', trackError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save track', details: trackError }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update generation status to completed
    const { error: updateError } = await supabase
      .from('ai_generations')
      .update({
        status: 'completed',
        result_url: trackData.audio_url,
        track_id: savedTrack.id,
        completed_at: new Date().toISOString(),
        metadata: {
          ...((generation.metadata as any) || {}),  // TODO: Типизировать metadata правильно
          ...trackData,
          saved_track_id: savedTrack.id,
          track_saved: true,
          skip_sync: true
        }
      })
      .eq('id', generationId)

    // TODO: FIXME - Improve background download with better error handling
    if (trackData.audio_url && trackData.audio_url !== 'undefined' && trackData.audio_url.startsWith('http')) {
      console.log('[SAVE-MUREKA] Starting background download...');
      console.log('[SAVE-MUREKA] URL for download:', trackData.audio_url);
      
      // Используем EdgeRuntime.waitUntil для фонового процесса
      if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(
          supabase.functions.invoke('download-and-save-track', {
            body: {
              generation_id: generationId,
              external_url: trackData.audio_url,
              filename: `mureka_${generationId.slice(0, 8)}.mp3`,
              track_id: savedTrack.id
            }
          }).then(result => {
            if (result.error) {
              console.error('[SAVE-MUREKA] Background download failed:', result.error);
            } else {
              console.log('[SAVE-MUREKA] Background download successful:', result.data);
            }
          }).catch(error => {
            console.error('[SAVE-MUREKA] Background download exception:', error.message);
          })
        );
      } else {
        // Fallback без waitUntil
        supabase.functions.invoke('download-and-save-track', {
          body: {
            generation_id: generationId,
            external_url: trackData.audio_url,
            filename: `mureka_${generationId.slice(0, 8)}.mp3`,
            track_id: savedTrack.id
          }
        }).catch(error => {
          console.error('[SAVE-MUREKA] Background download failed (fallback):', error);
        });
      }
      
      console.log('[SAVE-MUREKA] Background download initiated');
    } else {
      console.warn('[SAVE-MUREKA] Invalid audio URL for download:', trackData.audio_url);
    }

    if (updateError) {
      console.error('Error updating generation:', updateError)
      // Don't fail the request if track was saved successfully
    }

    console.log('Mureka track saved successfully:', savedTrack.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        track: savedTrack,
        message: 'Track saved successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in save-mureka-generation:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})