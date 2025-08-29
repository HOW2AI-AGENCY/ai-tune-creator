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

export const useTelegramAuthOptimized = () => {
  const { user, session, loading: authLoading } = useAuth();
  const { webApp, isInTelegram, user: telegramUser } = useTelegramWebApp();
  const { toast } = useToast();
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [autoAuthDisabled, setAutoAuthDisabled] = useState(false);
  const attemptRef = useRef(0);
  const maxAttempts = 2;

  // Get Telegram auth data from initData
  const getTelegramAuthData = useCallback((): TelegramAuthData | null => {
    if (!webApp?.initData || !telegramUser) {
      console.log('Telegram Auth: Missing webApp data or user');
      return null;
    }

    return {
      telegramId: telegramUser.id,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      username: telegramUser.username,
      languageCode: telegramUser.language_code,
      initData: webApp.initData
    };
  }, [webApp, telegramUser]);

  // Initialize state from sessionStorage
  useEffect(() => {
    const disabled = sessionStorage.getItem('tg_auto_auth_disabled') === '1';
    const attempts = parseInt(sessionStorage.getItem('tg_auth_attempts') || '0');
    
    setAutoAuthDisabled(disabled);
    attemptRef.current = attempts;
  }, []);

  // Enhanced authentication function with better error handling
  const authenticateWithTelegram = useCallback(async (): Promise<boolean> => {
    const authData = getTelegramAuthData();
    
    if (!authData) {
      const errorMsg = 'Данные Telegram недоступны. Перезапустите приложение.';
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
    attemptRef.current += 1;
    sessionStorage.setItem('tg_auth_attempts', attemptRef.current.toString());

    try {
      console.log('Telegram Auth: Authenticating user...', {
        telegramId: authData.telegramId,
        firstName: authData.firstName,
        attempt: attemptRef.current
      });
      
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { authData }
      });

      if (error) {
        console.error('Telegram Auth: Edge function error:', error);
        
        let userMessage = 'Произошла ошибка аутентификации.';
        const errorCode = (error as any).context?.code;
        
        // Enhanced error handling
        switch (errorCode) {
          case 'TELEGRAM_DATA_EXPIRED':
            userMessage = 'Сессия Telegram устарела. Перезапустите приложение.';
            break;
          case 'INVALID_TELEGRAM_SIGNATURE':
            userMessage = 'Не удалось подтвердить данные Telegram. Перезапустите приложение.';
            break;
          case 'RATE_LIMITED':
            userMessage = 'Слишком много попыток входа. Подождите и попробуйте снова.';
            break;
          case 'SERVICE_UNAVAILABLE':
            userMessage = 'Сервис временно недоступен. Попробуйте позже.';
            break;
          default:
            if (error.message?.includes('Too many')) {
              userMessage = 'Превышен лимит попыток. Подождите минуту.';
            } else {
              userMessage = `Ошибка сервера: ${error.message}`;
            }
        }

        setAuthError(userMessage);
        toast({
          title: 'Ошибка входа через Telegram',
          description: userMessage,
          variant: 'destructive',
        });

        // Disable auto-auth after critical errors or too many attempts
        if (['TELEGRAM_DATA_EXPIRED', 'INVALID_TELEGRAM_SIGNATURE'].includes(errorCode) || 
            attemptRef.current >= maxAttempts) {
          setAutoAuthDisabled(true);
          sessionStorage.setItem('tg_auto_auth_disabled', '1');
        }

        return false;
      }

      // Validate response structure
      if (!data?.session?.access_token || !data?.session?.refresh_token) {
        console.error('Telegram Auth: Invalid session response', data);
        const errorMsg = 'Неверный ответ от сервера аутентификации.';
        setAuthError(errorMsg);
        toast({
          title: 'Ошибка входа',
          description: errorMsg,
          variant: 'destructive',
        });
        return false;
      }

      // Set session with proper error handling
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

      if (sessionError) {
        console.error('Telegram Auth: setSession failed:', sessionError);
        const errorMsg = 'Не удалось установить сессию. Попробуйте снова.';
        setAuthError(errorMsg);
        toast({
          title: 'Ошибка входа',
          description: errorMsg,
          variant: 'destructive',
        });
        return false;
      }

      console.log('Telegram Auth: Successfully authenticated');
      
      // Clear attempt counters on success
      sessionStorage.removeItem('tg_auth_attempts');
      sessionStorage.removeItem('tg_auto_auth_disabled');
      attemptRef.current = 0;
      setAutoAuthDisabled(false);
      
      toast({
        title: "Добро пожаловать!",
        description: data.isNewUser ? 
          "Ваш аккаунт создан через Telegram." : 
          "Вы успешно вошли в систему.",
      });

      return true;

    } catch (error) {
      console.error('Telegram Auth: Unexpected error:', error);
      const errorMsg = 'Произошла непредвиденная ошибка. Проверьте соединение.';
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

  // Optimized auto-authentication logic
  const shouldAutoAuth = useCallback(() => {
    return (
      isInTelegram &&
      !authLoading &&
      !user &&
      !session &&
      !isAuthenticating &&
      !autoAuthDisabled &&
      attemptRef.current < maxAttempts &&
      getTelegramAuthData() !== null
    );
  }, [isInTelegram, authLoading, user, session, isAuthenticating, autoAuthDisabled, getTelegramAuthData]);

  // Auto-authenticate with improved timing and error handling
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let mounted = true;

    if (shouldAutoAuth()) {
      // Delay auto-auth to allow components to mount properly
      timeoutId = setTimeout(async () => {
        if (!mounted || !shouldAutoAuth()) return;

        console.log('Telegram Auth: Starting auto-authentication (attempt', attemptRef.current + 1, ')');
        
        try {
          const success = await authenticateWithTelegram();
          if (!success && mounted) {
            // Disable auto-auth on failure to prevent loops
            setAutoAuthDisabled(true);
            sessionStorage.setItem('tg_auto_auth_disabled', '1');
          }
        } catch (error) {
          console.error('Auto-auth failed:', error);
          if (mounted) {
            setAutoAuthDisabled(true);
            sessionStorage.setItem('tg_auto_auth_disabled', '1');
          }
        }
      }, 800); // Slightly longer delay for better stability
    }

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [shouldAutoAuth, authenticateWithTelegram]);

  // Reset function for manual retry
  const resetAutoAuth = useCallback(() => {
    setAutoAuthDisabled(false);
    setAuthError(null);
    attemptRef.current = 0;
    sessionStorage.removeItem('tg_auto_auth_disabled');
    sessionStorage.removeItem('tg_auth_attempts');
  }, []);

  // Clear error function
  const clearError = useCallback(() => {
    setAuthError(null);
  }, []);

  return {
    authData: getTelegramAuthData(),
    isInTelegram,
    isAuthenticated: !!user && !!session,
    isAuthenticating,
    authError,
    authenticateWithTelegram,
    clearError,
    autoAuthDisabled,
    resetAutoAuth,
    attemptCount: attemptRef.current,
    maxAttempts
  };
};