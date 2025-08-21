/**
 * @fileoverview Специализированная форма для генерации с Mureka AI
 * Полностью независимая от Suno интеграции
 * @version 1.0.0
 * @author Claude Code Assistant
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Music, 
  Sparkles, 
  FileText, 
  Settings,
  Play,
  Loader2
} from 'lucide-react';
import { useMurekaGeneration } from '@/hooks/useMurekaGeneration';

// ==========================================
// ТИПЫ И КОНСТАНТЫ
// ==========================================

interface MurekaGenerationFormProps {
  projectId?: string;
  artistId?: string;
  onGenerationComplete?: (tracks: any[]) => void;
  className?: string;
}

const MUREKA_MODELS = [
  { value: 'auto', label: 'Auto (V7)', description: 'Лучший выбор для большинства случаев' },
  { value: 'V7', label: 'V7', description: 'Новейшая модель 2025' },
] as const;

const GENRES = [
  'pop', 'rock', 'electronic', 'hip-hop', 'jazz', 'classical',
  'folk', 'country', 'blues', 'reggae', 'metal', 'punk'
] as const;

const MOODS = [
  'energetic', 'calm', 'happy', 'sad', 'aggressive', 'romantic',
  'mysterious', 'uplifting', 'melancholic', 'triumphant'
] as const;

// ==========================================
// ОСНОВНОЙ КОМПОНЕНТ
// ==========================================

export function MurekaGenerationForm({
  projectId,
  artistId,
  onGenerationComplete,
  className = ''
}: MurekaGenerationFormProps) {
  
  // ====================================
  // СОСТОЯНИЕ
  // ====================================
  
  const [inputType, setInputType] = useState<'description' | 'lyrics'>('description');
  const [description, setDescription] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('pop');
  const [mood, setMood] = useState('energetic');
  const [model, setModel] = useState<'auto' | 'V7'>('auto');
  const [instrumental, setInstrumental] = useState(false);
  const [useInbox, setUseInbox] = useState(!projectId);
  
  // Хук для работы с Mureka
  const { 
    generateTrack, 
    isGenerating, 
    activeGenerations,
    getCompletedTracks 
  } = useMurekaGeneration();
  
  // ====================================
  // ОБРАБОТЧИКИ
  // ====================================
  
  const handleGenerate = useCallback(async () => {
    try {
      const request = {
        inputType,
        prompt: inputType === 'description' ? description : undefined,
        lyrics: inputType === 'lyrics' ? lyrics : undefined,
        title: title.trim() || undefined,
        genre,
        mood,
        model,
        instrumental,
        projectId: useInbox ? undefined : projectId,
        artistId,
        useInbox
      };
      
      console.log('[MUREKA FORM] Generating with request:', request);
      
      const generationId = await generateTrack(request);
      
      console.log('[MUREKA FORM] Generation started:', generationId);
      
      // Очищаем форму после успешного запуска
      if (inputType === 'description') {
        setDescription('');
      } else {
        setLyrics('');
      }
      setTitle('');
      
    } catch (error: any) {
      console.error('[MUREKA FORM] Generation failed:', error);
    }
  }, [
    inputType, description, lyrics, title, genre, mood, model, 
    instrumental, projectId, artistId, useInbox, generateTrack
  ]);
  
  const isFormValid = () => {
    if (inputType === 'description') {
      return description.trim().length > 0;
    } else {
      return lyrics.trim().length > 0;
    }
  };
  
  // ====================================
  // РЕНДЕР
  // ====================================
  
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-purple-500" />
            Генерация с Mureka AI
            <Badge variant="secondary" className="ml-2">Независимая интеграция</Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Тип входных данных */}
          <div>
            <Label className="text-base font-medium">Тип генерации</Label>
            <Tabs value={inputType} onValueChange={(value) => setInputType(value as any)} className="mt-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="description" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Из описания
                </TabsTrigger>
                <TabsTrigger value="lyrics" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Из лирики
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="description" className="mt-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Опишите желаемый трек</Label>
                  <Textarea
                    id="description"
                    placeholder="Например: энергичная поп-песня о летней любви с легкой электронной музыкой"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-sm text-muted-foreground">
                    Mureka AI создаст лирику и музыку на основе вашего описания
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="lyrics" className="mt-4">
                <div className="space-y-2">
                  <Label htmlFor="lyrics">Введите готовую лирику</Label>
                  <Textarea
                    id="lyrics"
                    placeholder="[Verse 1]&#10;Your lyrics here...&#10;&#10;[Chorus]&#10;Your chorus here..."
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    rows={8}
                    className="resize-none font-mono"
                  />
                  <p className="text-sm text-muted-foreground">
                    Используйте структуру: [Verse], [Chorus], [Bridge] и т.д.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          <Separator />
          
          {/* Настройки трека */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Название трека (опционально)</Label>
              <Input
                id="title"
                placeholder="Автоматическое название"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="model">Модель</Label>
              <Select value={model} onValueChange={(value) => setModel(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MUREKA_MODELS.map((modelOption) => (
                    <SelectItem key={modelOption.value} value={modelOption.value}>
                      <div>
                        <div className="font-medium">{modelOption.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {modelOption.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="genre">Жанр</Label>
              <Select value={genre} onValueChange={setGenre}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((genreOption) => (
                    <SelectItem key={genreOption} value={genreOption}>
                      <span className="capitalize">{genreOption}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mood">Настроение</Label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOODS.map((moodOption) => (
                    <SelectItem key={moodOption} value={moodOption}>
                      <span className="capitalize">{moodOption}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Separator />
          
          {/* Дополнительные опции */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="instrumental">Инструментальный трек</Label>
                <p className="text-sm text-muted-foreground">
                  Создать трек без вокала
                </p>
              </div>
              <Switch
                id="instrumental"
                checked={instrumental}
                onCheckedChange={setInstrumental}
              />
            </div>
            
            {!projectId && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="useInbox">Сохранить в Inbox</Label>
                  <p className="text-sm text-muted-foreground">
                    Сохранить в личную папку
                  </p>
                </div>
                <Switch
                  id="useInbox"
                  checked={useInbox}
                  onCheckedChange={setUseInbox}
                />
              </div>
            )}
          </div>
          
          <Separator />
          
          {/* Кнопка генерации */}
          <Button
            onClick={handleGenerate}
            disabled={!isFormValid() || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Генерация в процессе...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Генерировать трек
              </>
            )}
          </Button>
          
          {/* Статус активных генераций */}
          {activeGenerations.size > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Активные генерации:</h4>
              <div className="space-y-2">
                {Array.from(activeGenerations.values()).map((status) => (
                  <div key={status.id} className="flex items-center justify-between text-sm">
                    <span>{status.message}</span>
                    <Badge 
                      variant={status.status === 'completed' ? 'default' : 'secondary'}
                    >
                      {status.progress}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}