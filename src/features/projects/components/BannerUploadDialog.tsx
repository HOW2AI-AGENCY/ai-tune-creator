import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useImageGeneration } from "@/features/ai-generation/hooks/useImageGeneration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Sparkles, Loader2, Image as ImageIcon } from "lucide-react";

interface BannerUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  onBannerUploaded?: (bannerUrl: string) => void;
}

export function BannerUploadDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  onBannerUploaded
}: BannerUploadDialogProps) {
  const { toast } = useToast();
  const [uploadLoading, setUploadLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const { generateImage, generating } = useImageGeneration({
    onImageGenerated: (imageUrl) => {
      onBannerUploaded?.(imageUrl);
      updateProjectBanner(imageUrl);
      onOpenChange(false);
    }
  });

  const updateProjectBanner = async (bannerUrl: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          metadata: { banner_url: bannerUrl }
        })
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "Успешно",
        description: "Баннер проекта обновлен"
      });
    } catch (error: any) {
      console.error('Error updating banner:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить баннер",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploadLoading(true);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Пожалуйста, выберите файл изображения');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Размер файла не должен превышать 10MB');
      }

      const fileName = `${projectId}-banner-${Date.now()}.${file.name.split('.').pop()}`;

      const { data, error } = await supabase.storage
        .from('project-covers')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('project-covers')
        .getPublicUrl(fileName);

      if (urlData.publicUrl) {
        onBannerUploaded?.(urlData.publicUrl);
        updateProjectBanner(urlData.publicUrl);
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Ошибка загрузки",
        description: error.message || "Не удалось загрузить файл",
        variant: "destructive"
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите описание для генерации баннера",
        variant: "destructive"
      });
      return;
    }

    const response = await supabase.functions.invoke('generate-cover-image', {
      body: {
        prompt: prompt.trim(),
        projectId,
        type: 'banner'
      }
    });

    if (response.error) {
      toast({
        title: "Ошибка генерации",
        description: response.error.message || "Не удалось сгенерировать баннер",
        variant: "destructive"
      });
      return;
    }

    if (response.data?.imageUrl) {
      onBannerUploaded?.(response.data.imageUrl);
      updateProjectBanner(response.data.imageUrl);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Баннер проекта
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Загрузить
            </TabsTrigger>
            <TabsTrigger value="generate" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Генерировать
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="file-upload">Выберите изображение</Label>
                    <Input
                      id="file-upload"
                      type="file"
                      accept="image/*"
                      disabled={uploadLoading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="mt-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Поддерживаются форматы: JPG, PNG, WebP. Максимум 10MB.
                      Рекомендуемый размер: 1792x1008px (16:9)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generate" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="prompt">Описание баннера</Label>
                    <Textarea
                      id="prompt"
                      placeholder={`Баннер для ${projectTitle}. Например: "Темный киберпанк город с неоновыми огнями"`}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      disabled={generating}
                      className="mt-2"
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Опишите желаемый стиль и атмосферу баннера
                    </p>
                  </div>

                  <Button
                    onClick={handleGenerate}
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
                        <Sparkles className="h-4 w-4" />
                        Сгенерировать баннер
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}