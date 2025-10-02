import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface TelegramLinkInfo {
  telegram_id: string;
  telegram_username?: string;
  telegram_first_name?: string;
  telegram_last_name?: string;
}

interface LinkResponse {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  telegram_info?: TelegramLinkInfo;
}

export const useAccountLinking = () => {
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const linkTelegramAccount = async (telegramInfo: TelegramLinkInfo): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Необходимо войти в систему для привязки аккаунта",
        variant: "destructive",
      });
      return false;
    }

    setIsLinking(true);
    try {
      const { data, error } = await supabase.functions.invoke('link-telegram-account', {
        body: {
          ...telegramInfo,
          action: 'link'
        }
      });

      if (error) {
        console.error('Link error:', error);
        toast({
          title: "Ошибка привязки",
          description: "Не удалось привязать Telegram аккаунт",
          variant: "destructive",
        });
        return false;
      }

      const result = data as LinkResponse;
      
      if (!result.success) {
        if (result.code === 'TELEGRAM_ALREADY_LINKED') {
          toast({
            title: "Аккаунт уже привязан",
            description: result.error || "Этот Telegram аккаунт уже используется",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Ошибка",
            description: result.error || "Не удалось привязать аккаунт",
            variant: "destructive",
          });
        }
        return false;
      }

      toast({
        title: "Успешно!",
        description: result.message || "Telegram аккаунт привязан",
      });
      return true;

    } catch (error) {
      console.error('Unexpected link error:', error);
      toast({
        title: "Ошибка",
        description: "Произошла непредвиденная ошибка",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLinking(false);
    }
  };

  const unlinkTelegramAccount = async (): Promise<boolean> => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Необходимо войти в систему",
        variant: "destructive",
      });
      return false;
    }

    setIsUnlinking(true);
    try {
      const { data, error } = await supabase.functions.invoke('link-telegram-account', {
        body: {
          telegram_id: '', // Not used for unlink
          action: 'unlink'
        }
      });

      if (error) {
        console.error('Unlink error:', error);
        toast({
          title: "Ошибка",
          description: "Не удалось отвязать Telegram аккаунт",
          variant: "destructive",
        });
        return false;
      }

      const result = data as LinkResponse;
      
      if (!result.success) {
        toast({
          title: "Ошибка",
          description: result.error || "Не удалось отвязать аккаунт",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Успешно!",
        description: result.message || "Telegram аккаунт отвязан",
      });
      return true;

    } catch (error) {
      console.error('Unexpected unlink error:', error);
      toast({
        title: "Ошибка",
        description: "Произошла непредвиденная ошибка",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUnlinking(false);
    }
  };

  const linkToExistingEmail = async (
    email: string,
    password: string,
    telegramInfo: TelegramLinkInfo
  ): Promise<{ success: boolean; session?: any }> => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Необходимо войти в систему",
        variant: "destructive",
      });
      return { success: false };
    }

    setIsLinking(true);
    try {
      const { data, error } = await supabase.functions.invoke('link-telegram-to-existing-email', {
        body: {
          email,
          password,
          ...telegramInfo
        }
      });

      if (error) {
        console.error('Link to existing email error:', error);
        toast({
          title: "Ошибка привязки",
          description: error.message || "Не удалось привязать аккаунты",
          variant: "destructive",
        });
        return { success: false };
      }

      const result = data as any;
      
      if (!result.success) {
        const errorMessages: Record<string, string> = {
          'NOT_TELEGRAM_USER': 'Только Telegram пользователи могут привязать email аккаунт',
          'INVALID_EMAIL_CREDENTIALS': 'Неверный email или пароль',
          'EMAIL_ALREADY_LINKED': 'Этот email уже связан с другим Telegram',
          'TELEGRAM_ALREADY_LINKED': 'Этот Telegram уже привязан к другому аккаунту',
          'LINK_FAILED': 'Не удалось привязать аккаунты'
        };

        toast({
          title: "Ошибка",
          description: errorMessages[result.code] || result.error || "Не удалось объединить аккаунты",
          variant: "destructive",
        });
        return { success: false };
      }

      toast({
        title: "✅ Аккаунты объединены!",
        description: "Теперь вы можете входить через Telegram или Email",
      });
      
      // Return session for re-authentication
      return { success: true, session: result.session };

    } catch (error: any) {
      console.error('Unexpected link error:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Произошла непредвиденная ошибка",
        variant: "destructive",
      });
      return { success: false };
    } finally {
      setIsLinking(false);
    }
  };

  return {
    linkTelegramAccount,
    unlinkTelegramAccount,
    linkToExistingEmail,
    isLinking,
    isUnlinking,
  };
};