import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Function для исправления лирики в существующих треках
 * Извлекает лирику из metadata.suno_track_data.prompt и сохраняет в поле lyrics
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Начинаем исправление лирики в существующих треках...');

    // Находим все треки без лирики, но с метаданными Suno
    const { data: tracksWithoutLyrics, error: fetchError } = await supabase
      .from('tracks')
      .select('id, title, lyrics, metadata')
      .is('lyrics', null)
      .not('metadata->suno_track_data', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Найдено ${tracksWithoutLyrics?.length || 0} треков без лирики`);

    const fixedTracks = [];
    const errorTracks = [];

    for (const track of tracksWithoutLyrics || []) {
      try {
        const sunoTrackData = track.metadata?.suno_track_data;
        const extractedLyrics = sunoTrackData?.prompt || sunoTrackData?.lyric;

        if (extractedLyrics) {
          // Генерируем умное название если нужно
          let smartTitle = track.title;
          if (track.title === 'AI Generated Track 17.08.2025' || track.title === 'Сгенерированный трек') {
            // Извлекаем первую строку после [Куплет] или [Verse] как название
            const lyricsMatch = extractedLyrics.match(/\[(?:Куплет|Verse|Intro|Интро)\s*\d*\]?\s*\n(.+)/i);
            if (lyricsMatch && lyricsMatch[1]) {
              smartTitle = lyricsMatch[1].trim().slice(0, 50);
            } else {
              // Используем первую осмысленную строку
              const lines = extractedLyrics.split('\n').filter(line => 
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

          // Обновляем трек
          const { error: updateError } = await supabase
            .from('tracks')
            .update({
              lyrics: extractedLyrics,
              title: smartTitle,
              metadata: {
                ...track.metadata,
                lyrics_fixed: true,
                title_improved: smartTitle !== track.title,
                fixed_at: new Date().toISOString()
              }
            })
            .eq('id', track.id);

          if (updateError) {
            throw updateError;
          }

          fixedTracks.push({
            id: track.id,
            original_title: track.title,
            new_title: smartTitle,
            lyrics_length: extractedLyrics.length,
            title_improved: smartTitle !== track.title
          });

          console.log(`Исправлен трек ${track.id}: "${track.title}" -> "${smartTitle}"`);
        } else {
          console.log(`Трек ${track.id} не содержит лирику в метаданных`);
        }
      } catch (error: any) {
        console.error(`Ошибка при обработке трека ${track.id}:`, error);
        errorTracks.push({
          id: track.id,
          title: track.title,
          error: error.message
        });
      }
    }

    const result = {
      success: true,
      processed: tracksWithoutLyrics?.length || 0,
      fixed: fixedTracks.length,
      errors: errorTracks.length,
      fixed_tracks: fixedTracks,
      error_tracks: errorTracks
    };

    console.log('Результат исправления:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Ошибка при исправлении лирики:', error);
    
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