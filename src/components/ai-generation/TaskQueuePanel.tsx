import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Music, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Download,
  Play,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TaskQueuePanelProps {
  className?: string;
}

interface GenerationTask {
  id: string;
  prompt: string;
  service: 'suno' | 'mureka';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  metadata?: any;
  result_url?: string;
  error_message?: string;
  track_id?: string;
}

export function TaskQueuePanel({ className }: TaskQueuePanelProps) {
  const { user } = useAuth();

  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['generation-tasks', user?.id],
    queryFn: async (): Promise<GenerationTask[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('ai_generations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        service: item.service as 'suno' | 'mureka',
        status: item.status as 'pending' | 'processing' | 'completed' | 'failed'
      }));
    },
    enabled: !!user,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const activeTasks = tasks.filter(task => 
    task.status === 'pending' || task.status === 'processing'
  );

  const recentTasks = tasks.filter(task => 
    task.status === 'completed' || task.status === 'failed'
  ).slice(0, 5);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'processing':
        return 'bg-blue-500/10 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-green-500/10 text-green-700 border-green-200';
      case 'failed':
        return 'bg-red-500/10 text-red-700 border-red-200';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getServiceIcon = (service: string) => {
    return <Music className="h-3 w-3" />;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const handlePlay = (url: string) => {
    // TODO: Integrate with audio player
    window.open(url, '_blank');
  };

  const handleDownload = (url: string, prompt: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${prompt.slice(0, 30)}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-32"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Music className="h-5 w-5" />
            Generation Queue
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Active Tasks */}
        {activeTasks.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Active ({activeTasks.length})
            </h4>
            {activeTasks.map((task) => (
              <div 
                key={task.id} 
                className="p-3 border rounded-lg bg-card space-y-2 animate-fade-in"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {task.prompt}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getStatusColor(task.status))}
                      >
                        {getStatusIcon(task.status)}
                        {task.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getServiceIcon(task.service)}
                        {task.service}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(task.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {task.status === 'processing' && (
                  <div className="space-y-1">
                    <Progress value={65} className="h-1" />
                    <p className="text-xs text-muted-foreground">
                      Estimated time remaining: ~2 minutes
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Recent Tasks */}
        {recentTasks.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              Recent
            </h4>
            {recentTasks.map((task) => (
              <div 
                key={task.id} 
                className="p-3 border rounded-lg bg-card/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {task.prompt}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", getStatusColor(task.status))}
                      >
                        {getStatusIcon(task.status)}
                        {task.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getServiceIcon(task.service)}
                        {task.service}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(task.created_at)}
                      </span>
                    </div>

                    {task.error_message && (
                      <p className="text-xs text-red-600 mt-1 truncate">
                        {task.error_message}
                      </p>
                    )}
                  </div>

                  {task.status === 'completed' && task.result_url && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePlay(task.result_url!)}
                        className="h-8 w-8 p-0"
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(task.result_url!, task.prompt)}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {activeTasks.length === 0 && recentTasks.length === 0 && (
          <div className="text-center py-6">
            <Music className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No generation tasks yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Start generating music to see tasks here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}