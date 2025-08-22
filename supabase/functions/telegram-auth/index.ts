import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramAuthData {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  initData: string;
}

// Correct Telegram initData validation using HMAC-SHA256
async function validateTelegramAuth(initData: string, botToken: string): Promise<boolean> {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    const authDate = urlParams.get('auth_date');
    
    if (!hash || !authDate) return false;

    // Check auth_date is not older than 5 minutes (300 seconds)
    const authTime = parseInt(authDate) * 1000;
    const now = Date.now();
    if (now - authTime > 300000) {
      console.log('Telegram auth: initData too old');
      return false;
    }

    urlParams.delete('hash');
    
    // Sort parameters and create data check string
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Create secret key: SHA256(bot_token)
    const encoder = new TextEncoder();
    const tokenHash = await crypto.subtle.digest('SHA-256', encoder.encode(botToken));
    
    const secretKey = await crypto.subtle.importKey(
      'raw',
      tokenHash,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Create HMAC-SHA256 signature
    const signature = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(dataCheckString));
    const expectedHash = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const isValid = hash === expectedHash;
    console.log('Telegram validation:', { isValid, authDate, hash: hash.substring(0, 8) + '...' });
    
    return isValid;
  } catch (error) {
    console.error('Telegram validation error:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { authData }: { authData: TelegramAuthData } = await req.json()
    
    // Получаем токен бота из переменных окружения
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      throw new Error('Telegram bot token not configured')
    }

    // Валидируем данные от Telegram
    if (!(await validateTelegramAuth(authData.initData, botToken))) {
      return new Response(
        JSON.stringify({ error: 'Invalid Telegram authentication data' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Создаем уникальный email для пользователя Telegram
    const telegramEmail = `telegram_${authData.telegramId}@telegram.local`
    
    // Пытаемся найти существующего пользователя
    const { data: existingUser, error: getUserError } = await supabaseClient.auth.admin.getUserByEmail(telegramEmail)
    
    // Generate random password for one-time use
    const randomPassword = crypto.randomUUID();
    
    if (existingUser?.user) {
      // User exists, update with new password
      const { error: updateError } = await supabaseClient.auth.admin.updateUserById(
        existingUser.user.id,
        { password: randomPassword }
      );

      if (updateError) {
        throw updateError;
      }

      console.log('Telegram auth: Existing user updated', existingUser.user.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          email: telegramEmail,
          password: randomPassword,
          isNewUser: false
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Create new user with password
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email: telegramEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          telegram_id: authData.telegramId,
          first_name: authData.firstName,
          last_name: authData.lastName,
          username: authData.username,
          language_code: authData.languageCode,
          provider: 'telegram',
          avatar_url: `https://t.me/i/userpic/320/${authData.username || authData.telegramId}.jpg`
        }
      });

      if (createError) {
        throw createError;
      }

      console.log('Telegram auth: New user created', newUser.user?.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          email: telegramEmail,
          password: randomPassword,
          isNewUser: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Telegram auth error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})