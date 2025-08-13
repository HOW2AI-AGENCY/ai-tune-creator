import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { FileText, Music2, Mic2, Settings2, Clock } from "lucide-react";
import { tempoOptions, durationOptions, voiceStyles, languages } from "../data/presets";

interface CustomModePanelProps {
  customLyrics: string;
  onCustomLyricsChange: (lyrics: string) => void;
  tempo: string;
  onTempoChange: (tempo: string) => void;
  duration: number;
  onDurationChange: (duration: number) => void;
  instrumental: boolean;
  onInstrumentalChange: (instrumental: boolean) => void;
  voiceStyle: string;
  onVoiceStyleChange: (voiceStyle: string) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  stylePrompt: string;
  onStylePromptChange: (stylePrompt: string) => void;
}

export function CustomModePanel({
  customLyrics,
  onCustomLyricsChange,
  tempo,
  onTempoChange,
  duration,
  onDurationChange,
  instrumental,
  onInstrumentalChange,
  voiceStyle,
  onVoiceStyleChange,
  language,
  onLanguageChange,
  stylePrompt,
  onStylePromptChange
}: CustomModePanelProps) {
  return (
    <div className="space-y-4">
      {/* Пользовательская лирика */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Пользовательская лирика
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Введите текст песни...&#10;&#10;[Verse 1]&#10;Здесь может быть ваш текст&#10;С любой структурой&#10;&#10;[Chorus]&#10;Припев песни..."
            value={customLyrics}
            onChange={(e) => onCustomLyricsChange(e.target.value)}
            className="min-h-[120px] text-sm resize-none font-mono"
          />
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-xs">Поддерживаются SUNO теги</Badge>
            <Badge variant="outline" className="text-xs">[Verse], [Chorus], [Bridge]</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Настройки звучания */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Music2 className="h-4 w-4" />
            Настройки звучания
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Темп</Label>
              <Select value={tempo} onValueChange={onTempoChange}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Выберите темп" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Автоматически</SelectItem>
                  {tempoOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Длительность</Label>
              <Select value={duration.toString()} onValueChange={(v) => onDurationChange(parseInt(v))}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map(option => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Вокальные настройки */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground flex items-center gap-2">
                <Mic2 className="h-3 w-3" />
                Инструментальная версия
              </Label>
              <Switch
                checked={instrumental}
                onCheckedChange={onInstrumentalChange}
              />
            </div>

            {!instrumental && (
              <>
                <div>
                  <Label className="text-xs text-muted-foreground">Стиль вокала</Label>
                  <Select value={voiceStyle} onValueChange={onVoiceStyleChange}>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Выберите стиль" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Автоматически</SelectItem>
                      {voiceStyles.map(style => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Язык вокала</Label>
                  <Select value={language} onValueChange={onLanguageChange}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map(lang => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Стилевые инструкции */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Дополнительные инструкции
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Дополнительные инструкции по стилю:&#10;- Использовать электрогитары&#10;- Добавить струнные&#10;- Сделать более драматично..."
            value={stylePrompt}
            onChange={(e) => onStylePromptChange(e.target.value)}
            className="min-h-[80px] text-sm resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Опишите конкретные инструменты, эффекты или стилистические особенности
          </p>
        </CardContent>
      </Card>
    </div>
  );
}