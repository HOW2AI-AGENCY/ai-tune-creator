import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music2, Settings, Clock, Mic, Volume2, Eye, X } from "lucide-react";
import { GenerationParams } from "../types";

interface GenerationParametersPreviewProps {
  params: GenerationParams;
  onEdit: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function GenerationParametersPreview({ 
  params, 
  onEdit, 
  onConfirm, 
  onCancel 
}: GenerationParametersPreviewProps) {
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Предварительный просмотр генерации
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Основная информация */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Music2 className="h-4 w-4 text-primary" />
            <span className="font-medium">Сервис:</span>
            <Badge variant={params.service === 'suno' ? 'default' : 'secondary'}>
              {params.service === 'suno' ? 'Suno AI' : 'Mureka'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Режим:</span>
            <Badge variant="outline">
              {params.mode === 'quick' ? 'Быстрая генерация' : 'Кастомные настройки'}
            </Badge>
          </div>
        </div>

        {/* Описание */}
        {params.prompt && (
          <div>
            <h4 className="font-medium text-sm mb-2">Описание трека:</h4>
            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md">
              {params.prompt}
            </p>
          </div>
        )}

        {/* Кастомная лирика */}
        {params.customLyrics && (
          <div>
            <h4 className="font-medium text-sm mb-2">Кастомная лирика:</h4>
            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md max-h-24 overflow-y-auto">
              {params.customLyrics}
            </p>
          </div>
        )}

        {/* Музыкальные параметры */}
        <div className="grid grid-cols-2 gap-3">
          {params.genreTags && params.genreTags.length > 0 && (
            <div>
              <span className="text-sm font-medium">Стиль:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {params.genreTags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {params.duration && (
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span className="text-sm">{params.duration}с</span>
            </div>
          )}

          {params.tempo && params.tempo !== 'none' && (
            <div className="flex items-center gap-2">
              <Music2 className="h-3 w-3" />
              <span className="text-sm">Темп: {params.tempo}</span>
            </div>
          )}

          {params.instrumental && (
            <div className="flex items-center gap-2">
              <Volume2 className="h-3 w-3" />
              <span className="text-sm">Инструментальный</span>
            </div>
          )}

          {params.voiceStyle && params.voiceStyle !== 'none' && (
            <div className="flex items-center gap-2">
              <Mic className="h-3 w-3" />
              <span className="text-sm">Голос: {params.voiceStyle}</span>
            </div>
          )}

          {params.language && (
            <div className="flex items-center gap-2">
              <span className="text-sm">Язык: {params.language === 'ru' ? 'Русский' : 'Английский'}</span>
            </div>
          )}
        </div>

        {/* Кнопки управления */}
        <div className="flex gap-2 pt-2">
          <Button onClick={onEdit} variant="outline" className="flex-1">
            Изменить
          </Button>
          <Button onClick={onConfirm} className="flex-1">
            Начать генерацию
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}