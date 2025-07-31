import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Upload, Wand2, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CoverUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  currentCoverUrl?: string;
  onCoverUpdated: (newCoverUrl: string) => void;
}

export function CoverUploadDialog({
  open,
  onOpenChange,
  projectId,
  currentCoverUrl,
  onCoverUpdated
}: CoverUploadDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const { uploadFile, uploading } = useFileUpload({
    bucket: 'project-covers',
    folder: 'covers',
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const coverUrl = await uploadFile(file);
      if (coverUrl) {
        await updateProjectCover(coverUrl);
        setPreviewUrl(coverUrl);
      }
    } catch (error: any) {
      console.error('Error uploading cover:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить обложку",
        variant: "destructive"
      });
    }
  };

  const generateCover = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите описание для генерации обложки",
        variant: "destructive"
      });
      return;
    }

    try {
      setGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('generate-cover-image', {
        body: {
          prompt: `Music album cover: ${prompt}. Professional, high quality, artistic style.`,
          projectId,
          style: 'artistic'
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        await updateProjectCover(data.imageUrl);
        setPreviewUrl(data.imageUrl);
        toast({
          title: "Успешно",
          description: "Обложка сгенерирована и сохранена"
        });
      }
    } catch (error: any) {
      console.error('Error generating cover:', error);
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось сгенерировать обложку",
        variant: "destructive"
      });
    } finally {
      setGenerating(false);
    }
  };

  const updateProjectCover = async (coverUrl: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          cover_url: coverUrl,
          cover_metadata: {
            uploaded_at: new Date().toISOString(),
            type: coverUrl.includes('generated') ? 'ai_generated' : 'uploaded'
          }
        })
        .eq('id', projectId);

      if (error) throw error;

      onCoverUpdated(coverUrl);
    } catch (error: any) {
      console.error('Error updating project cover:', error);
      throw error;
    }
  };

  const handleSave = () => {
    if (previewUrl) {
      onOpenChange(false);
      setPreviewUrl(null);
      setPrompt("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Обложка проекта
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Загрузить файл
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-2">
              <Wand2 className="h-4 w-4" />
              Сгенерировать ИИ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cover-upload">Выберите изображение</Label>
              <Input
                id="cover-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <p className="text-sm text-muted-foreground">
                Поддерживаются форматы: JPEG, PNG, WebP. Максимальный размер: 10MB
              </p>
            </div>

            {uploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Загрузка изображения...
              </div>
            )}
          </TabsContent>

          <TabsContent value="generate" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Описание обложки</Label>
              <Textarea
                id="prompt"
                placeholder="Опишите желаемую обложку: стиль, цвета, настроение, элементы..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                disabled={generating}
              />
              <p className="text-sm text-muted-foreground">
                Например: "Минималистичная обложка в синих тонах с абстрактными волнами для электронной музыки"
              </p>
            </div>

            <Button 
              onClick={generateCover} 
              disabled={generating || !prompt.trim()}
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
                  Сгенерировать обложку
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Preview */}
        {(previewUrl || currentCoverUrl) && (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <Label>Предпросмотр</Label>
                <div className="flex justify-center">
                  <img
                    src={previewUrl || currentCoverUrl}
                    alt="Предпросмотр обложки"
                    className="w-48 h-48 rounded-lg object-cover border"
                  />
                </div>
                {previewUrl && (
                  <div className="flex gap-2">
                    <Button onClick={handleSave} className="flex-1">
                      Сохранить
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setPreviewUrl(null)}
                      className="flex-1"
                    >
                      Отменить
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}