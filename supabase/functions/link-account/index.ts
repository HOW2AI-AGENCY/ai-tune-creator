import { supabase } from "@/integrations/supabase/client";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LinkAccountRequest {
  provider: 'email' | 'telegram';
  credentials: {
    email?: string;
    telegram_id?: string;
    telegram_username?: string;
    telegram_first_name?: string;
    telegram_last_name?: string;
  };
}

export default async function handler(req: Request) {
  console.log('Link account function called with method:', req.method);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Проверяем аутентификацию пользователя
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { provider, credentials }: LinkAccountRequest = await req.json();

    console.log('Link account request:', { provider, user_id: user.id });

    if (provider === 'email') {
      // Проверяем, что email уже не привязан к другому аккаунту
      const { data: existingUser, error: checkError } = await supabase.auth.admin.getUserByEmail(
        credentials.email!
      );

      if (checkError && checkError.message !== 'User not found') {
        console.error('Error checking existing email:', checkError);
        throw checkError;
      }

      if (existingUser && existingUser.id !== user.id) {
        return new Response(
          JSON.stringify({ 
            error: 'Email уже привязан к другому аккаунту',
            code: 'EMAIL_ALREADY_LINKED'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Обновляем email пользователя
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { email: credentials.email }
      );

      if (updateError) {
        console.error('Error updating user email:', updateError);
        throw updateError;
      }

      // Логируем операцию
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'EMAIL_LINKED',
        description: `Email ${credentials.email} linked to account`,
        metadata: { email: credentials.email }
      });

    } else if (provider === 'telegram') {
      // Проверяем, что Telegram ID уже не привязан к другому аккаунту
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('metadata->>telegram_id', credentials.telegram_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // Не найдено
        console.error('Error checking existing Telegram ID:', checkError);
        throw checkError;
      }

      if (existingProfile && existingProfile.user_id !== user.id) {
        return new Response(
          JSON.stringify({ 
            error: 'Telegram аккаунт уже привязан к другому пользователю',
            code: 'TELEGRAM_ALREADY_LINKED'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Обновляем или создаем профиль с Telegram данными
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          metadata: {
            telegram_id: credentials.telegram_id,
            telegram_username: credentials.telegram_username,
            telegram_first_name: credentials.telegram_first_name,
            telegram_last_name: credentials.telegram_last_name,
            telegram_linked_at: new Date().toISOString()
          }
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error('Error updating profile with Telegram data:', upsertError);
        throw upsertError;
      }

      // Логируем операцию
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'TELEGRAM_LINKED',
        description: `Telegram account @${credentials.telegram_username} linked`,
        metadata: { 
          telegram_id: credentials.telegram_id,
          telegram_username: credentials.telegram_username 
        }
      });
    }

    console.log('Account successfully linked:', provider);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${provider === 'email' ? 'Email' : 'Telegram'} успешно привязан к аккаунту`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in link-account function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Внутренняя ошибка сервера',
        details: error.details || null
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}