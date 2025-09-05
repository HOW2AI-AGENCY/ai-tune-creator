/**
 * Simplified Generation Panel - легковесный fallback для генерации
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Music } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GenerationParams } from '@/features/ai-generation/types';

interface SimplifiedGenerationPanelProps {
  onGenerate: (params: GenerationParams) => void;
  isGenerating?: boolean;
  className?: string;
}

export function SimplifiedGenerationPanel({ 
  onGenerate, 
  isGenerating = false,
  className = "" 
}: SimplifiedGenerationPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [service, setService] = useState<'suno' | 'mureka'>('suno');
  const [inputType, setInputType] = useState<'description' | 'lyrics'>('description');
  const [instrumental, setInstrumental] = useState(false);
  const { toast } = useToast();

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: "Введите описание",
        description: "Опишите музыку, которую хотите создать",
        variant: "destructive"
      });
      return;
    }

    const params: GenerationParams = {
      prompt: prompt.trim(),
      service,
      inputType,
      mode: 'quick',
      instrumental,
      useInbox: true,
      language: 'ru'
    };

    onGenerate(params);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Быстрая генерация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Service Selection */}
          <div>
            <Label className="text-xs text-muted-foreground">AI Сервис</Label>
            <Select value={service} onValueChange={(v) => setService(v as 'suno' | 'mureka')}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suno">Suno AI</SelectItem>
                <SelectItem value="mureka">Mureka</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Input Type */}
          <div>
            <Label className="text-xs text-muted-foreground">Тип ввода</Label>
            <Select value={inputType} onValueChange={(v) => setInputType(v as 'description' | 'lyrics')}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="description">Описание стиля</SelectItem>
                <SelectItem value="lyrics">Готовая лирика</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Main Input */}
          <div>
            <Label className="text-xs text-muted-foreground">
              {inputType === 'description' ? 'Описание музыки' : 'Текст песни'}
            </Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                inputType === 'description' 
                  ? "Опишите стиль, жанр и настроение музыки..."
                  : "Введите текст песни..."
              }
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Instrumental Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="instrumental"
              checked={instrumental}
              onCheckedChange={setInstrumental}
            />
            <Label htmlFor="instrumental" className="text-xs text-muted-foreground">
              Только инструментал
            </Label>
          </div>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Music className="h-4 w-4 mr-2 animate-pulse" />
                Создаем...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Создать музыку
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}