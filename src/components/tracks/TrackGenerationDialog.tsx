import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useTrackGeneration } from "@/hooks/useTrackGeneration";
import { Loader2, Sparkles, Music, FileText, Lightbulb } from "lucide-react";

// T-059: Компонент для ИИ генерации треков
interface TrackGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (type: 'lyrics' | 'concept' | 'description', data: any) => void;
  artistInfo?: any;
  projectInfo?: any;
  existingTrackData?: {
    stylePrompt?: string;
    genreTags?: string[];
    lyrics?: string;
  };
}

export function TrackGenerationDialog({ 
  open, 
  onOpenChange, 
  onGenerated,
  artistInfo,
  projectInfo,
  existingTrackData
}: TrackGenerationDialogProps) {
  const [formData, setFormData] = useState({
    stylePrompt: existingTrackData?.stylePrompt || "",
    genreTags: existingTrackData?.genreTags ? existingTrackData.genreTags.join(", ") : "",
  });

  const [generatedData, setGeneratedData] = useState<{
    lyrics: any | null;
    concept: any | null;
  }>({
    lyrics: null,
    concept: null
  });

  const { 
    generateLyrics, 
    generatingLyrics,
    generateConcept,
    generatingConcept,
    generateStylePrompt,
    generatingStylePrompt
  } = useTrackGeneration({
    onLyricsGenerated: (lyrics) => {
      setGeneratedData(prev => ({ ...prev, lyrics }));
      onGenerated('lyrics', lyrics);
    },
    onConceptGenerated: (concept) => {
      setGeneratedData(prev => ({ ...prev, concept }));
      onGenerated('concept', concept);
    },
    onStylePromptGenerated: (stylePrompt, genreTags) => {
      setFormData(prev => ({ 
        ...prev, 
        stylePrompt, 
        genreTags: genreTags.join(', ') 
      }));
    }
  });

  const handleGenerateLyrics = async () => {
    if (!formData.stylePrompt.trim()) {
      toast({
        title: "Ошибка",
        description: "Необходимо указать промпт стиля",
        variant: "destructive"
      });
      return;
    }

    await generateLyrics({
      stylePrompt: formData.stylePrompt,
      genreTags: formData.genreTags.split(',').map(tag => tag.trim()).filter(tag => tag),
      artistInfo,
      projectInfo,
      existingLyrics: existingTrackData?.lyrics
    });
  };

  const handleGenerateConcept = async () => {
    if (!formData.stylePrompt.trim()) {
      toast({
        title: "Ошибка", 
        description: "Необходимо указать промпт стиля",
        variant: "destructive"
      });
      return;
    }

    await generateConcept({
      stylePrompt: formData.stylePrompt,
      genreTags: formData.genreTags.split(',').map(tag => tag.trim()).filter(tag => tag),
      artistInfo,
      projectInfo
    });
  };

  const handleGenerateStylePrompt = async () => {
    await generateStylePrompt(artistInfo, projectInfo);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано",
      description: "Текст скопирован в буфер обмена"
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Генерация с помощью ИИ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Форма для ввода параметров */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Параметры генерации</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Промпт стиля *</label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleGenerateStylePrompt}
                    disabled={generatingStylePrompt || !artistInfo?.name}
                    className="h-7 px-2"
                  >
                    {generatingStylePrompt ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    ИИ
                  </Button>
                </div>
                <Textarea
                  value={formData.stylePrompt}
                  onChange={(e) => setFormData({ ...formData, stylePrompt: e.target.value })}
                  placeholder="Энергичная поп-песня с элементами рока, яркие эмоции, современное звучание..."
                  rows={3}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Жанры</label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleGenerateStylePrompt}
                    disabled={generatingStylePrompt || !artistInfo?.name}
                    className="h-7 px-2"
                  >
                    {generatingStylePrompt ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    ИИ
                  </Button>
                </div>
                <Input
                  value={formData.genreTags}
                  onChange={(e) => setFormData({ ...formData, genreTags: e.target.value })}
                  placeholder="pop, rock, electronic (через запятую)"
                />
              </div>

              {/* Информация о контексте */}
              {(artistInfo?.name || projectInfo?.title) && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm font-medium mb-2">Контекст:</p>
                  {artistInfo?.name && (
                    <Badge variant="outline" className="mr-2">
                      Артист: {artistInfo.name}
                    </Badge>
                  )}
                  {projectInfo?.title && (
                    <Badge variant="outline">
                      Проект: {projectInfo.title}
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Кнопки генерации */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={handleGenerateLyrics}
              disabled={generatingLyrics || !formData.stylePrompt.trim()}
              className="h-12"
            >
              {generatingLyrics ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Music className="h-4 w-4 mr-2" />
              )}
              {existingTrackData?.lyrics ? 'Создать вариацию лирики' : 'Сгенерировать лирику'}
            </Button>

            <Button
              onClick={handleGenerateConcept}
              disabled={generatingConcept || !formData.stylePrompt.trim()}
              variant="outline"
              className="h-12"
            >
              {generatingConcept ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Lightbulb className="h-4 w-4 mr-2" />
              )}
              Сгенерировать концепцию
            </Button>
          </div>

          {/* Результаты генерации */}
          {(generatedData.lyrics || generatedData.concept) && (
            <Tabs defaultValue="lyrics" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="lyrics" disabled={!generatedData.lyrics}>
                  Лирика
                </TabsTrigger>
                <TabsTrigger value="concept" disabled={!generatedData.concept}>
                  Концепция
                </TabsTrigger>
              </TabsList>

              {/* Результат лирики */}
              {generatedData.lyrics && (
                <TabsContent value="lyrics" className="space-y-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">Сгенерированная лирика</CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generatedData.lyrics.lyrics)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Копировать
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="whitespace-pre-wrap font-mono text-sm bg-muted/50 p-4 rounded-lg max-h-60 overflow-y-auto">
                        {generatedData.lyrics.lyrics}
                      </div>
                      
                      {generatedData.lyrics.mood && (
                        <div className="mt-4">
                          <p className="text-sm font-medium">Настроение:</p>
                          <p className="text-sm text-muted-foreground">{generatedData.lyrics.mood}</p>
                        </div>
                      )}
                      
                      {generatedData.lyrics.structure && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Структура:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {generatedData.lyrics.structure.map((part: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {part}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {generatedData.lyrics.suno_tags && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">SUNO AI теги:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {generatedData.lyrics.suno_tags.map((tag: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {generatedData.lyrics.themes && generatedData.lyrics.themes.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Темы:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {generatedData.lyrics.themes.map((theme: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {theme}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

              {/* Результат концепции */}
              {generatedData.concept && (
                <TabsContent value="concept" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Концепция трека</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {generatedData.concept.title_suggestions && (
                        <div>
                          <p className="text-sm font-medium">Предложения названий:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {generatedData.concept.title_suggestions.map((title: string, index: number) => (
                              <Badge key={index} variant="outline" className="cursor-pointer"
                                     onClick={() => copyToClipboard(title)}>
                                {title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {generatedData.concept.description && (
                        <div>
                          <p className="text-sm font-medium">Описание:</p>
                          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                            {generatedData.concept.description}
                          </p>
                        </div>
                      )}

                      {generatedData.concept.mood_energy && (
                        <div>
                          <p className="text-sm font-medium">Настроение и энергетика:</p>
                          <p className="text-sm text-muted-foreground">{generatedData.concept.mood_energy}</p>
                        </div>
                      )}

                      {generatedData.concept.lyrical_themes && (
                        <div>
                          <p className="text-sm font-medium">Лирические темы:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {generatedData.concept.lyrical_themes.map((theme: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {theme}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          )}

          {/* TODO: Добавить step-by-step мастер для генерации */}
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}