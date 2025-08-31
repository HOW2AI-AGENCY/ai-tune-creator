import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code: string;
  photo_url?: string;
}

export const useTelegramAuth = () => {
  const { user: authUser, signOut } = useAuth();
  const { user: tgUser, isAvailable } = useTelegramWebApp();
  const [isLinked, setIsLinked] = useState(false);

  useEffect(() => {
    // Check if current user is linked to Telegram
    if (authUser && tgUser) {
      setIsLinked(true);
    }
  }, [authUser, tgUser]);

  const linkAccount = async () => {
    if (!tgUser || !authUser) return false;
    
    try {
      // Implementation would call Supabase edge function to link accounts
      return true;
    } catch (error) {
      console.error('Failed to link Telegram account:', error);
      return false;
    }
  };

  const unlinkAccount = async () => {
    try {
      // Implementation would call Supabase edge function to unlink accounts
      setIsLinked(false);
      return true;
    } catch (error) {
      console.error('Failed to unlink Telegram account:', error);
      return false;
    }
  };

  return {
    isInTelegram: isAvailable,
    isAuthenticated: !!authUser,
    telegramUser: tgUser as TelegramUser | undefined,
    authData: authUser,
    isLinked,
    linkAccount,
    unlinkAccount,
    signOut
  };
};