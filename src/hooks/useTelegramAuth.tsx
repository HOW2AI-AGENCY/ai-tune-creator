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
      setAuthError('Telegram authentication data not available');
      return false;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      console.log('Telegram Auth: Starting authentication process...');
      
      const { data, error } = await supabase.functions.invoke('telegram-auth', {
        body: { authData }
      });

      if (error) {
        console.error('Telegram Auth: Error from edge function:', error);

        // Handle specific error types
        const msg = error.message || '';
        if (msg.includes('Too many')) {
          setAuthError('Слишком много попыток входа. Подождите и попробуйте снова.');
        } else if (msg.includes('expired')) {
          setAuthError('Сессия Telegram устарела. Перезапустите мини‑приложение.');
          setAutoAuthDisabled(true);
          sessionStorage.setItem('tg_auto_auth_disabled', '1');
        } else if (msg.includes('Invalid signature')) {
          setAuthError('Не удалось подтвердить данные Telegram. Перезапустите мини‑приложение.');
          setAutoAuthDisabled(true);
          sessionStorage.setItem('tg_auto_auth_disabled', '1');
        } else {
          setAuthError(`Ошибка аутентификации: ${msg}`);
        }
        return false;
      }

      if (!data?.email || !data?.password) {
        console.error('Telegram Auth: Invalid response format', data);
        setAuthError('Authentication failed: Invalid server response');
        return false;
      }

      // Sign in with generated credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      
      if (signInError) {
        console.error('Telegram Auth: Error signing in:', signInError);
        setAuthError(`Sign in failed: ${signInError.message}`);
        return false;
      }

      console.log('Telegram Auth: Successfully authenticated user');
      
      toast({
        title: "Welcome from Telegram!",
        description: data.isNewUser ? "Account created successfully" : "Successfully signed in",
      });

      return true;

    } catch (error) {
      console.error('Telegram Auth: Exception during authentication:', error);
      setAuthError('Authentication failed. Please try again.');
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
    clearError: () => setAuthError(null)
  };
};