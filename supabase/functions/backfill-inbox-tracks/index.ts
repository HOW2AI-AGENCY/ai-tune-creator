import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAdminOnlyCorsHeaders, authenticateUser } from '../_shared/cors.ts';

interface Track {
  id: string;
  title: string;
  project_id: string | null;
  projects?: { title: string; is_inbox: boolean } | null;
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getAdminOnlyCorsHeaders(origin);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Require admin authentication
  const { user, error: authError, supabase: userSupabase } = await authenticateUser(req);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Check admin privileges
  const { data: isAdmin, error: roleError } = await userSupabase!.rpc('is_admin');
  if (roleError || !isAdmin) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting inbox backfill process...');

    // Get tracks without project context or with null project_id
    const { data: orphanTracks, error: fetchError } = await supabase
      .from('tracks')
      .select(`
        id, 
        title, 
        project_id,
        projects!inner(title, is_inbox)
      `)
      .or('project_id.is.null,projects.is_inbox.is.null');

    if (fetchError) {
      console.error('Error fetching orphan tracks:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${orphanTracks?.length || 0} tracks to process`);

    if (!orphanTracks || orphanTracks.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No orphan tracks found to backfill',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processedCount = 0;
    let errorCount = 0;
    const results: Array<{ trackId: string; status: string; message?: string }> = [];

    // Process each orphan track
    for (const track of orphanTracks as Track[]) {
      try {
        console.log(`Processing track: ${track.id} - "${track.title}"`);

        // Get the track's owner through ai_generations
        const { data: generation, error: genError } = await supabase
          .from('ai_generations')
          .select('user_id')
          .eq('track_id', track.id)
          .single();

        if (genError || !generation) {
          console.log(`No generation found for track ${track.id}, skipping`);
          results.push({
            trackId: track.id,
            status: 'skipped',
            message: 'No generation record found'
          });
          continue;
        }

        // Ensure user has an inbox project
        const { data: inboxProjectId, error: inboxError } = await supabase
          .rpc('ensure_user_inbox', { p_user_id: generation.user_id });

        if (inboxError || !inboxProjectId) {
          console.error(`Failed to ensure inbox for user ${generation.user_id}:`, inboxError);
          results.push({
            trackId: track.id,
            status: 'error',
            message: 'Failed to create/find inbox project'
          });
          errorCount++;
          continue;
        }

        // Deduplicate track title within the inbox project
        const { data: uniqueTitle, error: dedupeError } = await supabase
          .rpc('dedupe_track_title', { 
            p_project_id: inboxProjectId, 
            p_title: track.title 
          });

        if (dedupeError) {
          console.error(`Failed to dedupe title for track ${track.id}:`, dedupeError);
          results.push({
            trackId: track.id,
            status: 'error',
            message: 'Failed to dedupe track title'
          });
          errorCount++;
          continue;
        }

        // Get next track number for the inbox
        const { data: trackNumber, error: trackNumError } = await supabase
          .rpc('get_next_track_number', { p_project_id: inboxProjectId });

        if (trackNumError) {
          console.error(`Failed to get track number for track ${track.id}:`, trackNumError);
          results.push({
            trackId: track.id,
            status: 'error',
            message: 'Failed to get track number'
          });
          errorCount++;
          continue;
        }

        // Update the track with inbox project and deduplicated title
        const { error: updateError } = await supabase
          .from('tracks')
          .update({
            project_id: inboxProjectId,
            title: uniqueTitle,
            track_number: trackNumber
          })
          .eq('id', track.id);

        if (updateError) {
          console.error(`Failed to update track ${track.id}:`, updateError);
          results.push({
            trackId: track.id,
            status: 'error',
            message: 'Failed to update track'
          });
          errorCount++;
          continue;
        }

        console.log(`Successfully moved track "${track.title}" to inbox as "${uniqueTitle}"`);
        results.push({
          trackId: track.id,
          status: 'success',
          message: `Moved to inbox as "${uniqueTitle}"`
        });
        processedCount++;

      } catch (error) {
        console.error(`Error processing track ${track.id}:`, error);
        results.push({
          trackId: track.id,
          status: 'error',
          message: error.message
        });
        errorCount++;
      }
    }

    console.log(`Backfill completed. Processed: ${processedCount}, Errors: ${errorCount}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Backfill completed successfully`,
      processed: processedCount,
      errors: errorCount,
      total: orphanTracks.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in backfill-inbox-tracks function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});