import React from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useLyricsAutoSave } from '../hooks/useLyricsAutoSave';

interface LyricsEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (lyrics: string) => Promise<void>;
  autoSave?: boolean;
  placeholder?: string;
  trackTitle?: string;
  className?: string;
  showSidebar?: boolean;
}

export function LyricsEditor({
  value,
  onChange,
  onSave,
  autoSave = false,
  placeholder = "Введите текст песни...\n\nИспользуйте теги структуры:\n[Verse]\n[Chorus]\n[Bridge]",
  className = '',
}: LyricsEditorProps) {
  const { hasUnsavedChanges, isSaving } = useLyricsAutoSave(value, {
    enabled: autoSave && !!onSave,
    onSave,
  });
  return (
    <div className={`lyrics-editor ${className}`}>
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Status bar for auto-save */}
        {autoSave && onSave && (
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
            <span className="text-xs text-muted-foreground">
              Автосохранение включено
            </span>
            <div className="flex items-center gap-2">
              {isSaving && (
                <Badge variant="secondary" className="text-xs">
                  Сохранение...
                </Badge>
              )}
              {hasUnsavedChanges && !isSaving && (
                <Badge variant="outline" className="text-xs">
                  Есть несохраненные изменения
                </Badge>
              )}
              {!hasUnsavedChanges && !isSaving && (
                <Badge variant="default" className="text-xs">
                  Сохранено
                </Badge>
              )}
            </div>
          </div>
        )}
        
        <div className="flex-1 relative">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-[400px] resize-none border-0 bg-transparent focus:outline-none font-mono text-sm leading-relaxed"
          />
        </div>
      </Card>
    </div>
  );
}