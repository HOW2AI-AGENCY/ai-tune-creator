import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Music, Plus, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MurekaExtensionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTrackExtended?: (trackData: any) => void;
}

export function MurekaExtensionDialog({ open, onOpenChange, onTrackExtended }: MurekaExtensionDialogProps) {
  const [sourceType, setSourceType] = useState<'song_id' | 'upload_audio_id'>('song_id');
  const [songId, setSongId] = useState('');
  const [uploadAudioId, setUploadAudioId] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [extendAt, setExtendAt] = useState(30000); // 30 seconds in milliseconds
  const [isExtending, setIsExtending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleExtend = async () => {
    if (!lyrics.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите текст для расширения",
        variant: "destructive"
      });
      return;
    }

    const sourceId = sourceType === 'song_id' ? songId : uploadAudioId;
    if (!sourceId.trim()) {
      toast({
        title: "Ошибка",
        description: sourceType === 'song_id' ? "Введите ID песни" : "Введите ID загруженного аудио",
        variant: "destructive"
      });
      return;
    }

    if (extendAt < 8000 || extendAt > 420000) {
      toast({
        title: "Ошибка",
        description: "Время расширения должно быть от 8 до 420 секунд",
        variant: "destructive"
      });
      return;
    }

    setIsExtending(true);
    try {
      const response = await supabase.functions.invoke('extend-mureka-song', {
        body: {
          [sourceType]: sourceId,
          lyrics,
          extend_at: extendAt
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Ошибка при обращении к API');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Ошибка расширения');
      }

      const { data } = response.data;
      setResult(data);

      toast({
        title: "Успешно!",
        description: "Задача расширения песни создана"
      });

      if (onTrackExtended) {
        onTrackExtended(data);
      }

    } catch (error: any) {
      console.error('Error extending song:', error);
      toast({
        title: "Ошибка",
        description: error.message || 'Произошла ошибка при расширении песни',
        variant: "destructive"
      });
    } finally {
      setIsExtending(false);
    }
  };

  const handleReset = () => {
    setSongId('');
    setUploadAudioId('');
    setLyrics('');
    setExtendAt(30000);
    setResult(null);
  };

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Расширение песни с Mureka AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Source Type Selection */}
          <div className="space-y-4">
            <Label>Источник аудио</Label>
            <Select value={sourceType} onValueChange={(value: 'song_id' | 'upload_audio_id') => setSourceType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="song_id">ID сгенерированной песни</SelectItem>
                <SelectItem value="upload_audio_id">ID загруженного файла</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Source ID Input */}
          <div className="space-y-2">
            <Label htmlFor="source-id">
              {sourceType === 'song_id' ? 'ID песни' : 'ID загруженного аудио'}
            </Label>
            <Input
              id="source-id"
              value={sourceType === 'song_id' ? songId : uploadAudioId}
              onChange={(e) => sourceType === 'song_id' ? setSongId(e.target.value) : setUploadAudioId(e.target.value)}
              placeholder={sourceType === 'song_id' ? "Введите ID песни..." : "Введите ID загруженного файла..."}
            />
            <p className="text-sm text-muted-foreground">
              {sourceType === 'song_id' 
                ? "ID песни, полученный при генерации" 
                : "ID файла, загруженного через files/upload API (только файлы младше месяца)"
              }
            </p>
          </div>

          {/* Extend At Time */}
          <div className="space-y-2">
            <Label htmlFor="extend-at">Время начала расширения (миллисекунды)</Label>
            <div className="flex gap-2 items-center">
              <Input
                id="extend-at"
                type="number"
                value={extendAt}
                onChange={(e) => setExtendAt(Number(e.target.value))}
                min={8000}
                max={420000}
                step={1000}
              />
              <span className="text-sm text-muted-foreground">
                ({formatTime(extendAt)})
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              От 8 до 420 секунд. Если больше длительности песни, будет использована длительность песни.
            </p>
          </div>

          {/* Lyrics Input */}
          <div className="space-y-2">
            <Label htmlFor="lyrics">Текст для расширения</Label>
            <Textarea
              id="lyrics"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="Введите текст, которым нужно продолжить песню..."
              className="min-h-32"
            />
          </div>

          {/* Extend Button */}
          <Button 
            onClick={handleExtend} 
            disabled={isExtending}
            className="w-full"
          >
            {isExtending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Создаём задачу расширения...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Расширить песню
              </>
            )}
          </Button>

          {/* Result */}
          {result && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="text-center">
                <h4 className="font-semibold text-green-600 mb-2">
                  ✅ Задача создана!
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  ID задачи: <code className="bg-background px-2 py-1 rounded">{result.id}</code>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Модель:</span> {result.model}
                </div>
                <div>
                  <span className="font-medium">Статус:</span> {result.status}
                </div>
                <div>
                  <span className="font-medium">Создано:</span> {new Date(result.created_at * 1000).toLocaleString('ru-RU')}
                </div>
                {result.finished_at && (
                  <div>
                    <span className="font-medium">Завершено:</span> {new Date(result.finished_at * 1000).toLocaleString('ru-RU')}
                  </div>
                )}
              </div>

              {result.failed_reason && (
                <div className="p-2 bg-destructive/10 border border-destructive/20 rounded">
                  <span className="text-sm text-destructive">
                    <strong>Ошибка:</strong> {result.failed_reason}
                  </span>
                </div>
              )}

              <Button variant="outline" onClick={handleReset} className="w-full">
                Создать новое расширение
              </Button>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>💡 <strong>Совет:</strong> Расширение начинается с указанного времени и продолжает песню в том же стиле</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}