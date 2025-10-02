import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    const { taskId }: { taskId?: string } = await req.json();

    console.log('Manual track grouping started for user:', user.id);
    console.log('Task ID filter:', taskId || 'all tasks');

    // Get all tracks with their generation metadata
    let query = supabase
      .from('tracks')
      .select(`
        id,
        title,
        variant_group_id,
        variant_number,
        is_master_variant,
        metadata,
        project_id,
        projects!inner(
          artist_id,
          artists!inner(
            user_id
          )
        )
      `)
      .eq('projects.artists.user_id', user.id);

    // Filter by task_id if provided
    if (taskId) {
      // Use text extraction ->> for proper string comparison
      query = query.or(`metadata->>task_id.eq.${taskId},metadata->>mureka_task_id.eq.${taskId}`);
    }

    const { data: tracks, error: tracksError } = await query;

    if (tracksError) {
      console.error('Error fetching tracks:', tracksError);
      throw tracksError;
    }

    console.log(`Found ${tracks?.length || 0} tracks for grouping`);

    // Apply in-code taskId filter as a fallback for JSON filters
    const filteredTracks = taskId
      ? (tracks || []).filter((t: any) => {
          const m = t.metadata as any;
          const id = m?.task_id || m?.mureka_task_id;
          return id === taskId;
        })
      : (tracks || []);

    // Group tracks by task_id from metadata
    const taskGroups = new Map<string, any[]>();

    for (const track of filteredTracks) {
      const metadata = track.metadata as any;
      const trackTaskId = metadata?.task_id || metadata?.mureka_task_id;
      if (!trackTaskId) {
        console.log(`Track ${track.id} has no task_id, skipping`);
        continue;
      }
      if (!taskGroups.has(trackTaskId)) {
        taskGroups.set(trackTaskId, []);
      }
      taskGroups.get(trackTaskId)!.push(track);
    }

    console.log(`Found ${taskGroups.size} unique task groups`);

    const updates: any[] = [];
    let groupsUpdated = 0;

    // Process each task group
    for (const [groupTaskId, groupTracks] of taskGroups.entries()) {
      // Skip if less than 2 tracks (no variants)
      if (groupTracks.length < 2) {
        console.log(`Task ${groupTaskId} has only 1 track, skipping`);
        continue;
      }

      // Check if already grouped
      const hasVariantGroup = groupTracks.every(t => t.variant_group_id);
      if (hasVariantGroup) {
        console.log(`Task ${groupTaskId} already grouped, skipping`);
        continue;
      }

      // Sort by track ID to ensure consistent ordering
      groupTracks.sort((a, b) => a.id.localeCompare(b.id));

      // Use existing variant_group_id or create new one
      const variantGroupId = groupTracks.find(t => t.variant_group_id)?.variant_group_id || 
                            crypto.randomUUID();
      
      console.log(`Grouping ${groupTracks.length} tracks for task ${groupTaskId} with group ID ${variantGroupId}`);

      // Update each track
      for (let i = 0; i < groupTracks.length; i++) {
        const track = groupTracks[i];
        const variantNumber = i + 1;
        const isMasterVariant = i === 0;

        const { error: updateError } = await supabase
          .from('tracks')
          .update({
            variant_group_id: variantGroupId,
            variant_number: variantNumber,
            is_master_variant: isMasterVariant,
            title: track.title?.includes('(вариант')
              ? track.title
              : `${track.title || 'Трек'} (вариант ${variantNumber})`
          })
          .eq('id', track.id);

        if (updateError) {
          console.error(`Error updating track ${track.id}:`, updateError);
          continue;
        }

        updates.push({
          track_id: track.id,
          track_title: track.title,
          variant_group_id: variantGroupId,
          variant_number: variantNumber,
          is_master_variant: isMasterVariant,
          task_id: groupTaskId
        });
      }

      groupsUpdated++;
    }

    console.log(`Manual grouping completed: ${groupsUpdated} groups, ${updates.length} tracks updated`);

    return new Response(
      JSON.stringify({
        success: true,
        groups_updated: groupsUpdated,
        tracks_updated: updates.length,
        updates: updates
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error in manual track grouping:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
