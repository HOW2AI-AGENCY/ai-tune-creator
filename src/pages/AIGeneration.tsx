import { useState } from "react";
import { Zap, Play, Download, RefreshCw, Sparkles, Music, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/hooks/useTranslation";

export default function AIGeneration() {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedService, setSelectedService] = useState("suno");

  // Mock data for previous generations
  const generations = [
    {
      id: "1",
      prompt: "Электронный эмбиент трек с эфирным вокалом и глубоким басом",
      service: "suno",
      status: "completed",
      resultUrl: "https://example.com/track1.mp3",
      createdAt: "2024-01-20T10:30:00Z",
      duration: 180
    },
    {
      id: "2",
      prompt: "Оптимистичная поп-песня с гитарными риффами и энергичными барабанами",
      service: "mureka",
      status: "processing",
      progress: 65,
      createdAt: "2024-01-20T11:15:00Z"
    },
    {
      id: "3",
      prompt: "Джаз-фьюжн инструментал со сложными гармониями",
      service: "suno",
      status: "completed",
      resultUrl: "https://example.com/track3.mp3",
      createdAt: "2024-01-19T15:45:00Z",
      duration: 240
    },
    {
      id: "4",
      prompt: "Chill lo-fi хип-хоп для учебы",
      service: "openai",
      status: "failed",
      errorMessage: "Сервис временно недоступен",
      createdAt: "2024-01-19T09:20:00Z"
    }
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    // Simulate API call
    setTimeout(() => {
      setIsGenerating(false);
      setPrompt("");
    }, 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success hover:bg-success/20';
      case 'processing':
        return 'bg-warning/10 text-warning hover:bg-warning/20';
      case 'failed':
        return 'bg-destructive/10 text-destructive hover:bg-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'завершено';
      case 'processing':
        return 'обрабатывается';
      case 'failed':
        return 'ошибка';
      default:
        return status;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          {t("aiGenerationTitle")}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Создавайте уникальные музыкальные треки с помощью продвинутого ИИ. Опишите ваше видение и позвольте ИИ воплотить ваши музыкальные идеи в жизнь.
        </p>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Генерация
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Music className="h-4 w-4" />
            История
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          {/* Generation Form */}
          <Card className="shadow-card max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Создать новый трек
              </CardTitle>
              <CardDescription>
                Опишите музыку, которую хотите создать, и выберите предпочитаемый ИИ сервис
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="service">ИИ Сервис</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите ИИ сервис" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suno">Suno AI - Лучший для полных песен</SelectItem>
                    <SelectItem value="mureka">Mureka - Креативные композиции</SelectItem>
                    <SelectItem value="openai">OpenAI - Экспериментальные звуки</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Описание музыки</Label>
                <Textarea
                  id="prompt"
                  placeholder="Опишите музыку, которую хотите создать... (например, 'Оптимистичный электронный танцевальный трек с синт-лидами и драйвовой басовой линией')"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Будьте конкретны в отношении жанра, инструментов, настроения и стиля для лучших результатов
                </p>
              </div>

              <Button 
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className="w-full shadow-glow"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Генерируется...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Создать трек
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Service Comparison */}
          <div className="grid gap-4 md:grid-cols-3 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg">Suno AI</CardTitle>
                <CardDescription>Создание полных песен</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Лучший для полных песен с вокалом и текстами. Превосходен в популярных музыкальных жанрах.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg">Mureka</CardTitle>
                <CardDescription>Креативные композиции</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Идеален для инструментальных треков и креативного звукового дизайна. Отлично для эмбиент музыки.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader>
                <CardTitle className="text-lg">OpenAI</CardTitle>
                <CardDescription>Экспериментальные звуки</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Идеален для уникальных текстур и экспериментальных композиций. Передовые технологии.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Generation History */}
          <div className="space-y-4">
            {generations.map((generation) => (
              <Card key={generation.id} className="shadow-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getStatusColor(generation.status)}>
                          {getStatusText(generation.status)}
                        </Badge>
                        <Badge variant="secondary">{generation.service}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(generation.createdAt).toLocaleString()}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium">{generation.prompt}</p>
                      
                      {generation.status === 'processing' && generation.progress && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Обрабатывается...</span>
                            <span className="text-muted-foreground">{generation.progress}%</span>
                          </div>
                          <Progress value={generation.progress} className="h-2" />
                        </div>
                      )}
                      
                      {generation.status === 'failed' && generation.errorMessage && (
                        <p className="text-sm text-destructive">{generation.errorMessage}</p>
                      )}
                      
                      {generation.status === 'completed' && generation.duration && (
                        <p className="text-sm text-muted-foreground">
                          Длительность: {formatDuration(generation.duration)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {generation.status === 'completed' && (
                        <>
                          <Button variant="outline" size="sm">
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {generation.status === 'failed' && (
                        <Button variant="outline" size="sm">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {generations.length === 0 && (
            <div className="text-center py-12">
              <Music className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Пока нет генераций</h3>
              <p className="text-muted-foreground mb-4">
                Начните создавать музыку с ИИ, чтобы увидеть историю генераций
              </p>
              <Button>
                <Zap className="mr-2 h-4 w-4" />
                Создать ваш первый трек
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}