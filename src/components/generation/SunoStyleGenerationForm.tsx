import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

interface SunoStyleGenerationFormProps {
  onGenerate: (input: CanonicalGenerationInput) => void;
  isGenerating: boolean;
  className?: string;
}

export function SunoStyleGenerationForm({
  onGenerate,
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
  const [instrumental, setInstrumental] = useState(false);
  const [duration, setDuration] = useState([120]);
  const [language, setLanguage] = useState("ru");

  // Quick presets and custom mode
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [styleInfluence, setStyleInfluence] = useState([65]); // 0-100%
  const [weirdness, setWeirdness] = useState([50]); // Креативность 0-100%
  const [vocalGender, setVocalGender] = useState("auto"); // male, female, auto
  const [excludeStyles, setExcludeStyles] = useState<string[]>([]);

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

  // Преобразование лирики из JSON/структур в формат Suno AI с секциями
  const toSunoLyricsFormat = (raw: string): string => {
    if (!raw) return '';
    const trim = raw.trim();
    const header = (name: string) => {
      const map: Record<string, string> = {
        verse: 'Verse', chorus: 'Chorus', bridge: 'Bridge', outro: 'Outro', intro: 'Intro', prechorus: 'Pre-Chorus'
      };
      const key = name?.toLowerCase?.() || 'section';
      return `[${map[key] || name || 'Section'}]`;
    };

    // Попытка распарсить JSON
    if ((trim.startsWith('{') || trim.startsWith('['))) {
      try {
        const data = JSON.parse(trim);
        let out: string[] = [];
        if (Array.isArray(data)) {
          for (const part of data) {
            const name = (part as any).section || (part as any).name || (part as any).type || 'Section';
            const lines = Array.isArray((part as any).lines)
              ? (part as any).lines.join('\n')
              : ((part as any).text || (part as any).content || '');
            if (lines) {
              out.push(`${header(name)}\n${lines}`);
            }
          }
        } else if (typeof data === 'object' && data) {
          for (const [key, value] of Object.entries<any>(data)) {
            const text = Array.isArray(value) ? value.join('\n') : (value?.text || value?.content || String(value));
            if (text) out.push(`${header(key)}\n${text}`);
          }
        }
        if (out.length) return out.join('\n\n');
      } catch { /* ignore */ }
    }

    return trim;
  };

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

  const handleGenerate = () => {
    const mainContent = (!isCustomMode || inputType === 'description') ? description : lyrics;
    if (!mainContent.trim()) {
      return;
    }

    const tags = [...selectedTags];
    if (selectedGenre && selectedGenre !== "auto") tags.push(selectedGenre);
    if (selectedMood && selectedMood !== "auto") tags.push(selectedMood);

    // Context - всегда создаем новые треки без привязки
    const canonicalInput: CanonicalGenerationInput = {
      prompt: (isCustomMode && inputType === 'lyrics') ? `Create music for lyrics: ${lyrics}` : description,
      lyrics: (isCustomMode && inputType === 'lyrics') ? toSunoLyricsFormat(lyrics) : undefined,
      tags,
      flags: {
        instrumental,
        language,
        duration: duration[0]
      },
      mode: isCustomMode ? 'custom' : 'quick',
      inputType: inputType,
      context: {
        // Убираем привязку к существующим проектам/артистам/трекам
        projectId: undefined,
        artistId: undefined,
        trackId: undefined,
        useInbox: true
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
          {/* Lyrcs Mode for Custom */}
          {isCustomMode && selectedService === 'suno' && (
            <div className="mb-4">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-muted p-1 rounded-lg flex">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setInputType('description'); setLyrics(''); }}
                    className={`flex items-center gap-2 ${inputType === 'description' ? 'bg-background text-foreground' : ''}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    Авто-лирика
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setInputType('lyrics'); setDescription(''); }}
                    className={`flex items-center gap-2 ${inputType === 'lyrics' ? 'bg-background text-foreground' : ''}`}
                  >
                    <FileText className="h-4 w-4" />
                    Своя лирика
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Input */}
          <Textarea
            placeholder={
              !isCustomMode
                ? "Например: энергичный поп-трек о летней любви с гитарными соло..."
                : inputType === 'description'
                ? "Опишите стиль и настроение вашей музыки..."
                : `Введите текст песни в формате Suno AI:

[Verse 1]
Твой текст первого куплета

[Chorus]
Твой текст припева

[Verse 2]
Твой текст второго куплета

[Chorus]
Твой текст припева

[Bridge]
Твой текст бриджа

[Outro]
Твой текст концовки`
            }
            value={
              !isCustomMode || inputType === 'description' 
                ? description 
                : lyrics
            }
            onChange={(e) => {
              if (!isCustomMode || inputType === 'description') {
                setDescription(e.target.value);
              } else {
                setLyrics(e.target.value);
              }
              setSelectedPreset("");
            }}
            onBlur={(e) => {
              if (isCustomMode && inputType === 'lyrics') {
                setLyrics(toSunoLyricsFormat(e.currentTarget.value));
              }
            }}
            className={
              isCustomMode && inputType === 'lyrics'
                ? "min-h-[360px] text-base border-2 focus:border-primary/50 transition-colors resize-none font-mono text-sm leading-relaxed"
                : "min-h-[120px] text-base border-2 focus:border-primary/50 transition-colors resize-none"
            }
          />

          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <span>
              {(!isCustomMode || inputType === 'description') ? description.length : lyrics.length} символов
            </span>
            <span>
              {(!isCustomMode || inputType === 'description') 
                ? 'Макс. 500' 
                : 'Макс. 3000 (формат Suno: [Verse], [Chorus], [Bridge])'
              }
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
              {/* Music Settings */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-3 block">Настройки звучания</label>
                  <div className="space-y-4">
                    {/* Style Influence */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Влияние стиля</span>
                        <span className="text-sm font-medium">{styleInfluence[0]}%</span>
                      </div>
                      <Slider
                        value={styleInfluence}
                        onValueChange={setStyleInfluence}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Как сильно ИИ следует заданному стилю
                      </div>
                    </div>

                    {/* Weirdness/Creativity */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-muted-foreground">Креативность</span>
                        <span className="text-sm font-medium">{weirdness[0]}%</span>
                      </div>
                      <Slider
                        value={weirdness}
                        onValueChange={setWeirdness}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Экспериментальность и неожиданность звучания
                      </div>
                    </div>

                    {/* Vocal Gender */}
                    {!instrumental && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Пол вокалиста</label>
                        <Select value={vocalGender} onValueChange={setVocalGender}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[60] bg-popover">
                            <SelectItem value="auto">Автовыбор</SelectItem>
                            <SelectItem value="male">Мужской</SelectItem>
                            <SelectItem value="female">Женский</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Exclude Styles */}
                <div>
                  <label className="text-sm font-medium mb-3 block">Исключить стили</label>
                  <div className="flex flex-wrap gap-2">
                    {popularTags.map(tag => (
                      <Badge
                        key={tag}
                        variant={excludeStyles.includes(tag) ? "destructive" : "outline"}
                        className="cursor-pointer hover:bg-destructive/20 transition-colors"
                        onClick={() => {
                          setExcludeStyles(prev =>
                            prev.includes(tag)
                              ? prev.filter(t => t !== tag)
                              : [...prev, tag]
                          );
                        }}
                      >
                        {excludeStyles.includes(tag) ? "✕ " : ""}{tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Стили, которые ИИ должен избегать
                  </div>
                </div>
              </div>

              <Separator />

              {/* Basic Settings */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Продолжительность (сек)</label>
                  <Slider
                    value={duration}
                    onValueChange={setDuration}
                    max={240}
                    min={30}
                    step={10}
                    className="w-full"
                  />
                  <div className="text-center text-sm text-muted-foreground mt-1">
                    {duration[0]} секунд
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Язык</label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[60] bg-popover">
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="auto">Авто</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="instrumental"
                    checked={instrumental}
                    onCheckedChange={setInstrumental}
                  />
                  <label htmlFor="instrumental" className="text-sm font-medium">
                    Инструментальная версия
                  </label>
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