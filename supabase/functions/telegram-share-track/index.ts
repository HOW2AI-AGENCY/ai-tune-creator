import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
    const { telegram_id, track_id, track_title, track_url, artist_name } = await req.json();
    
    console.log('Sharing track to Telegram');
    
    if (!telegram_id || !track_title) {
      throw new Error('Missing required parameters: telegram_id, track_title');
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    // Prepare message
    const caption = `🎵 *${track_title}*\n\n` +
                   `🎤 Artist: ${artist_name || 'AI Composer'}\n` +
                   '🤖 Generated with AI Music Studio\n\n' +
                   'Tap to listen! 👆';

    let response;

    if (track_url) {
      // Send as audio file
      response = await fetch(`https://api.telegram.org/bot${botToken}/sendAudio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: telegram_id,
          audio: track_url,
          caption,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              {
                text: '🎶 Create More Music',
                web_app: { url: `${Deno.env.get('SUPABASE_URL')?.replace('//', '//').replace('.supabase.co', '.lovable.app')}/generate` }
              }
            ]]
          }
        })
      });
    } else {
      // Send as text message
      response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: telegram_id,
          text: caption,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              {
                text: '🎶 Open Music Studio',
                web_app: { url: `${Deno.env.get('SUPABASE_URL')?.replace('//', '//').replace('.supabase.co', '.lovable.app')}/generate` }
              }
            ]]
          }
        })
      });
    }

    const telegramResult = await response.json();
    
    if (!response.ok || !telegramResult.ok) {
      console.error('Telegram API error:', telegramResult);
      throw new Error(`Telegram API error: ${telegramResult.description || 'Unknown error'}`);
    }

    console.log('Track shared successfully to Telegram');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Track shared to Telegram successfully',
        telegram_response: telegramResult
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error sharing track to Telegram:', error);
    
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
    );
  }
});