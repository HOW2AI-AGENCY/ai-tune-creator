import { useState } from "react";
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

const createArtistSchema = z.object({
  name: z.string().min(1, "Название артиста обязательно"),
  description: z.string().optional(),
  metadata: z.object({
    genre: z.string().optional(),
    location: z.string().optional(),
    background: z.string().optional(),
    style: z.string().optional(),
    influences: z.array(z.string()).optional(),
  }).optional()
});

type CreateArtistForm = z.infer<typeof createArtistSchema>;

interface CreateArtistDialogProps {
  onArtistCreated?: () => void;
}

export function CreateArtistDialog({ onArtistCreated }: CreateArtistDialogProps) {
  const [open, setOpen] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const { uploadFile, uploading } = useFileUpload({
    bucket: 'avatars',
    folder: 'artists'
  });

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

  const handleFileSelect = (file: File | null) => {
    setAvatarFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAvatarPreview("");
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
      const { data, error } = await supabase.functions.invoke('generate-artist-info', {
        body: {
          name: artistName,
          context: "Российский музыкальный артист"
        }
      });

      if (error) throw error;

      const { artistInfo } = data;
      
      // Заполняем форму сгенерированными данными
      form.setValue('description', artistInfo.description);
      form.setValue('metadata.genre', artistInfo.genre);
      form.setValue('metadata.location', artistInfo.location);
      form.setValue('metadata.background', artistInfo.background);
      form.setValue('metadata.style', artistInfo.style);
      form.setValue('metadata.influences', artistInfo.influences);

      toast({
        title: "Успешно",
        description: "Информация об артисте сгенерирована"
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

  const onSubmit = async (data: CreateArtistForm) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Ошибка",
          description: "Пользователь не авторизован",
          variant: "destructive"
        });
        return;
      }

      let avatarUrl = null;

      // Upload avatar if provided
      if (avatarFile) {
        avatarUrl = await uploadFile(avatarFile);
        if (!avatarUrl) {
          return; // Error handling is done in uploadFile
        }
      }

      // Create artist
      const { error } = await supabase
        .from('artists')
        .insert({
          user_id: user.id,
          name: data.name,
          description: data.description || null,
          avatar_url: avatarUrl,
          metadata: data.metadata || {}
        });

      if (error) {
        throw error;
      }

      toast({
        title: "Успешно",
        description: "Артист создан"
      });

      // Reset form and close dialog
      form.reset();
      setAvatarFile(null);
      setAvatarPreview("");
      setOpen(false);
      onArtistCreated?.();

    } catch (error: any) {
      console.error('Create artist error:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Произошла ошибка при создании артиста",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-glow">
          <Plus className="mr-2 h-4 w-4" />
          Новый артист
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать нового артиста</DialogTitle>
          <DialogDescription>
            Добавьте информацию о новом артисте
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
                disabled={uploading || form.formState.isSubmitting}
                className="flex-1"
              >
                {uploading || form.formState.isSubmitting ? "Создание..." : "Создать"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}