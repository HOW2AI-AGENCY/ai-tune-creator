import React, { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileDashboard } from "./mobile/MobileDashboard";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { GenerationAnalytics } from "@/components/analytics/GenerationAnalytics";
import { TestGenerationButton } from "@/components/test/TestGenerationButton";
import { TrackCleanupTools } from "@/components/dev/TrackCleanupTools";
import { 
  Music2, 
  Users, 
  FolderOpen, 
  TrendingUp, 
  Sparkles, 
  Clock, 
  Activity,
  Settings,
  BarChart3,
  Zap
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState({
    tracks: 0,
    projects: 0,
    artists: 0,
    generations: 0,
    recentGenerations: [] as any[]
  });
  const [loading, setLoading] = useState(true);


  const loadStats = async () => {
    if (!user) return;

    try {
      const [
        tracksRes,
        projectsRes,
        artistsRes,
        generationsRes
      ] = await Promise.all([
        supabase
          .from('tracks')
          .select('count', { count: 'exact', head: true }),
        supabase
          .from('projects')
          .select('count', { count: 'exact', head: true }),
        supabase
          .from('artists')
          .select('count', { count: 'exact', head: true }),
        supabase
          .from('ai_generations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      setStats({
        tracks: tracksRes.count || 0,
        projects: projectsRes.count || 0,
        artists: artistsRes.count || 0,
        generations: generationsRes.data?.length || 0,
        recentGenerations: generationsRes.data || []
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [user]);

  if (isMobile) {
    return <MobileDashboard />;
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} дней назад`;
    if (diffHours > 0) return `${diffHours} часов назад`;
    return 'Только что';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Завершен</Badge>;
      case 'processing':
        return <Badge variant="secondary">Обрабатывается</Badge>;
      case 'failed':
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Добро пожаловать!</CardTitle>
            <CardDescription>
              Войдите в систему, чтобы увидеть вашу панель управления.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Панель управления</h1>
          <p className="text-muted-foreground">
            Добро пожаловать в вашу музыкальную студию с ИИ
          </p>
        </div>
        <div className="flex gap-2">
          <TestGenerationButton />
          <Button asChild>
            <Link to="/generate">
              <Sparkles className="mr-2 h-4 w-4" />
              Создать музыку
            </Link>
          </Button>
        </div>
      </div>

      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 border border-primary/20">
        <h2 className="text-2xl font-bold mb-2">Готовы создать что-то удивительное?</h2>
        <p className="text-muted-foreground mb-4">
          Используйте мощь ИИ для создания уникальной музыки. У вас уже есть {stats.tracks} треков и {stats.generations} генераций!
        </p>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/generate">
              <Sparkles className="mr-2 h-4 w-4" />
              Новая генерация
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/tracks">Мои треки</Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Треков создано
                </p>
                <p className="text-3xl font-bold">{loading ? '...' : stats.tracks}</p>
              </div>
              <Music2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Проектов
                </p>
                <p className="text-3xl font-bold">{loading ? '...' : stats.projects}</p>
              </div>
              <FolderOpen className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Артистов
                </p>
                <p className="text-3xl font-bold">{loading ? '...' : stats.artists}</p>
              </div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  ИИ генераций
                </p>
                <p className="text-3xl font-bold">{loading ? '...' : stats.generations}</p>
              </div>
              <Zap className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Недавняя активность
              </CardTitle>
              <CardDescription>
                Последние генерации ИИ и созданные треки
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : stats.recentGenerations.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Пока нет генераций</h3>
                  <p className="text-muted-foreground mb-4">
                    Создайте свою первую музыкальную композицию с помощью ИИ
                  </p>
                  <Button asChild>
                    <Link to="/generate">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Начать генерацию
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.recentGenerations.map((generation) => (
                    <div key={generation.id} className="flex items-start justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">
                          {generation.prompt.length > 80 
                            ? `${generation.prompt.substring(0, 80)}...` 
                            : generation.prompt
                          }
                        </p>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(generation.status)}
                          <Badge variant="outline" className="text-xs">
                            {generation.service}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {formatTimeAgo(generation.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" asChild className="flex-1">
                      <Link to="/tracks">Все треки</Link>
                    </Button>
                    <Button asChild className="flex-1">
                      <Link to="/generate">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Новая генерация
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <GenerationAnalytics />
          <div className="mt-6">
            <TrackCleanupTools />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}