/**
 * @fileoverview Check for multiple track variants from Suno API
 * @version 0.01.037
 * @author Claude Code Assistant
 * 
 * This function analyzes completed Suno generations and creates tracks for all variants
 * that were generated but not yet processed.
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    console.log('Checking for missing track variants for user:', user.id);

    // Находим все completed генерации с multiple tracks в metadata
    const { data: generations, error: fetchError } = await supabase
      .from('ai_generations')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .eq('service', 'suno')
      .not('metadata->all_tracks', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch generations: ${fetchError.message}`);
    }

    console.log(`Found ${generations?.length || 0} completed Suno generations with multiple tracks`);

    let createdTracks = 0;
    let processedGenerations = 0;

    // Получаем inbox проект для пользователя
    const { data: inboxProject, error: inboxError } = await supabase.rpc('ensure_user_inbox', {
      p_user_id: user.id
    });

    if (inboxError) {
      throw new Error(`Failed to ensure inbox project: ${inboxError.message}`);
    }

    for (const gen of generations || []) {
      try {
        const allTracks = gen.metadata?.all_tracks || [];
        if (!Array.isArray(allTracks) || allTracks.length <= 1) {
          continue; // Пропускаем генерации с одним треком
        }

        console.log(`Processing generation ${gen.id} with ${allTracks.length} track variants`);

        // Проверяем какие треки уже созданы
        const { data: existingTracks, error: existingError } = await supabase
          .from('tracks')
          .select('id, metadata')
          .eq('metadata->>generation_id', gen.id);

        if (existingError) {
          console.error('Error checking existing tracks:', existingError);
          continue;
        }

        const existingVariants = new Set(
          existingTracks?.map(t => t.metadata?.track_variant || 1) || [1]
        );

        console.log(`Found ${existingTracks?.length || 0} existing tracks for generation ${gen.id}`);
        console.log('Existing variants:', Array.from(existingVariants));

        // Создаем недостающие треки
        for (let trackIndex = 0; trackIndex < allTracks.length; trackIndex++) {
          const variantNumber = trackIndex + 1;
          
          if (existingVariants.has(variantNumber)) {
            console.log(`Variant ${variantNumber} already exists, skipping`);
            continue;
          }

          const track = allTracks[trackIndex];
          console.log(`Creating missing variant ${variantNumber}:`, track.id);

          // Генерируем smart title
          let smartTitle = track.title || 'Сгенерированный трек';
          if (track.title === 'AI Generated Track 17.08.2025' || !track.title) {
            const lyrics = track.prompt || track.lyric;
            if (lyrics) {
              const lyricsMatch = lyrics.match(/\[(?:Куплет|Verse|Intro|Интро|Припев|Chorus)\s*\d*\]?\s*\n(.+)/i);
              if (lyricsMatch && lyricsMatch[1]) {
                smartTitle = lyricsMatch[1].trim().slice(0, 50);
              } else {
                const lines = lyrics.split('\n').filter(line => 
                  line.trim() && 
                  !line.includes('[') && 
                  !line.toLowerCase().includes('создай') &&
                  line.length > 10
                );
                if (lines.length > 0) {
                  smartTitle = lines[0].trim().slice(0, 50);
                }
              }
            }
          }

          // Добавляем номер варианта для дополнительных треков
          if (trackIndex > 0) {
            smartTitle = `${smartTitle} (вариант ${variantNumber})`;
          }

          // Дедуплицируем название
          const { data: dedupedTitle } = await supabase
            .rpc('dedupe_track_title', { 
              p_project_id: inboxProject, 
              p_title: smartTitle 
            });

          const finalTitle = dedupedTitle || smartTitle;

          // Получаем следующий номер трека
          const { data: nextNumber } = await supabase
            .rpc('get_next_track_number', { p_project_id: inboxProject });

          const trackNumber = nextNumber || 1;

          // Создаем трек
          const { data: newTrack, error: createError } = await supabase
            .from('tracks')
            .insert({
              title: finalTitle,
              track_number: trackNumber,
              audio_url: track.audio_url,
              duration: track.duration,
              lyrics: track.prompt || track.lyric || '',
              description: track.prompt || `Generated with ${track.model_name}`,
              genre_tags: track.tags ? track.tags.split(', ').filter(Boolean) : [],
              style_prompt: track.style || '',
              project_id: inboxProject,
              metadata: {
                suno_task_id: gen.external_id,
                suno_track_id: track.id,
                suno_model: track.model_name,
                suno_track_data: track,
                generation_id: gen.id,
                track_variant: variantNumber,
                total_variants: allTracks.length,
                is_primary: trackIndex === 0,
                completed_at: new Date().toISOString(),
                external_audio_url: track.audio_url,
                auto_inbox: true,
                created_by_variant_sync: true
              }
            })
            .select()
            .single();

          if (createError) {
            console.error(`Error creating variant ${variantNumber}:`, createError);
          } else {
            console.log(`Created variant ${variantNumber}:`, newTrack.id);
            createdTracks++;

            // Запускаем фоновую загрузку
            supabase.functions.invoke('download-and-save-track', {
              body: {
                generation_id: gen.id,
                external_url: track.audio_url,
                track_id: newTrack.id
              }
            }).catch(err => console.error('Background download error:', err));
          }
        }

        processedGenerations++;
      } catch (error: any) {
        console.error(`Error processing generation ${gen.id}:`, error);
      }
    }

    const response = {
      success: true,
      data: {
        processed_generations: processedGenerations,
        created_tracks: createdTracks,
        message: `Created ${createdTracks} missing track variants from ${processedGenerations} generations`
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in create-missing-track-variants:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});