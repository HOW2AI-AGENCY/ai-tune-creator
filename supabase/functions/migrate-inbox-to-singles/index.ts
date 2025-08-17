import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          artist_id: string;
          title: string;
          description: string | null;
          type: string;
          status: string;
          is_inbox: boolean | null;
          created_at: string;
          updated_at: string;
        };
      };
      tracks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          audio_url: string | null;
          lyrics: string | null;
          metadata: any;
          created_at: string;
        };
      };
      artists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
        };
      };
    };
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting migration of inbox tracks to singles...');

    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all inbox projects with their tracks
    const { data: inboxProjects, error: inboxError } = await supabase
      .from('projects')
      .select(`
        id,
        artist_id,
        title,
        artists!inner(user_id),
        tracks(*)
      `)
      .eq('is_inbox', true);

    if (inboxError) {
      console.error('Error fetching inbox projects:', inboxError);
      throw new Error(`Failed to fetch inbox projects: ${inboxError.message}`);
    }

    if (!inboxProjects || inboxProjects.length === 0) {
      console.log('No inbox projects found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No inbox projects to migrate' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let totalMigrated = 0;
    let totalErrors = 0;

    // Process each inbox project
    for (const inboxProject of inboxProjects) {
      const tracks = inboxProject.tracks || [];
      console.log(`Processing inbox project ${inboxProject.id} with ${tracks.length} tracks`);

      // Create a single project for each track
      for (const track of tracks) {
        try {
          console.log(`Migrating track: ${track.title}`);

          // Generate smart title for the single project
          const { data: titleResult, error: titleError } = await supabase
            .functions.invoke('generate-with-llm', {
              body: {
                prompt: `Generate a concise, creative title for a music single based on this track information:
                Title: ${track.title}
                Description: ${track.description || 'No description'}
                Lyrics: ${track.lyrics ? track.lyrics.substring(0, 200) + '...' : 'No lyrics'}
                
                Return ONLY the title, no quotes or extra text. Make it catchy and appropriate for a music single.`,
                maxTokens: 20
              }
            });

          let singleTitle = track.title;
          if (!titleError && titleResult?.data?.generatedText) {
            singleTitle = titleResult.data.generatedText.trim().replace(/['"]/g, '');
          }

          // Create single project using the new function
          const { data: singleProjectId, error: projectError } = await supabase
            .rpc('ensure_single_project', {
              p_user_id: inboxProject.artists.user_id,
              p_title: singleTitle,
              p_description: track.description || `Single created from: ${track.title}`
            });

          if (projectError) {
            console.error(`Error creating single project for track ${track.id}:`, projectError);
            totalErrors++;
            continue;
          }

          // Update track to point to new single project
          const { error: updateError } = await supabase
            .from('tracks')
            .update({ 
              project_id: singleProjectId,
              title: singleTitle // Update track title to match project title
            })
            .eq('id', track.id);

          if (updateError) {
            console.error(`Error updating track ${track.id}:`, updateError);
            totalErrors++;
            continue;
          }

          console.log(`Successfully migrated track ${track.id} to single project ${singleProjectId}`);
          totalMigrated++;

        } catch (error) {
          console.error(`Error processing track ${track.id}:`, error);
          totalErrors++;
        }
      }
    }

    // Clean up empty inbox projects
    const { error: cleanupError } = await supabase
      .from('projects')
      .delete()
      .eq('is_inbox', true)
      .is('tracks', null);

    if (cleanupError) {
      console.warn('Warning: Could not clean up empty inbox projects:', cleanupError);
    }

    console.log(`Migration completed. Migrated: ${totalMigrated}, Errors: ${totalErrors}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Migration completed successfully`,
      migrated: totalMigrated,
      errors: totalErrors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});