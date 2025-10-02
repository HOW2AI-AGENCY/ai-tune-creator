/**
 * Dynamic Generation Form
 * 
 * Упрощенная адаптивная форма генерации музыки, совместимая с API Suno и Mureka
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Sparkles, 
  Music2, 
  FileText, 
  Settings, 
  Mic,
  Volume2,
  Languages,
  Info,
  Zap,
  Timer
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CanonicalGenerationInput } from "../types/canonical";
import { AIServiceStatusPanel } from "./AIServiceStatusPanel";
import DOMPurify from 'dompurify';

interface DynamicGenerationFormProps {
  onGenerate: (input: CanonicalGenerationInput) => void;
  isGenerating: boolean;
  className?: string;
}

export function DynamicGenerationForm({ 
  onGenerate, 
  isGenerating,
  className 
}: DynamicGenerationFormProps) {
  // Service selection
  const [selectedService, setSelectedService] = useState<'suno' | 'mureka'>('suno');
  
  // Common fields
  const [inputType, setInputType] = useState<'description' | 'lyrics'>('description');
  const [description, setDescription] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [language, setLanguage] = useState('auto');
  
  // Suno-specific
  const [sunoModel, setSunoModel] = useState('V3_5');
  const [sunoMode, setSunoMode] = useState<'quick' | 'custom'>('custom');
  const [style, setStyle] = useState('');
  const [voiceStyle, setVoiceStyle] = useState('');
  const [tempo, setTempo] = useState('');
  
  // Mureka-specific
  const [murekaModel, setMurekaModel] = useState('V7');
  const [duration, setDuration] = useState(120);
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [murekaTempo, setMurekaTempo] = useState('');
  
  const { toast } = useToast();

  // Sanitize input
  const sanitizeInput = (input: string): string => {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    }).trim();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const mainContent = inputType === 'description' ? description : lyrics;
    const sanitizedContent = sanitizeInput(mainContent);
    
    if (!sanitizedContent || sanitizedContent.length < 10) {
      toast({
        title: "Ошибка валидации",
        description: "Минимум 10 символов в основном поле",
        variant: "destructive"
      });
      return;
    }

    if (selectedService === 'suno') {
      const tags = style ? style.split(',').map(t => t.trim()).filter(Boolean) : [];
      
      const canonicalInput: CanonicalGenerationInput = {
        service: 'suno',
        inputType,
        description: inputType === 'description' ? sanitizedContent : (style || 'Create music'),
        lyrics: inputType === 'lyrics' ? sanitizeInput(lyrics) : undefined,
        tags,
        mode: sunoMode,
        flags: {
          instrumental,
          language,
          voiceStyle: voiceStyle || undefined,
          tempo: tempo || undefined,
          model: sunoModel === 'auto' ? undefined : sunoModel,
        },
        context: {
          projectId: null,
          artistId: null,
          useInbox: true
        }
      };

      console.log('📤 Suno Generation Request:', canonicalInput);
      onGenerate(canonicalInput);
      
    } else {
      const tags = [genre, mood].filter(Boolean);
      
      const canonicalInput: CanonicalGenerationInput = {
        service: 'mureka',
        inputType,
        description: inputType === 'description' ? sanitizedContent : `Create music for: ${sanitizedContent.slice(0, 50)}...`,
        lyrics: inputType === 'lyrics' ? sanitizeInput(lyrics) : undefined,
        tags,
        mode: 'custom',
        flags: {
          instrumental,
          language,
          tempo: murekaTempo || undefined,
          duration,
          model: murekaModel === 'auto' ? undefined : murekaModel,
        },
        context: {
          projectId: null,
          artistId: null,
          useInbox: true
        }
      };

      console.log('📤 Mureka Generation Request:', canonicalInput);
      onGenerate(canonicalInput);
    }
  };

  const currentModel = selectedService === 'suno' ? sunoModel : murekaModel;

  return (
    <Card className={className}>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Генерация музыки
            </CardTitle>
            <CardDescription>
              Создайте уникальную музыку с помощью AI
            </CardDescription>
          </div>
        </div>

        {/* Service Selector */}
        <Tabs value={selectedService} onValueChange={(v) => setSelectedService(v as 'suno' | 'mureka')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="suno" className="flex items-center gap-2">
              <Music2 className="h-4 w-4" />
              Suno AI
            </TabsTrigger>
            <TabsTrigger value="mureka" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Mureka
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Service Status */}
        <AIServiceStatusPanel compact />
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Input Type Selection */}
          <div className="space-y-2">
            <Label>Тип ввода</Label>
            <Select value={inputType} onValueChange={(v) => setInputType(v as 'description' | 'lyrics')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="description">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Описание трека
                  </div>
                </SelectItem>
                <SelectItem value="lyrics">
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4" />
                    Текст песни
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {inputType === 'description' 
                ? 'Опишите желаемый стиль и настроение музыки'
                : 'Введите текст песни для генерации музыки'
              }
            </p>
          </div>

          {/* Main Input Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{inputType === 'description' ? 'Описание' : 'Текст песни'}</Label>
              <Badge variant="outline" className="text-xs">
                {(inputType === 'description' ? description : lyrics).length} / 3000
              </Badge>
            </div>
            <Textarea
              value={inputType === 'description' ? description : lyrics}
              onChange={(e) => inputType === 'description' ? setDescription(e.target.value) : setLyrics(e.target.value)}
              placeholder={
                inputType === 'description'
                  ? "Энергичный рок трек с яркими гитарными риффами и мощным вокалом..."
                  : "Verse 1:\nВ тишине ночной...\n\nChorus:\nМы летим как птицы..."
              }
              className="min-h-[150px] resize-y"
              disabled={isGenerating}
              maxLength={3000}
            />
          </div>

          {/* Suno-specific fields */}
          {selectedService === 'suno' && (
            <>
              {inputType === 'lyrics' && (
                <div className="space-y-2">
                  <Label>Стиль музыки</Label>
                  <Input
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="Pop, Rock, Electronic, Upbeat, Energetic..."
                    disabled={isGenerating}
                  />
                  <p className="text-sm text-muted-foreground">
                    Теги через запятую (жанр, настроение, инструменты)
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Режим генерации</Label>
                <Select value={sunoMode} onValueChange={(v) => setSunoMode(v as 'quick' | 'custom')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Быстрый (авто-параметры)
                      </div>
                    </SelectItem>
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Кастомный (полный контроль)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Модель AI</Label>
                <Select value={sunoModel} onValueChange={setSunoModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Авто (рекомендуется)</SelectItem>
                    <SelectItem value="V3">V3 - Классика (макс 2 мин)</SelectItem>
                    <SelectItem value="V3_5">V3.5 - Стабильная (макс 4 мин)</SelectItem>
                    <SelectItem value="V4">V4 - Качественный вокал (макс 4 мин)</SelectItem>
                    <SelectItem value="V4_5">V4.5 - Продвинутая (макс 8 мин)</SelectItem>
                    <SelectItem value="V4_5PLUS">V4.5+ - Премиум (макс 8 мин)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {sunoModel === 'V3' && '⏱ До 2 минут • Базовая модель'}
                  {sunoModel === 'V3_5' && '⏱ До 4 минут • Улучшенная структура'}
                  {sunoModel === 'V4' && '⏱ До 4 минут • Качественный вокал'}
                  {sunoModel === 'V4_5' && '⏱ До 8 минут • Умные промпты'}
                  {sunoModel === 'V4_5PLUS' && '⏱ До 8 минут • Премиум качество'}
                </p>
              </div>

              {sunoMode === 'custom' && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Settings className="h-4 w-4" />
                    Дополнительные параметры
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Стиль вокала</Label>
                    <Select value={voiceStyle} onValueChange={setVoiceStyle}>
                      <SelectTrigger>
                        <SelectValue placeholder="По умолчанию" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">По умолчанию</SelectItem>
                        <SelectItem value="male">Мужской</SelectItem>
                        <SelectItem value="female">Женский</SelectItem>
                        <SelectItem value="child">Детский</SelectItem>
                        <SelectItem value="robotic">Роботический</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Темп</Label>
                    <Select value={tempo} onValueChange={setTempo}>
                      <SelectTrigger>
                        <SelectValue placeholder="Авто" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Авто</SelectItem>
                        <SelectItem value="slow">Медленный (60-80 BPM)</SelectItem>
                        <SelectItem value="medium">Средний (80-120 BPM)</SelectItem>
                        <SelectItem value="fast">Быстрый (120-160 BPM)</SelectItem>
                        <SelectItem value="very-fast">Очень быстрый (160+ BPM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Mureka-specific fields */}
          {selectedService === 'mureka' && (
            <>
              <div className="space-y-2">
                <Label>Модель AI</Label>
                <Select value={murekaModel} onValueChange={setMurekaModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Авто (рекомендуется)</SelectItem>
                    <SelectItem value="V7">V7 - Последняя модель</SelectItem>
                    <SelectItem value="O1">O1 - Chain-of-Thought</SelectItem>
                    <SelectItem value="V6">V6 - Стабильная</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Длительность
                  </Label>
                  <Badge variant="outline">{duration} сек</Badge>
                </div>
                <Slider
                  min={30}
                  max={300}
                  step={10}
                  value={[duration]}
                  onValueChange={(vals) => setDuration(vals[0])}
                  disabled={isGenerating}
                />
                <p className="text-sm text-muted-foreground">
                  От 30 до 300 секунд (5 минут)
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Жанр</Label>
                  <Input
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Pop, Rock..."
                    disabled={isGenerating}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Настроение</Label>
                  <Input
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder="Happy, Sad..."
                    disabled={isGenerating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Темп</Label>
                <Select value={murekaTempo} onValueChange={setMurekaTempo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Авто" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Авто</SelectItem>
                    <SelectItem value="slow">Медленный</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="fast">Быстрый</SelectItem>
                    <SelectItem value="very-fast">Очень быстрый</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Common Options */}
          <Separator />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-base flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Инструментальная версия
                </Label>
                <p className="text-sm text-muted-foreground">
                  Создать трек без вокала
                </p>
              </div>
              <Switch
                checked={instrumental}
                onCheckedChange={setInstrumental}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Язык
              </Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Авто-определение</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="it">Italiano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {selectedService === 'suno' 
                ? '💡 Suno AI создает полные песни с вокалом. Генерация занимает 45-90 секунд.'
                : '💡 Mureka специализируется на инструментальной музыке. Генерация занимает 60-120 секунд.'
              }
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            size="lg"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin mr-2">⏳</div>
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Создать музыку
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
