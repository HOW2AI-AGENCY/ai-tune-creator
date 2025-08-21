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
    const { trackId, userId, softDelete = true } = await req.json();

    if (!trackId || !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'trackId and userId are required'
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

    console.log(`[DELETE] ${softDelete ? 'Soft' : 'Hard'} deleting track ${trackId} for user ${userId}`);

    // Проверяем, что трек принадлежит пользователю
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select(`
        id,
        title,
        project_id,
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
      .eq('id', trackId)
      .eq('projects.artists.user_id', userId)
      .single();

    if (trackError || !track) {
      console.error('[DELETE] Track not found or access denied:', trackError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Track not found or access denied'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    let result;

    if (softDelete) {
      // Soft delete: помечаем трек как удаленный в metadata
      const currentMetadata = track.metadata || {};
      const { error: updateError } = await supabase
        .from('tracks')
        .update({
          metadata: {
            ...currentMetadata,
            deleted: true,
            deleted_at: new Date().toISOString(),
            deleted_by: userId
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', trackId);

      if (updateError) {
        console.error('[DELETE] Error soft deleting track:', updateError);
        throw updateError;
      }

      result = {
        success: true,
        message: 'Track moved to trash',
        deleted: false,
        track_id: trackId
      };

      console.log('[DELETE] Track moved to trash successfully');
    } else {
      // Hard delete: полное удаление
      console.log('[DELETE] Starting hard delete process...');

      // Удаляем связанные записи в правильном порядке
      console.log('[DELETE] Deleting track assets...');
      const { error: assetsError } = await supabase
        .from('track_assets')
        .delete()
        .eq('track_id', trackId);

      if (assetsError) {
        console.error('[DELETE] Error deleting track assets:', assetsError);
      }

      console.log('[DELETE] Deleting track versions...');
      const { error: versionsError } = await supabase
        .from('track_versions')
        .delete()
        .eq('track_id', trackId);

      if (versionsError) {
        console.error('[DELETE] Error deleting track versions:', versionsError);
      }

      console.log('[DELETE] Updating AI generations...');
      const { error: generationsError } = await supabase
        .from('ai_generations')
        .update({ track_id: null })
        .eq('track_id', trackId);

      if (generationsError) {
        console.error('[DELETE] Error updating AI generations:', generationsError);
      }

      console.log('[DELETE] Deleting promo materials...');
      const { error: promoError } = await supabase
        .from('promo_materials')
        .delete()
        .eq('entity_type', 'track')
        .eq('entity_id', trackId);

      if (promoError) {
        console.error('[DELETE] Error deleting promo materials:', promoError);
      }

      // TODO: FIXME - Improve storage deletion logic
      console.log('[DELETE] Attempting to delete track from storage...');
      
      if (track.audio_url) {
        try {
          console.log('[DELETE] Track audio URL:', track.audio_url);
          
          // Check if this is a Supabase storage URL
          if (track.audio_url.includes('supabase.co/storage/v1/object/public/')) {
            const urlParts = track.audio_url.split('/storage/v1/object/public/');
            if (urlParts[1]) {
              const [bucket, ...pathParts] = urlParts[1].split('/');
              const filePath = pathParts.join('/');
              
              console.log('[DELETE] Storage deletion - bucket:', bucket, 'path:', filePath);
              
              const { error: storageError } = await supabase.storage
                .from(bucket)
                .remove([filePath]);
              
              if (storageError) {
                console.error('[DELETE] Storage deletion failed:', storageError);
                // TODO: FIXME - Don't fail the whole deletion if storage fails
              } else {
                console.log('[DELETE] File successfully deleted from storage:', filePath);
              }
            }
          } else {
            console.log('[DELETE] Audio URL is not from Supabase storage, skipping storage deletion');
          }
        } catch (storageDeleteError) {
          console.error('[DELETE] Exception during storage deletion:', storageDeleteError);
          // TODO: FIXME - Continue with track deletion even if storage fails
        }
      } else {
        console.log('[DELETE] No audio URL to delete from storage');
      }

      // Удаляем сам трек
      console.log('[DELETE] Deleting track record...');
      const { error: deleteError } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (deleteError) {
        console.error('[DELETE] Error deleting track:', deleteError);
        throw deleteError;
      }

      result = {
        success: true,
        message: 'Track permanently deleted',
        deleted: true,
        track_id: trackId
      };

      console.log('[DELETE] Track permanently deleted successfully');
    }

    // Создаём лог активности
    const { error: logError } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        action: softDelete ? 'track_soft_delete' : 'track_hard_delete',
        description: softDelete ? 'Track moved to trash' : 'Track permanently deleted',
        entity_type: 'track',
        entity_id: trackId,
        status: 'completed',
        metadata: {
          track_title: track.title,
          project_id: track.project_id,
          soft_delete: softDelete
        }
      });

    if (logError) {
      console.error('[DELETE] Error creating activity log:', logError);
      // Не прерываем выполнение, если лог не создался
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in delete-track function:', error);
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