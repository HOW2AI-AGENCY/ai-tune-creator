/**
 * Unified Generation Sidebar
 * 
 * Replaces TrackGenerationSidebar with standardized field mapping
 * and improved UX for immediate feedback
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Sparkles, 
  Mic, 
  Music2, 
  Settings, 
  Zap, 
  Sliders, 
  FileText, 
  MessageSquare,
  HelpCircle,
  Timer,
  Languages
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QuickPresetsGrid } from "./QuickPresetsGrid";
import { AIServiceStatusPanel } from "./AIServiceStatusPanel";
import { quickPresets } from "../data/presets";
import { QuickPreset, Option } from "../types";
import { CanonicalGenerationInput } from "../types/canonical";

interface UnifiedGenerationSidebarProps {
  projects: Option[];
  artists: Option[];
  onGenerate: (input: CanonicalGenerationInput) => void;
  isGenerating: boolean;
  className?: string;
}

export function UnifiedGenerationSidebar({ 
  projects, 
  artists, 
  onGenerate, 
  isGenerating,
  className 
}: UnifiedGenerationSidebarProps) {
  // Core state
  const [mode, setMode] = useState<'quick' | 'custom'>('quick');
  const [inputType, setInputType] = useState<'description' | 'lyrics'>('description');
  const [description, setDescription] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [selectedService, setSelectedService] = useState<'suno' | 'mureka'>('suno');
  
  // Context
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none");
  const [selectedArtistId, setSelectedArtistId] = useState<string>("none");
  const [useInbox, setUseInbox] = useState(false);
  
  // Standardized tags
  const [genreTags, setGenreTags] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>("none");
  const [selectedMood, setSelectedMood] = useState<string>("none");
  
  // Generation flags
  const [instrumental, setInstrumental] = useState(false);
  const [language, setLanguage] = useState("ru");
  const [voiceStyle, setVoiceStyle] = useState("none");
  const [tempo, setTempo] = useState("none");
  const [duration, setDuration] = useState([120]);
  
  // Quick presets
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  
  const { toast } = useToast();

  // Standardized options
  const genres = [
    "Поп", "Рок", "Хип-хоп", "Электронная музыка", 
    "Джаз", "Блюз", "Классика", "Фолк", "Регги", "Панк"
  ];

  const moods = [
    "Энергичное", "Спокойное", "Романтичное", "Грустное",
    "Веселое", "Драматичное", "Мечтательное", "Агрессивное"
  ];

  const voiceStyles = [
    { value: "none", label: "По умолчанию" },
    { value: "male", label: "Мужской вокал" },
    { value: "female", label: "Женский вокал" },
    { value: "child", label: "Детский голос" },
    { value: "elderly", label: "Зрелый голос" },
    { value: "robotic", label: "Роботический" }
  ];

  const tempos = [
    { value: "none", label: "Авто" },
    { value: "slow", label: "Медленный (60-80 BPM)" },
    { value: "medium", label: "Средний (80-120 BPM)" },
    { value: "fast", label: "Быстрый (120-160 BPM)" },
    { value: "very-fast", label: "Очень быстрый (160+ BPM)" }
  ];

  const languages = [
    { value: "ru", label: "Русский" },
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "fr", label: "Français" },
    { value: "de", label: "Deutsch" },
    { value: "it", label: "Italiano" },
    { value: "ja", label: "日本語" },
    { value: "ko", label: "한국어" },
    { value: "zh", label: "中文" }
  ];

  const handleSelectPreset = (preset: QuickPreset) => {
    setSelectedPresetId(preset.id);
    setDescription(preset.prompt);
    setSelectedService(preset.service);
    
    // Update tags
    const newTags = [preset.genre, preset.mood, ...preset.tags].filter(Boolean);
    setGenreTags(newTags);
    setSelectedGenre(preset.genre);
    setSelectedMood(preset.mood);
  };

  const handleGenerate = () => {
    // Validation
    const mainContent = inputType === 'description' ? description : lyrics;
    if (!mainContent.trim()) {
      toast({
        title: "Заполните поле ввода",
        description: inputType === 'description' 
          ? "Опишите желаемый трек или выберите готовый пресет"
          : "Введите текст песни для генерации музыки",
        variant: "destructive"
      });
      return;
    }

    // Build tags array
    const tags = [...genreTags];
    if (selectedGenre && selectedGenre !== "none" && !tags.includes(selectedGenre)) {
      tags.push(selectedGenre);
    }
    if (selectedMood && selectedMood !== "none" && !tags.includes(selectedMood)) {
      tags.push(selectedMood);
    }

    // Create canonical input
    const canonicalInput: CanonicalGenerationInput = {
      description: inputType === 'description' ? description : `Создать музыку для текста: ${lyrics.slice(0, 100)}...`,
      lyrics: inputType === 'lyrics' ? lyrics : undefined,
      tags,
      flags: {
        instrumental,
        language,
        voiceStyle: voiceStyle !== "none" ? voiceStyle : undefined,
        tempo: tempo !== "none" ? tempo : undefined,
        duration: duration[0]
      },
      mode,
      inputType,
      context: {
        projectId: useInbox ? undefined : (selectedProjectId !== "none" ? selectedProjectId : undefined),
        artistId: useInbox ? undefined : (selectedArtistId !== "none" ? selectedArtistId : undefined),
        useInbox
      },
      service: selectedService
    };

    onGenerate(canonicalInput);
  };

  return (
    <TooltipProvider>
      <div className={`h-full bg-card overflow-y-auto min-w-[280px] ${className}`}>
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Генерация трека</h2>
            </div>
          </div>

          {/* AI Service Status */}
          <AIServiceStatusPanel compact={true} />

          {/* Context Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Контекст проекта
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Выберите проект и артиста или отправьте в Inbox</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="use-inbox"
                  checked={useInbox}
                  onCheckedChange={setUseInbox}
                />
                <Label htmlFor="use-inbox" className="text-xs text-muted-foreground">
                  Отправить в Inbox (без привязки к проекту)
                </Label>
              </div>

              {!useInbox && (
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

          {/* Generation Mode */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'quick' | 'custom')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="quick" className="flex items-center gap-2">
                <Zap className="h-3 w-3" />
                Быстро
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center gap-2">
                <Sliders className="h-3 w-3" />
                Детально
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-4">
              {/* Quick Presets */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Готовые шаблоны
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
            </TabsContent>

            <TabsContent value="custom" className="space-y-4">
              {/* Advanced settings will go here */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Длительность
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Продолжительность генерируемого трека в секундах</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>30 сек</span>
                      <span>{duration[0]} сек</span>
                      <span>300 сек</span>
                    </div>
                    <Slider
                      value={duration}
                      onValueChange={setDuration}
                      max={300}
                      min={30}
                      step={10}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* AI Service Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Music2 className="h-4 w-4" />
                AI Сервис
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Suno AI: полные песни с вокалом<br/>Mureka: креативные композиции</p>
                  </TooltipContent>
                </Tooltip>
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
            </CardContent>
          </Card>

          {/* Input Type and Content */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {inputType === 'description' ? <MessageSquare className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                Содержание трека
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input type toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    {inputType === 'description' ? 'Описание стиля' : 'Готовая лирика'}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {inputType === 'description' 
                      ? 'Опишите желаемый стиль - AI создаст музыку и текст'
                      : 'Введите готовый текст - AI создаст к нему музыку'
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
              
              {/* Text input */}
              <Textarea
                placeholder={inputType === 'description' 
                  ? "Опишите желаемый стиль и настроение трека..."
                  : "Введите текст песни (стихи), к которому нужно создать музыку..."
                }
                value={inputType === 'description' ? description : lyrics}
                onChange={(e) => {
                  if (inputType === 'description') {
                    setDescription(e.target.value);
                  } else {
                    setLyrics(e.target.value);
                  }
                  // Reset preset selection when user types
                  if (selectedPresetId) {
                    setSelectedPresetId("");
                  }
                }}
                className="min-h-[100px] text-sm resize-none"
              />
              
              {selectedPresetId && (
                <p className="text-xs text-primary">
                  📋 Выбран шаблон: {quickPresets.find(p => p.id === selectedPresetId)?.name}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Musical Style */}
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
                    <SelectItem value="none">Любой жанр</SelectItem>
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
                    <SelectItem value="none">Любое настроение</SelectItem>
                    {moods.map(mood => (
                      <SelectItem key={mood} value={mood.toLowerCase()}>
                        {mood}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Темп</Label>
                <Select value={tempo} onValueChange={setTempo}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tempos.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Voice and Language */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Вокал и язык
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="instrumental"
                  checked={instrumental}
                  onCheckedChange={setInstrumental}
                />
                <Label htmlFor="instrumental" className="text-xs text-muted-foreground">
                  Инструментальная версия (без вокала)
                </Label>
              </div>

              {!instrumental && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Стиль вокала</Label>
                    <Select value={voiceStyle} onValueChange={setVoiceStyle}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {voiceStyles.map(style => (
                          <SelectItem key={style.value} value={style.value}>
                            {style.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Язык</Label>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map(lang => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || (!description.trim() && !lyrics.trim())}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Music2 className="mr-2 h-4 w-4 animate-spin" />
                Генерируется...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Создать трек
              </>
            )}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}