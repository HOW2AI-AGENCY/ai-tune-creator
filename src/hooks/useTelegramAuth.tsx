import { useState, useEffect, useCallback } from "react";
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

  // Check if user should be automatically authenticated
  const shouldAutoAuth = useCallback(() => {
    return (
      isInTelegram && 
      !authLoading && 
      !user && 
      !session && 
      getTelegramAuthData() !== null &&
      !isAuthenticating
    );
  }, [isInTelegram, authLoading, user, session, getTelegramAuthData, isAuthenticating]);

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
        setAuthError(`Authentication failed: ${error.message}`);
        return false;
      }

      if (!data?.session) {
        console.error('Telegram Auth: No session in response');
        setAuthError('Authentication failed: No session received');
        return false;
      }

      // Set the session in Supabase client
      const { error: setSessionError } = await supabase.auth.setSession(data.session);
      
      if (setSessionError) {
        console.error('Telegram Auth: Error setting session:', setSessionError);
        setAuthError(`Session error: ${setSessionError.message}`);
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

    if (shouldAutoAuth()) {
      // Small delay to ensure all components are initialized
      timeoutId = setTimeout(() => {
        console.log('Telegram Auth: Auto-authenticating user...');
        authenticateWithTelegram();
      }, 100);
    }

    return () => {
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