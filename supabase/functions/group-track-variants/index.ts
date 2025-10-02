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

    console.log('Grouping track variants for user:', user.id);

    // Get all ai_generations with tracks for this user
    const { data: generations, error: genError } = await supabase
      .from('ai_generations')
      .select('id, external_id, track_id, metadata, created_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .not('track_id', 'is', null)
      .order('created_at', { ascending: false });

    if (genError) throw genError;

    console.log(`Found ${generations?.length || 0} generations with tracks`);

    // Group generations by external_id (Suno/Mureka task ID)
    const groupedByTask = new Map<string, any[]>();
    
    for (const gen of generations || []) {
      const externalId = gen.external_id;
      if (!externalId) continue;

      // Extract base task ID (remove variant suffix if exists)
      const baseTaskId = externalId.split('-variant-')[0];
      
      if (!groupedByTask.has(baseTaskId)) {
        groupedByTask.set(baseTaskId, []);
      }
      groupedByTask.get(baseTaskId)!.push(gen);
    }

    console.log(`Found ${groupedByTask.size} unique task groups`);

    const updates: any[] = [];
    let variantGroupsCreated = 0;

    // Process each group
    for (const [taskId, taskGenerations] of groupedByTask.entries()) {
      // Only process if there are 2+ tracks in the same task
      if (taskGenerations.length < 2) continue;

      // Sort by created_at to determine order
      taskGenerations.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Create variant_group_id
      const variantGroupId = crypto.randomUUID();
      
      console.log(`Creating variant group ${variantGroupId} for task ${taskId} with ${taskGenerations.length} variants`);

      // Update each generation and track
      for (let i = 0; i < taskGenerations.length; i++) {
        const gen = taskGenerations[i];
        const variantNumber = i + 1;
        const isMasterVariant = i === 0;

        // Update ai_generation
        await supabase
          .from('ai_generations')
          .update({
            variant_group_id: variantGroupId,
            total_variants: taskGenerations.length,
            metadata: {
              ...gen.metadata,
              variant_metadata: {
                variant_group_id: variantGroupId,
                variant_number: variantNumber,
                is_master_variant: isMasterVariant,
                total_variants: taskGenerations.length
              }
            }
          })
          .eq('id', gen.id);

        // Update track
        await supabase
          .from('tracks')
          .update({
            variant_group_id: variantGroupId,
            variant_number: variantNumber,
            is_master_variant: isMasterVariant
          })
          .eq('id', gen.track_id);

        updates.push({
          generation_id: gen.id,
          track_id: gen.track_id,
          variant_group_id: variantGroupId,
          variant_number: variantNumber,
          is_master_variant: isMasterVariant
        });
      }

      variantGroupsCreated++;
    }

    console.log(`Created ${variantGroupsCreated} variant groups with ${updates.length} total variants`);

    return new Response(
      JSON.stringify({
        success: true,
        variant_groups_created: variantGroupsCreated,
        tracks_updated: updates.length,
        updates: updates
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('Error grouping variants:', error);
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
