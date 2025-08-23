import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { LyricsViewer } from "@/features/lyrics/components/LyricsViewer";
import { 
  Music, 
  Clock, 
  Hash, 
  FileText, 
  Brain,
  Calendar,
  User,
  Loader2,
  Eye,
  Play,
  History,
  Sparkles
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Track {
  id: string;
  title: string;
  track_number: number;
  duration?: number | null;
  lyrics?: string | null;
  audio_url?: string | null;
  current_version: number;
  description?: string | null;
  genre_tags?: string[] | null;
  style_prompt?: string | null;
  metadata?: any;
  created_at: string;
  updated_at: string;
  project_id: string;
  projects?: {
    title: string;
    artist_id: string;
    artists?: {
      name: string;
      avatar_url?: string;
    };
  };
}

interface TrackViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track | null;
}

export function TrackViewDialog({ open, onOpenChange, track }: TrackViewDialogProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [aiGenerations, setAiGenerations] = useState<any[]>([]);
  const [loadingAiHistory, setLoadingAiHistory] = useState(false);

  useEffect(() => {
    if (track && open) {
      loadAiHistory(track.id);
    }
  }, [track, open]);

  const loadAiHistory = async (trackId: string) => {
    try {
      setLoadingAiHistory(true);
      console.log('Loading AI history for track:', trackId);
      
      const { data, error } = await supabase
        .from('ai_generations')
        .select('*')
        .eq('track_id', trackId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('AI history query error:', error);
        throw error;
      }
      
      console.log('AI history loaded:', data);
      setAiGenerations(data || []);
    } catch (error: any) {
      console.error('Error loading AI history:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить историю ИИ генераций",
        variant: "destructive"
      });
    } finally {
      setLoadingAiHistory(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (duration: number) => {
    if (!duration) return '0:00';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано",
      description: "Текст скопирован в буфер обмена"
    });
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'lyrics':
        return <FileText className="h-4 w-4" />;
      case 'concept':
        return <Brain className="h-4 w-4" />;
      case 'analysis':
        return <Eye className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getServiceName = (service: string) => {
    switch (service) {
      case 'lyrics':
        return 'Генерация лирики';
      case 'concept':
        return 'Генерация концепции';
      case 'analysis':
        return 'Анализ лирики';
      case 'improvement':
        return 'Улучшение лирики';
      default:
        return service;
    }
  };

  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Просмотр трека
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with track info */}
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={track.projects?.artists?.avatar_url} alt={track.projects?.artists?.name} />
                  <AvatarFallback className="text-xs">
                    {track.projects?.artists?.name?.slice(0, 2).toUpperCase() || 'TR'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-semibold">{track.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {track.projects?.artists?.name} • {track.projects?.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Hash className="h-4 w-4" />
                  Трек #{track.track_number}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {track.duration ? formatDuration(track.duration) : 'Не указана'}
                </div>
                <div className="flex items-center gap-1">
                  <History className="h-4 w-4" />
                  Версия {track.current_version}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Основное</TabsTrigger>
              <TabsTrigger value="lyrics">Лирика</TabsTrigger>
              <TabsTrigger value="ai-history">ИИ История</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Информация о треке</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {track.description && (
                    <div>
                      <h4 className="font-medium mb-2">Описание</h4>
                      <p className="text-sm text-muted-foreground">{track.description}</p>
                    </div>
                  )}
                  
                  {track.genre_tags && track.genre_tags.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Жанры</h4>
                      <div className="flex flex-wrap gap-1">
                        {track.genre_tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {track.style_prompt && (
                    <div>
                      <h4 className="font-medium mb-2">Промпт стиля</h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {track.style_prompt}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <h4 className="font-medium">Создан</h4>
                      <p className="text-muted-foreground">{formatDate(track.created_at)}</p>
                    </div>
                    <div>
                      <h4 className="font-medium">Обновлен</h4>
                      <p className="text-muted-foreground">{formatDate(track.updated_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Lyrics Tab */}
            <TabsContent value="lyrics" className="space-y-4">
              <LyricsViewer 
                lyrics={track.lyrics || ""} 
                title={`${track.title} - Текст песни`}
                showStructurePanel={true}
              />
            </TabsContent>

            {/* AI History Tab */}
            <TabsContent value="ai-history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    История ИИ генераций
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingAiHistory ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : aiGenerations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>История ИИ генераций пуста</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiGenerations.map((generation) => (
                        <div key={generation.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getServiceIcon(generation.service)}
                              <span className="font-medium">{getServiceName(generation.service)}</span>
                              <Badge variant={generation.status === 'completed' ? 'default' : generation.status === 'error' ? 'destructive' : 'secondary'}>
                                {generation.status === 'completed' ? 'Завершено' : generation.status === 'error' ? 'Ошибка' : 'В процессе'}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(generation.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">{generation.prompt}</p>
                          
                          {generation.error_message && (
                            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                              {generation.error_message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}