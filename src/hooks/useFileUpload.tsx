import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseFileUploadOptions {
  bucket: string;
  folder?: string;
  maxSize?: number;
  allowedTypes?: string[];
}

export function useFileUpload({
  bucket,
  folder = '',
  maxSize = 5 * 1024 * 1024, // 5MB default
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
}: UseFileUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const uploadFile = async (file: File, fileName?: string): Promise<string | null> => {
    if (!file) {
      toast({
        title: "Ошибка",
        description: "Файл не выбран",
        variant: "destructive"
      });
      return null;
    }

    // Validate file size
    if (file.size > maxSize) {
      toast({
        title: "Ошибка",
        description: `Файл слишком большой. Максимальный размер: ${Math.round(maxSize / (1024 * 1024))}MB`,
        variant: "destructive"
      });
      return null;
    }

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Ошибка", 
        description: "Неподдерживаемый тип файла",
        variant: "destructive"
      });
      return null;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Пользователь не авторизован');
      }

      // Generate file name if not provided
      const fileExtension = file.name.split('.').pop();
      const finalFileName = fileName || `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
      const filePath = folder ? `${folder}/${user.id}/${finalFileName}` : `${user.id}/${finalFileName}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      setProgress(100);
      
      toast({
        title: "Успешно",
        description: "Файл загружен"
      });

      return publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Ошибка загрузки",
        description: error.message || "Произошла ошибка при загрузке файла",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const deleteFile = async (filePath: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) {
        throw error;
      }

      toast({
        title: "Успешно",
        description: "Файл удален"
      });

      return true;
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Ошибка",
        description: error.message || "Произошла ошибка при удалении файла",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    uploadFile,
    deleteFile,
    uploading,
    progress
  };
}