import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { telegram_id, tracks } = await req.json()
    
    console.log('Sharing playlist to Telegram:', { telegram_id, trackCount: tracks?.length })
    
    if (!telegram_id || !tracks || !Array.isArray(tracks) || tracks.length === 0) {
      throw new Error('Missing required parameters: telegram_id, tracks (non-empty array)')
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured')
    }

    // Send playlist header message
    const playlistHeader = `🎶 *Your AI Music Playlist*\n\n` +
                          `📀 ${tracks.length} track${tracks.length > 1 ? 's' : ''}\n` +
                          `🤖 Generated with AI Music Studio\n\n` +
                          `Enjoy your personalized music! 🎧`

    const headerResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegram_id,
        text: playlistHeader,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🎵 Create More Music',
              web_app: { url: `${Deno.env.get('SUPABASE_URL')?.replace('//', '//').replace('.supabase.co', '.lovable.app')}/generate` }
            }
          ]]
        }
      })
    })

    if (!headerResponse.ok) {
      throw new Error('Failed to send playlist header')
    }

    // Send each track
    const results = []
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i]
      const trackCaption = `${i + 1}. *${track.title}*\n🎤 ${track.artist || 'AI Composer'}`

      try {
        let trackResponse
        if (track.url) {
          // Send as audio
          trackResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendAudio`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: telegram_id,
              audio: track.url,
              caption: trackCaption,
              parse_mode: 'Markdown'
            })
          })
        } else {
          // Send as text if no audio URL
          trackResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: telegram_id,
              text: trackCaption,
              parse_mode: 'Markdown'
            })
          })
        }

        const trackResult = await trackResponse.json()
        results.push({
          track_id: track.id,
          success: trackResponse.ok && trackResult.ok,
          error: trackResult.description || null
        })

        // Small delay between messages to avoid rate limiting
        if (i < tracks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200))
        }

      } catch (trackError) {
        console.error(`Error sending track ${i + 1}:`, trackError)
        results.push({
          track_id: track.id,
          success: false,
          error: trackError.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    
    console.log(`Playlist shared: ${successCount}/${tracks.length} tracks sent successfully`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Playlist shared: ${successCount}/${tracks.length} tracks sent`,
        results
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error sharing playlist to Telegram:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})