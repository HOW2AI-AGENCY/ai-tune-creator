/**
 * @fileoverview Draggable Lyrics Section Component
 * @version 0.01.033
 * 
 * Individual lyrics section с drag-and-drop и tag management
 */

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { GripVertical, X, Edit2, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LyricsSectionProps {
  section: {
    id: string;
    type: string;
    label: string;
    content: string;
    tags: Array<{
      id: string;
      category: string;
      label: string;
      color: string;
    }>;
    order: number;
  };
  isEditing: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  onAddTag: (tag: any) => void;
  onRemoveTag: (tagId: string) => void;
}

// Section type colors and emojis
const SECTION_STYLES = {
  intro: { color: 'border-blue-500', emoji: '🎵', bg: 'bg-blue-50' },
  verse: { color: 'border-purple-500', emoji: '📝', bg: 'bg-purple-50' },
  chorus: { color: 'border-pink-500', emoji: '🎤', bg: 'bg-pink-50' },
  bridge: { color: 'border-green-500', emoji: '🌉', bg: 'bg-green-50' },
  outro: { color: 'border-orange-500', emoji: '🎬', bg: 'bg-orange-50' },
  custom: { color: 'border-gray-500', emoji: '🎶', bg: 'bg-gray-50' },
};

export function LyricsSection({
  section,
  isEditing,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onAddTag,
  onRemoveTag,
}: LyricsSectionProps) {
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [localContent, setLocalContent] = useState(section.content);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [localLabel, setLocalLabel] = useState(section.label);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sectionStyle = SECTION_STYLES[section.type as keyof typeof SECTION_STYLES] || SECTION_STYLES.custom;

  const handleSaveContent = () => {
    onUpdate({ content: localContent });
    setIsEditingContent(false);
  };

  const handleSaveLabel = () => {
    onUpdate({ label: localLabel });
    setIsEditingLabel(false);
  };

  const handleCancelContent = () => {
    setLocalContent(section.content);
    setIsEditingContent(false);
  };

  const handleCancelLabel = () => {
    setLocalLabel(section.label);
    setIsEditingLabel(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-all duration-200',
        isDragging && 'opacity-50',
        isSelected && 'ring-2 ring-primary'
      )}
    >
      <Card
        className={cn(
          'border-l-4 hover:shadow-md transition-shadow cursor-pointer',
          sectionStyle.color,
          sectionStyle.bg
        )}
        onClick={onSelect}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isEditing && (
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-move touch-none"
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              
              <span className="text-xl">{sectionStyle.emoji}</span>
              
              {isEditingLabel ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={localLabel}
                    onChange={(e) => setLocalLabel(e.target.value)}
                    className="h-8 w-32"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveLabel();
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelLabel();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{section.label}</span>
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingLabel(true);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {section.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {section.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className={cn('text-xs', tag.color, 'text-white')}
                    >
                      {tag.label}
                      {isEditing && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveTag(tag.id);
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
              
              {isEditing && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isEditingContent ? (
            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
              <Textarea
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                className="min-h-[100px] font-mono text-sm"
                placeholder="Enter lyrics for this section..."
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={handleCancelContent}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveContent}>
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'whitespace-pre-wrap font-mono text-sm',
                isEditing && 'hover:bg-muted/50 rounded p-2 transition-colors'
              )}
              onClick={(e) => {
                if (isEditing) {
                  e.stopPropagation();
                  setIsEditingContent(true);
                }
              }}
            >
              {section.content || (
                <span className="text-muted-foreground italic">
                  {isEditing ? 'Click to add lyrics...' : 'No lyrics'}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}