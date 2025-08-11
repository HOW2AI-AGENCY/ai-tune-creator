import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Download, Play, RefreshCw, Layers, Music2, Sparkles } from "lucide-react";

export type GenerationStatus = 'completed' | 'processing' | 'failed';

export interface GenerationItem {
  id: string;
  groupId: string; // Группа версий одного трека
  version: number;
  prompt: string;
  service: 'suno' | 'mureka';
  status: GenerationStatus;
  createdAt: string;
  duration?: number;
  progress?: number;
  resultUrl?: string;
  errorMessage?: string;
  projectName?: string;
  artistName?: string;
  title?: string;
  trackId?: string; // исходный трек, если доступен
}

function getStatusColor(status: GenerationStatus) {
  switch (status) {
    case 'completed':
      return 'bg-success/10 text-success hover:bg-success/20';
    case 'processing':
      return 'bg-warning/10 text-warning hover:bg-warning/20';
    case 'failed':
      return 'bg-destructive/10 text-destructive hover:bg-destructive/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function getStatusText(status: GenerationStatus) {
  switch (status) {
    case 'completed':
      return 'завершено';
    case 'processing':
      return 'обрабатывается';
    case 'failed':
      return 'ошибка';
    default:
      return status;
  }
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

interface GenerationFeedProps {
  generations: GenerationItem[];
  onQuickGenerate?: (opts: { trackId: string; nextVersion: number; prompt: string; service: 'suno' | 'mureka' }) => void;
}

export function GenerationFeed({ generations, onQuickGenerate }: GenerationFeedProps) {
  // Группируем по groupId (версии одного трека)
  const groups = generations.reduce<Record<string, GenerationItem[]>>((acc, item) => {
    acc[item.groupId] = acc[item.groupId] || [];
    acc[item.groupId].push(item);
    return acc;
  }, {});

  const groupEntries = Object.entries(groups).sort((a, b) => {
    const dateA = Math.max(...a[1].map(i => new Date(i.createdAt).getTime()));
    const dateB = Math.max(...b[1].map(i => new Date(i.createdAt).getTime()));
    return dateB - dateA; // новые сверху
  });

  if (groupEntries.length === 0) {
    return (
      <div className="text-center py-12">
        <Music2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Пока нет генераций</h3>
        <p className="text-muted-foreground">Создайте первый трек с помощью формы слева</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupEntries.map(([groupId, items]) => {
        const latest = items.slice().sort((a, b) => b.version - a.version)[0];
        return (
          <Card key={groupId} className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4" /> Версии трека · {latest.title || 'Без названия'}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {latest.projectName && <Badge variant="secondary">Проект: {latest.projectName}</Badge>}
                    {latest.artistName && <Badge variant="secondary">Артист: {latest.artistName}</Badge>}
                    <span className="hidden md:inline">·</span>
                    <span className="truncate">{latest.prompt}</span>
                  </div>
                </div>
                <Badge variant="outline">{items.length} верс.</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {items
                .sort((a, b) => b.version - a.version)
                .map((gen) => (
                  <div key={gen.id} className="flex items-start justify-between gap-4 border rounded-md p-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={getStatusColor(gen.status)}>
                          v{gen.version} · {getStatusText(gen.status)}
                        </Badge>
                        <Badge variant="secondary">{gen.service}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(gen.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {gen.status === 'processing' && gen.progress != null && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Обрабатывается...</span>
                            <span className="text-muted-foreground">{gen.progress}%</span>
                          </div>
                          <Progress value={gen.progress} className="h-2" />
                        </div>
                      )}
                      {gen.status === 'failed' && gen.errorMessage && (
                        <p className="text-sm text-destructive">{gen.errorMessage}</p>
                      )}
                      {gen.status === 'completed' && gen.duration && (
                        <p className="text-sm text-muted-foreground">Длительность: {formatDuration(gen.duration)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {onQuickGenerate && gen.trackId && (
                        <Button
                          size="sm"
                          onClick={() =>
                            onQuickGenerate({
                              trackId: gen.trackId!,
                              nextVersion: gen.version + 1,
                              prompt: gen.prompt,
                              service: gen.service,
                            })
                          }
                        >
                          <Sparkles className="h-4 w-4 mr-1" /> Сгенерировать трек
                        </Button>
                      )}
                      {gen.status === 'completed' && (
                        <>
                          <Button variant="outline" size="sm">
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {gen.status === 'failed' && (
                        <Button variant="outline" size="sm">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
