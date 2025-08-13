/**
 * @fileoverview Interactive Track Details View с drag-and-drop lyrics editor
 * @version 0.01.033
 * @author Claude Code Assistant
 * 
 * FEATURES:
 * - Visual lyrics display с Suno AI tags
 * - Drag-and-drop секций
 * - Interactive tag editing
 * - Real-time preview
 */

import React, { useState, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, Clock, Tag, Edit, Save, X, Plus, GripVertical, Play, Pause } from 'lucide-react';
// import { useTrack } from '@/hooks/data/useTracks';
import { LyricsSection } from './LyricsSection';
import { TagPalette } from './TagPalette';
import { cn } from '@/lib/utils';

// ====================================
// 🎯 TYPE DEFINITIONS
// ====================================

interface TrackDetailsViewProps {
  trackId: string;
  onClose?: () => void;
  editable?: boolean;
}

interface LyricSection {
  id: string;
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'custom';
  label: string;
  content: string;
  tags: SunoTag[];
  order: number;
}

interface SunoTag {
  id: string;
  category: 'structure' | 'vocal' | 'instrument' | 'emotion' | 'effect' | 'tempo' | 'production' | 'special';
  label: string;
  value?: string;
  color: string;
  icon?: string;
}

// ====================================
// 🎨 TAG CATEGORIES & COLORS
// ====================================

const TAG_CATEGORIES = {
  structure: { color: 'bg-blue-500', label: 'Structure' },
  vocal: { color: 'bg-purple-500', label: 'Vocals' },
  instrument: { color: 'bg-green-500', label: 'Instruments' },
  emotion: { color: 'bg-red-500', label: 'Emotions' },
  effect: { color: 'bg-orange-500', label: 'Effects' },
  tempo: { color: 'bg-yellow-500', label: 'Tempo' },
  production: { color: 'bg-gray-500', label: 'Production' },
  special: { color: 'bg-gradient-to-r from-purple-500 to-pink-500', label: 'Special' },
};

// ====================================
// 🎼 MAIN COMPONENT
// ====================================

export function TrackDetailsView({ trackId, onClose, editable = false }: TrackDetailsViewProps) {
  // Mock hook for existing track data - to be replaced with actual useTrack
  const useTrackMock = (id: string) => {
    const [track, setTrack] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    
    React.useEffect(() => {
      // Simulate loading existing track data
      setTimeout(() => {
        setTrack({
          id,
          title: "Sample Track",
          duration: 180,
          genre_tags: ['Pop', 'Electronic'],
          lyrics: "[Intro]\nSample lyrics here...\n\n[Verse 1]\nVerse content...",
          ai_context: {
            provider: 'suno',
            generation_quality: 0.8,
            generation_time: 30,
          },
          lyrics_context: {
            structure_detected: ['Intro', 'Verse'],
            language: 'en',
            word_count: 50,
            has_suno_tags: true,
          },
        });
        setIsLoading(false);
      }, 500);
    }, [id]);
    
    return { track, isLoading, isError: false, error: null };
  };
  
  const { track, isLoading } = useTrackMock(trackId);
  const [isEditing, setIsEditing] = useState(false);
  const [sections, setSections] = useState<LyricSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // DnD sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Parse lyrics into sections on load
  React.useEffect(() => {
    if (track?.lyrics) {
      const parsed = parseLyricsToSections(track.lyrics);
      setSections(parsed);
    }
  }, [track?.lyrics]);

  /**
   * Parse raw lyrics text into structured sections
   */
  const parseLyricsToSections = useCallback((lyrics: string): LyricSection[] => {
    const lines = lyrics.split('\n');
    const sections: LyricSection[] = [];
    let currentSection: LyricSection | null = null;
    let sectionOrder = 0;

    const sectionRegex = /^\[(Intro|Verse|Chorus|Bridge|Outro|Pre-Chorus|Post-Chorus|Hook|Break|Interlude)(?:\s+\d+)?\]/i;

    lines.forEach((line) => {
      const sectionMatch = line.match(sectionRegex);
      
      if (sectionMatch) {
        // Save previous section if exists
        if (currentSection) {
          sections.push(currentSection);
        }

        // Create new section
        const sectionType = sectionMatch[1].toLowerCase() as LyricSection['type'];
        currentSection = {
          id: `section-${Date.now()}-${sectionOrder}`,
          type: sectionType === 'pre-chorus' || sectionType === 'post-chorus' ? 'custom' : sectionType,
          label: sectionMatch[0],
          content: '',
          tags: extractTags(line),
          order: sectionOrder++,
        };
      } else if (currentSection) {
        // Add content to current section
        currentSection.content += (currentSection.content ? '\n' : '') + line;
      }
    });

    // Add last section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }, []);

  /**
   * Extract Suno AI tags from text
   */
  const extractTags = (text: string): SunoTag[] => {
    const tagRegex = /\[([^\]]+)\]/g;
    const tags: SunoTag[] = [];
    let match;

    while ((match = tagRegex.exec(text)) !== null) {
      const tagContent = match[1];
      const category = determineTagCategory(tagContent);
      
      tags.push({
        id: `tag-${Date.now()}-${Math.random()}`,
        category,
        label: tagContent,
        color: TAG_CATEGORIES[category].color,
      });
    }

    return tags;
  };

  /**
   * Determine tag category based on content
   */
  const determineTagCategory = (tag: string): SunoTag['category'] => {
    const lower = tag.toLowerCase();
    
    if (['intro', 'verse', 'chorus', 'bridge', 'outro'].some(s => lower.includes(s))) {
      return 'structure';
    }
    if (['vocal', 'voice', 'harmonies', 'choir'].some(s => lower.includes(s))) {
      return 'vocal';
    }
    if (['guitar', 'piano', 'drums', 'bass', 'synth'].some(s => lower.includes(s))) {
      return 'instrument';
    }
    if (['emotional', 'intense', 'gentle', 'powerful'].some(s => lower.includes(s))) {
      return 'emotion';
    }
    if (['reverb', 'delay', 'echo', 'distortion'].some(s => lower.includes(s))) {
      return 'effect';
    }
    if (['bpm', 'tempo', 'speed'].some(s => lower.includes(s))) {
      return 'tempo';
    }
    if (['volume', 'pan', 'eq', 'mix'].some(s => lower.includes(s))) {
      return 'production';
    }
    
    return 'special';
  };

  /**
   * Handle drag end for section reordering
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setSections((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  /**
   * Add new section
   */
  const addSection = (type: LyricSection['type']) => {
    const newSection: LyricSection = {
      id: `section-${Date.now()}`,
      type,
      label: `[${type.charAt(0).toUpperCase() + type.slice(1)}]`,
      content: '',
      tags: [],
      order: sections.length,
    };
    setSections([...sections, newSection]);
  };

  /**
   * Update section content
   */
  const updateSection = (sectionId: string, updates: Partial<LyricSection>) => {
    setSections(sections.map(s => 
      s.id === sectionId ? { ...s, ...updates } : s
    ));
  };

  /**
   * Delete section
   */
  const deleteSection = (sectionId: string) => {
    setSections(sections.filter(s => s.id !== sectionId));
  };

  /**
   * Add tag to section
   */
  const addTagToSection = (sectionId: string, tag: SunoTag) => {
    setSections(sections.map(s => 
      s.id === sectionId 
        ? { ...s, tags: [...s.tags, tag] }
        : s
    ));
  };

  /**
   * Remove tag from section
   */
  const removeTagFromSection = (sectionId: string, tagId: string) => {
    setSections(sections.map(s => 
      s.id === sectionId 
        ? { ...s, tags: s.tags.filter(t => t.id !== tagId) }
        : s
    ));
  };

  /**
   * Export sections back to lyrics format
   */
  const exportToLyrics = (): string => {
    return sections
      .sort((a, b) => a.order - b.order)
      .map(section => {
        const tags = section.tags.map(t => `[${t.label}]`).join(' ');
        const header = section.label + (tags ? ' ' + tags : '');
        return `${header}\n${section.content}`;
      })
      .join('\n\n');
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-pulse">Loading track details...</div>
        </CardContent>
      </Card>
    );
  }

  if (!track) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center h-96">
          <div>Track not found</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Music className="h-6 w-6" />
                {track.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-4">
                {track.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                  </span>
                )}
                {track.genre_tags?.map(genre => (
                  <Badge key={genre} variant="secondary">{genre}</Badge>
                ))}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {track.audio_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              )}
              {editable && (
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                </Button>
              )}
              {onClose && (
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="lyrics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
          <TabsTrigger value="structure">Structure</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        {/* Lyrics Tab */}
        <TabsContent value="lyrics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Lyrics Editor */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Lyrics Editor</CardTitle>
                  <CardDescription>
                    {isEditing ? 'Drag sections to reorder, click to edit' : 'View lyrics with Suno AI tags'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px] pr-4">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={sections.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-4">
                          {sections.map((section) => (
                            <LyricsSection
                              key={section.id}
                              section={section}
                              isEditing={isEditing}
                              isSelected={selectedSection === section.id}
                              onSelect={() => setSelectedSection(section.id)}
                              onUpdate={(updates) => updateSection(section.id, updates)}
                              onDelete={() => deleteSection(section.id)}
                              onAddTag={(tag) => addTagToSection(section.id, tag)}
                              onRemoveTag={(tagId) => removeTagFromSection(section.id, tagId)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>

                    {isEditing && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addSection('verse')}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Verse
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addSection('chorus')}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Chorus
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addSection('bridge')}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Bridge
                        </Button>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Tag Palette */}
            {isEditing && (
              <div className="lg:col-span-1">
                <TagPalette
                  onTagSelect={(tag) => {
                    if (selectedSection) {
                      addTagToSection(selectedSection, tag);
                    }
                  }}
                />
              </div>
            )}
          </div>
        </TabsContent>

        {/* Structure Tab */}
        <TabsContent value="structure">
          <Card>
            <CardHeader>
              <CardTitle>Song Structure</CardTitle>
              <CardDescription>Visual representation of song sections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sections.map((section, index) => (
                  <div key={section.id} className="flex items-center gap-2">
                    <Badge className="w-24">{section.label}</Badge>
                    <div className="flex-1 h-8 bg-muted rounded flex items-center px-2">
                      <div className="text-sm text-muted-foreground">
                        {section.content.split('\n').length} lines
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {section.tags.slice(0, 3).map(tag => (
                        <Badge
                          key={tag.id}
                          variant="outline"
                          className={cn('text-xs', tag.color)}
                        >
                          {tag.label}
                        </Badge>
                      ))}
                      {section.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{section.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata">
          <Card>
            <CardHeader>
              <CardTitle>Track Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {track.ai_context && (
                <div>
                  <h4 className="font-medium mb-2">AI Generation</h4>
                  <div className="space-y-1 text-sm">
                    <div>Provider: {track.ai_context.provider}</div>
                    <div>Quality: {(track.ai_context.generation_quality * 100).toFixed(0)}%</div>
                    <div>Generation Time: {track.ai_context.generation_time}s</div>
                  </div>
                </div>
              )}
              
              {track.lyrics_context && (
                <div>
                  <h4 className="font-medium mb-2">Lyrics Analysis</h4>
                  <div className="space-y-1 text-sm">
                    <div>Structure: {track.lyrics_context.structure_detected.join(', ')}</div>
                    <div>Language: {track.lyrics_context.language}</div>
                    <div>Word Count: {track.lyrics_context.word_count}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}