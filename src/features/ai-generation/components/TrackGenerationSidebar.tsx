import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Mic, Music2, Settings, Zap, Sliders, FileText, MessageSquare, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OperationLoader from "@/components/ui/operation-loader";
import { QuickPresetsGrid } from "./QuickPresetsGrid";
import { CustomModePanel } from "./CustomModePanel";
import { UploadCoverPanel } from "./UploadCoverPanel";
import { GenerationParametersPreview } from "./GenerationParametersPreview";
import { ErrorHandler } from "./ErrorHandler";
import { AIServiceStatusPanel } from "./AIServiceStatusPanel";
import { quickPresets } from "../data/presets";
import { GenerationParams, Option, QuickPreset } from "../types";
import { useAIPromptProfiles } from "@/hooks/useAIPromptProfiles";
import { supabase } from "@/integrations/supabase/client";

interface TrackGenerationSidebarProps {
  projects: Option[];
  artists: Option[];
  onGenerate: (params: GenerationParams) => void;
  isGenerating: boolean;
  generationProgress?: {
    title: string;
    subtitle?: string;
    progress?: number;
    steps?: Array<{
      id: string;
      label: string;
      status: 'pending' | 'running' | 'done' | 'error';
    }>;
  };
  error?: {
    type: 'network' | 'api' | 'validation' | 'unknown';
    message: string;
    details?: string;
    code?: string;
  } | null;
  onErrorDismiss?: () => void;
}

export function TrackGenerationSidebar({ 
  projects, 
  artists, 
  onGenerate, 
  isGenerating,
  generationProgress,
  error,
  onErrorDismiss
}: TrackGenerationSidebarProps) {
  // Основные состояния
  const [mode, setMode] = useState<'quick' | 'custom' | 'cover'>('quick');
  const [prompt, setPrompt] = useState("");
  const [selectedService, setSelectedService] = useState<'suno' | 'mureka'>('suno');
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none");
  const [selectedArtistId, setSelectedArtistId] = useState<string>("none");
  const [selectedGenre, setSelectedGenre] = useState<string>("none");
  const [selectedMood, setSelectedMood] = useState<string>("none");
  const [sendToInbox, setSendToInbox] = useState(false);
  
  // Состояния для быстрых пресетов
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  
  // Состояния для кастомного режима
  const [customLyrics, setCustomLyrics] = useState("");
  const [inputType, setInputType] = useState<'description' | 'lyrics'>('description');
  const [tempo, setTempo] = useState("none");
  const [duration, setDuration] = useState(120);
  const [instrumental, setInstrumental] = useState(false);
  const [voiceStyle, setVoiceStyle] = useState("none");
  const [language, setLanguage] = useState("ru");
  const [stylePrompt, setStylePrompt] = useState("");

  // Состояния для режима "Cover"
  const [coverPrompt, setCoverPrompt] = useState("");
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState("");
  
  // Состояния для preview и UX
  const [showPreview, setShowPreview] = useState(false);
  const [previewParams, setPreviewParams] = useState<GenerationParams | null>(null);
  
  const { toast } = useToast();
  const { activeProfile, getActiveProfileForService } = useAIPromptProfiles();

  const genres = [
    "Поп", "Рок", "Хип-хоп", "Электронная музыка", 
    "Джаз", "Блюз", "Классика", "Фолк", "Регги", "Панк"
  ];

  const moods = [
    "Энергичное", "Спокойное", "Романтичное", "Грустное",
    "Веселое", "Драматичное", "Мечтательное", "Агрессивное"
  ];

  const handleSelectPreset = (preset: QuickPreset) => {
    setSelectedPresetId(preset.id);
    setPrompt(preset.prompt);
    setSelectedService(preset.service);
    setSelectedGenre(preset.genre);
    setSelectedMood(preset.mood);
  };

  const validateAndShowPreview = () => {
    if (mode === 'cover') {
      if (!uploadedAudioUrl) {
        toast({ title: "Загрузите аудиофайл", description: "Необходимо выбрать и загрузить аудио для трансформации.", variant: "destructive" });
        return;
      }
      if (!coverPrompt.trim()) {
        toast({ title: "Опишите стиль", description: "Введите промпт, описывающий желаемый стиль кавера.", variant: "destructive" });
        return;
      }
      handleConfirmCoverGeneration();
      return;
    }

    // Валидация в зависимости от режима
    if (mode === 'quick' && !prompt.trim()) {
      toast({
        title: "Выберите пресет или заполните описание",
        description: "Выберите готовый вариант или опишите желаемый трек",
        variant: "destructive"
      });
      return;
    }
    
    if (mode === 'custom' && !customLyrics.trim() && !prompt.trim()) {
      toast({
        title: "Добавьте контент для генерации",
        description: "Введите пользовательскую лирику или описание трека",
        variant: "destructive"
      });
      return;
    }

    const genreTags = [];
    if (selectedGenre && selectedGenre !== "none") genreTags.push(selectedGenre);
    if (selectedMood && selectedMood !== "none") genreTags.push(selectedMood);

    const params: GenerationParams = {
      // ИСПРАВЛЕНО: Правильное разделение лирики и описания
      prompt: inputType === 'lyrics' ? (customLyrics || prompt) : prompt,
      lyrics: inputType === 'lyrics' ? (customLyrics || prompt) : undefined,
      description: inputType === 'description' ? prompt : undefined,
      inputType,
      
      // Сервис и режим
      service: selectedService,
      mode,
      
      // Проект и контекст
      projectId: sendToInbox ? undefined : (selectedProjectId !== "none" ? selectedProjectId : undefined),
      artistId: sendToInbox ? undefined : (selectedArtistId !== "none" ? selectedArtistId : undefined),
      useInbox: sendToInbox,
      
      // Стилистика (только для description режима)
      stylePrompt: inputType === 'description' ? stylePrompt || undefined : undefined,
      genreTags,
      
      // Аудио параметры
      tempo: tempo !== "none" ? tempo : undefined,
      duration,
      instrumental,
      voiceStyle: voiceStyle !== "none" ? voiceStyle : undefined,
      language
    };

    setPreviewParams(params);
    setShowPreview(true);
  };

  /**
   * @description Обрабатывает запуск генерации в режиме "Upload and Cover".
   * Вызывает соответствующую Edge Function и отображает уведомления.
   */
  const handleConfirmCoverGeneration = async () => {
    if (!uploadedAudioUrl || !coverPrompt.trim()) return;

    toast({ title: "Запуск трансформации аудио...", description: "Отправляем запрос в Suno API." });
    try {
        const { data, error } = await supabase.functions.invoke('upload-cover-suno-track', {
            body: {
                audio_url: uploadedAudioUrl,
                prompt: coverPrompt,
                title: `Cover of ${uploadedAudioUrl.split('/').pop()?.slice(0, 20) || 'track'}`.trim(),
                projectId: selectedProjectId !== "none" ? selectedProjectId : undefined,
                artistId: selectedArtistId !== "none" ? selectedArtistId : undefined,
            },
        });

        if (error) throw error;

        if (data.error) {
          throw new Error(data.details || data.error);
        }

        toast({ title: "Успех!", description: `Задача создана с ID: ${data.taskId}` });
    } catch (e: any) {
        console.error("Cover generation error:", e);
        toast({ title: "Ошибка", description: e.message, variant: "destructive" });
    }
  };

  const handleConfirmGeneration = () => {
    if (previewParams) {
      // Apply active prompt profile settings if available
      const profileSettings = getActiveProfileForService(previewParams.service);
      let finalParams = { ...previewParams };
      
      if (profileSettings) {
        finalParams = {
          ...finalParams,
          stylePrompt: profileSettings.stylePrompt || finalParams.stylePrompt,
          genreTags: [...(finalParams.genreTags || []), ...(profileSettings.genreTags || [])],
          voiceStyle: profileSettings.voiceStyle || finalParams.voiceStyle,
          language: profileSettings.language || finalParams.language,
          tempo: profileSettings.tempo || finalParams.tempo
        };
      }
      
      onGenerate(finalParams);
      setShowPreview(false);
      setPreviewParams(null);
    }
  };

  const handleEditPreview = () => {
    setShowPreview(false);
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreviewParams(null);
  };

  return (
    <div className="h-full bg-card overflow-y-auto"
      style={{ minWidth: '280px' }}
    >
      {/* Показываем прогресс генерации */}
      {isGenerating && generationProgress && (
        <div className="p-4 border-b border-border">
          <OperationLoader
            title={generationProgress.title}
            subtitle={generationProgress.subtitle}
            progress={generationProgress.progress}
            steps={generationProgress.steps}
            size="sm"
            colorClass="bg-primary/80"
          />
        </div>
      )}

      {/* Показываем ошибки */}
      {error && onErrorDismiss && (
        <div className="p-4 border-b border-border">
          <ErrorHandler
            error={error}
            onRetry={validateAndShowPreview}
            onDismiss={onErrorDismiss}
          />
        </div>
      )}
      
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Генерация трека</h2>
          </div>
          {activeProfile && (
            <Badge variant="outline" className="text-xs">
              📝 {activeProfile.name}
            </Badge>
          )}
        </div>

        {/* Статус AI сервисов */}
        <AIServiceStatusPanel compact={true} />

      {/* Контекст */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Контекст
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Switch
              id="send-to-inbox"
              checked={sendToInbox}
              onCheckedChange={setSendToInbox}
            />
            <Label htmlFor="send-to-inbox" className="text-xs text-muted-foreground">
              Отправить в Inbox
            </Label>
          </div>

          {!sendToInbox && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">Проект</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Выберите проект" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без проекта</SelectItem>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Артист</Label>
                <Select value={selectedArtistId} onValueChange={setSelectedArtistId}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Выберите артиста" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Без артиста</SelectItem>
                    {artists.map(artist => (
                      <SelectItem key={artist.id} value={artist.id}>
                        {artist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Режимы генерации */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'quick' | 'custom' | 'cover')} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <Zap className="h-3 w-3" />
            Быстро
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Sliders className="h-3 w-3" />
            Кастом
          </TabsTrigger>
          <TabsTrigger value="cover" className="flex items-center gap-2">
            <UploadCloud className="h-3 w-3" />
            Трансформация
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick" className="space-y-4">
          {/* Быстрые пресеты */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Готовые варианты
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QuickPresetsGrid
                presets={quickPresets}
                onSelectPreset={handleSelectPreset}
                selectedPresetId={selectedPresetId}
              />
            </CardContent>
          </Card>

          {/* Стиль */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Music2 className="h-4 w-4" />
                Музыкальный стиль
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Жанр</Label>
                <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Выберите жанр" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Выберите жанр</SelectItem>
                    {genres.map(genre => (
                      <SelectItem key={genre} value={genre.toLowerCase()}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Настроение</Label>
                <Select value={selectedMood} onValueChange={setSelectedMood}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Выберите настроение" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Выберите настроение</SelectItem>
                    {moods.map(mood => (
                      <SelectItem key={mood} value={mood.toLowerCase()}>
                        {mood}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">AI Сервис</Label>
                <Select value={selectedService} onValueChange={(v: 'suno' | 'mureka') => setSelectedService(v)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suno">
                      <div className="flex items-center gap-2">
                        <Mic className="h-3 w-3" />
                        <span>Suno AI</span>
                        <Badge variant="secondary" className="text-xs">Полные песни</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="mureka">
                      <div className="flex items-center gap-2">
                        <Music2 className="h-3 w-3" />
                        <span>Mureka</span>
                        <Badge variant="outline" className="text-xs">Креатив</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Тип ввода */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {inputType === 'description' ? <MessageSquare className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                Что вы хотите ввести?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    {inputType === 'description' ? 'Описание стиля' : 'Готовая лирика'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {inputType === 'description' 
                      ? 'Опишите стиль и настроение - AI создаст музыку и лирику'
                      : 'Введите готовый текст песни - AI создаст музыку к нему'
                    }
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <Switch 
                    checked={inputType === 'lyrics'}
                    onCheckedChange={(checked) => setInputType(checked ? 'lyrics' : 'description')}
                  />
                  <FileText className="h-4 w-4" />
                </div>
              </div>
              
              <Textarea
                placeholder={inputType === 'description' 
                  ? "Опишите желаемый трек или используйте готовый пресет выше..."
                  : "Введите текст песни (лирику), к которому нужно создать музыку..."
                }
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  // Если пользователь изменил текст, сбрасываем выбранный пресет
                  if (selectedPresetId) {
                    setSelectedPresetId("");
                  }
                }}
                className="min-h-[100px] text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {selectedPresetId ? 
                  `Выбран пресет: ${quickPresets.find(p => p.id === selectedPresetId)?.name}` : 
                  inputType === 'description' 
                    ? "Выберите пресет выше или опишите свой трек"
                    : "AI создаст музыку к вашей лирике"
                }
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <CustomModePanel
            customLyrics={customLyrics}
            onCustomLyricsChange={setCustomLyrics}
            tempo={tempo}
            onTempoChange={setTempo}
            duration={duration}
            onDurationChange={setDuration}
            instrumental={instrumental}
            onInstrumentalChange={setInstrumental}
            voiceStyle={voiceStyle}
            onVoiceStyleChange={setVoiceStyle}
            language={language}
            onLanguageChange={setLanguage}
            stylePrompt={stylePrompt}
            onStylePromptChange={setStylePrompt}
          />

          {/* AI Сервис для кастомного режима */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                AI Сервис
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedService} onValueChange={(v: 'suno' | 'mureka') => setSelectedService(v)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="suno">
                    <div className="flex items-center gap-2">
                      <Mic className="h-3 w-3" />
                      <span>Suno AI</span>
                      <Badge variant="secondary" className="text-xs">Лучше для лирики</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="mureka">
                    <div className="flex items-center gap-2">
                      <Music2 className="h-3 w-3" />
                      <span>Mureka</span>
                      <Badge variant="outline" className="text-xs">Экспериментальное</Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Дополнительное описание */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Общее описание</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Общее описание стиля и настроения трека..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[60px] text-sm resize-none"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cover" className="space-y-4">
          <UploadCoverPanel
            prompt={coverPrompt}
            onPromptChange={setCoverPrompt}
            onUploadComplete={setUploadedAudioUrl}
          />
        </TabsContent>
      </Tabs>

      {/* Предварительный просмотр параметров */}
      {showPreview && previewParams && (
        <GenerationParametersPreview
          params={previewParams}
          onEdit={handleEditPreview}
          onConfirm={handleConfirmGeneration}
          onCancel={handleCancelPreview}
        />
      )}

      {/* Кнопка генерации */}
      {!showPreview && (
        <Button 
          onClick={validateAndShowPreview}
          disabled={isGenerating || (mode === 'cover' && (!uploadedAudioUrl || !coverPrompt.trim()))}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Music2 className="h-4 w-4 mr-2 animate-pulse" />
              Генерируется...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              {mode === 'cover' ? 'Запустить трансформацию' : (mode === 'quick' ? 'Предварительный просмотр' : 'Просмотр настроек')}
            </>
          )}
        </Button>
      )}
      </div>
    </div>
  );
}