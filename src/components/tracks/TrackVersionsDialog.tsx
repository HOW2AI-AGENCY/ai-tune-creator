import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { History, Clock, User, ArrowLeft, Loader2 } from "lucide-react";

interface TrackVersion {
  id: string;
  version_number: number;
  audio_url: string;
  change_description: string | null;
  metadata: any;
  created_at: string;
}

interface TrackVersionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  trackTitle: string;
}

export function TrackVersionsDialog({ open, onOpenChange, trackId, trackTitle }: TrackVersionsDialogProps) {
  const [versions, setVersions] = useState<TrackVersion[]>([]);
  const [loading, setLoading] = useState(false);

  const loadVersions = async () => {
    if (!trackId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('track_versions')
        .select('*')
        .eq('track_id', trackId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error: any) {
      console.error('Error loading versions:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить историю версий",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && trackId) {
      loadVersions();
    }
  }, [open, trackId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            История версий: {trackTitle}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Загрузка истории...</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">История версий не найдена</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version, index) => (
                <Card key={version.id} className={index === 0 ? "border-primary" : ""}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Badge variant={index === 0 ? "default" : "secondary"}>
                          Версия {version.version_number}
                        </Badge>
                        {index === 0 && (
                          <Badge variant="outline">Текущая</Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatDate(version.created_at)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {version.change_description && (
                      <p className="text-sm mb-3">{version.change_description}</p>
                    )}
                    
                    {version.metadata && (
                      <div className="space-y-2">
                        {version.metadata.changes && (
                          <div className="text-sm">
                            <span className="font-medium">Изменения:</span>
                            <ul className="ml-4 mt-1 space-y-1">
                              {version.metadata.changes.title_changed && (
                                <li>• Изменено название</li>
                              )}
                              {version.metadata.changes.lyrics_changed && (
                                <li>• Изменен текст</li>
                              )}
                              {version.metadata.changes.duration_changed && (
                                <li>• Изменена длительность</li>
                              )}
                              {version.metadata.changes.track_number_changed && (
                                <li>• Изменен номер трека</li>
                              )}
                            </ul>
                          </div>
                        )}
                        
                        {version.metadata.previous_title && (
                          <div className="text-sm">
                            <span className="font-medium">Предыдущее название:</span>
                            <span className="ml-2 text-muted-foreground">{version.metadata.previous_title}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}