import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LinkAccountRequest {
  telegram_id: string;
  telegram_username?: string;
  telegram_first_name?: string;
  telegram_last_name?: string;
  action: 'link' | 'unlink';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { telegram_id, telegram_username, telegram_first_name, telegram_last_name, action }: LinkAccountRequest = await req.json();

    if (!telegram_id && action === 'link') {
      return new Response(
        JSON.stringify({ error: 'telegram_id is required for linking' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'link') {
      // Check if Telegram account is already linked to another user
      const { data: existingLink, error: checkError } = await supabaseClient
        .from('user_profiles')
        .select('user_id')
        .eq('telegram_id', telegram_id)
        .neq('user_id', user.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error checking existing link:', checkError);
        return new Response(
          JSON.stringify({ error: 'Database error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (existingLink) {
        return new Response(
          JSON.stringify({ 
            error: 'Этот Telegram аккаунт уже привязан к другому пользователю',
            code: 'TELEGRAM_ALREADY_LINKED' 
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create or update user profile with Telegram info
      const { error: upsertError } = await supabaseClient
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          telegram_id: telegram_id,
          telegram_username: telegram_username,
          telegram_first_name: telegram_first_name,
          telegram_last_name: telegram_last_name,
          updated_at: new Date().toISOString()
        });

      if (upsertError) {
        console.error('Failed to link Telegram account:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Failed to link account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Successfully linked Telegram account');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Telegram аккаунт успешно привязан',
          telegram_info: {
            telegram_id,
            telegram_username,
            telegram_first_name,
            telegram_last_name
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'unlink') {
      // Remove Telegram info from user profile
      const { error: updateError } = await supabaseClient
        .from('user_profiles')
        .update({
          telegram_id: null,
          telegram_username: null,
          telegram_first_name: null,
          telegram_last_name: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to unlink Telegram account:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to unlink account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Successfully unlinked Telegram account');
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Telegram аккаунт отвязан' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});