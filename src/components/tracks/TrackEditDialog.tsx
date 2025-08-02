import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Save, Loader2, Clock, History } from "lucide-react";

interface Track {
  id: string;
  title: string;
  track_number: number;
  duration: number | null;
  lyrics: string | null;
  audio_url: string | null;
  current_version: number;
  metadata: any;
  created_at: string;
  updated_at: string;
  // T-051: Добавляем новые поля для ИИ генерации
  description?: string | null;
  genre_tags?: string[] | null;
  style_prompt?: string | null;
}

interface TrackEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track | null;
  onTrackUpdated: () => void;
}

export function TrackEditDialog({ open, onOpenChange, track, onTrackUpdated }: TrackEditDialogProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loadingAIData, setLoadingAIData] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    track_number: 1,
    duration: "",
    lyrics: "",
    change_description: "",
    // T-051: Добавляем поля для новых данных треков
    description: "",
    genre_tags: "",
    style_prompt: "",
  });

  useEffect(() => {
    if (track) {
      setFormData({
        title: track.title,
        track_number: track.track_number,
        duration: track.duration ? String(track.duration) : "",
        lyrics: track.lyrics || "",
        change_description: "",
        // T-051: Заполняем новые поля
        description: track.description || "",
        genre_tags: track.genre_tags ? track.genre_tags.join(", ") : "",
        style_prompt: track.style_prompt || "",
      });
      
      // Загружаем данные ИИ для этого трека
      loadAIGenerations(track.id);
    }
  }, [track]);

  // Загружаем данные ИИ генерации для трека
  const loadAIGenerations = async (trackId: string) => {
    setLoadingAIData(true);
    try {
      const { data, error } = await supabase
        .from('ai_generations')
        .select('*')
        .eq('track_id', trackId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Ищем последние версии каждого типа генерации
        const latestGenerations: Record<string, any> = {};
        
        data.forEach(item => {
          const parameters = item.parameters as any;
          const generationType = parameters?.generation_type;
          
          if (generationType && !latestGenerations[generationType]) {
            latestGenerations[generationType] = parameters.result;
          }
        });
        
        // Обновляем форму данными из ИИ, если поля пусты
        setFormData(prev => ({
          ...prev,
          lyrics: prev.lyrics || extractLyricsFromAI(latestGenerations.lyrics) || "",
          description: prev.description || extractDescriptionFromAI(latestGenerations.concept) || "",
        }));
      }
    } catch (error) {
      console.error('Error loading AI generations:', error);
    } finally {
      setLoadingAIData(false);
    }
  };

  // Извлекаем текст лирики из данных ИИ
  const extractLyricsFromAI = (lyricsData: any): string => {
    if (!lyricsData) return "";
    
    if (typeof lyricsData === 'string') return lyricsData;
    
    if (lyricsData?.improved_text) return lyricsData.improved_text;
    
    if (lyricsData?.song?.sections) {
      return lyricsData.song.sections.map((section: any) => 
        `${section.tag}\n${section.lyrics}`
      ).join('\n\n');
    }
    
    if (lyricsData?.lyrics) return lyricsData.lyrics;
    
    return "";
  };

  // Извлекаем описание из концепции ИИ
  const extractDescriptionFromAI = (conceptData: any): string => {
    if (!conceptData) return "";
    
    return conceptData?.DESCRIPTION || conceptData?.description || "";
  };

  const handleSave = async () => {
    if (!track || !user || !formData.title.trim()) return;

    setSaving(true);
    try {
      // Create new version in track_versions table
      const { error: versionError } = await supabase
        .from('track_versions')
        .insert({
          track_id: track.id,
          version_number: track.current_version + 1,
          audio_url: track.audio_url || '',
          change_description: formData.change_description || `Обновление трека: ${formData.title}`,
          metadata: {
            previous_title: track.title,
            previous_lyrics: track.lyrics,
            previous_duration: track.duration,
            updated_by: user.id,
            changes: {
              title_changed: track.title !== formData.title,
              lyrics_changed: track.lyrics !== formData.lyrics,
              duration_changed: track.duration !== (formData.duration ? parseInt(formData.duration) : null),
              track_number_changed: track.track_number !== formData.track_number,
            }
          }
        });

      if (versionError) throw versionError;

      // Update the main track record
      const { error: trackError } = await supabase
        .from('tracks')
        .update({
          title: formData.title,
          track_number: formData.track_number,
          duration: formData.duration ? parseInt(formData.duration) : null,
          lyrics: formData.lyrics || null,
          current_version: track.current_version + 1,
          // T-051: Обновляем новые поля
          description: formData.description || null,
          genre_tags: formData.genre_tags ? formData.genre_tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
          style_prompt: formData.style_prompt || null,
          metadata: {
            ...track.metadata,
            last_edited_by: user.id,
            edit_count: (track.metadata?.edit_count || 0) + 1,
            last_edit_description: formData.change_description
          }
        })
        .eq('id', track.id);

      if (trackError) throw trackError;

      toast({
        title: "Успешно",
        description: `Трек обновлен (версия ${track.current_version + 1})`,
      });

      onTrackUpdated();
      onOpenChange(false);
      setFormData({
        title: "",
        track_number: 1,
        duration: "",
        lyrics: "",
        change_description: "",
        // T-051: Сбрасываем новые поля
        description: "",
        genre_tags: "",
        style_prompt: "",
      });
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

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!track) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Редактировать трек
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Track info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Информация о версии
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAIData ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загружаем данные ИИ...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Текущая версия:</p>
                    <p className="text-muted-foreground">{track.current_version}</p>
                  </div>
                  <div>
                    <p className="font-medium">Последнее обновление:</p>
                    <p className="text-muted-foreground">
                      {new Date(track.updated_at).toLocaleString('ru-RU')}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Количество редактирований:</p>
                    <p className="text-muted-foreground">
                      {track.metadata?.edit_count || 0}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Текущая длительность:</p>
                    <p className="text-muted-foreground">
                      {track.duration ? formatDuration(track.duration) : 'Не указана'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Название трека</label>
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
                  min="1"
                  value={formData.track_number}
                  onChange={(e) => setFormData({ ...formData, track_number: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Длительность (секунды)</label>
              <Input
                type="number"
                min="0"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="Длительность в секундах"
              />
              {formData.duration && (
                <p className="text-xs text-muted-foreground mt-1">
                  Примерно: {formatDuration(parseInt(formData.duration) || 0)}
                </p>
              )}
            </div>

            {/* T-051: Добавляем новые поля */}
            <div>
              <label className="text-sm font-medium">Описание трека</label>
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
              <Textarea
                value={formData.lyrics}
                onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                placeholder="Введите текст песни..."
                rows={8}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Описание изменений</label>
              <Textarea
                value={formData.change_description}
                onChange={(e) => setFormData({ ...formData, change_description: e.target.value })}
                placeholder="Опишите что изменили в этой версии..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Это поможет отслеживать историю изменений
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Отмена
            </Button>
            
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saving || !formData.title.trim()}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Сохранить как версию {track.current_version + 1}
              </Button>
            </div>
          </div>

          {/* Changes preview */}
          {(track.title !== formData.title || 
            track.lyrics !== formData.lyrics || 
            String(track.duration || '') !== formData.duration ||
            track.track_number !== formData.track_number) && (
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-yellow-700 dark:text-yellow-300">
                  <History className="h-4 w-4" />
                  Предварительный просмотр изменений
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {track.title !== formData.title && (
                  <div>
                    <span className="font-medium">Название:</span>
                    <div className="ml-4">
                      <span className="text-red-600 line-through">{track.title}</span>
                      <span className="mx-2">→</span>
                      <span className="text-green-600">{formData.title}</span>
                    </div>
                  </div>
                )}
                {track.track_number !== formData.track_number && (
                  <div>
                    <span className="font-medium">Номер трека:</span>
                    <span className="ml-2 text-red-600 line-through">{track.track_number}</span>
                    <span className="mx-2">→</span>
                    <span className="text-green-600">{formData.track_number}</span>
                  </div>
                )}
                {String(track.duration || '') !== formData.duration && (
                  <div>
                    <span className="font-medium">Длительность:</span>
                    <span className="ml-2 text-red-600 line-through">
                      {track.duration ? formatDuration(track.duration) : 'Не указана'}
                    </span>
                    <span className="mx-2">→</span>
                    <span className="text-green-600">
                      {formData.duration ? formatDuration(parseInt(formData.duration)) : 'Не указана'}
                    </span>
                  </div>
                )}
                {track.lyrics !== formData.lyrics && (
                  <div>
                    <span className="font-medium">Текст:</span>
                    <span className="ml-2 text-muted-foreground">Изменен</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}