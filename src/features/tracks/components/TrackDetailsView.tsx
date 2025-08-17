/**
 * @fileoverview Simple Track Details View
 * @version 0.01.034
 * @author Claude Code Assistant
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, Clock, Edit, Save, X } from 'lucide-react';
import { TrackActionButtons } from '@/components/tracks/TrackActionButtons';

// ====================================
// 🎯 TYPE DEFINITIONS
// ====================================

interface TrackDetailsViewProps {
  trackId?: string;
  trackData?: any;
  onClose?: () => void;
  editable?: boolean;
}

export function TrackDetailsView({ trackId, trackData, onClose, editable = false }: TrackDetailsViewProps) {
  // Use provided track data or fallback to mock
  const track = trackData || {
    id: trackId || 'mock',
    title: "Sample Track",
    duration: 180,
    genre_tags: ['Pop', 'Electronic'],
    lyrics: `[Intro] [Soft Piano] [BPM: 75]
Whispers in the starlight...

[Verse 1] [Female Vocal] [Gentle]
Walking through the midnight streets alone
City lights are fading one by one
Dreams are calling from beyond the stone
Tell me that the night has just begun

[Chorus] [Powerful] [Catchy Hook]
We're dancing in starlight dreams tonight
Nothing can stop us when we shine so bright
Starlight dreams, starlight dreams
Everything's better than it seems`,
    ai_context: {
      provider: 'suno',
      generation_quality: 0.8,
      generation_time: 30,
    },
    lyrics_context: {
      structure_detected: ['Intro', 'Verse', 'Chorus'],
      language: 'en',
      word_count: 85,
      has_suno_tags: true,
    },
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

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
                {track.genre_tags?.map((genre: string) => (
                  <Badge key={genre} variant="secondary">{genre}</Badge>
                ))}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <TrackActionButtons
                track={track}
                variant="compact"
                onPlay={() => setIsPlaying(!isPlaying)}
                isPlaying={isPlaying}
              />
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lyrics</CardTitle>
              <CardDescription>
                Track lyrics with AI generation tags
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <pre className="whitespace-pre-wrap text-sm">
                  {track.lyrics}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Structure Tab */}
        <TabsContent value="structure">
          <Card>
            <CardHeader>
              <CardTitle>Song Structure</CardTitle>
              <CardDescription>Visual representation of song sections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Structure analysis coming soon...
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