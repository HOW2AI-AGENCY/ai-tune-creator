import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Mic, Music2, Settings, Zap, Sliders } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import OperationLoader from "@/components/ui/operation-loader";
import { QuickPresetsGrid } from "./QuickPresetsGrid";
import { CustomModePanel } from "./CustomModePanel";
import { quickPresets } from "../data/presets";
import { GenerationParams, Option, QuickPreset } from "../types";

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
}

export function TrackGenerationSidebar({ 
  projects, 
  artists, 
  onGenerate, 
  isGenerating,
  generationProgress
}: TrackGenerationSidebarProps) {
  // Основные состояния
  const [mode, setMode] = useState<'quick' | 'custom'>('quick');
  const [prompt, setPrompt] = useState("");
  const [selectedService, setSelectedService] = useState<'suno' | 'mureka'>('suno');
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none");
  const [selectedArtistId, setSelectedArtistId] = useState<string>("none");
  const [selectedGenre, setSelectedGenre] = useState<string>("none");
  const [selectedMood, setSelectedMood] = useState<string>("none");
  
  // Состояния для быстрых пресетов
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  
  // Состояния для кастомного режима
  const [customLyrics, setCustomLyrics] = useState("");
  const [tempo, setTempo] = useState("none");
  const [duration, setDuration] = useState(120);
  const [instrumental, setInstrumental] = useState(false);
  const [voiceStyle, setVoiceStyle] = useState("none");
  const [language, setLanguage] = useState("ru");
  const [stylePrompt, setStylePrompt] = useState("");
  
  const { toast } = useToast();

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

  const handleGenerate = () => {
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
      prompt,
      service: selectedService,
      projectId: selectedProjectId !== "none" ? selectedProjectId : undefined,
      artistId: selectedArtistId !== "none" ? selectedArtistId : undefined,
      genreTags,
      mode,
      customLyrics: mode === 'custom' ? customLyrics : undefined,
      tempo: tempo !== "none" ? tempo : undefined,
      duration,
      instrumental,
      voiceStyle: voiceStyle !== "none" ? voiceStyle : undefined,
      language,
      stylePrompt: stylePrompt || undefined
    };

    onGenerate(params);
  };

  return (
    <div className="w-80 bg-card border-r border-border overflow-y-auto">
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
      
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Генерация трека</h2>
        </div>

      {/* Контекст */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Контекст
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>

      {/* Режимы генерации */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'quick' | 'custom')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <Zap className="h-3 w-3" />
            Быстро
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex items-center gap-2">
            <Sliders className="h-3 w-3" />
            Кастом
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

          {/* Описание */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Описание трека</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Опишите желаемый трек или используйте готовый пресет выше..."
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  // Если пользователь изменил текст, сбрасываем выбранный пресет
                  if (selectedPresetId) {
                    setSelectedPresetId("");
                  }
                }}
                className="min-h-[80px] text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {selectedPresetId ? 
                  `Выбран пресет: ${quickPresets.find(p => p.id === selectedPresetId)?.name}` : 
                  "Выберите пресет выше или опишите свой трек"
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
      </Tabs>

        <Button 
          onClick={handleGenerate}
          disabled={isGenerating}
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
              {mode === 'quick' ? 'Создать трек' : 'Создать с кастомными настройками'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}