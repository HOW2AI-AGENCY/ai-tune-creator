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
import { Plus } from "lucide-react";

const createArtistSchema = z.object({
  name: z.string().min(1, "Название артиста обязательно"),
  description: z.string().optional(),
  metadata: z.object({
    genre: z.string().optional(),
    location: z.string().optional(),
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
        location: ""
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
      <DialogContent className="max-w-md">
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
                    <FormControl>
                      <Input placeholder="Введите название артиста" {...field} />
                    </FormControl>
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

              <div className="grid grid-cols-2 gap-4">
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