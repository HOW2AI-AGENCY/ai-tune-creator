import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Unlink, Link, MessageCircle, Mail, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAccountLinking } from "@/hooks/useAccountLinking";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";

interface UserProfile {
  telegram_id?: string;
  telegram_username?: string;
  telegram_first_name?: string;
  telegram_last_name?: string;
}

export const AccountLinkedInfo = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { linkTelegramAccount, unlinkTelegramAccount, isLinking, isUnlinking } = useAccountLinking();
  const { authData, isInTelegram } = useTelegramAuth();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('telegram_id, telegram_username, telegram_first_name, telegram_last_name')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data || {});
      }
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkTelegram = async () => {
    if (!authData || !isInTelegram) {
      return;
    }

    const success = await linkTelegramAccount({
      telegram_id: authData.telegramId,
      telegram_username: authData.username,
      telegram_first_name: authData.firstName,
      telegram_last_name: authData.lastName,
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
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return null;
  }

  const hasTelegramLinked = profile?.telegram_id;
  const telegramDisplayName = profile?.telegram_first_name 
    ? `${profile.telegram_first_name}${profile.telegram_last_name ? ' ' + profile.telegram_last_name : ''}`
    : profile?.telegram_username || profile?.telegram_id;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Связанные аккаунты
        </CardTitle>
        <CardDescription>
          Управление подключенными сервисами и аккаунтами
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Account */}
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Badge variant="secondary">Основной</Badge>
        </div>

        <Separator />

        {/* Telegram Account */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${hasTelegramLinked ? 'bg-blue-500/10' : 'bg-muted'}`}>
                <MessageCircle className={`h-4 w-4 ${hasTelegramLinked ? 'text-blue-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="font-medium">Telegram</p>
                {hasTelegramLinked ? (
                  <p className="text-sm text-muted-foreground">{telegramDisplayName}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Не привязан</p>
                )}
              </div>
            </div>
            
            {hasTelegramLinked ? (
              <Badge variant="default" className="bg-blue-500">Привязан</Badge>
            ) : (
              <Badge variant="outline">Не привязан</Badge>
            )}
          </div>

          {/* Telegram Actions */}
          {isInTelegram && authData ? (
            // In Telegram Mini App
            <div className="space-y-2">
              {!hasTelegramLinked ? (
                <Alert>
                  <Link className="h-4 w-4" />
                  <AlertDescription>
                    Привяжите ваш Telegram аккаунт для упрощения входа в будущем
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <MessageCircle className="h-4 w-4" />
                  <AlertDescription>
                    Telegram аккаунт привязан. Вы можете входить через Telegram или email.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex gap-2">
                {!hasTelegramLinked ? (
                  <Button 
                    onClick={handleLinkTelegram}
                    disabled={isLinking}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Link className="h-4 w-4" />
                    {isLinking ? "Привязываем..." : "Привязать аккаунт"}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleUnlinkTelegram}
                    disabled={isUnlinking}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Unlink className="h-4 w-4" />
                    {isUnlinking ? "Отвязываем..." : "Отвязать"}
                  </Button>
                )}
              </div>
            </div>
          ) : hasTelegramLinked ? (
            // Regular browser, account is linked
            <Alert>
              <MessageCircle className="h-4 w-4" />
              <AlertDescription>
                Telegram аккаунт привязан. Откройте приложение в Telegram для управления.
              </AlertDescription>
            </Alert>
          ) : (
            // Regular browser, no telegram link
            <Alert>
              <MessageCircle className="h-4 w-4" />
              <AlertDescription>
                Откройте приложение в Telegram Mini App для привязки аккаунта
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
};