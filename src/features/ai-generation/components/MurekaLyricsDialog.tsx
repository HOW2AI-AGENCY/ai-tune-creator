import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MurekaLyricsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLyricsGenerated?: (lyrics: string, title: string) => void;
}

export function MurekaLyricsDialog({ open, onOpenChange, onLyricsGenerated }: MurekaLyricsDialogProps) {
  const [prompt, setPrompt] = useState('');
  const [existingLyrics, setExistingLyrics] = useState('');
  const [mode, setMode] = useState<'generate' | 'extend'>('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ title?: string; lyrics: string } | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (mode === 'generate' && !prompt.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите промпт для генерации текста",
        variant: "destructive"
      });
      return;
    }

    if (mode === 'extend' && !existingLyrics.trim()) {
      toast({
        title: "Ошибка", 
        description: "Введите существующий текст для продолжения",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      let response;
      
      if (mode === 'generate') {
        response = await supabase.functions.invoke('generate-mureka-lyrics', {
          body: { prompt }
        });
      } else {
        response = await supabase.functions.invoke('extend-mureka-lyrics', {
          body: { lyrics: existingLyrics }
        });
      }

      if (response.error) {
        throw new Error(response.error.message || 'Ошибка при обращении к API');
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Ошибка генерации');
      }

      const { data } = response.data;
      setResult(data);

      toast({
        title: "Успешно!",
        description: mode === 'generate' 
          ? "Текст песни сгенерирован" 
          : "Текст песни продолжен"
      });

      if (onLyricsGenerated) {
        onLyricsGenerated(data.lyrics, data.title || '');
      }

    } catch (error: any) {
      console.error('Error generating lyrics:', error);
      toast({
        title: "Ошибка",
        description: error.message || 'Произошла ошибка при генерации текста',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseResult = () => {
    if (result && onLyricsGenerated) {
      onLyricsGenerated(result.lyrics, result.title || '');
      onOpenChange(false);
    }
  };

  const handleReset = () => {
    setPrompt('');
    setExistingLyrics('');
    setResult(null);
    setMode('generate');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Генерация текста с Mureka AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Selection */}
          <div className="flex gap-2">
            <Button
              variant={mode === 'generate' ? 'default' : 'outline'}
              onClick={() => setMode('generate')}
              className="flex-1"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Создать новый
            </Button>
            <Button
              variant={mode === 'extend' ? 'default' : 'outline'}
              onClick={() => setMode('extend')}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Продолжить существующий
            </Button>
          </div>

          {/* Generate Mode */}
          {mode === 'generate' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="prompt">Промпт для генерации</Label>
                <Input
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Например: Embrace of Night"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Extend Mode */}
          {mode === 'extend' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="existing-lyrics">Существующий текст</Label>
                <Textarea
                  id="existing-lyrics"
                  value={existingLyrics}
                  onChange={(e) => setExistingLyrics(e.target.value)}
                  placeholder="Введите существующий текст песни..."
                  className="mt-1 min-h-32"
                />
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {mode === 'generate' ? 'Генерируем...' : 'Продолжаем...'}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {mode === 'generate' ? 'Сгенерировать текст' : 'Продолжить текст'}
              </>
            )}
          </Button>

          {/* Result */}
          {result && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              {result.title && (
                <div>
                  <Label>Заголовок</Label>
                  <div className="mt-1 p-2 bg-background border rounded font-medium">
                    {result.title}
                  </div>
                </div>
              )}
              
              <div>
                <Label>Сгенерированный текст</Label>
                <Textarea
                  value={result.lyrics}
                  readOnly
                  className="mt-1 min-h-32 bg-background"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleUseResult} className="flex-1">
                  Использовать результат
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  Начать заново
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}