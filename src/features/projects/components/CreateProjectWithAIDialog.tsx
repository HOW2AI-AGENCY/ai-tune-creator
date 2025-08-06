import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAISettings } from "@/hooks/useAISettings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Music, Play, FolderOpen, Sparkles, Bot } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Artist {
  id: string;
  name: string;
  description?: string;
  metadata?: any;
}

interface CreateProjectWithAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: () => void;
}

const formSchema = z.object({
  artistId: z.string().min(1, "Выберите артиста"),
  projectIdea: z.string().min(1, "Опишите идею проекта"),
  type: z.enum(["album", "single", "ep"], {
    required_error: "Выберите тип проекта",
  }),
  additionalContext: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const PROJECT_TYPES = [
  {
    value: "album",
    label: "Альбом",
    description: "Полноформатный альбом (8+ треков)",
    icon: Music,
  },
  {
    value: "single",
    label: "Сингл",
    description: "Одиночный трек",
    icon: Play,
  },
  {
    value: "ep",
    label: "EP",
    description: "Мини-альбом (3-7 треков)",
    icon: FolderOpen,
  },
];

interface GeneratedProjectData {
  title: string;
  description: string;
  concept: string;
  genre: string;
  mood: string;
  target_audience: string;
  suggested_tracks?: string[];
}

export function CreateProjectWithAIDialog({
  open,
  onOpenChange,
  onProjectCreated,
}: CreateProjectWithAIDialogProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [generatedData, setGeneratedData] = useState<GeneratedProjectData | null>(null);
  const { toast } = useToast();
  const { settings } = useAISettings();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      artistId: "",
      projectIdea: "",
      type: "single",
      additionalContext: "",
    },
  });

  const loadArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, description, metadata')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArtists(data || []);
    } catch (error: any) {
      console.error('Error loading artists:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить артистов",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (open) {
      loadArtists();
    }
  }, [open]);

  const generateProjectData = async (data: FormData) => {
    try {
      setGenerating(true);

      const selectedArtist = artists.find(a => a.id === data.artistId);
      if (!selectedArtist) throw new Error("Артист не найден");

      const prompt = `
        Создай детальную концепцию музыкального проекта на основе следующей информации:
        
        Артист: ${selectedArtist.name}
        ${selectedArtist.description ? `Описание артиста: ${selectedArtist.description}` : ''}
        ${selectedArtist.metadata?.genre ? `Жанр артиста: ${selectedArtist.metadata.genre}` : ''}
        ${selectedArtist.metadata?.style ? `Стиль артиста: ${selectedArtist.metadata.style}` : ''}
        
        Идея проекта: ${data.projectIdea}
        Тип проекта: ${data.type}
        ${data.additionalContext ? `Дополнительный контекст: ${data.additionalContext}` : ''}
        
        Создай подробную концепцию, которая будет соответствовать стилю артиста и заданной идее.
      `;

      const { data: result, error } = await supabase.functions.invoke('generate-project-concept', {
        body: {
          artistName: selectedArtist.name,
          artistInfo: selectedArtist.description || '',
          projectIdea: data.projectIdea,
          projectType: data.type,
          additionalContext: data.additionalContext,
          provider: settings.provider,
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens
        }
      });

      if (error) throw error;

      const projectInfo = result.projectConcept;
      
      // Используем правильную структуру из новой функции
      const adaptedData: GeneratedProjectData = {
        title: projectInfo.title || `Новый ${data.type}`,
        description: projectInfo.description || '',
        concept: projectInfo.concept || '',
        genre: projectInfo.genre || selectedArtist.metadata?.genre || '',
        mood: typeof projectInfo.mood === 'string' 
          ? projectInfo.mood 
          : typeof projectInfo.mood === 'object' 
            ? `${projectInfo.mood.emotional_characteristics || ''} (${projectInfo.mood.key || ''}, ${projectInfo.mood.BPM || ''} BPM)`.trim()
            : '',
        target_audience: typeof projectInfo.target_audience === 'string' 
          ? projectInfo.target_audience 
          : typeof projectInfo.target_audience === 'object'
            ? `${projectInfo.target_audience.demographics?.age_range || ''} ${projectInfo.target_audience.demographics?.location || ''}`.trim() || 'Широкая аудитория'
            : 'Широкая аудитория',
        suggested_tracks: Array.isArray(projectInfo.suggested_tracks)
          ? projectInfo.suggested_tracks.map((track: any) => 
              typeof track === 'string' ? track : track.title || track.name || 'Без названия'
            )
          : []
      };

      setGeneratedData(adaptedData);
      
      toast({
        title: "Успешно",
        description: "Концепция проекта сгенерирована с помощью ИИ",
      });

    } catch (error: any) {
      console.error('Error generating project data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать концепцию проекта",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const createProject = async () => {
    if (!generatedData) return;

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Пользователь не авторизован");

      const formData = form.getValues();

      // Создаем проект
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .insert({
          title: generatedData.title,
          description: generatedData.description,
          type: formData.type,
          status: 'draft',
          artist_id: formData.artistId,
          metadata: {
            generated_by_ai: true,
            concept: generatedData.concept,
            genre: generatedData.genre,
            mood: generatedData.mood,
            target_audience: generatedData.target_audience,
            suggested_tracks: generatedData.suggested_tracks,
            original_idea: formData.projectIdea,
            additional_context: formData.additionalContext,
            ai_provider: settings.provider,
            ai_model: settings.model,
            created_by: user.id,
            created_at: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Для сингла - сразу создаем трек
      if (formData.type === 'single' && generatedData.suggested_tracks.length > 0) {
        const { error: trackError } = await supabase.from("tracks").insert({
          title: generatedData.suggested_tracks[0] || generatedData.title,
          project_id: projectData.id,
          track_number: 1,
          metadata: {
            generated_by_ai: true,
            concept: generatedData.concept,
            mood: generatedData.mood,
            genre: generatedData.genre,
            created_by: user.id,
          }
        });

        if (trackError) {
          console.error('Error creating track:', trackError);
          // Не блокируем создание проекта из-за ошибки трека
        }
      }

      // Для альбома/EP - создаем предложенные треки
      if ((formData.type === 'album' || formData.type === 'ep') && generatedData.suggested_tracks.length > 0) {
        const tracks = generatedData.suggested_tracks.map((trackTitle, index) => ({
          title: trackTitle,
          project_id: projectData.id,
          track_number: index + 1,
          metadata: {
            generated_by_ai: true,
            concept: generatedData.concept,
            mood: generatedData.mood,
            genre: generatedData.genre,
            created_by: user.id,
          }
        }));

        const { error: tracksError } = await supabase.from("tracks").insert(tracks);

        if (tracksError) {
          console.error('Error creating tracks:', tracksError);
          // Не блокируем создание проекта
        }
      }

      const trackCountMessage = formData.type === 'single' 
        ? ' и трек добавлен' 
        : (generatedData.suggested_tracks && generatedData.suggested_tracks.length > 0)
          ? ` и ${generatedData.suggested_tracks.length} треков добавлено`
          : '';

      toast({
        title: "Успешно",
        description: `Проект создан с помощью ИИ${trackCountMessage}`,
      });

      form.reset();
      setGeneratedData(null);
      onProjectCreated?.();
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать проект",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !loading && !generating) {
      form.reset();
      setGeneratedData(null);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Создать проект с помощью ИИ
          </DialogTitle>
          <DialogDescription>
            Опишите идею проекта, и ИИ создаст детальную концепцию
          </DialogDescription>
        </DialogHeader>

        {!generatedData ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(generateProjectData)} className="space-y-6">
              <FormField
                control={form.control}
                name="artistId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Артист</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите артиста" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {artists.map((artist) => (
                          <SelectItem key={artist.id} value={artist.id}>
                            <div>
                              <div className="font-medium">{artist.name}</div>
                              {artist.metadata?.genre && (
                                <div className="text-xs text-muted-foreground">
                                  {artist.metadata.genre}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectIdea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Идея проекта</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Опишите вашу идею для проекта: тематику, настроение, концепцию, вдохновение..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Чем подробнее опишете идею, тем лучше будет результат
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Тип проекта</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите тип" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {type.description}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="additionalContext"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дополнительный контекст (опционально)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Дополнительные детали, требования, пожелания..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Любая дополнительная информация для лучшего понимания проекта
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={generating}
                >
                  Отмена
                </Button>
                <Button type="submit" disabled={generating}>
                  {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Bot className="mr-2 h-4 w-4" />
                  Генерировать с ИИ
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Сгенерированная концепция
                </CardTitle>
                <CardDescription>
                  ИИ создал концепцию на основе ваших требований
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Название проекта</h4>
                  <p className="text-lg font-semibold">{generatedData.title}</p>
                </div>

                {generatedData.description && (
                  <div>
                    <h4 className="font-medium mb-2">Описание</h4>
                    <p className="text-muted-foreground">{generatedData.description}</p>
                  </div>
                )}

                {generatedData.concept && (
                  <div>
                    <h4 className="font-medium mb-2">Концепция</h4>
                    <p className="text-muted-foreground">{generatedData.concept}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {generatedData.genre && (
                    <div>
                      <h4 className="font-medium mb-1">Жанр</h4>
                      <Badge variant="secondary">{generatedData.genre}</Badge>
                    </div>
                  )}

                  {generatedData.mood && (
                    <div>
                      <h4 className="font-medium mb-1">Настроение</h4>
                      <Badge variant="outline">{generatedData.mood}</Badge>
                    </div>
                  )}
                </div>

                {generatedData.suggested_tracks && generatedData.suggested_tracks.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Предложенные темы</h4>
                    <div className="flex flex-wrap gap-2">
                      {generatedData.suggested_tracks.map((track, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {track}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setGeneratedData(null)}
                disabled={loading}
              >
                Изменить
              </Button>
              <Button onClick={createProject} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Создать проект
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}