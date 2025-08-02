import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Bold, 
  Italic, 
  Search, 
  Save, 
  Undo, 
  Redo, 
  Download, 
  Type,
  Music2,
  Hash
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { SONG_STRUCTURE_TAGS } from '@/lib/lyricsUtils';

interface LyricsToolbarProps {
  onInsertStructure: (tag: string) => void;
  onSearch: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  hasUnsavedChanges?: boolean;
  className?: string;
}

export function LyricsToolbar({
  onInsertStructure,
  onSearch,
  onSave,
  onUndo,
  onRedo,
  onExport,
  canUndo = false,
  canRedo = false,
  hasUnsavedChanges = false,
  className
}: LyricsToolbarProps) {
  return (
    <div className={`flex items-center gap-1 p-2 border-b bg-muted/30 ${className || ''}`}>
      {/* Structure Tags */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Music2 className="h-4 w-4" />
            Структура
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <div className="px-2 py-1">
            <p className="text-xs text-muted-foreground mb-2">Основные теги:</p>
          </div>
          {SONG_STRUCTURE_TAGS.slice(0, 8).map((tag) => (
            <DropdownMenuItem
              key={tag}
              onClick={() => onInsertStructure(tag)}
              className="text-sm"
            >
              <Hash className="h-3 w-3 mr-2" />
              {tag}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <div className="px-2 py-1">
            <p className="text-xs text-muted-foreground mb-2">Дополнительные:</p>
          </div>
          {SONG_STRUCTURE_TAGS.slice(8).map((tag) => (
            <DropdownMenuItem
              key={tag}
              onClick={() => onInsertStructure(tag)}
              className="text-sm"
            >
              <Hash className="h-3 w-3 mr-2" />
              {tag}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-6" />

      {/* Actions */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
        className="gap-1"
      >
        <Undo className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRedo}
        disabled={!canRedo}
        className="gap-1"
      >
        <Redo className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onSearch}
        className="gap-1"
      >
        <Search className="h-4 w-4" />
        Поиск
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <Button
        variant="ghost"
        size="sm"
        onClick={onExport}
        className="gap-1"
      >
        <Download className="h-4 w-4" />
        Экспорт
      </Button>

      {/* Auto-save indicator */}
      <div className="flex-1 flex justify-end items-center gap-2">
        {hasUnsavedChanges && (
          <Badge variant="outline" className="text-xs">
            Несохранено
          </Badge>
        )}
        
        <Button
          variant={hasUnsavedChanges ? "default" : "ghost"}
          size="sm"
          onClick={onSave}
          className="gap-1"
        >
          <Save className="h-4 w-4" />
          Сохранить
        </Button>
      </div>
    </div>
  );
}