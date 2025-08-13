/**
 * @fileoverview Tag Palette Component for Suno AI Tags
 * @version 0.01.033
 * 
 * Interactive palette для drag или click добавления тегов
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TagPaletteProps {
  onTagSelect: (tag: SunoTag) => void;
}

interface SunoTag {
  id: string;
  category: string;
  label: string;
  value?: string;
  color: string;
  description?: string;
}

// Complete Suno AI tags organized by category
const SUNO_TAGS = {
  structure: [
    { label: 'Intro', description: 'Opening section' },
    { label: 'Verse', description: 'Main lyrical section' },
    { label: 'Pre-Chorus', description: 'Build-up before chorus' },
    { label: 'Chorus', description: 'Main hook/repeated section' },
    { label: 'Post-Chorus', description: 'Follow-up to chorus' },
    { label: 'Bridge', description: 'Contrasting section' },
    { label: 'Outro', description: 'Ending section' },
    { label: 'Hook', description: 'Catchy repeated phrase' },
    { label: 'Break', description: 'Instrumental pause' },
    { label: 'Interlude', description: 'Musical transition' },
  ],
  vocal: [
    { label: 'Male Vocal', description: 'Male voice' },
    { label: 'Female Vocal', description: 'Female voice' },
    { label: 'Duet', description: 'Two singers' },
    { label: 'Choir', description: 'Multiple voices' },
    { label: 'Harmonies', description: 'Harmonic layers' },
    { label: 'Whisper', description: 'Quiet delivery' },
    { label: 'Belt', description: 'Powerful vocals' },
    { label: 'Falsetto', description: 'High register' },
    { label: 'Rap Verse', description: 'Rap section' },
    { label: 'Spoken Word', description: 'Speaking section' },
    { label: 'Ad-libs', description: 'Improvised vocals' },
    { label: 'Backing Vox', description: 'Background vocals' },
  ],
  instrument: [
    { label: 'Guitar Solo', description: 'Guitar feature' },
    { label: 'Piano Solo', description: 'Piano feature' },
    { label: 'Drum Solo', description: 'Drum feature' },
    { label: 'Bass Solo', description: 'Bass feature' },
    { label: 'Synth Lead', description: 'Synthesizer lead' },
    { label: 'Saxophone', description: 'Sax section' },
    { label: 'Strings', description: 'String section' },
    { label: 'Orchestra', description: 'Full orchestra' },
    { label: 'Acoustic', description: 'Acoustic instruments' },
    { label: 'Electric', description: 'Electric instruments' },
    { label: 'Percussion', description: 'Percussion section' },
  ],
  emotion: [
    { label: 'Emotional', description: 'Emotional delivery' },
    { label: 'Intense', description: 'High intensity' },
    { label: 'Gentle', description: 'Soft and gentle' },
    { label: 'Powerful', description: 'Strong and powerful' },
    { label: 'Melancholic', description: 'Sad mood' },
    { label: 'Uplifting', description: 'Positive energy' },
    { label: 'Dark', description: 'Dark atmosphere' },
    { label: 'Energetic', description: 'High energy' },
    { label: 'Anthemic', description: 'Anthem-like' },
    { label: 'Vulnerable', description: 'Exposed emotion' },
  ],
  effect: [
    { label: 'Build Up', description: 'Intensity increase' },
    { label: 'Drop', description: 'Sudden change' },
    { label: 'Break Down', description: 'Minimal section' },
    { label: 'Reverb', description: 'Space effect' },
    { label: 'Delay', description: 'Echo effect' },
    { label: 'Distortion', description: 'Distorted sound' },
    { label: 'Filter', description: 'Frequency filter' },
    { label: 'Glitch', description: 'Digital artifacts' },
    { label: 'Fade In', description: 'Volume fade in' },
    { label: 'Fade Out', description: 'Volume fade out' },
    { label: 'Crescendo', description: 'Gradual increase' },
    { label: 'Staccato', description: 'Short notes' },
  ],
  tempo: [
    { label: 'BPM: 60', description: 'Very slow tempo' },
    { label: 'BPM: 80', description: 'Slow tempo' },
    { label: 'BPM: 100', description: 'Moderate tempo' },
    { label: 'BPM: 120', description: 'Standard tempo' },
    { label: 'BPM: 140', description: 'Fast tempo' },
    { label: 'BPM: 160', description: 'Very fast tempo' },
    { label: 'Tempo Up', description: 'Increase tempo' },
    { label: 'Tempo Down', description: 'Decrease tempo' },
    { label: 'Half-Time', description: 'Half speed feel' },
    { label: 'Double-Time', description: 'Double speed feel' },
    { label: 'Swing', description: 'Swing rhythm' },
    { label: 'Syncopated', description: 'Off-beat emphasis' },
  ],
  production: [
    { label: 'Volume Up', description: 'Increase volume' },
    { label: 'Volume Down', description: 'Decrease volume' },
    { label: 'Pan Left', description: 'Move to left speaker' },
    { label: 'Pan Right', description: 'Move to right speaker' },
    { label: 'EQ Boost', description: 'Frequency boost' },
    { label: 'Bass Boost', description: 'Enhance bass' },
    { label: 'Wide', description: 'Stereo width' },
    { label: 'Compress', description: 'Dynamic compression' },
    { label: 'Dry', description: 'No effects' },
    { label: 'Wet', description: 'Heavy effects' },
  ],
  special: [
    { label: 'TikTok Ready', description: 'Optimized for TikTok' },
    { label: 'Loop Point', description: 'Seamless loop' },
    { label: 'Dance Break', description: 'Dance section' },
    { label: 'Meme Moment', description: 'Memeable section' },
    { label: 'Vinyl Effect', description: 'Vintage sound' },
    { label: 'Ambient Wash', description: 'Background texture' },
    { label: 'Riser', description: 'Build-up sound' },
    { label: 'Impact', description: 'Hit sound' },
    { label: 'Nature Sounds', description: 'Natural ambience' },
    { label: 'Crowd Noise', description: 'Audience sounds' },
  ],
};

const CATEGORY_CONFIG = {
  structure: { color: 'bg-blue-500', icon: '🏗️', label: 'Structure' },
  vocal: { color: 'bg-purple-500', icon: '🎤', label: 'Vocals' },
  instrument: { color: 'bg-green-500', icon: '🎸', label: 'Instruments' },
  emotion: { color: 'bg-red-500', icon: '❤️', label: 'Emotions' },
  effect: { color: 'bg-orange-500', icon: '✨', label: 'Effects' },
  tempo: { color: 'bg-yellow-500', icon: '⏱️', label: 'Tempo' },
  production: { color: 'bg-gray-500', icon: '🎚️', label: 'Production' },
  special: { color: 'bg-gradient-to-r from-purple-500 to-pink-500', icon: '🌟', label: 'Special' },
};

export function TagPalette({ onTagSelect }: TagPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('structure');
  const [customTag, setCustomTag] = useState('');

  const handleTagClick = (category: string, tag: { label: string; description?: string }) => {
    const newTag: SunoTag = {
      id: `tag-${Date.now()}-${Math.random()}`,
      category,
      label: tag.label,
      color: CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG].color,
      description: tag.description,
    };
    onTagSelect(newTag);
  };

  const handleCustomTag = () => {
    if (customTag.trim()) {
      const newTag: SunoTag = {
        id: `tag-${Date.now()}-${Math.random()}`,
        category: 'special',
        label: customTag.trim(),
        color: CATEGORY_CONFIG.special.color,
      };
      onTagSelect(newTag);
      setCustomTag('');
    }
  };

  const filteredTags = Object.entries(SUNO_TAGS).reduce((acc, [category, tags]) => {
    const filtered = tags.filter(tag =>
      tag.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = filtered;
    }
    return acc;
  }, {} as typeof SUNO_TAGS);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🎨</span> Tag Palette
        </CardTitle>
        <CardDescription>
          Click tags to add them to selected section
        </CardDescription>
        
        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid grid-cols-4 h-auto">
            {Object.entries(CATEGORY_CONFIG).slice(0, 4).map(([key, config]) => (
              <TabsTrigger
                key={key}
                value={key}
                className="flex flex-col gap-1 h-auto py-2"
              >
                <span className="text-lg">{config.icon}</span>
                <span className="text-xs">{config.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsList className="grid grid-cols-4 h-auto mt-2">
            {Object.entries(CATEGORY_CONFIG).slice(4).map(([key, config]) => (
              <TabsTrigger
                key={key}
                value={key}
                className="flex flex-col gap-1 h-auto py-2"
              >
                <span className="text-lg">{config.icon}</span>
                <span className="text-xs">{config.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            {Object.entries(filteredTags).map(([category, tags]) => (
              <TabsContent key={category} value={category} className="mt-0">
                <div className="grid grid-cols-2 gap-2">
                  {tags.map((tag) => (
                    <TooltipProvider key={tag.label}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              'justify-start text-xs h-auto py-2 px-3',
                              'hover:shadow-md transition-all'
                            )}
                            onClick={() => handleTagClick(category, tag)}
                          >
                            <Badge
                              variant="secondary"
                              className={cn(
                                'mr-2 text-white',
                                CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG].color
                              )}
                            >
                              {tag.label}
                            </Badge>
                            {tag.description && (
                              <Info className="h-3 w-3 ml-auto text-muted-foreground" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        {tag.description && (
                          <TooltipContent>
                            <p>{tag.description}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>

        {/* Custom Tag Input */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Custom tag..."
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCustomTag()}
              className="flex-1"
            />
            <Button
              size="sm"
              onClick={handleCustomTag}
              disabled={!customTag.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Usage Tips */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">💡 Tips</h4>
          <ul className="text-xs space-y-1 text-muted-foreground">
            <li>• Use 3-4 tags max per section</li>
            <li>• Structure tags go at section start</li>
            <li>• Combine vocal + emotion for impact</li>
            <li>• Platform tags work best in chorus</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}