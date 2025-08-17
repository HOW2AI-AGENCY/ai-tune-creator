import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { projectId } = await req.json();

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id || null;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check ownership
    const { data: project, error: projErr } = await supabase
      .from('projects')
      .select('id, artist_id, artists!inner(id, user_id)')
      .eq('id', projectId)
      .single();

    if (projErr || !project) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // @ts-ignore nested join shape
    if (project.artists?.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Collect track ids for cascade deletes
    const { data: tracks } = await supabase
      .from('tracks')
      .select('id')
      .eq('project_id', projectId);

    const trackIds = (tracks || []).map((t: any) => t.id);

    if (trackIds.length > 0) {
      // Delete AI generations linked to tracks
      await supabase.from('ai_generations').delete().in('track_id', trackIds);
      // Delete assets/versions
      await supabase.from('track_assets').delete().in('track_id', trackIds);
      await supabase.from('track_versions').delete().in('track_id', trackIds);
      // Delete tracks
      await supabase.from('tracks').delete().in('id', trackIds);
    }

    // Delete project notes and their research
    const { data: notes } = await supabase
      .from('project_notes')
      .select('id')
      .eq('project_id', projectId);
    const noteIds = (notes || []).map((n: any) => n.id);
    if (noteIds.length > 0) {
      await supabase.from('reference_research').delete().in('project_note_id', noteIds);
      await supabase.from('project_notes').delete().in('id', noteIds);
    }

    // Finally delete project
    const { error: delErr } = await supabase.from('projects').delete().eq('id', projectId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('delete-project error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
