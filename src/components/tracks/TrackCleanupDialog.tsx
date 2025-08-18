import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle, Eye, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface CleanupSummary {
  total_tracks: number;
  tracks_without_audio: number;
  tracks_without_metadata: number;
  tracks_with_empty_titles: number;
  soft_deleted_tracks: number;
  old_incomplete_tracks: number;
}

interface CleanupResult {
  success: boolean;
  dry_run: boolean;
  summary: CleanupSummary;
  details: {
    tracks_to_cleanup: {
      soft_deleted: Array<{ id: string; title: string }>;
      old_incomplete: Array<{ id: string; title: string; created_at: string }>;
    }
  };
  deleted_count?: number;
  deleted_track_ids?: string[];
}

interface TrackCleanupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCleanupComplete?: () => void;
}

export function TrackCleanupDialog({ open, onOpenChange, onCleanupComplete }: TrackCleanupDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<CleanupResult | null>(null);
  const [cleaning, setCleaning] = useState(false);

  const runAnalysis = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-tracks', {
        body: { 
          userId: user.id,
          dryRun: true 
        }
      });

      if (error) throw error;

      setAnalysisResult(data);
      toast({
        title: "Анализ завершен",
        description: `Найдено ${data.summary.soft_deleted_tracks + data.summary.old_incomplete_tracks} треков для очистки`
      });
    } catch (error: any) {
      console.error('Cleanup analysis error:', error);
      toast({
        title: "Ошибка анализа",
        description: error.message || "Не удалось проанализировать треки",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const executeCleanup = async () => {
    if (!user || !analysisResult) return;

    setCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-tracks', {
        body: { 
          userId: user.id,
          dryRun: false 
        }
      });

      if (error) throw error;

      toast({
        title: "Очистка завершена",
        description: `Удалено ${data.deleted_count} треков`
      });

      onCleanupComplete?.();
      onOpenChange(false);
      setAnalysisResult(null);
    } catch (error: any) {
      console.error('Cleanup execution error:', error);
      toast({
        title: "Ошибка очистки",
        description: error.message || "Не удалось выполнить очистку",
        variant: "destructive"
      });
    } finally {
      setCleaning(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Очистка треков
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!analysisResult ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Анализ треков
                </CardTitle>
                <CardDescription>
                  Проверим ваши треки на наличие проблем и покажем что можно удалить
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={runAnalysis} disabled={loading} className="w-full">
                  {loading ? "Анализируем..." : "Запустить анализ"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Результаты анализа</CardTitle>
                  <CardDescription>
                    Найдены треки, которые можно безопасно удалить
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Всего треков</Badge>
                      <span className="font-semibold">{analysisResult.summary.total_tracks}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Без аудио</Badge>
                      <span>{analysisResult.summary.tracks_without_audio}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Удаленные</Badge>
                      <span>{analysisResult.summary.soft_deleted_tracks}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Старые неполные</Badge>
                      <span>{analysisResult.summary.old_incomplete_tracks}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {(analysisResult.details.tracks_to_cleanup.soft_deleted.length > 0 || 
                analysisResult.details.tracks_to_cleanup.old_incomplete.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Треки для удаления
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysisResult.details.tracks_to_cleanup.soft_deleted.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Помеченные как удаленные:</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {analysisResult.details.tracks_to_cleanup.soft_deleted.map(track => (
                            <div key={track.id} className="text-sm p-2 bg-muted rounded">
                              {track.title || 'Без названия'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysisResult.details.tracks_to_cleanup.old_incomplete.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Старые неполные треки:</h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {analysisResult.details.tracks_to_cleanup.old_incomplete.map(track => (
                            <div key={track.id} className="text-sm p-2 bg-muted rounded flex justify-between">
                              <span>{track.title || 'Без названия'}</span>
                              <span className="text-muted-foreground">{formatDate(track.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={executeCleanup} 
                        disabled={cleaning}
                        variant="destructive"
                        className="flex items-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        {cleaning ? "Удаляем..." : "Удалить треки"}
                      </Button>
                      <Button 
                        onClick={() => setAnalysisResult(null)} 
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Отмена
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {analysisResult.details.tracks_to_cleanup.soft_deleted.length === 0 && 
               analysisResult.details.tracks_to_cleanup.old_incomplete.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Check className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="text-lg font-medium">Всё чисто!</p>
                      <p className="text-muted-foreground">Проблемных треков не найдено</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}