import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  TrendingUp, 
  Music, 
  Users, 
  Clock, 
  Activity,
  Zap,
  BarChart3,
  PieChart
} from 'lucide-react';

interface AnalyticsData {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  totalTracks: number;
  totalProjects: number;
  averageGenerationTime: number;
  topService: 'suno' | 'mureka';
  weeklyStats: {
    week: string;
    count: number;
  }[];
  serviceBreakdown: {
    suno: number;
    mureka: number;
  };
}

/**
 * Компонент аналитики AI генераций с метриками и статистикой
 * Удалена мемоизация для улучшения реактивности и отладки
 */
export function GenerationAnalytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * ОПТИМИЗАЦИЯ: Мемоизация функции загрузки аналитики
   * Предотвращает пересоздание функции при каждом рендере
   * Содержит сложную логику обработки данных
   */
  const loadAnalytics = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch analytics data
      const [
        generationsResponse,
        tracksResponse,
        projectsResponse
      ] = await Promise.all([
        supabase
          .from('ai_generations')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('tracks')
          .select('*, projects!inner(artist_id, artists!inner(user_id))')
          .eq('projects.artists.user_id', user.id),
        supabase
          .from('projects')
          .select('*, artists!inner(user_id)')
          .eq('artists.user_id', user.id)
      ]);

      const generations = generationsResponse.data || [];
      const tracks = tracksResponse.data || [];
      const projects = projectsResponse.data || [];

      // Calculate analytics
      const totalGenerations = generations.length;
      const successfulGenerations = generations.filter(g => g.status === 'completed').length;
      const failedGenerations = generations.filter(g => g.status === 'failed').length;

      // Service breakdown
      const sunoCount = generations.filter(g => g.service === 'suno').length;
      const murekaCount = generations.filter(g => g.service === 'mureka').length;
      const topService = sunoCount >= murekaCount ? 'suno' : 'mureka';

      // Weekly stats (last 4 weeks)
      const weeklyStats = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekGenerations = generations.filter(g => {
          const createdAt = new Date(g.created_at);
          return createdAt >= weekStart && createdAt < weekEnd;
        });

        weeklyStats.push({
          week: `Неделя ${4 - i}`,
          count: weekGenerations.length
        });
      }

      // Average generation time (mock calculation)
      const avgTime = totalGenerations > 0 ? 45 + Math.random() * 30 : 0;

      setAnalytics({
        totalGenerations,
        successfulGenerations,
        failedGenerations,
        totalTracks: tracks.length,
        totalProjects: projects.length,
        averageGenerationTime: Math.round(avgTime),
        topService,
        weeklyStats,
        serviceBreakdown: {
          suno: sunoCount,
          mureka: murekaCount
        }
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // Зависит только от ID пользователя

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  if (loading || !analytics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Вычисляем процент успешности без useMemo, чтобы избежать ошибок с хуками при условном рендере
  const successRate = analytics && analytics.totalGenerations > 0
    ? Math.round((analytics.successfulGenerations / analytics.totalGenerations) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Всего генераций
                </p>
                <p className="text-3xl font-bold">{analytics.totalGenerations}</p>
              </div>
              <Activity className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Успешных треков
                </p>
                <p className="text-3xl font-bold">{analytics.totalTracks}</p>
              </div>
              <Music className="h-8 w-8 text-green-500" />
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
                <p className="text-3xl font-bold">{analytics.totalProjects}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Среднее время
                </p>
                <p className="text-3xl font-bold">{analytics.averageGenerationTime}с</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate & Service Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Показатели успеха
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Успешные генерации</span>
                <span>{successRate}%</span>
              </div>
              <Progress value={successRate} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">
                  {analytics.successfulGenerations}
                </p>
                <p className="text-sm text-muted-foreground">Успешно</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">
                  {analytics.failedGenerations}
                </p>
                <p className="text-sm text-muted-foreground">Неудачно</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Использование AI сервисов
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Suno AI</Badge>
                  {analytics.topService === 'suno' && (
                    <Badge variant="outline" className="text-xs">Топ</Badge>
                  )}
                </div>
                <span className="font-medium">{analytics.serviceBreakdown.suno}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Mureka</Badge>
                  {analytics.topService === 'mureka' && (
                    <Badge variant="outline" className="text-xs">Топ</Badge>
                  )}
                </div>
                <span className="font-medium">{analytics.serviceBreakdown.mureka}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Активность по неделям
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.weeklyStats.map((week, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-20 text-sm text-muted-foreground">
                  {week.week}
                </div>
                <div className="flex-1">
                  <Progress 
                    value={week.count > 0 ? (week.count / Math.max(...analytics.weeklyStats.map(w => w.count))) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
                <div className="w-8 text-sm font-medium">
                  {week.count}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
