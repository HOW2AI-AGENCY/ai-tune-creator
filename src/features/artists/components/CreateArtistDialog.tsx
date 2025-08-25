import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFileUpload";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { useCreateArtist, useUpdateArtist, Artist } from "@/hooks/data/useArtists";

const createArtistSchema = z.object({
  name: z.string().min(1, "Название артиста обязательно"),
  description: z.string().optional().nullable(),
  metadata: z.object({
    genre: z.string().optional(),
    location: z.string().optional(),
    background: z.string().optional(),
    style: z.string().optional(),
    influences: z.array(z.string()).optional(),
  }).optional(),
});

type CreateArtistForm = z.infer<typeof createArtistSchema>;

interface CreateArtistDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onArtistCreated?: () => void;
  editingArtist?: Artist;
}

export function CreateArtistDialog({ open: controlledOpen, onOpenChange, onArtistCreated, editingArtist }: CreateArtistDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { uploadFile, uploading } = useFileUpload({
    bucket: 'avatars',
    folder: 'artists'
  });

  const createArtistMutation = useCreateArtist();
  const updateArtistMutation = useUpdateArtist();

  const isSubmitting = createArtistMutation.isPending || updateArtistMutation.isPending;

  const form = useForm<CreateArtistForm>({
    resolver: zodResolver(createArtistSchema),
    defaultValues: {
      name: "",
      description: "",
      metadata: {
        genre: "",
        location: "",
        background: "",
        style: "",
        influences: []
      }
    }
  });

  useEffect(() => {
    if (editingArtist) {
      form.reset({
        name: editingArtist.name || "",
        description: editingArtist.description || "",
        metadata: {
          genre: editingArtist.metadata?.genre || "",
          location: editingArtist.metadata?.location || "",
          background: editingArtist.metadata?.background || "",
          style: editingArtist.metadata?.style || "",
          influences: editingArtist.metadata?.influences || [],
        },
      });
      if (editingArtist.avatar_url) {
        setAvatarPreview(editingArtist.avatar_url);
      }
    } else {
      form.reset({
        name: "",
        description: "",
        metadata: {
          genre: "",
          location: "",
          background: "",
          style: "",
          influences: []
        },
      });
      setAvatarPreview("");
    }
  }, [editingArtist, form]);

  const handleFileSelect = (file: File | null) => {
    setAvatarFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview(editingArtist?.avatar_url || "");
    }
  };

  const handleGenerateArtistInfo = async () => {
    const artistName = form.getValues('name');
    if (!artistName.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название артиста для генерации",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      console.log('Запуск генерации информации об артисте:', artistName);
      
      const systemPrompt = `Ты - эксперт по музыкальной индустрии. Сгенерируй подробную информацию об артисте на основе его имени. 
      Верни ответ строго в формате JSON со следующими полями:
      {
        "description": "подробное описание артиста (2-3 предложения)",
        "genre": "основной жанр музыки",
        "location": "город или страна происхождения",
        "background": "краткая история или бэкграунд",
        "style": "музыкальный стиль и особенности",
        "influences": ["список", "влияний", "и", "вдохновений"]
      }`;

      const prompt = `Сгенерируй информацию об артисте: ${artistName}
      
      Если это реальный артист - используй фактическую информацию.
      Если это вымышленное имя - создай правдоподобную информацию в стиле современной музыки.
      
      Ответ должен быть на русском языке.`;

      const { data, error } = await supabase.functions.invoke('generate-with-llm', {
        body: {
          prompt: systemPrompt + '\n\n' + prompt,
          provider: 'openai',
          model: 'gpt-4.1-2025-04-14'
        }
      });

      if (error) {
        console.error('Ошибка при вызове функции:', error);
        throw error;
      }

      console.log('Получен ответ от LLM:', data);

      if (!data?.content) {
        throw new Error('Пустой ответ от AI сервиса');
      }

      // Парсим JSON ответ
      let artistInfo;
      try {
        const jsonMatch = data.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          artistInfo = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('JSON не найден в ответе');
        }
      } catch (parseError) {
        console.error('Ошибка парсинга JSON:', parseError);
        console.log('Исходный ответ:', data.content);
        throw new Error('Ошибка обработки ответа AI');
      }
      
      // Заполняем форму сгенерированными данными
      if (artistInfo.description) form.setValue('description', artistInfo.description);
      if (artistInfo.genre) form.setValue('metadata.genre', artistInfo.genre);
      if (artistInfo.location) form.setValue('metadata.location', artistInfo.location);
      if (artistInfo.background) form.setValue('metadata.background', artistInfo.background);
      if (artistInfo.style) form.setValue('metadata.style', artistInfo.style);
      if (artistInfo.influences && Array.isArray(artistInfo.influences)) {
        form.setValue('metadata.influences', artistInfo.influences);
      }

      toast({
        title: "Успешно",
        description: `Информация об артисте сгенерирована с помощью ${data.provider.toUpperCase()}`
      });

    } catch (error: any) {
      console.error('Generate artist info error:', error);
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось сгенерировать информацию",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (formData: CreateArtistForm) => {
    let avatarUrl = editingArtist?.avatar_url || null;

    if (avatarFile) {
      const uploadedUrl = await uploadFile(avatarFile);
      if (!uploadedUrl) {
        return; // Error is handled by the useFileUpload hook
      }
      avatarUrl = uploadedUrl;
    }

    const submissionData = {
      ...formData,
      avatar_url: avatarUrl,
    };

    const handleSuccess = () => {
      form.reset();
      setAvatarFile(null);
      setAvatarPreview("");
      setOpen(false);
      onArtistCreated?.();
    };

    if (editingArtist) {
      updateArtistMutation.mutate(
        { id: editingArtist.id, data: submissionData },
        { onSuccess: handleSuccess }
      );
    } else {
      createArtistMutation.mutate(submissionData, { onSuccess: handleSuccess });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!editingArtist && (
        <DialogTrigger asChild>
          <Button className="shadow-glow">
            <Plus className="mr-2 h-4 w-4" />
            Новый артист
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingArtist ? 'Редактировать артиста' : 'Создать нового артиста'}</DialogTitle>
          <DialogDescription>
            {editingArtist ? 'Обновите информацию об артисте' : 'Добавьте информацию о новом артисте'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название артиста *</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="Введите название артиста" {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateArtistInfo}
                        disabled={isGenerating || !field.value.trim()}
                        className="shrink-0"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Опишите стиль, направление или другую информацию об артисте"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="metadata.genre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Жанр</FormLabel>
                      <FormControl>
                        <Input placeholder="Электроника, Hip-hop..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="metadata.location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Локация</FormLabel>
                      <FormControl>
                        <Input placeholder="Москва, Россия" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="metadata.background"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Предыстория</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Краткая предыстория артиста..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metadata.style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Музыкальный стиль</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Описание музыкального стиля..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metadata.influences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Влияния</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Влияния через запятую..."
                        value={field.value?.join(', ') || ''}
                        onChange={(e) => {
                          const influences = e.target.value
                            .split(',')
                            .map(s => s.trim())
                            .filter(Boolean);
                          field.onChange(influences);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <FormLabel>Аватар артиста</FormLabel>
                <div className="mt-2">
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    accept="image/*"
                    maxSize={2 * 1024 * 1024} // 2MB
                    preview={avatarPreview}
                    placeholder="Загрузите изображение аватара"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button 
                type="submit" 
                disabled={uploading || isSubmitting}
                className="flex-1"
              >
                {uploading ? "Загрузка..." : (isSubmitting ? (editingArtist ? "Обновление..." : "Создание...") : (editingArtist ? "Обновить" : "Создать"))}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}