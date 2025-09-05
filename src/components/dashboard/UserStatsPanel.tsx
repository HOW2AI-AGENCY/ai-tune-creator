import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

export const UserStatsPanel = React.memo(() => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalTracks: 0,
    totalProjects: 0,
    totalArtists: 0,
    activeGenerations: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserStats = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use optimized RPC function for single database call
      const { data, error: rpcError } = await supabase
        .rpc('get_user_stats', { p_user_id: user.id });

      if (rpcError) throw rpcError;

      if (data && data.length > 0) {
        const result = data[0];
        setStats({
          totalTracks: result.total_tracks || 0,
          totalProjects: result.total_projects || 0,
          totalArtists: result.total_artists || 0,
          activeGenerations: result.active_generations || 0,
        });
      } else {
        setStats({
          totalTracks: 0,
          totalProjects: 0,
          totalArtists: 0,
          activeGenerations: 0,
        });
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
      setError('Failed to load statistics');
      setStats({
        totalTracks: 0,
        totalProjects: 0,
        totalArtists: 0,
        activeGenerations: 0,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadUserStats();
  }, [loadUserStats]);

  const statItems = useMemo(() => [
    {
      icon: Music,
      label: 'Треки',
      value: stats.totalTracks,
      color: 'text-primary'
    },
    {
      icon: FolderOpen,
      label: 'Проекты',
      value: stats.totalProjects,
      color: 'text-primary'
    },
    {
      icon: Users,
      label: 'Артисты',
      value: stats.totalArtists,
      color: 'text-primary'
    },
    {
      icon: Sparkles,
      label: 'Генерации',
      value: stats.activeGenerations,
      color: 'text-primary'
    }
  ], [stats]);

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

  if (error) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="col-span-full">
          <CardContent className="p-4 text-center text-muted-foreground">
            <p>Не удалось загрузить статистику</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statItems.map((item, index) => (
        <Card key={index} className="hover:shadow-sm transition-shadow">
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
});