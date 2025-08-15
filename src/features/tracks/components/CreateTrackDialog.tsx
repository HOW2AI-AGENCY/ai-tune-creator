import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrackGenerationDialog } from "@/features/tracks/components/TrackGenerationDialog";
import { LyricsEditor } from "@/features/lyrics/components/LyricsEditor";
import { Save, Loader2, Sparkles, Music, Plus } from "lucide-react";

interface CreateTrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  artistInfo?: any;
  projectInfo?: any;
  onTrackCreated: () => void;
  nextTrackNumber?: number;
}

export function CreateTrackDialog({ 
  open, 
  onOpenChange, 
  projectId,
  artistInfo,
  projectInfo,
  onTrackCreated,
  nextTrackNumber = 1
}: CreateTrackDialogProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showAIGeneration, setShowAIGeneration] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    track_number: nextTrackNumber,
    duration: "",
    lyrics: "",
    description: "",
    genre_tags: "",
    style_prompt: "",
  });

  const resetForm = () => {
    setFormData({
      title: "",
      track_number: nextTrackNumber,
      duration: "",
      lyrics: "",
      description: "",
      genre_tags: "",
      style_prompt: "",
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Ошибка",
        description: "Название трека обязательно",
        variant: "destructive"
      });
      return;
    }

    try {
      setSaving(true);

      const trackData = {
        title: formData.title,
        track_number: formData.track_number,
        duration: formData.duration ? parseInt(formData.duration) : null,
        lyrics: formData.lyrics || null,
        description: formData.description || null,
        genre_tags: formData.genre_tags ? formData.genre_tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
        style_prompt: formData.style_prompt || null,
        project_id: projectId,
        current_version: 1,
        metadata: {
          created_by: user?.id,
          creation_method: 'manual'
        }
      };

      const { data, error } = await supabase
        .from('tracks')
        .insert(trackData)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Трек создан"
      });

      resetForm();
      onTrackCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating track:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось создать трек",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAIGeneration = (type: 'lyrics' | 'concept' | 'description', data: any) => {
    if (type === 'lyrics' && data.lyrics) {
      setFormData(prev => ({ ...prev, lyrics: data.lyrics }));
    } else if (type === 'concept') {
      // Заполняем поля из концепции
      if (data.title_suggestions && data.title_suggestions.length > 0 && !formData.title) {
        setFormData(prev => ({ ...prev, title: data.title_suggestions[0] }));
      }
      if (data.description) {
        setFormData(prev => ({ ...prev, description: data.description }));
      }
      if (data.lyrical_themes && data.lyrical_themes.length > 0) {
        setFormData(prev => ({ 
          ...prev, 
          genre_tags: data.lyrical_themes.join(', ') 
        }));
      }
    }
    setShowAIGeneration(false);
    toast({
      title: "Успешно",
      description: "Данные из ИИ применены к форме"
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Создать новый трек
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Основное</TabsTrigger>
              <TabsTrigger value="lyrics">Лирика</TabsTrigger>
              <TabsTrigger value="ai">ИИ помощь</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Название трека *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Введите название трека"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Номер трека</label>
                  <Input
                    type="number"
                    value={formData.track_number}
                    onChange={(e) => setFormData({ ...formData, track_number: parseInt(e.target.value) || 1 })}
                    min="1"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Описание</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Краткое описание трека..."
                  rows={2}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Жанры</label>
                <Input
                  value={formData.genre_tags}
                  onChange={(e) => setFormData({ ...formData, genre_tags: e.target.value })}
                  placeholder="pop, rock, electronic (через запятую)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Укажите жанры через запятую
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Длительность (секунды)</label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="180"
                  min="1"
                />
              </div>
            </TabsContent>

            <TabsContent value="lyrics" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Промпт стиля (для ИИ)</label>
                <Textarea
                  value={formData.style_prompt}
                  onChange={(e) => setFormData({ ...formData, style_prompt: e.target.value })}
                  placeholder="Энергичная поп-песня с элементами рока, яркие эмоции..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Опишите стиль и настроение для генерации ИИ
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Текст песни</label>
                <LyricsEditor
                  value={formData.lyrics}
                  onChange={(lyrics) => setFormData({ ...formData, lyrics })}
                  trackTitle={formData.title || 'Новый трек'}
                  showSidebar={false}
                  className="border rounded-md"
                  autoSave={false}
                  onSave={async (lyrics) => {
                    // Для новых треков автосохранение отключено
                    // Пользователь должен сначала создать трек
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5" />
                    ИИ помощник
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Используйте ИИ для генерации лирики, концепции трека или отдельных элементов
                  </p>
                  
                  {/* Контекст */}
                  {(artistInfo?.name || projectInfo?.title) && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="text-sm font-medium mb-2">Контекст проекта:</p>
                      {artistInfo?.name && (
                        <Badge variant="outline" className="mr-2">
                          Артист: {artistInfo.name}
                        </Badge>
                      )}
                      {projectInfo?.title && (
                        <Badge variant="outline">
                          Проект: {projectInfo.title}
                        </Badge>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={() => setShowAIGeneration(true)}
                    className="w-full gap-2"
                    variant="outline"
                  >
                    <Sparkles className="h-4 w-4" />
                    Открыть ИИ генератор
                  </Button>

                  <div className="text-xs text-muted-foreground">
                    <p>• Генерируйте лирику на основе стиля и контекста</p>
                    <p>• Создавайте концепцию трека с предложениями названий</p>
                    <p>• Получайте рекомендации по жанрам и настроению</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !formData.title.trim()}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Создать трек
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ИИ генерация */}
      <TrackGenerationDialog
        open={showAIGeneration}
        onOpenChange={setShowAIGeneration}
        onGenerated={handleAIGeneration}
        artistInfo={artistInfo}
        projectInfo={projectInfo}
        existingTrackData={{
          stylePrompt: formData.style_prompt,
          genreTags: formData.genre_tags.split(',').map(tag => tag.trim()).filter(tag => tag),
          lyrics: formData.lyrics
        }}
      />
    </>
  );
}