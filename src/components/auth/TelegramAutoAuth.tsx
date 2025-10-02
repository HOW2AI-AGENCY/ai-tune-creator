import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TelegramAutoAuthProps {
  onAuthComplete?: () => void;
  onAuthFailed?: (error: string) => void;
}

export const TelegramAutoAuth = ({ onAuthComplete, onAuthFailed }: TelegramAutoAuthProps) => {
  const { isAvailable, webApp, user: tgUser } = useTelegramWebApp();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const attemptTelegramAuth = async () => {
      // Only proceed if we're in Telegram and have initData
      if (!isAvailable || !webApp?.initData || isAuthenticating) {
        console.log('🔐 TelegramAutoAuth: Not in Telegram or no initData', {
          isAvailable,
          hasInitData: !!webApp?.initData,
          isAuthenticating
        });
        if (onAuthFailed && !isAvailable) {
          onAuthFailed('Not running in Telegram Mini App');
        }
        return;
      }

      // Check if already authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('🔐 TelegramAutoAuth: Already authenticated');
        onAuthComplete?.();
        navigate('/', { replace: true });
        return;
      }

      if (!tgUser) {
        console.log('🔐 TelegramAutoAuth: No Telegram user data');
        const errorMsg = 'Отсутствуют данные пользователя Telegram';
        setError(errorMsg);
        onAuthFailed?.(errorMsg);
        return;
      }

      console.log('🔐 TelegramAutoAuth: Starting authentication', {
        telegramId: tgUser.id,
        username: tgUser.username
      });

      setIsAuthenticating(true);
      setError(null);

      try {
        // Call telegram-auth edge function
        const { data, error: authError } = await supabase.functions.invoke('telegram-auth', {
          body: {
            authData: {
              telegramId: tgUser.id,
              firstName: tgUser.first_name,
              lastName: tgUser.last_name,
              username: tgUser.username,
              languageCode: tgUser.language_code,
              initData: webApp.initData
            }
          }
        });

        if (authError) {
          console.error('🔐 TelegramAutoAuth: Edge function error', authError);
          throw new Error(authError.message || 'Ошибка аутентификации');
        }

        if (!data?.session) {
          console.error('🔐 TelegramAutoAuth: No session in response', data);
          throw new Error(data?.error || 'Не удалось получить сессию');
        }

        console.log('🔐 TelegramAutoAuth: Session received', {
          isNewUser: data.isNewUser,
          hasAccessToken: !!data.session.access_token
        });

        // Set the session in Supabase
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token
        });

        if (sessionError) {
          console.error('🔐 TelegramAutoAuth: Failed to set session', sessionError);
          throw sessionError;
        }

        console.log('🔐 TelegramAutoAuth: Authentication successful');

        toast({
          title: data.isNewUser ? '✨ Добро пожаловать!' : '👋 С возвращением!',
          description: data.message || 'Вы успешно вошли через Telegram'
        });

        onAuthComplete?.();
        navigate('/', { replace: true });

      } catch (err: any) {
        console.error('🔐 TelegramAutoAuth: Authentication failed', err);
        const errorMessage = err.message || 'Ошибка при входе через Telegram';
        setError(errorMessage);
        
        toast({
          title: '❌ Ошибка входа',
          description: errorMessage,
          variant: 'destructive'
        });

        onAuthFailed?.(errorMessage);
      } finally {
        setIsAuthenticating(false);
      }
    };

    attemptTelegramAuth();
  }, [isAvailable, webApp, tgUser, isAuthenticating, navigate, toast, onAuthComplete, onAuthFailed]);

  // Don't render anything if not in Telegram
  if (!isAvailable) {
    return null;
  }

  // Show loading state while authenticating
  if (isAuthenticating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">Вход через Telegram</h3>
          <p className="text-muted-foreground">
            Подождите, идет аутентификация...
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold text-destructive">Ошибка входа</h3>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground">
            Вы можете войти с помощью email ниже
          </p>
        </div>
      </div>
    );
  }

  return null;
};
