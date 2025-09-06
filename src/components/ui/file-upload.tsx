import * as React from "react";
import { cn } from "@/lib/utils";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SecureFileValidator } from "@/lib/security/secure-file-validation";
import { toast } from "sonner";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in bytes
  preview?: string;
  className?: string;
  placeholder?: string;
}

export function FileUpload({
  onFileSelect,
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB default
  preview,
  className,
  placeholder = "Перетащите файл сюда или нажмите для выбора"
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (file: File | null) => {
    setError(null);
    
    if (file) {
      // Determine upload type based on accept prop
      let uploadType: 'image' | 'audio' | 'general' = 'general';
      if (accept?.includes('image/')) uploadType = 'image';
      else if (accept?.includes('audio/')) uploadType = 'audio';

      try {
        const validation = await SecureFileValidator.validateFile(file, uploadType);
        
        if (!validation.valid) {
          setError(validation.errors.join(', '));
          toast.error(`File validation failed: ${validation.errors.join(', ')}`);
          return;
        }
      } catch (error) {
        console.error('File validation failed:', error);
        setError('File validation failed');
        toast.error('Failed to validate file');
        return;
      }
    }
    
    onFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const clearFile = () => {
    handleFileChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
          "hover:border-primary/50 hover:bg-accent/5",
          isDragOver && "border-primary bg-accent/10",
          error && "border-destructive",
          "border-border"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInput}
          className="hidden"
        />
        
        {preview ? (
          <div className="relative">
            <img 
              src={preview} 
              alt="Preview" 
              className="max-w-full max-h-32 mx-auto rounded object-cover"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="text-center">
            {accept.includes('image') ? (
              <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            ) : (
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            )}
            <p className="text-sm text-muted-foreground">{placeholder}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Максимальный размер: {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}