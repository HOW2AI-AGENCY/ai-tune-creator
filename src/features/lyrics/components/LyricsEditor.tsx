import React from 'react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

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
  placeholder = "Введите текст песни...\n\nИспользуйте теги структуры:\n[Verse]\n[Chorus]\n[Bridge]",
  className = '',
}: LyricsEditorProps) {
  return (
    <div className={`lyrics-editor ${className}`}>
      <Card className="flex-1 flex flex-col overflow-hidden">
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