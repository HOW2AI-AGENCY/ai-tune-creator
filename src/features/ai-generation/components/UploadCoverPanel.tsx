import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Music, FileAudio } from "lucide-react";

/**
 * @interface UploadCoverPanelProps
 * @description Свойства для компонента UploadCoverPanel.
 * @property {string} prompt - Текущее значение промпта для стиля кавера.
 * @property {(value: string) => void} onPromptChange - Обработчик изменения промпта.
 * @property {(url: string) => void} onUploadComplete - Обработчик, вызываемый после успешной загрузки файла.
 */
interface UploadCoverPanelProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  onUploadComplete: (url: string) => void;
}

/**
 * @component UploadCoverPanel
 * @description Компонент, предоставляющий UI для загрузки аудио и ввода промпта
 *              для функции "Upload and Cover Audio".
 * @param {UploadCoverPanelProps} props - Свойства компонента.
 */
export function UploadCoverPanel({ prompt, onPromptChange, onUploadComplete }: UploadCoverPanelProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);

  // HACK: Можно добавить обработку ошибок из хука useFileUpload, чтобы показывать их пользователю.
  const { uploadFile, uploading, progress } = useFileUpload({
    onUploadComplete: (url) => {
      onUploadComplete(url);
    },
    allowedTypes: ['audio/mpeg', 'audio/wav', 'audio/m4a'],
    maxSize: 50, // 50MB
  });

  const handleFileSelect = async (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      // Automatically upload the file when selected
      // TODO: Добавить обработку возможной ошибки при загрузке и сброс selectedFile.
      await uploadFile(file, 'covers', file.name);
    } else {
      // Clear the URL if the file is cleared
      onUploadComplete("");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileAudio className="h-4 w-4" />
            1. Загрузите аудио
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            onFileSelect={handleFileSelect}
            accept="audio/mpeg,audio/wav,audio/m4a"
            maxSize={50 * 1024 * 1024}
            placeholder="Перетащите аудиофайл сюда..."
          />
          {uploading && (
            <div className="mt-2">
              <Label className="text-xs">Загрузка...</Label>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
          {selectedFile && !uploading && (
             <p className="text-xs text-muted-foreground mt-2">Выбран файл: {selectedFile.name}</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Music className="h-4 w-4" />
            2. Опишите новый стиль
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Например: 'Эпичный саундтрек в стиле Ханса Циммера' или 'Танцевальный поп-трек в стиле 80-х'"
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            className="min-h-[100px] text-sm resize-none"
          />
        </CardContent>
      </Card>
    </div>
  );
}
