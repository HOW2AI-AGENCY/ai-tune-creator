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

// Валидация данных из Telegram с использованием Web Crypto API
async function validateTelegramAuth(initData: string, botToken: string): Promise<boolean> {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return false;

    urlParams.delete('hash');
    
    // Сортируем параметры и создаем строку для проверки
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Создаем секретный ключ с помощью Web Crypto API
    const encoder = new TextEncoder();
    const secretKeyData = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const secretKeyBytes = await crypto.subtle.sign('HMAC', secretKeyData, encoder.encode(botToken));
    
    const secretKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // Создаем хеш для проверки
    const signature = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(dataCheckString));
    const expectedHash = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return hash === expectedHash;
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
    
    if (existingUser?.user) {
      // Пользователь уже существует, создаем сессию
      const { data: session, error: sessionError } = await supabaseClient.auth.admin.generateLink({
        type: 'magiclink',
        email: telegramEmail,
        options: {
          redirectTo: `${req.headers.get('origin') || 'http://localhost:3000'}/`
        }
      })

      if (sessionError) {
        throw sessionError
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: existingUser.user,
          session: session
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Создаем нового пользователя
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email: telegramEmail,
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
      })

      if (createError) {
        throw createError
      }

      // Создаем сессию для нового пользователя
      const { data: session, error: sessionError } = await supabaseClient.auth.admin.generateLink({
        type: 'magiclink',
        email: telegramEmail,
        options: {
          redirectTo: `${req.headers.get('origin') || 'http://localhost:3000'}/`
        }
      })

      if (sessionError) {
        throw sessionError
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: newUser.user,
          session: session,
          isNewUser: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Telegram auth error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})