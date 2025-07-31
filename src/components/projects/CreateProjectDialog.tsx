import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import { Loader2, Music, Play, FolderOpen } from "lucide-react";

interface Artist {
  id: string;
  name: string;
}

interface CreateProjectDialogProps {
  artist: Artist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: () => void;
}

const formSchema = z.object({
  title: z.string().min(1, "Название проекта обязательно"),
  description: z.string().optional(),
  type: z.enum(["album", "single", "ep"], {
    required_error: "Выберите тип проекта",
  }),
  status: z.enum(["draft", "in_progress", "published"], {
    required_error: "Выберите статус проекта",
  }),
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
}: CreateProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "single",
      status: "draft",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Пользователь не авторизован");
      }

      const { error } = await supabase.from("projects").insert({
        title: data.title,
        description: data.description || null,
        type: data.type,
        status: data.status,
        artist_id: artist.id,
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
    if (!newOpen && !loading) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Создать новый проект</DialogTitle>
          <DialogDescription>
            Создание нового музыкального проекта для артиста {artist.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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