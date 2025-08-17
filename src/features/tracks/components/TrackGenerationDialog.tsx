import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { useTrackGeneration } from "@/features/ai-generation/hooks/useTrackGeneration";
import { LyricsAnalysisReport } from './LyricsAnalysisReport';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatLyricsReadable } from "@/lib/lyrics-formatter";
import { 
  Loader2, 
  Sparkles, 
  Music, 
  FileText, 
  Lightbulb, 
  BarChart3, 
  Copy, 
  Save, 
  Database,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

// T-059: Компонент для ИИ генерации треков
interface TrackGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (type: 'lyrics' | 'concept' | 'description' | 'analysis', data: any) => void;
  artistInfo?: any;
  projectInfo?: any;
  trackId?: string;
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
  trackId,
  existingTrackData
}: TrackGenerationDialogProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    stylePrompt: existingTrackData?.stylePrompt || "",
    genreTags: existingTrackData?.genreTags ? existingTrackData.genreTags.join(", ") : "",
  });

  const [generatedData, setGeneratedData] = useState<{
    lyrics: any | null;
    concept: any | null;
    analysis: any | null;
  }>({
    lyrics: null,
    concept: null,
    analysis: null
  });

  const [savingResult, setSavingResult] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveType, setSaveType] = useState<'lyrics' | 'concept' | 'analysis' | null>(null);
  
  // Загружаем существующие данные ИИ при открытии диалога
  React.useEffect(() => {
    if (open && trackId) {
      loadExistingAIData();
    }
  }, [open, trackId]);

  const loadExistingAIData = async () => {
    if (!trackId) return;
    
    try {
      const { data, error } = await supabase
        .from('ai_generations')
        .select('*')
        .eq('track_id', trackId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const aiData: any = {
          lyrics: null,
          concept: null,
          analysis: null
        };
        
        data.forEach(item => {
          const parameters = item.parameters as any;
          const generationType = parameters?.generation_type;
          if (generationType && parameters?.result) {
            aiData[generationType] = parameters.result;
          }
        });
        
        setGeneratedData(aiData);
      }
    } catch (error) {
      console.error('Error loading existing AI data:', error);
    }
  };

  console.log('Current generatedData:', generatedData);

  const {
    generateLyrics,
    generatingLyrics,
    generateConcept,
    generatingConcept,
    generateStylePrompt,
    generatingStylePrompt,
    analyzeLyrics,
    analyzingLyrics,
    improveLyrics
  } = useTrackGeneration({
    onLyricsGenerated: (lyrics) => {
      console.log('Lyrics generated:', lyrics);
      setGeneratedData(prev => ({ ...prev, lyrics }));
      onGenerated('lyrics', lyrics);
    },
    onConceptGenerated: (concept) => {
      console.log('Concept generated:', concept);
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

    try {
      await generateConcept({
        stylePrompt: formData.stylePrompt,
        genreTags: formData.genreTags.split(',').map(tag => tag.trim()).filter(tag => tag),
        artistInfo,
        projectInfo
      });
    } catch (error: any) {
      console.error('Ошибка генерации концепции:', error);
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось сгенерировать концепцию",
        variant: "destructive"
      });
    }
  };

  const handleGenerateStylePrompt = async () => {
    await generateStylePrompt(artistInfo, projectInfo);
  };

  const handleAnalyzeLyrics = async () => {
    if (!generatedData.lyrics) {
      toast({
        title: "Ошибка",
        description: "Сначала сгенерируйте лирику для анализа",
        variant: "destructive"
      });
      return;
    }

    try {
      const lyricsText = extractLyricsText(generatedData.lyrics);
      const analysis = await analyzeLyrics(lyricsText, formData.stylePrompt, formData.genreTags.split(',').map(tag => tag.trim()).filter(tag => tag));
      if (analysis) {
        setGeneratedData(prev => ({ ...prev, analysis }));
      }
    } catch (error) {
      console.error('Lyrics analysis failed:', error);
    }
  };

  const handleImproveLyrics = async () => {
    if (!generatedData.lyrics || !generatedData.analysis) {
      toast({
        title: "Ошибка",
        description: "Необходимы лирика и анализ для улучшения",
        variant: "destructive"
      });
      return;
    }

    try {
      const lyricsText = extractLyricsText(generatedData.lyrics);
      const improved = await improveLyrics(
        lyricsText,
        generatedData.analysis,
        formData.stylePrompt,
        formData.genreTags.split(',').map(tag => tag.trim()).filter(tag => tag)
      );
      
      if (improved?.improved_lyrics) {
        const formattedLyrics = formatLyricsReadable(improved.improved_lyrics);
        
        // Обновляем лирику новой улучшенной версией
        setGeneratedData(prev => ({ 
          ...prev, 
          lyrics: formattedLyrics,
          analysis: null // Сбрасываем анализ, так как лирика изменилась
        }));
        
        // Предлагаем обновить базу данных
        promptUpdateTrackWithLyrics(formattedLyrics);
        onGenerated('lyrics', formattedLyrics);
      }
    } catch (error) {
      console.error('Lyrics improvement failed:', error);
    }
  };

  const extractLyricsText = (lyricsData: any) => {
    return formatLyricsReadable(lyricsData);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано",
      description: "Текст скопирован в буфер обмена"
    });
  };

  const handleTitleClick = async (title: string) => {
    if (!trackId) {
      copyToClipboard(title);
      return;
    }

    try {
      const { error } = await supabase
        .from('tracks')
        .update({ title })
        .eq('id', trackId);

      if (error) throw error;

      toast({
        title: "Название обновлено",
        description: `Название трека изменено на "${title}"`
      });

      onGenerated('concept', { ...generatedData.concept, applied_title: title });
    } catch (error) {
      console.error('Error updating track title:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить название трека",
        variant: "destructive"
      });
      // Fallback to copying
      copyToClipboard(title);
    }
  };

  const saveAiResult = async (type: 'lyrics' | 'concept' | 'analysis', data: any, comment?: string) => {
    console.log('saveAiResult called with:', { type, user: !!user, trackId });
    
    if (!user || !trackId) {
      toast({
        title: "Ошибка",
        description: `Необходимо авторизоваться и выбрать трек. User: ${!!user}, TrackId: ${!!trackId}`,
        variant: "destructive"
      });
      return;
    }

    setSavingResult(true);
    try {
      const { error } = await supabase
        .from('ai_generations')
        .insert({
          user_id: user.id,
          track_id: trackId,
          service: 'openai',
          prompt: formData.stylePrompt,
          parameters: {
            generation_type: type,
            genre_tags: formData.genreTags.split(',').map(tag => tag.trim()).filter(tag => tag),
            result: data,
            user_comment: comment,
            model_used: 'gpt-4o-mini',
            temperature: 0.7,
            saved_at: new Date().toISOString()
          },
          status: 'completed'
        });

      if (error) throw error;

      toast({
        title: "Результат сохранен",
        description: `${type === 'lyrics' ? 'Лирика' : type === 'concept' ? 'Концепция' : 'Анализ'} сохранена в историю ИИ`,
      });

      if (type !== 'analysis') {
        onGenerated(type, data);
      }
    } catch (error: any) {
      console.error('Error saving AI result:', error);
      toast({
        title: "Ошибка сохранения",
        description: "Не удалось сохранить результат",
        variant: "destructive"
      });
    } finally {
      setSavingResult(false);
      setShowSaveDialog(false);
      setSaveType(null);
    }
  };

  const handleSaveClick = async (type: 'lyrics' | 'concept' | 'analysis') => {
    const data = type === 'lyrics' ? generatedData.lyrics : 
                 type === 'concept' ? generatedData.concept : 
                 generatedData.analysis;
    
    // Save to AI generations table
    await saveAiResult(type, data);
    
    // Also update the track directly in the tracks table
    if (trackId && type === 'lyrics') {
      try {
        const { error } = await supabase
          .from('tracks')
          .update({
            lyrics: formatLyricsReadable(data),
            metadata: {
              last_ai_update: new Date().toISOString(),
              ai_generated: true
            }
          })
          .eq('id', trackId);
          
        if (error) throw error;
      } catch (error) {
        console.error('Error updating track lyrics:', error);
      }
    }
    
    if (trackId && type === 'concept' && data?.description) {
      try {
        const { error } = await supabase
          .from('tracks')
          .update({
            description: data.description,
            metadata: {
              concept_generated: true,
              last_concept_update: new Date().toISOString()
            }
          })
          .eq('id', trackId);
          
        if (error) throw error;
      } catch (error) {
        console.error('Error updating track concept:', error);
      }
    }
  };

  const promptUpdateTrackWithLyrics = (improvedLyrics: string) => {
    if (!trackId) return;
    
    const shouldUpdate = window.confirm(
      'Хотите обновить трек в базе данных улучшенной лирикой?\n\n' +
      'Это создаст новую версию трека с обновленным текстом.'
    );
    
    if (shouldUpdate) {
      updateTrackLyrics(improvedLyrics);
    }
  };

  const updateTrackLyrics = async (newLyrics: string) => {
    if (!user || !trackId) return;

    try {
      // Получаем текущий трек
      const { data: track, error: fetchError } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', trackId)
        .single();

      if (fetchError) throw fetchError;

      // Создаем новую версию
      const { error: versionError } = await supabase
        .from('track_versions')
        .insert({
          track_id: trackId,
          version_number: track.current_version + 1,
          audio_url: track.audio_url || '',
          change_description: 'Автоматическое обновление: улучшенная лирика от ИИ',
          metadata: {
            previous_lyrics: track.lyrics,
            ai_improvement: true,
            updated_by: user.id,
            improvement_source: 'ai_analysis'
          }
        });

      if (versionError) throw versionError;

      // Обновляем основной трек
      const { error: updateError } = await supabase
        .from('tracks')
        .update({
          lyrics: newLyrics,
          current_version: track.current_version + 1,
          metadata: {
            ...(track.metadata && typeof track.metadata === 'object' ? track.metadata : {}),
            last_ai_improvement: new Date().toISOString(),
            last_edited_by: user.id
          }
        })
        .eq('id', trackId);

      if (updateError) throw updateError;

      toast({
        title: "Трек обновлен",
        description: `Лирика обновлена (версия ${track.current_version + 1})`,
      });

      // onGenerated('lyrics', { improved_text: newLyrics });
    } catch (error: any) {
      console.error('Error updating track:', error);
      toast({
        title: "Ошибка обновления",
        description: "Не удалось обновить трек",
        variant: "destructive"
      });
    }
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
            <div className="space-y-2">
              <Button
                onClick={handleGenerateLyrics}
                disabled={generatingLyrics || !formData.stylePrompt.trim()}
                className="h-12 relative w-full"
              >
                {generatingLyrics ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm">Генерация лирики...</span>
                  </>
                ) : (
                  <>
                    <Music className="h-4 w-4 mr-2" />
                    {existingTrackData?.lyrics ? 'Создать вариацию лирики' : 'Сгенерировать лирику'}
                  </>
                )}
              </Button>
              {generatingLyrics && (
                <div className="space-y-1">
                  <Progress value={70} className="h-1.5" />
                  <p className="text-xs text-muted-foreground text-center">
                    Создаем уникальную лирику...
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleGenerateConcept}
                disabled={generatingConcept || !formData.stylePrompt.trim()}
                variant="outline"
                className="h-12 relative w-full"
              >
                {generatingConcept ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm">Создание концепции...</span>
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Сгенерировать концепцию
                  </>
                )}
              </Button>
              {generatingConcept && (
                <div className="space-y-1">
                  <Progress value={60} className="h-1.5" />
                  <p className="text-xs text-muted-foreground text-center">
                    Разрабатываем концепцию трека...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Прогресс для анализа */}
          {analyzingLyrics && (
            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Анализируем лирику
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Экспертная оценка от ИИ-команды...
                    </p>
                  </div>
                </div>
                <Progress value={85} className="h-2" />
              </CardContent>
            </Card>
          )}

          {/* Результаты генерации */}
          {(generatedData.lyrics || generatedData.concept || generatedData.analysis) && (
            <Tabs defaultValue={generatedData.lyrics ? "lyrics" : (generatedData.concept ? "concept" : "analysis")} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="lyrics" disabled={!generatedData.lyrics}>
                  Лирика
                </TabsTrigger>
                <TabsTrigger value="concept" disabled={!generatedData.concept}>
                  Концепция
                </TabsTrigger>
                <TabsTrigger value="analysis" disabled={!generatedData.analysis}>
                  Анализ
                </TabsTrigger>
              </TabsList>

              {/* Результат лирики */}
              {generatedData.lyrics && (
                <TabsContent value="lyrics" className="space-y-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">Сгенерированная лирика</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAnalyzeLyrics}
                          disabled={analyzingLyrics}
                        >
                          {analyzingLyrics ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Анализируем...
                            </>
                          ) : (
                            <>
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Проанализировать
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(extractLyricsText(generatedData.lyrics))}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Копировать
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleSaveClick('lyrics')}
                          disabled={savingResult}
                        >
                          {savingResult ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Сохранить
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                       <div className="whitespace-pre-wrap font-mono text-sm bg-muted/50 p-4 rounded-lg max-h-60 overflow-y-auto">
                         {formatLyricsReadable(generatedData.lyrics)}
                       </div>
                      
                      {(generatedData.lyrics.mood || generatedData.lyrics.song?.mood) && (
                        <div className="mt-4">
                          <p className="text-sm font-medium">Настроение:</p>
                          <p className="text-sm text-muted-foreground">{generatedData.lyrics.mood || generatedData.lyrics.song?.mood}</p>
                        </div>
                      )}
                      
                      {(generatedData.lyrics.structure || generatedData.lyrics.song?.structure) && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Структура:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(generatedData.lyrics.structure || generatedData.lyrics.song?.structure?.map((part: any) => part.tag.replace(/[\[\]]/g, '')))?.map((part: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {typeof part === 'string' ? part : part}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {(generatedData.lyrics.suno_tags || generatedData.lyrics.song?.tags) && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">SUNO AI теги:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(generatedData.lyrics.suno_tags || generatedData.lyrics.song?.tags || []).map((tag: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {(generatedData.lyrics.themes || generatedData.lyrics.song?.themes) && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">Темы:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(generatedData.lyrics.themes || generatedData.lyrics.song?.themes || []).map((theme: string, index: number) => (
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

              {/* Результат анализа */}
              {generatedData.analysis && (
                <TabsContent value="analysis" className="space-y-4">
                  <div className="flex justify-end mb-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveClick('analysis')}
                      disabled={savingResult}
                    >
                      {savingResult ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Сохранить анализ
                    </Button>
                  </div>
                  <LyricsAnalysisReport 
                    analysis={generatedData.analysis}
                    onImproveClick={handleImproveLyrics}
                  />
                </TabsContent>
              )}

              {!generatedData.analysis && (
                <TabsContent value="analysis" className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Анализ лирики пока не проведен</p>
                    <p className="text-sm mt-2">
                      Сгенерируйте лирику и нажмите "Проанализировать" для получения экспертной оценки
                    </p>
                  </div>
                </TabsContent>
              )}

              {/* Результат концепции */}
              {generatedData.concept && (
                <TabsContent value="concept" className="space-y-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-lg">Концепция трека</CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveClick('concept')}
                        disabled={savingResult}
                      >
                        {savingResult ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Сохранить
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {(generatedData.concept.title_suggestions || generatedData.concept.TITLE_SUGGESTIONS) && (
                        <div>
                          <p className="text-sm font-medium">Предложения названий:</p>
                           <div className="flex flex-wrap gap-1 mt-1">
                             {(generatedData.concept.title_suggestions || generatedData.concept.TITLE_SUGGESTIONS).map((title: string, index: number) => (
                               <Badge key={index} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                      onClick={() => handleTitleClick(title)}>
                                 {title}
                               </Badge>
                             ))}
                           </div>
                        </div>
                      )}

                      {(generatedData.concept.description || generatedData.concept.DESCRIPTION) && (
                        <div>
                          <p className="text-sm font-medium">Описание:</p>
                          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                            {generatedData.concept.description || generatedData.concept.DESCRIPTION}
                          </p>
                        </div>
                      )}

                      {(generatedData.concept.mood_energy || generatedData.concept.MOOD_ENERGY) && (
                        <div>
                          <p className="text-sm font-medium">Настроение и энергетика:</p>
                          <p className="text-sm text-muted-foreground">{generatedData.concept.mood_energy || generatedData.concept.MOOD_ENERGY}</p>
                        </div>
                      )}

                      {(generatedData.concept.lyrical_themes || generatedData.concept.LYRICAL_THEMES) && (
                        <div>
                          <p className="text-sm font-medium">Лирические темы:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(generatedData.concept.lyrical_themes || generatedData.concept.LYRICAL_THEMES).map((theme: string, index: number) => (
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