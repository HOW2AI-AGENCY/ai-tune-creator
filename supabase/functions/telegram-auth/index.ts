import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_ATTEMPTS = 5;

interface TelegramAuthData {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  initData: string;
}

// Rate limiting function
function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const key = identifier;
  const current = rateLimitMap.get(key) || { count: 0, lastReset: now };
  
  // Reset window if expired
  if (now - current.lastReset > RATE_LIMIT_WINDOW) {
    current.count = 0;
    current.lastReset = now;
  }
  
  const allowed = current.count < RATE_LIMIT_MAX_ATTEMPTS;
  
  if (allowed) {
    current.count++;
  }
  
  rateLimitMap.set(key, current);
  
  return {
    allowed,
    remaining: Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - current.count)
  };
}

// Correct Telegram initData validation using HMAC-SHA256
async function validateTelegramAuth(initData: string, botToken: string): Promise<{ valid: boolean; error?: string }> {
  try {
    console.log('Validating initData:', initData ? `${initData.length} chars` : 'empty');
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    const authDate = urlParams.get('auth_date');
    
    if (!hash || !authDate) {
      console.log('Missing hash or auth_date in initData');
      return { valid: false, error: 'Missing hash or auth_date' };
    }

    // Check auth_date is not older than 5 minutes (300 seconds)
    const authTime = parseInt(authDate) * 1000;
    const now = Date.now();
    if (now - authTime > 300000) {
      console.log('Telegram auth: initData too old, age:', (now - authTime) / 1000, 'seconds');
      return { valid: false, error: 'Authentication data expired' };
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
    
    return { 
      valid: isValid, 
      error: isValid ? undefined : 'Invalid signature' 
    };
  } catch (error) {
    console.error('Telegram validation error:', error);
    return { valid: false, error: 'Validation failed' };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now();
  const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { authData }: { authData: TelegramAuthData } = await req.json()
    
    // Rate limiting check
    const rateLimitKey = `${authData.telegramId}_${clientIP}`;
    const rateLimit = checkRateLimit(rateLimitKey);
    
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for ${authData.telegramId} from ${clientIP}`);
      return new Response(
        JSON.stringify({ 
          error: 'Too many authentication attempts. Please wait before trying again.',
          retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(RATE_LIMIT_WINDOW / 1000))
          } 
        }
      )
    }
    
    // Получаем токен бота из переменных окружения
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      console.error('Telegram bot token not configured');
      throw new Error('Service configuration error')
    }

    // Log incoming auth data for debugging
    console.log(`Processing Telegram auth for user ${authData.telegramId}`, {
      firstName: authData.firstName,
      initDataLength: authData.initData.length,
      hasInitData: !!authData.initData
    });

    // Валидируем данные от Telegram
    const validation = await validateTelegramAuth(authData.initData, botToken);
    if (!validation.valid) {
      console.log(`Invalid Telegram auth for ${authData.telegramId}: ${validation.error}`);
      
      // Return more specific error messages
      let errorMessage = 'Ошибка аутентификации Telegram';
      let errorCode = 'INVALID_TELEGRAM_DATA';
      
      if (validation.error?.includes('expired')) {
        errorMessage = 'Данные Telegram устарели. Перезапустите мини-приложение.';
        errorCode = 'TELEGRAM_DATA_EXPIRED';
      } else if (validation.error?.includes('Invalid signature')) {
        errorMessage = 'Неверная подпись Telegram. Проверьте настройки бота.';
        errorCode = 'INVALID_TELEGRAM_SIGNATURE';
      } else if (validation.error?.includes('Missing')) {
        errorMessage = 'Отсутствуют обязательные данные Telegram.';
        errorCode = 'MISSING_TELEGRAM_DATA';
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          code: errorCode,
          details: validation.error
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Создаем уникальный email для пользователя Telegram
    const telegramEmail = `telegram_${authData.telegramId}@telegram.local`
    
    console.log(`Processing auth for Telegram user ${authData.telegramId} (${authData.firstName})`);
    
    // Пытаемся найти существующего пользователя
    const { data: existingUser, error: getUserError } = await supabaseClient.auth.admin.getUserByEmail(telegramEmail)
    
    if (getUserError && !getUserError.message.includes('not found')) {
      console.error('Error checking existing user:', getUserError);
      throw new Error('Database error during user lookup');
    }
    
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

      const duration = Date.now() - startTime;
      console.log(`Telegram auth: Existing user ${existingUser.user.id} updated successfully in ${duration}ms`);

      return new Response(
        JSON.stringify({ 
          success: true,
          email: telegramEmail,
          password: randomPassword,
          isNewUser: false,
          message: 'Успешный вход через Telegram',
          user: {
            id: existingUser.user.id,
            telegramId: authData.telegramId,
            firstName: authData.firstName
          }
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

      const duration = Date.now() - startTime;
      console.log(`Telegram auth: New user ${newUser.user?.id} created successfully in ${duration}ms`);

      return new Response(
        JSON.stringify({ 
          success: true,
          email: telegramEmail,
          password: randomPassword,
          isNewUser: true,
          message: 'Аккаунт создан через Telegram',
          user: {
            id: newUser.user?.id,
            telegramId: authData.telegramId,
            firstName: authData.firstName
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Telegram auth error after ${duration}ms:`, {
      error: error.message,
      telegramId: (error as any).telegramId,
      clientIP
    });
    
    // Don't expose internal errors to client
    const publicError = error.message.includes('Service configuration') 
      ? 'Service temporarily unavailable'
      : 'Authentication failed. Please try again.';
    
    return new Response(
      JSON.stringify({ 
        error: publicError,
        code: 'AUTH_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})