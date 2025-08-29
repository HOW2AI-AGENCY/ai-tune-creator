import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Music, Play } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MurekaInstrumentalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstrumentalGenerated?: (instrumentalData: any) => void;
}

export function MurekaInstrumentalDialog({ open, onOpenChange, onInstrumentalGenerated }: MurekaInstrumentalDialogProps) {
  const [model, setModel] = useState<'auto' | 'mureka-6' | 'mureka-7'>('auto');
  const [inputType, setInputType] = useState<'prompt' | 'instrumental_id'>('prompt');
  const [prompt, setPrompt] = useState('');
  const [instrumentalId, setInstrumentalId] = useState('');
  const [stream, setStream] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const modelDescriptions = {
    'auto': 'Автоматически выбрать лучшую модель',
    'mureka-6': 'Mureka-6 - стабильная модель',
    'mureka-7': 'Mureka-7 - улучшенная модель'
  };

  const handleGenerate = async () => {
    const inputValue = inputType === 'prompt' ? prompt : instrumentalId;
    if (!inputValue.trim()) {
      toast({
        title: "Ошибка",
        description: inputType === 'prompt' ? "Введите промпт для генерации" : "Введите ID инструментала",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-mureka-instrumental', {
        body: {
          model,
          [inputType]: inputValue,
          stream
        }
      });

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
        description: "Задача генерации инструментала создана"
      });

      if (onInstrumentalGenerated) {
        onInstrumentalGenerated(data);
      }

    } catch (error: any) {
      console.error('Error generating instrumental:', error);
      toast({
        title: "Ошибка",
        description: error.message || 'Произошла ошибка при генерации инструментала',
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setPrompt('');
    setInstrumentalId('');
    setResult(null);
    setModel('auto');
    setInputType('prompt');
    setStream(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Генерация инструментала с Mureka AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">Модель</Label>
            <Select value={model} onValueChange={(value: 'auto' | 'mureka-6' | 'mureka-7') => setModel(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (рекомендуется)</SelectItem>
                <SelectItem value="mureka-6">Mureka-6</SelectItem>
                <SelectItem value="mureka-7">Mureka-7</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {modelDescriptions[model]}
            </p>
          </div>

          {/* Input Type Selection */}
          <div className="space-y-4">
            <Label>Тип ввода</Label>
            <Select value={inputType} onValueChange={(value: 'prompt' | 'instrumental_id') => setInputType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prompt">Текстовый промпт</SelectItem>
                <SelectItem value="instrumental_id">ID референсного инструментала</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Input Field */}
          {inputType === 'prompt' ? (
            <div className="space-y-2">
              <Label htmlFor="prompt">Промпт для генерации</Label>
              <Input
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="r&b, slow, passionate, instrumental"
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground">
                Опишите желаемый стиль, жанр, настроение инструментала
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="instrumental-id">ID референсного инструментала</Label>
              <Input
                id="instrumental-id"
                value={instrumentalId}
                onChange={(e) => setInstrumentalId(e.target.value)}
                placeholder="Введите ID инструментала..."
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground">
                ID инструментала, загруженного через files/upload API
              </p>
            </div>
          )}

          {/* Streaming Option */}
          <div className="flex items-center space-x-2">
            <Switch
              id="stream"
              checked={stream}
              onCheckedChange={setStream}
            />
            <Label htmlFor="stream">Включить потоковое воспроизведение</Label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            Позволяет воспроизводить инструментал во время генерации
          </p>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Создаём инструментал...
              </>
            ) : (
              <>
                <Music className="h-4 w-4 mr-2" />
                Сгенерировать инструментал
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
                  <span className="font-medium">Потоковое:</span> {stream ? 'Да' : 'Нет'}
                </div>
                <div>
                  <span className="font-medium">Создано:</span> {new Date(result.created_at * 1000).toLocaleString('ru-RU')}
                </div>
              </div>

              {result.failed_reason && (
                <div className="p-2 bg-destructive/10 border border-destructive/20 rounded">
                  <span className="text-sm text-destructive">
                    <strong>Ошибка:</strong> {result.failed_reason}
                  </span>
                </div>
              )}

              {result.choices && result.choices.length > 0 && (
                <div className="space-y-2">
                  <Label>Результаты</Label>
                  {result.choices.map((choice: any, index: number) => (
                    <div key={index} className="p-2 bg-background border rounded">
                      {choice.title && <div className="font-medium">{choice.title}</div>}
                      <div className="text-sm text-muted-foreground">
                        Длительность: {choice.duration} сек
                      </div>
                      {choice.audio_url && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => window.open(choice.audio_url, '_blank', 'noopener,noreferrer')}
                          className="mt-2"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Воспроизвести
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Button variant="outline" onClick={handleReset} className="w-full">
                Создать новый инструментал
              </Button>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            <p>💡 <strong>Совет:</strong> Для лучших результатов используйте детальные описания стиля и настроения</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}