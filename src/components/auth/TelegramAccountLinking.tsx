import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Unlink, Link, MessageCircle, User, CheckCircle, Mail } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAccountLinking } from "@/hooks/useAccountLinking";
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp";
import { EmailLinkingForm } from "./EmailLinkingForm";
import { getTelegramData } from "@/lib/secure-profile";

interface UserProfile {
  telegram_id?: string | null;
  telegram_username?: string | null;
  telegram_first_name?: string | null;
  telegram_last_name?: string | null;
}

export const TelegramAccountLinking = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmailLinkingDialog, setShowEmailLinkingDialog] = useState(false);
  const { user } = useAuth();
  const { linkTelegramAccount, unlinkTelegramAccount, isLinking, isUnlinking } = useAccountLinking();
  const { user: telegramUser, isInTelegram } = useTelegramWebApp();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const telegramData = await getTelegramData();
      setProfile(telegramData || {});
    } catch (error) {
      console.error('Profile fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkTelegram = async () => {
    if (!telegramUser || !isInTelegram) {
      return;
    }

    const success = await linkTelegramAccount({
      telegram_id: String(telegramUser.id),
      telegram_username: telegramUser.username,
      telegram_first_name: telegramUser.first_name,
      telegram_last_name: telegramUser.last_name,
    });

    if (success) {
      await fetchUserProfile();
    }
  };

  const handleUnlinkTelegram = async () => {
    const success = await unlinkTelegramAccount();
    if (success) {
      await fetchUserProfile();
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-muted rounded-full animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-32 animate-pulse" />
              <div className="h-3 bg-muted rounded w-24 animate-pulse" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLinked = profile?.telegram_id;
  const canLink = isInTelegram && telegramUser && !isLinked;
  
  // Check if user authenticated via Telegram (has telegram email format)
  const isTelegramUser = user?.email?.includes('@telegram.local');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Привязка Telegram аккаунта
        </CardTitle>
        <CardDescription>
          Привяжите ваш Telegram аккаунт для удобного входа через мини-приложение
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLinked ? (
          // Account is linked
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Ваш Telegram аккаунт успешно привязан
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {profile.telegram_first_name}
                    {profile.telegram_last_name && ` ${profile.telegram_last_name}`}
                  </span>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100">
                    Привязан
                  </Badge>
                </div>
                {profile.telegram_username && (
                  <p className="text-sm text-muted-foreground">
                    @{profile.telegram_username}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  ID: {profile.telegram_id}
                </p>
              </div>
            </div>

            {/* Show email linking option if user logged in via Telegram */}
            {isTelegramUser && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Alert>
                    <Mail className="h-4 w-4" />
                    <AlertDescription>
                      Добавьте email и пароль для входа без Telegram
                    </AlertDescription>
                  </Alert>
                  <Button
                    variant="default"
                    onClick={() => setShowEmailLinkingDialog(true)}
                    className="w-full"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Привязать Email
                  </Button>
                </div>
              </>
            )}

            <Separator />

            <Button
              variant="outline"
              onClick={handleUnlinkTelegram}
              disabled={isUnlinking}
              className="w-full"
            >
              <Unlink className="mr-2 h-4 w-4" />
              {isUnlinking ? "Отвязывание..." : "Отвязать Telegram"}
            </Button>
          </div>
        ) : canLink ? (
          // Can link Telegram account
          <div className="space-y-4">
            <Alert>
              <MessageCircle className="h-4 w-4" />
              <AlertDescription>
                Вы можете привязать текущий Telegram аккаунт для быстрого входа
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-medium">
                  {telegramUser.first_name}
                  {telegramUser.last_name && ` ${telegramUser.last_name}`}
                </div>
                {telegramUser.username && (
                  <p className="text-sm text-muted-foreground">
                    @{telegramUser.username}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  ID: {telegramUser.id}
                </p>
              </div>
            </div>

            <Button
              onClick={handleLinkTelegram}
              disabled={isLinking}
              className="w-full"
            >
              <Link className="mr-2 h-4 w-4" />
              {isLinking ? "Привязывание..." : "Привязать Telegram аккаунт"}
            </Button>
          </div>
        ) : (
          // Cannot link or not in Telegram
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {!isInTelegram 
                  ? "Привязка Telegram доступна только в мини-приложении Telegram"
                  : "Не удалось получить данные Telegram пользователя"
                }
              </AlertDescription>
            </Alert>

            {!isInTelegram && (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Откройте приложение в Telegram для привязки аккаунта
                </p>
                <Button variant="outline" asChild>
                  <a 
                    href="https://t.me/musicverse_ai_bot?startapp=settings" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Открыть в Telegram
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Email Linking Dialog */}
      <Dialog open={showEmailLinkingDialog} onOpenChange={setShowEmailLinkingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Привязать Email к аккаунту</DialogTitle>
            <DialogDescription>
              Добавьте email и пароль для альтернативного способа входа
            </DialogDescription>
          </DialogHeader>
          <EmailLinkingForm 
            onSuccess={() => {
              setShowEmailLinkingDialog(false);
              fetchUserProfile();
            }}
            onCancel={() => setShowEmailLinkingDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};