import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Mic, Music2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Option {
  id: string;
  name: string;
}

interface TrackGenerationSidebarProps {
  projects: Option[];
  artists: Option[];
  onGenerate: (params: GenerationParams) => void;
  isGenerating: boolean;
}

interface GenerationParams {
  prompt: string;
  service: 'suno' | 'mureka';
  projectId?: string;
  artistId?: string;
  stylePrompt?: string;
  genreTags?: string[];
}

export function TrackGenerationSidebar({ 
  projects, 
  artists, 
  onGenerate, 
  isGenerating 
}: TrackGenerationSidebarProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedService, setSelectedService] = useState<'suno' | 'mureka'>('suno');
  const [selectedProjectId, setSelectedProjectId] = useState<string>("none");
  const [selectedArtistId, setSelectedArtistId] = useState<string>("none");
  const [selectedGenre, setSelectedGenre] = useState<string>("none");
  const [selectedMood, setSelectedMood] = useState<string>("none");
  const { toast } = useToast();

  const genres = [
    "Поп", "Рок", "Хип-хоп", "Электронная музыка", 
    "Джаз", "Блюз", "Классика", "Фолк", "Регги", "Панк"
  ];

  const moods = [
    "Энергичное", "Спокойное", "Романтичное", "Грустное",
    "Веселое", "Драматичное", "Мечтательное", "Агрессивное"
  ];

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: "Заполните описание",
        description: "Опишите желаемый трек для генерации",
        variant: "destructive"
      });
      return;
    }

    const genreTags = [];
    if (selectedGenre && selectedGenre !== "none") genreTags.push(selectedGenre);
    if (selectedMood && selectedMood !== "none") genreTags.push(selectedMood);

    onGenerate({
      prompt,
      service: selectedService,
      projectId: selectedProjectId !== "none" ? selectedProjectId : undefined,
      artistId: selectedArtistId !== "none" ? selectedArtistId : undefined,
      genreTags
    });
  };

  return (
    <div className="w-80 bg-card border-r border-border p-4 space-y-4 overflow-y-auto">
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
            placeholder="Опишите желаемый трек: жанр, инструменты, вокал, темп, настроение..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] text-sm resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Чем детальнее описание, тем лучше результат
          </p>
        </CardContent>
      </Card>

      <Button 
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
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
            Создать трек
          </>
        )}
      </Button>
    </div>
  );
}