// Wipe all user data: tracks, assets, generations, projects, artists, logs, notifications, settings, sessions, and storage files
// Auth required. Uses service role for DB/storage operations but validates the user via JWT first.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import { getAdminOnlyCorsHeaders, authenticateUser } from '../_shared/cors.ts';
import { DatabaseRateLimiter } from '../_shared/rate-limiter.ts';

serve(async (req) => {
  const corsHeaders = getAdminOnlyCorsHeaders(req.headers.get('Origin'));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authenticate user using secure helper
    const { user, error: authError } = await authenticateUser(req);
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: authError || 'Authentication failed' }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check rate limit for extremely sensitive operations - very restrictive
    const rateLimitResult = await DatabaseRateLimiter.checkLimit(user.id, 'suno');
    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Rate limit exceeded for sensitive operations',
        retryAfter: rateLimitResult.retryAfter 
      }), { 
        status: 429, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const userId = user.id;

    // Helper to delete storage files for a user
    async function deleteUserStorage(bucket: string) {
      try {
        // Try listing by prefix `${userId}` first
        const listByPrefix = await admin.storage.from(bucket).list(userId, { limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } });
        let files: { name: string }[] = [];
        if (!listByPrefix.error) {
          files = listByPrefix.data || [];
          if (files.length > 0) {
            const paths = files.map((f) => `${userId}/${f.name}`);
            const { error: remErr } = await admin.storage.from(bucket).remove(paths);
            if (remErr) console.error(`[STORAGE] remove error (${bucket}):`, remErr.message);
            return paths.length;
          }
        }
        // SECURITY FIX: Remove dangerous fallback that could delete other users' files
        // Only delete files explicitly under the user's prefix to prevent accidental deletion
        console.warn(`[STORAGE] No files found under prefix ${userId} in bucket ${bucket}`);
        return 0;
      } catch (e) {
        console.error(`[STORAGE] Unexpected error in ${bucket}:`, e);
        return 0;
      }
    }

    // Fetch hierarchical IDs
    const { data: artists, error: artistsErr } = await admin.from("artists").select("id").eq("user_id", userId);
    if (artistsErr) throw artistsErr;
    const artistIds = (artists || []).map((a: any) => a.id);

    const { data: projects, error: projectsErr } = await admin.from("projects").select("id").in("artist_id", artistIds.length ? artistIds : ["00000000-0000-0000-0000-000000000000"]);
    if (projectsErr) throw projectsErr;
    const projectIds = (projects || []).map((p: any) => p.id);

    const { data: tracks, error: tracksErr } = await admin.from("tracks").select("id").in("project_id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"]);
    if (tracksErr) throw tracksErr;
    const trackIds = (tracks || []).map((t: any) => t.id);

    const results: Record<string, number> = {};

    // Delete dependent tables first
    if (trackIds.length) {
      const { count: taCount } = await admin.from("track_assets").delete({ count: "exact" }).in("track_id", trackIds);
      results.deleted_track_assets = taCount || 0;

      const { count: tvCount } = await admin.from("track_versions").delete({ count: "exact" }).in("track_id", trackIds);
      results.deleted_track_versions = tvCount || 0;
    } else {
      results.deleted_track_assets = 0;
      results.deleted_track_versions = 0;
    }

    // Reference research -> notes
    const { data: notes, error: notesErr } = await admin.from("project_notes").select("id").in("project_id", projectIds.length ? projectIds : ["00000000-0000-0000-0000-000000000000"]);
    if (notesErr) throw notesErr;
    const noteIds = (notes || []).map((n: any) => n.id);

    if (noteIds.length) {
      const { count: rrCount } = await admin.from("reference_research").delete({ count: "exact" }).in("project_note_id", noteIds);
      results.deleted_reference_research = rrCount || 0;

      const { count: pnCount } = await admin.from("project_notes").delete({ count: "exact" }).in("id", noteIds);
      results.deleted_project_notes = pnCount || 0;
    } else {
      results.deleted_reference_research = 0;
      results.deleted_project_notes = 0;
    }

    // AI generations
    const { count: genCount } = await admin.from("ai_generations").delete({ count: "exact" }).eq("user_id", userId);
    results.deleted_ai_generations = genCount || 0;

    // Promo materials
    const { count: pmCount } = await admin.from("promo_materials").delete({ count: "exact" }).eq("user_id", userId);
    results.deleted_promo_materials = pmCount || 0;

    // Logs and notifications and sessions/settings
    const { count: logCount } = await admin.from("logs").delete({ count: "exact" }).eq("user_id", userId);
    results.deleted_logs = logCount || 0;

    const { count: actCount } = await admin.from("activity_logs").delete({ count: "exact" }).eq("user_id", userId);
    results.deleted_activity_logs = actCount || 0;

    const { count: notifCount } = await admin.from("notifications").delete({ count: "exact" }).eq("user_id", userId);
    results.deleted_notifications = notifCount || 0;

    const { count: sessCount } = await admin.from("sessions").delete({ count: "exact" }).eq("user_id", userId);
    results.deleted_sessions = sessCount || 0;

    const { count: usCount } = await admin.from("user_settings").delete({ count: "exact" }).eq("user_id", userId);
    results.deleted_user_settings = usCount || 0;

    // Tracks -> Projects -> Artists
    if (trackIds.length) {
      const { count: tCount } = await admin.from("tracks").delete({ count: "exact" }).in("id", trackIds);
      results.deleted_tracks = tCount || 0;
    } else {
      results.deleted_tracks = 0;
    }

    if (projectIds.length) {
      const { count: pCount } = await admin.from("projects").delete({ count: "exact" }).in("id", projectIds);
      results.deleted_projects = pCount || 0;
    } else {
      results.deleted_projects = 0;
    }

    if (artistIds.length) {
      const { count: aCount } = await admin.from("artists").delete({ count: "exact" }).in("id", artistIds);
      results.deleted_artists = aCount || 0;
    } else {
      results.deleted_artists = 0;
    }

    // Storage cleanup
    const buckets = ["albert-tracks", "project-covers", "avatars", "artist-assets", "promo-materials"];
    let storageDeleted = 0;
    for (const b of buckets) {
      const removed = await deleteUserStorage(b);
      storageDeleted += removed;
    }
    results.deleted_storage_objects = storageDeleted;

    const response = {
      success: true,
      data: {
        userId,
        summary: results,
        timestamp: new Date().toISOString(),
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[WIPE] Fatal error:", e);
    return new Response(JSON.stringify({ success: false, error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
