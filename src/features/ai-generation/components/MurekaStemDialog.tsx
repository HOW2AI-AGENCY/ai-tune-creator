import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Music, Download, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MurekaStemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MurekaStemDialog({ open, onOpenChange }: MurekaStemDialogProps) {
  const [audioUrl, setAudioUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ zip_url: string; expires_at: number } | null>(null);
  const { toast } = useToast();

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return url.includes('mp3') || url.includes('wav') || url.includes('m4a') || url.includes('audio');
    } catch {
      return false;
    }
  };

  const handleSeparate = async () => {
    if (!audioUrl.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите URL аудио файла",
        variant: "destructive"
      });
      return;
    }

    if (!isValidUrl(audioUrl)) {
      toast({
        title: "Ошибка",
        description: "Введите корректный URL аудио файла",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await supabase.functions.invoke('mureka-stem-separation', {
        body: { url: audioUrl }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Ошибка при обращении к API');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Ошибка разделения');
      }

      const { data } = response.data;
      setResult(data);

      toast({
        title: "Успешно!",
        description: "Аудио файл разделен на дорожки"
      });

    } catch (error: any) {
      console.error('Error separating stems:', error);
      toast({
        title: "Ошибка",
        description: error.message || 'Произошла ошибка при разделении аудио',
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (result?.zip_url) {
      window.open(result.zip_url, '_blank');
    }
  };

  const formatExpirationDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString('ru-RU');
  };

  const handleReset = () => {
    setAudioUrl('');
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Разделение аудио на дорожки
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="audio-url">URL аудио файла</Label>
              <Input
                id="audio-url"
                value={audioUrl}
                onChange={(e) => setAudioUrl(e.target.value)}
                placeholder="https://example.com/song.mp3"
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Поддерживаются форматы: MP3, WAV, M4A (максимум 10 МБ)
              </p>
            </div>
          </div>

          {/* Process Button */}
          <Button 
            onClick={handleSeparate} 
            disabled={isProcessing || !audioUrl.trim()}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Обрабатываем аудио...
              </>
            ) : (
              <>
                <Music className="h-4 w-4 mr-2" />
                Разделить на дорожки
              </>
            )}
          </Button>

          {/* Result */}
          {result && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <div className="text-center">
                <h4 className="font-semibold text-green-600 mb-2">
                  ✅ Разделение завершено!
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Файл содержит отдельные дорожки: вокал, инструменты, барабаны и другие элементы
                </p>
              </div>

              <div className="space-y-2">
                <Button onClick={handleDownload} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Скачать ZIP архив
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={() => window.open(result.zip_url, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Открыть в браузере
                </Button>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Ссылка действительна до: {formatExpirationDate(result.expires_at)}
              </div>

              <Button variant="outline" onClick={handleReset} className="w-full">
                Обработать другой файл
              </Button>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>💡 <strong>Совет:</strong> Для лучшего качества используйте файлы в высоком разрешении (320 kbps или выше)</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}