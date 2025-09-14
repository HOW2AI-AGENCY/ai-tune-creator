import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { WelcomeSection } from "@/components/dashboard/WelcomeSection";
import { UserStatsPanel } from "@/components/dashboard/UserStatsPanel";
import { PublicTracksFeed } from "@/components/dashboard/PublicTracksFeed";
import { useTelegramAuth } from "@/hooks/useTelegramAuth";
import { usePrefetchPublicTracks } from "@/hooks/usePublicTracks";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const { isInTelegram, isAuthenticated } = useTelegramAuth();
  const { prefetch } = usePrefetchPublicTracks();
  const navigate = useNavigate();

  useEffect(() => {
    // Если не в Telegram и нет пользователя после загрузки
    if (!loading && !user && !isInTelegram) {
      navigate("/auth");
    }
    
    // Предзагружаем треки для улучшения UX
    if (user && !loading) {
      prefetch(10);
    }
  }, [user, loading, navigate, isInTelegram, prefetch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <WelcomeSection />
        
        {/* Статистика пользователя */}
        <UserStatsPanel />
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Button 
            onClick={() => navigate('/ai-generation')} 
            className="h-20 flex-col gap-2"
          >
            <div className="text-lg">🎵</div>
            <div>Генерация ИИ</div>
          </Button>
          <Button 
            onClick={() => navigate('/tracks')} 
            variant="outline"
            className="h-20 flex-col gap-2"
          >
            <div className="text-lg">🎼</div>
            <div>Мои треки</div>
          </Button>
          <Button 
            onClick={() => navigate('/projects')} 
            variant="outline"
            className="h-20 flex-col gap-2"
          >
            <div className="text-lg">📁</div>
            <div>Проекты</div>
          </Button>
        </div>

        {/* Лента треков сообщества */}
        <div className="mb-6">
          <PublicTracksFeed limit={10} />
        </div>

        {/* Account Actions */}
        <div className="flex justify-center">
          <Button onClick={signOut} variant="ghost" size="sm">
            Выйти из аккаунта
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;