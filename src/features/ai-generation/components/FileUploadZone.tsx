import React, { useCallback } from 'react';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadZoneProps {
  onFileUploaded?: (url: string, metadata?: any) => void;
  allowedTypes?: string[];
  maxSize?: number;
  bucket?: string;
  folder?: string;
  accept?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export function FileUploadZone({
  onFileUploaded,
  allowedTypes,
  maxSize,
  bucket,
  folder,
  accept = "audio/*",
  children,
  disabled = false
}: FileUploadZoneProps) {
  const { toast } = useToast();
  const { uploadFile, uploading, progress } = useFileUpload({
    onUploadComplete: onFileUploaded,
    allowedTypes,
    maxSize,
    bucket,
    folder
  });

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadFile(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить файл",
        variant: "destructive"
      });
    }

    // Reset input
    event.target.value = '';
  }, [uploadFile, toast]);

  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) return;

    try {
      await uploadFile(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить файл",
        variant: "destructive"
      });
    }
  }, [uploadFile, toast]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div
      className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
        id="file-upload"
      />
      
      {children || (
        <div className="space-y-4">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">
              Перетащите файл сюда или
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={disabled || uploading}
            >
              {uploading ? `Загрузка... ${progress}%` : 'Выберите файл'}
            </Button>
          </div>
          {allowedTypes && (
            <p className="text-xs text-muted-foreground">
              Поддерживаемые форматы: {allowedTypes.join(', ')}
            </p>
          )}
          {maxSize && (
            <p className="text-xs text-muted-foreground">
              Максимальный размер: {maxSize}MB
            </p>
          )}
        </div>
      )}
    </div>
  );
}