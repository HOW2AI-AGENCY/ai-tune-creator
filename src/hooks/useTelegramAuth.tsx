import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TelegramAuthData {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  initData: string;
}

export const useTelegramAuth = () => {
  const { user, session, loading: authLoading } = useAuth();
  const { webApp, isInTelegram, user: telegramUser } = useTelegramWebApp();
  const { toast } = useToast();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [autoAuthDisabled, setAutoAuthDisabled] = useState(false);
  const attemptRef = useRef(0);
  // Get Telegram auth data from initData
  const getTelegramAuthData = useCallback((): TelegramAuthData | null => {
    if (!webApp?.initData || !telegramUser) return null;

    return {
      telegramId: telegramUser.id,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      username: telegramUser.username,
      languageCode: telegramUser.language_code,
      initData: webApp.initData
    };
  }, [webApp, telegramUser]);

  useEffect(() => {
    if (sessionStorage.getItem('tg_auto_auth_disabled') === '1') {
      setAutoAuthDisabled(true);
    }
  }, []);

  // Check if user should be automatically authenticated
  const shouldAutoAuth = useCallback(() => {
    return (
      isInTelegram &&
      !authLoading &&
      !user &&
      !session &&
      getTelegramAuthData() !== null &&
      !isAuthenticating &&
      !autoAuthDisabled &&
      attemptRef.current < 1
    );
  }, [isInTelegram, authLoading, user, session, getTelegramAuthData, isAuthenticating, autoAuthDisabled]);

  // Telegram authentication function
  const authenticateWithTelegram = useCallback(async (): Promise<boolean> => {
    const authData = getTelegramAuthData();
    
    if (!authData) {
      const errorMsg = 'Данные Telegram недоступны. Попробуйте перезапустить приложение.';
      console.warn('Telegram Auth: No auth data available.');
      setAuthError(errorMsg);
      toast({
        title: 'Ошибка входа',
        description: errorMsg,
        variant: 'destructive',
      });
      return false;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      console.log('Telegram Auth: Starting authentication process...');
      console.log('Telegram Auth: Auth data:', {
        telegramId: authData.telegramId,
        firstName: authData.firstName,
        initDataLength: authData.initData.length
      });
      
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { authData }
      });

      console.log('Telegram Auth: Edge function response:', { data, error: error?.message });

      if (error) {
        console.error('Telegram Auth: Error from edge function:', {
          message: error.message,
          details: (error as any).context?.details,
          code: (error as any).context?.code,
        });

        // More user-friendly error handling
        let userMessage = `Произошла ошибка аутентификации.`;
        const msg = error.message || '';
        const errorCode = (error as any).context?.code;

        if (errorCode === 'TELEGRAM_DATA_EXPIRED' || msg.includes('expired')) {
          userMessage = 'Сессия Telegram устарела. Пожалуйста, перезапустите мини-приложение.';
        } else if (errorCode === 'INVALID_TELEGRAM_SIGNATURE' || msg.includes('Invalid signature')) {
          userMessage = 'Не удалось подтвердить данные Telegram. Это может быть проблема с конфигурацией сервиса. Пожалуйста, перезапустите приложение.';
        } else if (msg.includes('Too many')) {
          userMessage = 'Слишком много попыток входа. Пожалуйста, подождите минуту и попробуйте снова.';
        } else if (msg.includes('Service temporarily unavailable')) {
          userMessage = 'Сервис временно недоступен. Вероятно, не настроен токен Telegram бота на сервере.';
        } else {
          userMessage = `Ошибка сервера: ${msg}. Попробуйте позже.`;
        }

        setAuthError(userMessage);
        toast({
          title: 'Ошибка входа через Telegram',
          description: userMessage,
          variant: 'destructive',
        });

        if (errorCode === 'TELEGRAM_DATA_EXPIRED' || errorCode === 'INVALID_TELEGRAM_SIGNATURE') {
          setAutoAuthDisabled(true);
          sessionStorage.setItem('tg_auto_auth_disabled', '1');
        }

        return false;
      }

      if (!data?.session?.access_token || !data?.session?.refresh_token) {
        console.error('Telegram Auth: Invalid session response from edge function', data);
        const errorMsg = 'Неверный ответ от сервера аутентификации. Сессия не была создана.';
        setAuthError(errorMsg);
        toast({
          title: 'Ошибка входа',
          description: errorMsg,
          variant: 'destructive',
        });
        return false;
      }

      // Set the session directly, which is more secure than using a password
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) {
        console.error('Telegram Auth: Supabase setSession failed:', sessionError);
        const errorMsg = 'Не удалось установить сессию после верификации. Пожалуйста, попробуйте еще раз.';
        setAuthError(errorMsg);
        toast({
          title: 'Ошибка входа',
          description: errorMsg,
          variant: 'destructive',
        });
        return false;
      }

      console.log('Telegram Auth: Successfully authenticated user via Telegram.');
      
      toast({
        title: "Добро пожаловать!",
        description: data.isNewUser ? "Ваш аккаунт был успешно создан через Telegram." : "Вы успешно вошли в систему.",
      });

      return true;

    } catch (error) {
      console.error('Telegram Auth: Exception during authentication process:', error);
      const errorMsg = 'Произошла непредвиденная ошибка. Пожалуйста, проверьте ваше интернет-соединение и попробуйте снова.';
      setAuthError(errorMsg);
      toast({
        title: 'Критическая ошибка',
        description: errorMsg,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsAuthenticating(false);
    }
  }, [getTelegramAuthData, toast]);

  // Auto-authenticate if conditions are met
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let mounted = true;

    if (shouldAutoAuth()) {
      timeoutId = setTimeout(async () => {
        if (!mounted) return;

        // Ensure we only auto-attempt once per session
        attemptRef.current += 1;
        console.log('Telegram Auth: Auto-authenticating user (attempt', attemptRef.current, ')...');
        try {
          const ok = await authenticateWithTelegram();
          if (!ok) {
            // Disable further auto attempts this session to prevent loops/blinking
            setAutoAuthDisabled(true);
            sessionStorage.setItem('tg_auto_auth_disabled', '1');
          }
        } catch (error) {
          console.error('Auto-auth failed:', error);
          setAutoAuthDisabled(true);
          sessionStorage.setItem('tg_auto_auth_disabled', '1');
          // No toast to avoid spam
        }
      }, 500); // Slightly longer delay for better stability
    }

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [shouldAutoAuth, authenticateWithTelegram]);

  return {
    authData: getTelegramAuthData(),
    isInTelegram,
    isAuthenticated: !!user && !!session,
    isAuthenticating,
    authError,
    authenticateWithTelegram,
    clearError: () => setAuthError(null),
    autoAuthDisabled,
    resetAutoAuth: () => {
      setAutoAuthDisabled(false);
      sessionStorage.removeItem('tg_auto_auth_disabled');
      attemptRef.current = 0;
    }
  };
};