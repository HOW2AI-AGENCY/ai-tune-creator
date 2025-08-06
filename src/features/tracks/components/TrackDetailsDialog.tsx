import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrackVersionsDialog } from "./TrackVersionsDialog";
import { TrackGenerationDialog } from "./TrackGenerationDialog";
import { LyricsEditor } from "@/features/lyrics/components/LyricsEditor";
import { 
  Music, 
  Edit, 
  History, 
  Sparkles, 
  Clock, 
  Hash, 
  FileText, 
  Brain,
  Save,
  Copy,
  Calendar,
  User,
  Loader2,
  Eye,
  Play
} from "lucide-react";

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
  project?: {
    title: string;
    artist: {
      name: string;
      avatar_url?: string;
    };
  };
}

interface TrackDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track | null;
  onTrackUpdated: () => void;
}

export function TrackDetailsDialog({ open, onOpenChange, track, onTrackUpdated }: TrackDetailsDialogProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiGenerations, setAiGenerations] = useState<any[]>([]);
  const [loadingAiHistory, setLoadingAiHistory] = useState(false);
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false);
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    genre_tags: "",
    style_prompt: "",
    lyrics: ""
  });

  useEffect(() => {
    if (track) {
      setFormData({
        title: track.title,
        description: track.description || "",
        genre_tags: track.genre_tags ? track.genre_tags.join(", ") : "",
        style_prompt: track.style_prompt || "",
        lyrics: track.lyrics || ""
      });
      setEditing(false);
      loadAiHistory(track.id);
    }
  }, [track]);

  const loadAiHistory = async (trackId: string) => {
    try {
      setLoadingAiHistory(true);
      const { data, error } = await supabase
        .from('ai_generations')
        .select('*')
        .eq('track_id', trackId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAiGenerations(data || []);
    } catch (error) {
      console.error('Error loading AI history:', error);
    } finally {
      setLoadingAiHistory(false);
    }
  };

  const handleSave = async () => {
    if (!track || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('tracks')
        .update({
          title: formData.title,
          description: formData.description || null,
          genre_tags: formData.genre_tags ? formData.genre_tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
          style_prompt: formData.style_prompt || null,
          lyrics: formData.lyrics || null,
          metadata: {
            ...track.metadata,
            last_edited_by: user.id,
            last_manual_edit: new Date().toISOString()
          }
        })
        .eq('id', track.id);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Трек обновлен",
      });

      setEditing(false);
      onTrackUpdated();
    } catch (error: any) {
      console.error('Error updating track:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить трек",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Детали трека
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Header with track info */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={track.project?.artist.avatar_url} alt={track.project?.artist.name} />
                    <AvatarFallback className="text-xs">
                      {track.project?.artist.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-xl font-semibold">{track.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {track.project?.artist.name} • {track.project?.title}
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
              
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setVersionsDialogOpen(true)}
                >
                  <History className="h-4 w-4 mr-2" />
                  История версий
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setGenerationDialogOpen(true)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  ИИ Генерация
                </Button>
              </div>
            </div>

            <Separator />

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Основное</TabsTrigger>
                <TabsTrigger value="lyrics">Лирика</TabsTrigger>
                <TabsTrigger value="ai-history">ИИ История</TabsTrigger>
                <TabsTrigger value="versions">Версии</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Информация о треке</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(!editing)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {editing ? 'Отмена' : 'Редактировать'}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {editing ? (
                      <>
                        <div>
                          <label className="text-sm font-medium">Название</label>
                          <Input
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Описание</label>
                          <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Жанры</label>
                          <Input
                            value={formData.genre_tags}
                            onChange={(e) => setFormData({ ...formData, genre_tags: e.target.value })}
                            placeholder="pop, rock, electronic"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Промпт стиля</label>
                          <Textarea
                            value={formData.style_prompt}
                            onChange={(e) => setFormData({ ...formData, style_prompt: e.target.value })}
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Save className="h-4 w-4 mr-2" />
                            )}
                            Сохранить
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
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
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Lyrics Tab */}
              <TabsContent value="lyrics" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Текст песни</CardTitle>
                    <div className="flex gap-2">
                      {track.lyrics && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(track.lyrics!)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Копировать
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(!editing)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        {editing ? 'Отмена' : 'Редактировать'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {editing ? (
                      <div className="space-y-4">
                        <LyricsEditor
                          value={formData.lyrics}
                          onChange={(lyrics) => setFormData({ ...formData, lyrics })}
                          trackTitle={track.title}
                          onSave={async () => { await handleSave(); }}
                          autoSave={false}
                          className="border rounded-md"
                        />
                        <Button onClick={handleSave} disabled={saving}>
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Сохранить
                        </Button>
                      </div>
                    ) : (
                      <div>
                        {track.lyrics ? (
                          <pre className="whitespace-pre-wrap text-sm bg-muted/50 p-4 rounded-lg max-h-96 overflow-y-auto">
                            {track.lyrics}
                          </pre>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Текст песни не добавлен</p>
                            <Button
                              variant="outline"
                              className="mt-2"
                              onClick={() => setEditing(true)}
                            >
                              Добавить текст
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AI History Tab */}
              <TabsContent value="ai-history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>История ИИ генерации</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingAiHistory ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : aiGenerations.length > 0 ? (
                      <ScrollArea className="h-96">
                        <div className="space-y-4">
                          {aiGenerations.map((generation) => (
                            <Card key={generation.id} className="border-l-4 border-l-primary/50">
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {getServiceIcon(generation.service)}
                                    <span className="font-medium">
                                      {getServiceName(generation.service)}
                                    </span>
                                    <Badge
                                      variant={generation.status === 'completed' ? 'default' : 
                                               generation.status === 'pending' ? 'secondary' : 'destructive'}
                                    >
                                      {generation.status}
                                    </Badge>
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(generation.created_at)}
                                  </span>
                                </div>
                                
                                {generation.prompt && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {generation.prompt}
                                  </p>
                                )}
                                
                                {generation.parameters?.result && (
                                  <div className="bg-muted/50 p-3 rounded-lg text-sm">
                                    <pre className="whitespace-pre-wrap">
                                      {typeof generation.parameters.result === 'string' 
                                        ? generation.parameters.result 
                                        : JSON.stringify(generation.parameters.result, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                
                                {generation.error_message && (
                                  <p className="text-sm text-destructive mt-2">
                                    Ошибка: {generation.error_message}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>История ИИ генерации пуста</p>
                        <p className="text-sm mt-2">
                          Используйте ИИ генерацию для создания контента
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Versions Tab */}
              <TabsContent value="versions" className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Используйте кнопку "История версий" для просмотра</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <TrackVersionsDialog
        open={versionsDialogOpen}
        onOpenChange={setVersionsDialogOpen}
        trackId={track?.id}
        trackTitle={track?.title}
      />

      <TrackGenerationDialog
        open={generationDialogOpen}
        onOpenChange={setGenerationDialogOpen}
        onGenerated={(type, data) => {
          // Обновляем AI историю
          loadAiHistory(track.id);
        }}
        artistInfo={track.project?.artist}
        projectInfo={track.project}
        existingTrackData={{
          stylePrompt: track.style_prompt || undefined,
          genreTags: track.genre_tags || undefined,
          lyrics: track.lyrics || undefined
        }}
      />
    </>
  );
}