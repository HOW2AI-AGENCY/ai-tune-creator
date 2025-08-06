import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useFileUpload } from "@/hooks/useFileUpload";
import { supabase } from "@/integrations/supabase/client";

interface ArtistBannerUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistId: string;
  artistName: string;
  onBannerUploaded?: (bannerUrl: string) => void;
}

export function ArtistBannerUploadDialog({
  open,
  onOpenChange,
  artistId,
  artistName,
  onBannerUploaded
}: ArtistBannerUploadDialogProps) {
  const [uploadLoading, setUploadLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const { toast } = useToast();
  const { generateImage, generating } = useImageGeneration();
  const { uploadFile } = useFileUpload({
    bucket: 'artist-assets',
    folder: `${artistId}/banners`
  });

  const updateArtistBanner = async (bannerUrl: string) => {
    try {
      const currentMetadata = await supabase
        .from('artists')
        .select('metadata')
        .eq('id', artistId)
        .single();

      const metadata = currentMetadata.data?.metadata || {};
      
      const { error } = await supabase
        .from('artists')
        .update({ 
          metadata: { 
            ...(metadata as object), 
            banner_url: bannerUrl 
          }
        })
        .eq('id', artistId);

      if (error) throw error;

      onBannerUploaded?.(bannerUrl);
      toast({
        title: "Успешно",
        description: "Баннер артиста обновлен"
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating artist banner:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить баннер артиста",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploadLoading(true);
      
      // Проверка типа файла
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Ошибка",
          description: "Пожалуйста, выберите изображение",
          variant: "destructive"
        });
        return;
      }

      // Проверка размера файла (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Ошибка",
          description: "Размер файла не должен превышать 10MB",
          variant: "destructive"
        });
        return;
      }

      const fileName = `banner-${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = await uploadFile(file, fileName);
      
      if (filePath) {
        const { data } = supabase.storage
          .from('artist-assets')
          .getPublicUrl(filePath);
        
        await updateArtistBanner(data.publicUrl);
      }
    } catch (error: any) {
      console.error('Error uploading banner:', error);
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

    try {
      const { data, error } = await supabase.functions.invoke('generate-cover-image', {
        body: {
          prompt: `Artist banner for ${artistName}: ${prompt}`,
          artistId,
          style: 'banner',
          format: 'wide'
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        await updateArtistBanner(data.imageUrl);
      }
    } catch (error: any) {
      console.error('Error generating banner:', error);
      toast({
        title: "Ошибка генерации",
        description: error.message || "Не удалось сгенерировать баннер",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Загрузить баннер артиста</DialogTitle>
          <DialogDescription>
            Загрузите изображение или сгенерируйте его с помощью ИИ для баннера артиста {artistName}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Загрузить</TabsTrigger>
            <TabsTrigger value="generate">Генерировать</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="banner-file">Выберите изображение</Label>
                <Input
                  id="banner-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file);
                    }
                  }}
                  disabled={uploadLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Рекомендуемый размер: 1200x400px. Максимальный размер: 10MB
                </p>
              </div>

              <Button 
                onClick={() => document.getElementById('banner-file')?.click()}
                disabled={uploadLoading}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadLoading ? 'Загрузка...' : 'Выбрать файл'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="generate" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Описание баннера</Label>
                <Textarea
                  id="prompt"
                  placeholder={`Например: концертная сцена с неоновым освещением для ${artistName}, атмосферный фон в стиле хип-хоп...`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <p className="text-sm text-muted-foreground">
                  Опишите как должен выглядеть баннер для артиста
                </p>
              </div>

              <Button 
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="w-full"
              >
                <Wand2 className="mr-2 h-4 w-4" />
                {generating ? 'Генерация...' : 'Сгенерировать баннер'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}