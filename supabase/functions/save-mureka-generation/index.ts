import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { generationId, trackData, projectId, artistId } = await req.json()

    console.log('Saving Mureka generation:', { generationId, trackData })

    // Get user from generation record
    const { data: generation, error: genError } = await supabase
      .from('ai_generations')
      .select('user_id, title, prompt')
      .eq('id', generationId)
      .single()

    if (genError || !generation) {
      console.error('Error getting generation:', genError)
      return new Response(
        JSON.stringify({ success: false, error: 'Generation not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create track record with immediate audio URL
    const trackRecord = {
      id: crypto.randomUUID(),
      user_id: generation.user_id,
      title: trackData.title || generation.title || 'AI Generated Track',
      audio_url: trackData.audio_url, // Direct audio URL from Mureka
      duration: trackData.duration || 120,
      lyrics: trackData.lyrics || '',
      genre: 'ai-generated',
      project_id: projectId || null,
      artist_id: artistId || null,
      generation_id: generationId,
      metadata: {
        service: 'mureka',
        model: trackData.model || 'auto',
        prompt: generation.prompt,
        generated_at: new Date().toISOString(),
        original_data: trackData
      },
      status: 'completed',
      processing_status: 'completed'
    }

    // Save track to database
    const { data: savedTrack, error: trackError } = await supabase
      .from('tracks')
      .insert([trackRecord])
      .select()
      .single()

    if (trackError) {
      console.error('Error saving track:', trackError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save track', details: trackError }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update generation status to completed
    const { error: updateError } = await supabase
      .from('ai_generations')
      .update({
        status: 'completed',
        result_url: trackData.audio_url,
        track_id: savedTrack.id,
        completed_at: new Date().toISOString(),
        metadata: {
          ...trackData,
          saved_track_id: savedTrack.id
        }
      })
      .eq('id', generationId)

    if (updateError) {
      console.error('Error updating generation:', updateError)
      // Don't fail the request if track was saved successfully
    }

    console.log('Mureka track saved successfully:', savedTrack.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        track: savedTrack,
        message: 'Track saved successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in save-mureka-generation:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})