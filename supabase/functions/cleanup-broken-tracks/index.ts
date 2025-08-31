import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[CLEANUP] Starting broken tracks cleanup...');

    // 1. Найти треки без audio_url или с недоступными URL
    const { data: brokenTracks, error: fetchError } = await supabase
      .from('tracks')
      .select('id, title, audio_url, metadata')
      .or('audio_url.is.null,audio_url.eq.');

    if (fetchError) {
      console.error('[CLEANUP] Error fetching broken tracks:', fetchError);
      throw fetchError;
    }

    console.log(`[CLEANUP] Found ${brokenTracks?.length || 0} tracks without audio_url`);

    // 2. Проверить доступность URL для треков с audio_url
    const tracksToDelete = [];
    
    for (const track of brokenTracks || []) {
      let shouldDelete = false;

      if (!track.audio_url) {
        shouldDelete = true;
        console.log(`[CLEANUP] Track "${track.title}" has no audio_url`);
      } else {
        // Проверить доступность URL
        try {
          const response = await fetch(track.audio_url, { method: 'HEAD' });
          if (!response.ok) {
            shouldDelete = true;
            console.log(`[CLEANUP] Track "${track.title}" has broken URL (${response.status})`);
          }
        } catch (error) {
          shouldDelete = true;
          console.log(`[CLEANUP] Track "${track.title}" has inaccessible URL:`, error.message);
        }
      }

      if (shouldDelete) {
        tracksToDelete.push(track);
      }
    }

    console.log(`[CLEANUP] Will delete ${tracksToDelete.length} broken tracks`);

    // 3. Мягкое удаление треков
    const deletedIds = [];
    for (const track of tracksToDelete) {
      const { error: deleteError } = await supabase
        .from('tracks')
        .update({ 
          metadata: { 
            ...track.metadata, 
            deleted: true, 
            deleted_reason: 'broken_audio_url',
            deleted_at: new Date().toISOString()
          } 
        })
        .eq('id', track.id);

      if (deleteError) {
        console.error(`[CLEANUP] Error deleting track ${track.id}:`, deleteError);
      } else {
        deletedIds.push(track.id);
        console.log(`[CLEANUP] Marked track "${track.title}" as deleted`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Cleanup completed',
      details: {
        found_broken: brokenTracks?.length || 0,
        deleted: deletedIds.length,
        deleted_ids: deletedIds
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[CLEANUP] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});