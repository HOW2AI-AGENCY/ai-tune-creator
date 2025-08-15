import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseUrlFileUploadOptions {
  apiKey: string;
  baseUrl?: string;
}

interface UrlUploadRequest {
  fileUrl: string;
  uploadPath: string;
  fileName?: string;
}

interface FileUploadResult {
  fileName: string;
  filePath: string;
  downloadUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

interface ApiResponse {
  success: boolean;
  code: number;
  msg: string;
  data?: FileUploadResult;
}

export function useUrlFileUpload({ 
  apiKey, 
  baseUrl = 'https://sunoapiorg.redpandaai.co' 
}: UseUrlFileUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFromUrl = async (request: UrlUploadRequest): Promise<FileUploadResult | null> => {
    if (!request.fileUrl || !request.uploadPath) {
      toast({
        title: "Ошибка",
        description: "URL файла и путь загрузки обязательны",
        variant: "destructive"
      });
      return null;
    }

    setUploading(true);

    try {
      const response = await fetch(`${baseUrl}/api/file-url-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error(result.msg);
      }

      if (!result.data) {
        throw new Error('No file data returned');
      }

      toast({
        title: "Успешно",
        description: "Файл загружен с URL"
      });

      return result.data;
    } catch (error: any) {
      console.error('URL upload error:', error);
      toast({
        title: "Ошибка загрузки",
        description: error.message || "Не удалось загрузить файл с URL",
        variant: "destructive"
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return {
    uploadFromUrl,
    uploading
  };
}