import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LinkRequest {
  email: string;
  password: string;
  telegram_id: string;
  telegram_username?: string;
  telegram_first_name?: string;
  telegram_last_name?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authenticated user (must be logged in via Telegram)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: currentUser }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !currentUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestBody: LinkRequest = await req.json()
    const { email, password, telegram_id, telegram_username, telegram_first_name, telegram_last_name } = requestBody

    console.log('Link Telegram to existing email account:', { 
      current_user_id: currentUser.id,
      telegram_id,
      target_email: email 
    })

    // 1. Verify current user is Telegram user
    if (!currentUser.email?.includes('@telegram.local')) {
      return new Response(
        JSON.stringify({ 
          error: 'Only Telegram users can link to email accounts',
          code: 'NOT_TELEGRAM_USER'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Verify email account exists and credentials are correct
    const { data: emailAuthData, error: emailAuthError } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    })

    if (emailAuthError) {
      console.error('Email auth failed:', emailAuthError)
      return new Response(
        JSON.stringify({ 
          error: 'Неверный email или пароль',
          code: 'INVALID_EMAIL_CREDENTIALS'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailUser = emailAuthData.user

    // 3. Check if email account already has Telegram linked
    const { data: existingProfile } = await supabaseClient
      .from('user_profiles')
      .select('telegram_id')
      .eq('user_id', emailUser.id)
      .single()

    if (existingProfile?.telegram_id) {
      return new Response(
        JSON.stringify({ 
          error: 'Этот email аккаунт уже связан с другим Telegram',
          code: 'EMAIL_ALREADY_LINKED'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Check if this Telegram ID is already linked to another account
    const { data: telegramProfile } = await supabaseClient
      .from('user_profiles')
      .select('user_id')
      .eq('telegram_id', telegram_id)
      .neq('user_id', emailUser.id)
      .single()

    if (telegramProfile) {
      return new Response(
        JSON.stringify({ 
          error: 'Этот Telegram уже привязан к другому аккаунту',
          code: 'TELEGRAM_ALREADY_LINKED'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Link Telegram to email account
    const { error: updateError } = await supabaseClient
      .from('user_profiles')
      .upsert({
        user_id: emailUser.id,
        telegram_id,
        telegram_username,
        telegram_first_name,
        telegram_last_name
      }, {
        onConflict: 'user_id'
      })

    if (updateError) {
      console.error('Failed to link accounts:', updateError)
      return new Response(
        JSON.stringify({ 
          error: 'Не удалось привязать аккаунты',
          code: 'LINK_FAILED'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Delete Telegram-only user (current user)
    const { error: deleteError } = await supabaseClient.auth.admin.deleteUser(currentUser.id)

    if (deleteError) {
      console.error('Failed to delete Telegram user:', deleteError)
      // Don't fail the request, profile is already linked
    }

    console.log('✅ Successfully linked Telegram to email account:', {
      email_user_id: emailUser.id,
      telegram_id,
      deleted_telegram_user: currentUser.id
    })

    // 7. Return new session for email account
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.admin.generateLink({
      type: 'magiclink',
      email: emailUser.email!
    })

    if (sessionError) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Аккаунты успешно связаны, но не удалось создать сессию. Войдите через email.',
          linked_to_user_id: emailUser.id
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Telegram успешно привязан к email аккаунту',
        session: {
          access_token: sessionData.properties.access_token,
          refresh_token: sessionData.properties.refresh_token,
          expires_at: sessionData.properties.expires_at,
          token_type: 'bearer'
        },
        user: {
          id: emailUser.id,
          email: emailUser.email
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Critical error in link-telegram-to-existing-email:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
