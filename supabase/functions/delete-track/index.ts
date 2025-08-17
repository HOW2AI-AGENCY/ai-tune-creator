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

    const { trackId, userId } = await req.json();

    if (!trackId) {
      return new Response(JSON.stringify({ error: 'trackId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify auth
    const { data: userRes } = await supabase.auth.getUser();
    const authedUserId = userRes.user?.id || null;
    if (!authedUserId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check ownership: track -> project -> artist.user_id === authedUserId
    const { data: track, error: trackErr } = await supabase
      .from('tracks')
      .select(`id, project_id, projects!inner( id, artists!inner( id, user_id ) )`)
      .eq('id', trackId)
      .single();

    if (trackErr || !track) {
      return new Response(JSON.stringify({ error: 'Track not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // @ts-ignore - nested select structure
    const ownerId = track.projects?.artists?.user_id as string | undefined;
    if (ownerId !== authedUserId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Delete dependent rows first
    await supabase.from('track_versions').delete().eq('track_id', trackId);
    await supabase.from('track_assets').delete().eq('track_id', trackId);
    await supabase.from('ai_generations').delete().eq('track_id', trackId);

    // Delete the track
    const { error: delErr } = await supabase.from('tracks').delete().eq('id', trackId);
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
    console.error('delete-track error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
