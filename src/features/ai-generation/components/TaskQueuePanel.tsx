import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Music,
  Mic,
  Music2,
  MoreHorizontal,
  Play,
  Download,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface GenerationTask {
  id: string;
  prompt: string;
  service: 'suno' | 'mureka';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  result?: any;
  created_at: string;
  estimated_time?: number;
}

interface TaskQueuePanelProps {
  tasks: GenerationTask[];
}

export function TaskQueuePanel({ tasks }: TaskQueuePanelProps) {
  const activeTasks = tasks.filter(task => task.status === 'pending' || task.status === 'running');
  const recentTasks = tasks.slice(0, 5); // Show last 5 tasks

  const getStatusIcon = (status: GenerationTask['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: GenerationTask['status']) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'running':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getServiceIcon = (service: 'suno' | 'mureka') => {
    return service === 'suno' ? 
      <Mic className="h-3 w-3" /> : 
      <Music2 className="h-3 w-3" />;
  };

  const formatEstimatedTime = (seconds?: number) => {
    if (!seconds) return 'Неизвестно';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}м ${remainingSeconds}с` : `${remainingSeconds}с`;
  };

  if (recentTasks.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-border bg-card/30">
      <div className="p-4">
        {/* Active Tasks Header */}
        {activeTasks.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                Активные задачи
              </h3>
              <Badge variant="outline" className="text-xs">
                {activeTasks.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {activeTasks.map((task) => (
                <Card key={task.id} className="bg-card/50">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getServiceIcon(task.service)}
                          <span className="text-xs font-medium capitalize">
                            {task.service}
                          </span>
                          <Badge variant={getStatusColor(task.status)} className="text-xs">
                            {task.status === 'pending' ? 'В очереди' : 'Генерация'}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-foreground mb-2 line-clamp-2">
                          {task.prompt}
                        </p>
                        
                        {task.status === 'running' && task.progress !== undefined && (
                          <div className="space-y-1">
                            <Progress value={task.progress} className="h-1" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{task.progress}%</span>
                              <span>~{formatEstimatedTime(task.estimated_time)}</span>
                            </div>
                          </div>
                        )}
                        
                        {task.status === 'pending' && (
                          <div className="text-xs text-muted-foreground">
                            Оценочное время: {formatEstimatedTime(task.estimated_time)}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {getStatusIcon(task.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Tasks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Недавние задачи
            </h3>
            <Badge variant="outline" className="text-xs">
              {recentTasks.length}
            </Badge>
          </div>
          
          <div className="space-y-1">
            {recentTasks.map((task) => (
              <div 
                key={task.id} 
                className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getStatusIcon(task.status)}
                  <div className="flex items-center gap-1">
                    {getServiceIcon(task.service)}
                    <span className="text-xs text-muted-foreground capitalize">
                      {task.service}
                    </span>
                  </div>
                  <span className="text-sm truncate">
                    {task.prompt}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {task.status === 'completed' && task.result && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <Play className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  {task.status === 'failed' && (
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive">
                      <AlertCircle className="h-3 w-3" />
                    </Button>
                  )}
                  
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(task.created_at), { 
                      addSuffix: true, 
                      locale: ru 
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}