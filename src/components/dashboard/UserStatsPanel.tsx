import { useState, useEffect } from 'react';
import { Music, Sparkles, FolderOpen, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserStats {
  totalTracks: number;
  totalProjects: number;
  totalArtists: number;
  activeGenerations: number;
}

export const UserStatsPanel = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalTracks: 0,
    totalProjects: 0,
    totalArtists: 0,
    activeGenerations: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUserStats = async () => {
      if (!user) return;

      try {
        // Получаем статистику пользователя напрямую

        // Простой подход - получаем данные напрямую
        const [tracks, projects, artists, generations] = await Promise.all([
          supabase
            .from('tracks')
            .select(`
              id,
              projects!inner (
                id,
                artists!inner (
                  id,
                  user_id
                )
              )
            `)
            .eq('projects.artists.user_id', user.id),
            
          supabase
            .from('projects')
            .select(`
              id,
              artists!inner (
                user_id
              )
            `)
            .eq('artists.user_id', user.id),
            
          supabase
            .from('artists')
            .select('id')
            .eq('user_id', user.id),
            
          supabase
            .from('ai_generations')
            .select('id')
            .eq('user_id', user.id)
            .in('status', ['pending', 'processing'])
        ]);

        setStats({
          totalTracks: tracks.data?.length || 0,
          totalProjects: projects.data?.length || 0,
          totalArtists: artists.data?.length || 0,
          activeGenerations: generations.data?.length || 0
        });

      } catch (error) {
        console.error('Error loading user stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserStats();
  }, [user]);

  const statItems = [
    {
      icon: Music,
      label: 'Треки',
      value: stats.totalTracks,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      icon: FolderOpen,
      label: 'Проекты',
      value: stats.totalProjects,
      color: 'text-green-600 dark:text-green-400'
    },
    {
      icon: Users,
      label: 'Артисты',
      value: stats.totalArtists,
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      icon: Sparkles,
      label: 'Генерации',
      value: stats.activeGenerations,
      color: 'text-orange-600 dark:text-orange-400'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="w-8 h-8 bg-muted animate-pulse rounded" />
                <div className="h-6 bg-muted animate-pulse rounded" />
                <div className="h-4 bg-muted animate-pulse rounded w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statItems.map((item, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center space-y-2">
              <item.icon className={`h-8 w-8 ${item.color}`} />
              <div className="text-2xl font-bold">{item.value}</div>
              <div className="text-sm text-muted-foreground">{item.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};