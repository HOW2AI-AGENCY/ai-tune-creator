import { useState, useEffect } from "react";
import { Music, Sparkles, Headphones, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { useTelegramWebApp } from "@/hooks/useTelegramWebApp";
import { supabase } from "@/integrations/supabase/client";

interface UserProfile {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  metadata?: {
    telegram_id?: string;
    telegram_username?: string;
    telegram_first_name?: string;
    telegram_last_name?: string;
  };
}

export const WelcomeSection = () => {
  const { user } = useAuth();
  const { isInTelegram, user: telegramUser } = useTelegramWebApp();
  const { authData } = useTelegramAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, bio, avatar_url, metadata')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading profile:', error);
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error('Profile load error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, [user]);

  if (!user || isLoading) {
    return (
      <Card className="mb-6 bg-gradient-to-br from-primary/5 to-accent/5 border-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-muted animate-pulse rounded" />
              <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Определяем отображаемое имя
  const displayName = profile?.display_name || 
    (isInTelegram && telegramUser ? 
      `${telegramUser.first_name} ${telegramUser.last_name || ''}`.trim() :
      user.email?.split('@')[0]
    ) || 'Пользователь';

  // Определяем источник аватара
  const avatarUrl = profile?.avatar_url || 
    (isInTelegram && telegramUser?.photo_url ? 
      telegramUser.photo_url : 
      null
    );

  // Определяем дополнительную информацию
  const additionalInfo = profile?.bio || 
    (isInTelegram ? 'Пользователь Telegram' : 'Добро пожаловать в платформу');

  const isConnectedViaTelegram = isInTelegram && authData;

  return (
    <Card className="mb-6 bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Аватар пользователя */}
          <Avatar className="h-16 w-16 ring-2 ring-primary/20">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          {/* Информация о пользователе */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-foreground truncate">
                Привет, {displayName}!
              </h2>
              {isConnectedViaTelegram && (
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    Telegram
                  </span>
                </div>
              )}
            </div>
            
            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
              {additionalInfo}
            </p>

            {/* Статистика или быстрые действия */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Music className="h-3 w-3" />
                <span>Ваша музыка</span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                <span>ИИ генерация</span>
              </div>
              {isInTelegram && (
                <div className="flex items-center gap-1">
                  <Headphones className="h-3 w-3" />
                  <span>Мобильно</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Краткие действия */}
        <div className="mt-4 flex gap-2">
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => window.location.href = '/ai-generation'}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Создать трек
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => window.location.href = '/tracks'}
          >
            <Music className="h-4 w-4 mr-2" />
            Мои треки
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};