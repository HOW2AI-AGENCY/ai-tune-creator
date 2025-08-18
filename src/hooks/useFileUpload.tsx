import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BUCKET_AUDIO, buildStoragePath, isValidAudioUrl, BUCKET_PROJECT_COVERS, BUCKET_ARTIST_ASSETS, BUCKET_USER_UPLOADS } from '@/lib/storage/constants';

interface UseFileUploadProps {
  onUploadComplete?: (url: string, metadata?: any) => void;
  onUploadError?: (error: string) => void;
  allowedTypes?: string[];
  maxSize?: number; // in MB
  bucket?: string; // For backward compatibility
  folder?: string; // Default folder for uploads
}

export function useFileUpload({
  onUploadComplete,
  onUploadError,
  allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg'],
  maxSize = 50,
  bucket, // Ignored for now, using BUCKET_AUDIO constant
  folder
}: UseFileUploadProps = {}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const uploadFile = useCallback(async (
    file: File,
    uploadFolder?: string,
    fileName?: string
  ): Promise<string | null> => {
    if (!file) {
      toast({
        title: "Ошибка", 
        description: "Файл не выбран",
        variant: "destructive"
      });
      return null;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      const errorMsg = `Файл слишком большой. Максимальный размер: ${maxSize}MB`;
      toast({
        title: "Ошибка", 
        description: errorMsg,
        variant: "destructive"
      });
      onUploadError?.(errorMsg);
      return null;
    }

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      const errorMsg = "Неподдерживаемый тип файла";
      toast({
        title: "Ошибка", 
        description: errorMsg,
        variant: "destructive"
      });
      onUploadError?.(errorMsg);
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

      // Build safe file path using storage utilities
      const sanitizedFileName = fileName || file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const targetFolder = uploadFolder || folder || 'uploads';
      const filePath = buildStoragePath(
        user.id,
        targetFolder as 'suno' | 'mureka', // Type assertion for now
        Date.now().toString(),
        sanitizedFileName
      );

      console.log('Uploading to path:', filePath);

      setProgress(25);

      // Upload file to storage with proper configuration
      const bucketToUse = bucket === 'project-covers' ? BUCKET_PROJECT_COVERS 
                         : bucket === 'artist-assets' ? BUCKET_ARTIST_ASSETS
                         : bucket === 'user-uploads' ? BUCKET_USER_UPLOADS
                         : BUCKET_AUDIO;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketToUse)
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: 'public, max-age=31536000, immutable',
          upsert: false // Prevent overwrites due to unique filename
        });

      if (uploadError) {
        throw uploadError;
      }

      setProgress(75);

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from(bucketToUse)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Validate the generated URL
      if (!isValidAudioUrl(publicUrl)) {
        throw new Error('Generated URL failed validation');
      }

      setProgress(100);
      
      toast({
        title: "Успешно",
        description: "Файл загружен"
      });

      const metadata = {
        fileName: sanitizedFileName,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        storagePath: filePath
      };

      onUploadComplete?.(publicUrl, metadata);
      return publicUrl;

    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMsg = error.message || 'Ошибка загрузки файла';
      
      toast({
        title: "Ошибка загрузки",
        description: errorMsg,
        variant: "destructive"
      });

      onUploadError?.(errorMsg);
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }, [allowedTypes, maxSize, toast, onUploadComplete, onUploadError, folder]);

  const deleteFile = useCallback(async (filePath: string, bucketName?: string): Promise<boolean> => {
    try {
      const bucketToUse = bucketName || BUCKET_AUDIO;
      const { error } = await supabase.storage
        .from(bucketToUse)
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
        title: "Ошибка удаления",
        description: error.message || 'Не удалось удалить файл',
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  return {
    uploadFile,
    deleteFile,
    uploading,
    progress
  };
}