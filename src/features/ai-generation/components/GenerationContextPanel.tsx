import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  Mic, 
  Music2, 
  Settings, 
  Zap, 
  Sliders, 
  FileText, 
  MessageSquare,
  Clock,
  Volume2,
  Gauge
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AIServiceStatusPanel } from "./AIServiceStatusPanel";
import { QuickPresetsSlider } from "./QuickPresetsSlider";
import { quickPresets } from "../data/presets";
import { GenerationParams, Option } from "../types";
import { useAIPromptProfiles } from "@/hooks/useAIPromptProfiles";
import { supabase } from "@/integrations/supabase/client";

interface GenerationContextPanelProps {
  projects: Option[];
  artists: Option[];
  onGenerate: (params: GenerationParams) => void;
}

export function GenerationContextPanel({ 
  projects, 
  artists, 
  onGenerate 
}: GenerationContextPanelProps) {
  // Core States
  const [mode, setMode] = useState<'quick' | 'custom'>('quick');
  const [prompt, setPrompt] = useState("");
  const [selectedService, setSelectedService] = useState<'suno' | 'mureka'>('suno');
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none");
  const [selectedArtistId, setSelectedArtistId] = useState<string>("none");
  const [sendToInbox, setSendToInbox] = useState(true);
  
  // Quick Mode States
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [selectedGenre, setSelectedGenre] = useState<string>("none");
  const [selectedMood, setSelectedMood] = useState<string>("none");
  
  // Custom Mode States
  const [inputType, setInputType] = useState<'description' | 'lyrics'>('description');
  const [customLyrics, setCustomLyrics] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [duration, setDuration] = useState([120]);
  const [tempo, setTempo] = useState("none");
  const [voiceStyle, setVoiceStyle] = useState("none");
  const [language, setLanguage] = useState("ru");

  const { toast } = useToast();
  const { getActiveProfileForService } = useAIPromptProfiles();

  // Reference track (prefill) state
  const [referenceTrackId, setReferenceTrackId] = useState<string>("none");
  const [referenceTrackOptions, setReferenceTrackOptions] = useState<{id: string; name: string}[]>([]);

  const loadReferenceTracks = async () => {
    try {
      let query = supabase
        .from('tracks')
        .select('id,title,updated_at')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (!sendToInbox && selectedProjectId && selectedProjectId !== 'none') {
        // Filter by project when выбран
        // Most schemas use project_id FK
        // If your schema differs, adjust to the correct FK column
        // @ts-ignore
        query = query.eq('project_id', selectedProjectId);
      }

      const { data, error } = await query as any;
      if (!error && data) {
        setReferenceTrackOptions(
          (data as any[]).map((t) => ({ id: t.id, name: t.title || 'Без названия' }))
        );
      }
    } catch (e) {
      console.error('Failed to load reference tracks', e);
    }
  };

  useEffect(() => {
    loadReferenceTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId, sendToInbox]);

  const applyReferenceFromTrack = async (trackId: string) => {
    if (!trackId || trackId === 'none') return;
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('id,title,lyrics,description,genre_tags,style_prompt')
        .eq('id', trackId)
        .single();

      if (error || !data) return;

      console.log('Reference track data:', data);

      // Switch to custom mode for precise control
      setMode('custom');

      // Parse description properly (might be JSON or plain text)
      let cleanDescription = '';
      if (data.description) {
        try {
          // Try to parse as JSON first
          const parsed = JSON.parse(data.description);
          if (typeof parsed === 'string') {
            cleanDescription = parsed;
          } else if (parsed && typeof parsed === 'object') {
            // If it's an object, try to extract meaningful text
            cleanDescription = parsed.prompt || parsed.description || parsed.text || JSON.stringify(parsed);
          }
        } catch {
          // If parsing fails, use as plain text
          cleanDescription = data.description;
        }
      }

      // Handle lyrics vs description
      const hasLyrics = data.lyrics && typeof data.lyrics === 'string' && data.lyrics.trim().length > 0;
      
      if (hasLyrics) {
        setInputType('lyrics');
        setPrompt(data.lyrics.trim());
        setInstrumental(false);
        console.log('Applied lyrics:', data.lyrics);
      } else {
        setInputType('description');
        setPrompt(cleanDescription);
        console.log('Applied description:', cleanDescription);
      }

      // Set style prompt
      let cleanStylePrompt = '';
      if (data.style_prompt) {
        try {
          const parsed = JSON.parse(data.style_prompt);
          cleanStylePrompt = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
        } catch {
          cleanStylePrompt = data.style_prompt;
        }
      } else if (cleanDescription) {
        cleanStylePrompt = cleanDescription;
      }
      
      setStylePrompt(cleanStylePrompt);

      // Handle genre tags
      if (Array.isArray(data.genre_tags) && data.genre_tags.length > 0) {
        const firstTag = data.genre_tags[0]?.toString().toLowerCase();
        if (firstTag && firstTag !== 'none') {
          setSelectedGenre(firstTag);
        }
        
        if (data.genre_tags[1]) {
          const secondTag = data.genre_tags[1].toString().toLowerCase();
          if (secondTag && secondTag !== 'none') {
            setSelectedMood(secondTag);
          }
        }
      }

      toast({
        title: 'Данные подставлены',
        description: hasLyrics ? 'Лирика загружена из трека' : 'Описание загружено из трека',
      });
    } catch (e: any) {
      console.error('Failed to apply reference track', e);
      toast({
        title: 'Не удалось подставить данные',
        description: e.message || 'Попробуйте другой трек',
        variant: 'destructive',
      });
    }
  };

  const genres = [
    "Поп", "Рок", "Хип-хоп", "Электронная музыка", 
    "Джаз", "Блюз", "Классика", "Фолк", "Регги", "Панк"
  ];

  const moods = [
    "Энергичное", "Спокойное", "Романтичное", "Грустное",
    "Веселое", "Драматичное", "Мечтательное", "Агрессивное"
  ];

  const tempoOptions = [
    { value: "slow", label: "Медленно (60-80 BPM)" },
    { value: "medium", label: "Средне (80-120 BPM)" },
    { value: "fast", label: "Быстро (120-160 BPM)" },
    { value: "very_fast", label: "Очень быстро (160+ BPM)" }
  ];

  const voiceOptions = [
    { value: "male", label: "Мужской голос" },
    { value: "female", label: "Женский голос" },
    { value: "mixed", label: "Смешанный" },
    { value: "choir", label: "Хор" }
  ];

  const handleSelectPreset = (preset: typeof quickPresets[0]) => {
    setSelectedPresetId(preset.id);
    setPrompt(preset.prompt);
    setSelectedService(preset.service);
    setSelectedGenre(preset.genre);
    setSelectedMood(preset.mood);
  };

  const handleGenerate = () => {
    // Validation
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
        description: "Введите лирику или описание трека",
        variant: "destructive"
      });
      return;
    }

    const genreTags = [];
    if (selectedGenre && selectedGenre !== "none") genreTags.push(selectedGenre);
    if (selectedMood && selectedMood !== "none") genreTags.push(selectedMood);

    let finalParams: GenerationParams = {
      // Основной контент - либо описание, либо лирика
      prompt: inputType === 'lyrics' ? prompt : (mode === 'custom' && customLyrics ? customLyrics : prompt),
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
      duration: duration[0],
      instrumental,
      voiceStyle: voiceStyle !== "none" ? voiceStyle : undefined,
      language
    };

    // Apply prompt profile if available
    const profileSettings = getActiveProfileForService(finalParams.service);
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
    
    // Reset quick mode selections after generation
    if (mode === 'quick') {
      setPrompt("");
      setSelectedPresetId("");
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Service Status */}
      <AIServiceStatusPanel compact={true} />

      {/* Context Settings */}
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

      {/* Prefill from existing track */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Загрузить из существующего трека</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label className="text-xs text-muted-foreground">Выберите трек</Label>
          <Select
            value={referenceTrackId}
            onValueChange={async (v) => {
              setReferenceTrackId(v);
              await applyReferenceFromTrack(v);
            }}
          >
            <SelectTrigger className="h-8">
              <SelectValue placeholder="Недавние треки" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Не выбирать</SelectItem>
              {referenceTrackOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Generation Modes */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'quick' | 'custom')}>
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
          {/* Quick Presets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Готовые варианты
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QuickPresetsSlider
                presets={quickPresets}
                onSelectPreset={handleSelectPreset}
                selectedPresetId={selectedPresetId}
              />
            </CardContent>
          </Card>

          {/* Input Type Toggle */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {inputType === 'description' ? <MessageSquare className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                Тип ввода
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
                      ? 'Опишите стиль и настроение'
                      : 'Введите готовый текст песни'
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
                  : "Введите текст песни (лирику)..."
                }
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (selectedPresetId) {
                    setSelectedPresetId("");
                  }
                }}
                className={`text-sm resize-none ${
                  inputType === 'lyrics' ? 'min-h-[300px]' : 'min-h-[120px]'
                }`}
                maxLength={inputType === 'lyrics' ? 55000 : 500}
              />
              {(inputType === 'lyrics' || prompt.length > 400) && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {inputType === 'lyrics' ? 'Лирика' : 'Промпт'} ({prompt.length}/{inputType === 'lyrics' ? '55000' : '500'})
                  </span>
                  {prompt.length > (inputType === 'lyrics' ? 50000 : 450) && (
                    <span className="text-amber-500">Приближается лимит</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Style Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Music2 className="h-4 w-4" />
                Стиль
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
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          {/* Quick Templates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Быстрые шаблоны
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {quickPresets.slice(0, 6).map((preset) => (
                  <Button
                    key={preset.id}
                    variant="outline"
                    size="sm"
                    className="h-auto p-2 flex flex-col items-start text-left"
                    onClick={() => {
                      setPrompt(preset.prompt);
                      setSelectedService(preset.service);
                    }}
                  >
                    <span className="text-xs font-medium">{preset.name}</span>
                    <span className="text-xs text-muted-foreground truncate w-full">
                      {preset.description}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sliders className="h-4 w-4" />
                Продвинутые настройки
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground">Описание трека</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={async () => {
                      if (!prompt.trim()) {
                        toast({
                          title: "Введите описание",
                          description: "Сначала добавьте базовое описание трека",
                          variant: "destructive"
                        });
                        return;
                      }
                      
                      try {
                        const response = await fetch('/api/generate-style-prompt', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ prompt })
                        });
                        
                        if (response.ok) {
                          const data = await response.json();
                          setPrompt(data.improvedPrompt || data.prompt);
                          toast({
                            title: "Промпт улучшен",
                            description: "ИИ улучшил ваше описание"
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Ошибка улучшения",
                          description: "Не удалось улучшить промпт",
                          variant: "destructive"
                        });
                      }
                    }}
                    disabled={!prompt.trim()}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Улучшить
                  </Button>
                </div>
                <Textarea
                  placeholder="Опишите стиль, настроение и характер трека..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] text-sm resize-none"
                  maxLength={500}
                />
                {prompt.length > 400 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Промпт ({prompt.length}/500)</span>
                    {prompt.length > 450 && (
                      <span className="text-amber-500">Приближается лимит</span>
                    )}
                  </div>
                )}
              </div>

              {!instrumental && (
                <div>
                  <Label className="text-xs text-muted-foreground">Пользовательская лирика</Label>
                  <Textarea
                    placeholder="Введите текст песни (опционально)..."
                    value={customLyrics}
                    onChange={(e) => setCustomLyrics(e.target.value)}
                    className="min-h-[300px] text-sm resize-none"
                    maxLength={55000}
                  />
                  {customLyrics.length > 0 && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Лирика ({customLyrics.length}/55000)</span>
                      {customLyrics.length > 50000 && (
                        <span className="text-amber-500">Приближается лимит</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground">Стиль-промпт</Label>
                <Textarea
                  placeholder="Дополнительные указания по стилю..."
                  value={stylePrompt}
                  onChange={(e) => setStylePrompt(e.target.value)}
                  className="min-h-[80px] text-sm resize-none"
                  maxLength={500}
                />
              </div>
            </CardContent>
          </Card>

          {/* Audio Parameters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Аудио параметры
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="instrumental"
                  checked={instrumental}
                  onCheckedChange={setInstrumental}
                />
                <Label htmlFor="instrumental" className="text-xs text-muted-foreground">
                  Инструментальная версия
                </Label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Длительность
                  </Label>
                  <Badge variant="outline" className="text-xs">
                    {duration[0]}с
                  </Badge>
                </div>
                <Slider
                  value={duration}
                  onValueChange={setDuration}
                  max={240}
                  min={30}
                  step={10}
                  className="w-full"
                />
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Темп</Label>
                <Select value={tempo} onValueChange={setTempo}>
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Автоматически" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Автоматически</SelectItem>
                    {tempoOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!instrumental && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Стиль вокала</Label>
                    <Select value={voiceStyle} onValueChange={setVoiceStyle}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Автоматически" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Автоматически</SelectItem>
                        {voiceOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
                        <SelectItem value="ru">Русский</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

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
                        <Badge variant="secondary" className="text-xs">v4.5+</Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="mureka">
                      <div className="flex items-center gap-2">
                        <Music2 className="h-3 w-3" />
                        <span>Mureka</span>
                        <Badge variant="outline" className="text-xs">Pro</Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Generate Button */}
      <Button 
        onClick={handleGenerate} 
        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200"
        size="lg"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        Создать трек
      </Button>
    </div>
  );
}