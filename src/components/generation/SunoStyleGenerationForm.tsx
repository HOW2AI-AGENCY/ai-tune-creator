import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  Mic, 
  Music2, 
  Zap, 
  FileText, 
  MessageSquare,
  Play,
  Shuffle,
  Volume2,
  Settings,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { AIServiceStatusPanel } from "@/features/ai-generation/components/AIServiceStatusPanel";
import { quickPresets } from "@/features/ai-generation/data/presets";
import { CanonicalGenerationInput } from "@/features/ai-generation/types/canonical";
import { Option } from "@/features/ai-generation/types";

interface SunoStyleGenerationFormProps {
  projects: Option[];
  artists: Option[];
  tracks: Option[];
  selectedTrack?: Option | null;
  onGenerate: (input: CanonicalGenerationInput) => void;
  onTrackSelect?: (track: Option | null) => void;
  isGenerating: boolean;
  className?: string;
}

export function SunoStyleGenerationForm({
  projects,
  artists,
  tracks,
  selectedTrack,
  onGenerate,
  onTrackSelect,
  isGenerating,
  className
}: SunoStyleGenerationFormProps) {
  // Core state
  const [inputType, setInputType] = useState<'description' | 'lyrics'>('description');
  const [description, setDescription] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [selectedService, setSelectedService] = useState<'suno' | 'mureka'>('suno');
  
  // Style and mood
  const [selectedGenre, setSelectedGenre] = useState("auto");
  const [selectedMood, setSelectedMood] = useState("auto");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Advanced settings
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [createNewSingle, setCreateNewSingle] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none");
  const [selectedArtistId, setSelectedArtistId] = useState<string>("none");
  const [instrumental, setInstrumental] = useState(false);
  const [duration, setDuration] = useState([120]);
  const [language, setLanguage] = useState("ru");

  // Quick presets and custom mode
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState(false);

  const genres = [
    "Поп", "Рок", "Хип-хоп", "Электронная музыка", 
    "Джаз", "Блюз", "Классика", "Фолк", "Регги", "Панк"
  ];

  const moods = [
    "Энергичное", "Спокойное", "Романтичное", "Грустное",
    "Веселое", "Драматичное", "Мечтательное", "Агрессивное"
  ];

  const popularTags = [
    "uptempo", "catchy", "melodic", "powerful", "dreamy", "emotional",
    "rhythmic", "atmospheric", "energetic", "smooth", "vibrant", "soulful"
  ];

  const handlePresetSelect = (preset: any) => {
    setSelectedPreset(preset.id);
    setDescription(preset.prompt);
    setSelectedService(preset.service);
    setSelectedGenre(preset.genre);
    setSelectedMood(preset.mood);
    setSelectedTags(preset.tags || []);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleTrackSelect = (trackId: string) => {
    if (trackId === "none") {
      onTrackSelect?.(null);
      return;
    }

    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    onTrackSelect?.(track);
    
    // Auto-populate form with track data
    if (track.description) {
      setDescription(track.description);
      setInputType('description');
    }
    
    if (track.lyrics) {
      setLyrics(track.lyrics);
      if (!track.description) {
        setInputType('lyrics');
      }
    }

    // Enable custom mode automatically
    setIsCustomMode(true);
    setSelectedPreset("");

    // Auto-select project and artist if available
    if (track.project_id) {
      setSelectedProjectId(track.project_id);
      setCreateNewSingle(false);
    }

    // Extract genre tags if available
    if (track.genre_tags && track.genre_tags.length > 0) {
      setSelectedTags(track.genre_tags);
    }
  };

  const handleGenerate = () => {
    const mainContent = inputType === 'description' ? description : lyrics;
    if (!mainContent.trim()) {
      return;
    }

    const tags = [...selectedTags];
    if (selectedGenre && selectedGenre !== "auto") tags.push(selectedGenre);
    if (selectedMood && selectedMood !== "auto") tags.push(selectedMood);

    const canonicalInput: CanonicalGenerationInput = {
      description: inputType === 'description' ? description : `Создать музыку для текста: ${lyrics.slice(0, 100)}...`,
      lyrics: inputType === 'lyrics' ? lyrics : undefined,
      tags,
      flags: {
        instrumental,
        language,
        duration: duration[0]
      },
      mode: 'quick',
      inputType,
      context: {
        projectId: createNewSingle ? undefined : (selectedProjectId !== "none" ? selectedProjectId : undefined),
        artistId: createNewSingle ? undefined : (selectedArtistId !== "none" ? selectedArtistId : undefined),
        useInbox: false
      },
      service: selectedService
    };

    onGenerate(canonicalInput);
  };

  return (
    <div className={`max-w-2xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-gradient-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium">
          <Sparkles className="h-4 w-4" />
          Создать музыку с ИИ
        </div>
        <p className="text-muted-foreground text-sm">
          Опишите свою идею или введите текст песни
        </p>
      </div>

      {/* AI Service Status */}
      <AIServiceStatusPanel compact={true} />

      {/* Track Selection */}
      <Card className="border-2 border-accent/30 bg-gradient-subtle">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Music2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Выбрать трек для редактирования</h3>
          </div>
          
          <Select value={selectedTrack?.id || "none"} onValueChange={handleTrackSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите трек или создайте новый" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Создать новый трек</SelectItem>
              {tracks.map(track => (
                <SelectItem key={track.id} value={track.id}>
                  {track.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {selectedTrack && (
            <div className="mt-3 p-3 bg-background/50 rounded-lg">
              <div className="text-sm text-muted-foreground">
                Выбран трек: <span className="font-medium text-foreground">{selectedTrack.name}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mode Selection */}
      <Card className="border-2 border-primary/20 bg-gradient-accent">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Режим создания</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button
              variant={!isCustomMode ? "default" : "outline"}
              onClick={() => setIsCustomMode(false)}
              className="h-auto p-4 flex-col items-start justify-start space-y-2"
            >
              <div className="font-medium">Быстрый старт</div>
              <div className="text-xs opacity-80">Готовые шаблоны</div>
            </Button>
            
            <Button
              variant={isCustomMode ? "default" : "outline"}
              onClick={() => setIsCustomMode(true)}
              className="h-auto p-4 flex-col items-start justify-start space-y-2"
            >
              <div className="font-medium">Кастомный режим</div>
              <div className="text-xs opacity-80">Полный контроль</div>
            </Button>
          </div>

          {!isCustomMode && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickPresets.slice(0, 6).map((preset) => (
                <Button
                  key={preset.id}
                  variant={selectedPreset === preset.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePresetSelect(preset)}
                  className="h-auto p-3 text-left flex-col items-start justify-start"
                >
                  <div className="text-xs font-medium">{preset.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {preset.genre}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Input */}
      <Card className="border-2 hover:border-primary/30 transition-colors">
        <CardContent className="p-6">
          {/* Input Type Toggle */}
          <div className="flex items-center justify-center mb-6">
            <div className="bg-muted p-1 rounded-lg flex">
              <Button
                variant={inputType === 'description' ? "default" : "ghost"}
                size="sm"
                onClick={() => setInputType('description')}
                className="flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                Описание
              </Button>
              <Button
                variant={inputType === 'lyrics' ? "default" : "ghost"}
                size="sm"
                onClick={() => setInputType('lyrics')}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Лирика
              </Button>
            </div>
          </div>

          {/* Text Input */}
          <Textarea
            placeholder={
              inputType === 'description'
                ? "Например: энергичный поп-трек о летней любви с гитарными соло..."
                : "Введите текст песни полностью..."
            }
            value={inputType === 'description' ? description : lyrics}
            onChange={(e) => {
              if (inputType === 'description') {
                setDescription(e.target.value);
              } else {
                setLyrics(e.target.value);
              }
              setSelectedPreset("");
            }}
            className="min-h-[120px] text-base border-2 focus:border-primary/50 transition-colors resize-none"
          />

          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <span>
              {inputType === 'description' ? description.length : lyrics.length} символов
            </span>
            <span>
              {inputType === 'description' ? 'Макс. 500' : 'Макс. 3000'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Style Selection */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Music2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Стиль и настроение</h3>
          </div>

          {/* Genre and Mood */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Жанр</label>
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите жанр" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Авто</SelectItem>
                  {genres.map(genre => (
                    <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Настроение</label>
              <Select value={selectedMood} onValueChange={setSelectedMood}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите настроение" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Авто</SelectItem>
                  {moods.map(mood => (
                    <SelectItem key={mood} value={mood}>{mood}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Popular Tags */}
          <div>
            <label className="text-sm font-medium mb-3 block">Дополнительные теги</label>
            <div className="flex flex-wrap gap-2">
              {popularTags.map(tag => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Service Selection */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">AI Сервис</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={selectedService === 'suno' ? "default" : "outline"}
              onClick={() => setSelectedService('suno')}
              className="h-auto p-4 flex-col items-start justify-start space-y-2"
            >
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                <span className="font-medium">Suno AI</span>
              </div>
              <div className="text-xs text-left opacity-80">
                Полные песни с вокалом и инструментами
              </div>
            </Button>
            
            <Button
              variant={selectedService === 'mureka' ? "default" : "outline"}
              onClick={() => setSelectedService('mureka')}
              className="h-auto p-4 flex-col items-start justify-start space-y-2"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                <span className="font-medium">Mureka</span>
              </div>
              <div className="text-xs text-left opacity-80">
                Креативные композиции и эксперименты
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Дополнительные настройки</span>
                </div>
                {isAdvancedOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardContent>
          </Card>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Project Context */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="create-single"
                    checked={createNewSingle}
                    onCheckedChange={setCreateNewSingle}
                  />
                  <label htmlFor="create-single" className="text-sm font-medium">
                    Создать новый сингл (ИИ выберет название)
                  </label>
                </div>

                {!createNewSingle && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Проект</label>
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите проект" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Создать новый</SelectItem>
                          {projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">Артист</label>
                      <Select value={selectedArtistId} onValueChange={setSelectedArtistId}>
                        <SelectTrigger>
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
                  </div>
                )}
              </div>

              <Separator />

              {/* Generation Options */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="instrumental"
                    checked={instrumental}
                    onCheckedChange={setInstrumental}
                  />
                  <label htmlFor="instrumental" className="text-sm font-medium">
                    Инструментальная версия (без вокала)
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Продолжительность: {duration[0]} секунд
                  </label>
                  <Slider
                    value={duration}
                    onValueChange={setDuration}
                    max={300}
                    min={30}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>30 сек</span>
                    <span>5 мин</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Язык</label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || (!description.trim() && !lyrics.trim())}
        size="lg"
        className="w-full h-14 text-lg font-semibold bg-gradient-primary hover:opacity-90 transition-opacity shadow-lg"
      >
        {isGenerating ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3" />
            Генерируем...
          </>
        ) : (
          <>
            <Play className="h-5 w-5 mr-3" />
            Создать музыку
          </>
        )}
      </Button>

      {/* Quick Actions */}
      <div className="flex justify-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDescription("");
            setLyrics("");
            setSelectedPreset("");
            setSelectedTags([]);
            setSelectedGenre("auto");
            setSelectedMood("auto");
          }}
          className="text-muted-foreground"
        >
          <Shuffle className="h-4 w-4 mr-2" />
          Очистить
        </Button>
      </div>
    </div>
  );
}