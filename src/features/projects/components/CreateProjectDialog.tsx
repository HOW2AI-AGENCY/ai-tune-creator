import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useImageGeneration } from "@/features/ai-generation/hooks/useImageGeneration";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Music, Play, FolderOpen, Upload, Wand2, Image as ImageIcon, Camera } from "lucide-react";

interface Artist {
  id: string;
  name: string;
}

interface CreateProjectDialogProps {
  artist?: Artist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (data?: any) => void;
  initialData?: any;
  mode?: 'create' | 'edit';
}

const formSchema = z.object({
  title: z.string().min(1, "Название проекта обязательно"),
  description: z.string().optional(),
  type: z.enum(["album", "single", "ep"], {
    message: "Выберите тип проекта",
  }),
  status: z.enum(["draft", "in_progress", "published"], {
    message: "Выберите статус проекта",
  }),
  artistId: z.string().min(1, "Выберите артиста"),
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

const PROJECT_STATUSES = [
  {
    value: "draft",
    label: "Черновик",
    description: "Проект только начат",
  },
  {
    value: "in_progress",
    label: "В работе",
    description: "Активная работа над проектом",
  },
  {
    value: "published",
    label: "Опубликован",
    description: "Проект готов и опубликован",
  },
];

export function CreateProjectDialog({
  artist,
  open,
  onOpenChange,
  onProjectCreated,
  initialData,
  mode = 'create',
}: CreateProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [coverUrl, setCoverUrl] = useState("");
  const [coverPrompt, setCoverPrompt] = useState("");
  const { toast } = useToast();

  const { uploadFile, uploading } = useFileUpload({
    bucket: 'project-covers',
    folder: 'covers',
    maxSize: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  });

  const { generateImage, generating } = useImageGeneration({
    onImageGenerated: (imageUrl) => setCoverUrl(imageUrl)
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      type: initialData?.type || "single",
      status: initialData?.status || "draft",
      artistId: initialData?.artist_id || artist?.id || "",
    },
  });

  const loadArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name')
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
    if (open && !artist) {
      loadArtists();
    }
  }, [open, artist]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const uploadedUrl = await uploadFile(file);
    if (uploadedUrl) {
      setCoverUrl(uploadedUrl);
    }
  };

  const handleGenerateCover = async () => {
    if (!coverPrompt.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите описание для генерации обложки",
        variant: "destructive"
      });
      return;
    }

    await generateImage(coverPrompt);
  };

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      if (mode === 'edit') {
        // Режим редактирования
        onProjectCreated?.(data);
      } else {
        // Режим создания
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Пользователь не авторизован");
        }

        const { error } = await supabase.from("projects").insert({
          title: data.title,
          description: data.description || null,
          type: data.type,
          status: data.status,
          artist_id: data.artistId,
          cover_url: coverUrl || null,
          cover_metadata: coverUrl ? {
            uploaded_at: new Date().toISOString(),
            type: coverUrl.includes('generated') ? 'ai_generated' : 'uploaded'
          } : null,
          metadata: {
            created_by: user.id,
            created_at: new Date().toISOString(),
          },
        });

        if (error) throw error;

        toast({
          title: "Успешно",
          description: "Проект создан",
        });

        form.reset();
        setCoverUrl("");
        setCoverPrompt("");
        onProjectCreated?.();
      }
    } catch (error: any) {
      console.error("Error creating/updating project:", error);
      toast({
        title: "Ошибка",
        description: mode === 'edit' ? "Не удалось обновить проект" : "Не удалось создать проект",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !loading) {
      form.reset();
      setCoverUrl("");
      setCoverPrompt("");
      if (!artist) {
        form.setValue('artistId', '');
      }
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Редактировать проект' : 'Создать новый проект'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Редактирование музыкального проекта'
              : artist 
                ? `Создание нового музыкального проекта для артиста ${artist.name}`
                : "Создание нового музыкального проекта"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {!artist && (
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
                        {artists.map((artistOption) => (
                          <SelectItem key={artistOption.id} value={artistOption.id}>
                            {artistOption.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название проекта</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Название альбома, сингла или EP"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Введите название вашего музыкального проекта
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание (опционально)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Краткое описание проекта, концепция, история создания..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Опишите концепцию и идею проекта
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROJECT_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            <div>
                              <div className="font-medium">{status.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {status.description}
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
            </div>

            {/* Cover Upload Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                <FormLabel>Обложка проекта (опционально)</FormLabel>
              </div>
              
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload" className="gap-2">
                    <Upload className="h-4 w-4" />
                    Загрузить
                  </TabsTrigger>
                  <TabsTrigger value="generate" className="gap-2">
                    <Wand2 className="h-4 w-4" />
                    Генерировать ИИ
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-3">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <FormDescription>
                    Поддерживаются форматы: JPEG, PNG, WebP. Максимум: 10MB
                  </FormDescription>
                  {uploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Загрузка...
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="generate" className="space-y-3">
                  <Input
                    value={coverPrompt}
                    onChange={(e) => setCoverPrompt(e.target.value)}
                    placeholder="Опишите желаемую обложку..."
                    disabled={generating}
                  />
                  <Button 
                    type="button"
                    onClick={handleGenerateCover} 
                    disabled={generating || !coverPrompt.trim()}
                    className="w-full gap-2"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Генерация...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        Сгенерировать
                      </>
                    )}
                  </Button>
                  <FormDescription>
                    Например: "Минималистичная обложка в синих тонах с абстрактными волнами для электронной музыки"
                  </FormDescription>
                </TabsContent>
              </Tabs>

              {/* Cover Preview */}
              {coverUrl && (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <FormLabel>Предпросмотр обложки</FormLabel>
                      <div className="flex justify-center">
                        <img
                          src={coverUrl}
                          alt="Предпросмотр обложки"
                          className="w-32 h-32 rounded-lg object-cover border"
                        />
                      </div>
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm"
                        onClick={() => setCoverUrl("")}
                        className="w-full gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        Удалить обложку
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Создать проект
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}