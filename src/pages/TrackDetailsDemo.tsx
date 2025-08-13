/**
 * @fileoverview Demo page for TrackDetailsView component
 * @version 0.01.033
 * 
 * Demonstration of interactive lyrics editor с drag-and-drop и Suno AI tags
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrackDetailsView } from '@/features/tracks';
import { ArrowLeft, Music2 } from 'lucide-react';

// Mock track data for demonstration
const DEMO_TRACK = {
  id: 'demo-track-1',
  title: 'Demo Song - Starlight Dreams',
  duration: 245, // 4:05 minutes
  genre_tags: ['Pop', 'Electronic', 'Dreamy'],
  audio_url: 'https://example.com/demo-track.mp3',
  lyrics: `[Intro] [Soft Piano] [BPM: 75] [Ambient Wash]
Whispers in the starlight...

[Verse 1] [Female Vocal] [Gentle] [Reverb]
Walking through the midnight streets alone
City lights are fading one by one
Dreams are calling from beyond the stone
Tell me that the night has just begun

[Pre-Chorus] [Build Up] [Harmonies] [Crescendo]
Close your eyes and feel the magic start
Every wish lives in your beating heart

[Chorus] [Powerful] [Catchy Hook] [Energy: High] [TikTok Ready]
We're dancing in starlight dreams tonight
Nothing can stop us when we shine so bright
Starlight dreams, starlight dreams
Everything's better than it seems

[Verse 2] [Male Vocal] [Emotional] [Guitar Solo]
Shadows whisper secrets of the past
But tomorrow's waiting to be free
Hold my hand and make this moment last
In the starlight, just you and me

[Bridge] [Orchestral] [Epic] [Crescendo] [Emotional Bridge]
When the world gets heavy and you fall
Remember starlight dreams illuminate it all
Every tear will turn to stardust gold
Every fear becomes a story told

[Outro] [Fade Out] [Ambient] [Whisper] [Piano Solo]
Dancing in starlight dreams...
Forever and always...
Starlight dreams...`,
  ai_context: {
    provider: 'suno' as const,
    generation_quality: 0.92,
    generation_time: 28,
    prompt_used: 'Dreamy pop song about finding hope in darkness',
  },
  lyrics_context: {
    structure_detected: ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Bridge', 'Outro'],
    language: 'en',
    word_count: 145,
    has_suno_tags: true,
    character_count: 876,
  },
  metadata: {
    bpm: 75,
    key: 'C Major',
    energy_level: 70,
  },
};

export default function TrackDetailsDemo() {
  const [showDemo, setShowDemo] = useState(false);

  if (showDemo) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => setShowDemo(false)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Demo Info
        </Button>
        
        {/* Mock hook response */}
        <MockTrackProvider track={DEMO_TRACK}>
          <TrackDetailsView 
            trackId="demo-track-1" 
            editable={true}
          />
        </MockTrackProvider>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music2 className="h-6 w-6" />
            Interactive Track Details Demo
          </CardTitle>
          <CardDescription>
            Demonstration of the new TrackDetailsView component с drag-and-drop lyrics editor и Suno AI tags
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🎵 Visual Lyrics</CardTitle>
            <CardDescription>
              Structured lyrics display с секциями и тегами
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>• Section-based organization</li>
              <li>• Color-coded by type</li>
              <li>• Emoji indicators</li>
              <li>• Tag visualization</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🎯 Drag & Drop</CardTitle>
            <CardDescription>
              Interactive reordering секций
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>• Drag sections to reorder</li>
              <li>• Visual feedback</li>
              <li>• Keyboard navigation</li>
              <li>• Touch support</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🏷️ Suno AI Tags</CardTitle>
            <CardDescription>
              Complete tag palette integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>• 100+ pre-defined tags</li>
              <li>• Categorized by type</li>
              <li>• Custom tag support</li>
              <li>• Smart validation</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">✏️ Live Editing</CardTitle>
            <CardDescription>
              Real-time lyrics editing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>• In-place text editing</li>
              <li>• Section label editing</li>
              <li>• Add/remove sections</li>
              <li>• Undo/redo support</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📊 Structure View</CardTitle>
            <CardDescription>
              Song structure visualization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>• Visual timeline</li>
              <li>• Section proportions</li>
              <li>• Tag overview</li>
              <li>• Metadata display</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">🎪 Interactive Tags</CardTitle>
            <CardDescription>
              Smart tag management
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>• Click to add tags</li>
              <li>• Context-aware suggestions</li>
              <li>• Tag descriptions</li>
              <li>• Conflict detection</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Demo Data Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Track Data</CardTitle>
          <CardDescription>
            Sample track "Starlight Dreams" with complete Suno AI tag structure
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge>Duration: 4:05</Badge>
            <Badge>BPM: 75</Badge>
            <Badge>Key: C Major</Badge>
            <Badge>Language: English</Badge>
            <Badge>Word Count: 145</Badge>
            <Badge>Quality: 92%</Badge>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Song Structure:</h4>
            <div className="flex flex-wrap gap-2">
              {DEMO_TRACK.lyrics_context.structure_detected.map(section => (
                <Badge key={section} variant="outline">{section}</Badge>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Genre Tags:</h4>
            <div className="flex flex-wrap gap-2">
              {DEMO_TRACK.genre_tags.map(genre => (
                <Badge key={genre} variant="secondary">{genre}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Launch */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Launch Interactive Demo</CardTitle>
          <CardDescription>
            Try the new TrackDetailsView component с live editing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowDemo(true)} size="lg" className="w-full">
            Open Interactive Demo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Mock provider for demonstration
function MockTrackProvider({ track, children }: { track: any; children: React.ReactNode }) {
  // Mock the useTrack hook response
  React.useEffect(() => {
    // Override the useTrack hook temporarily for demo
    const originalModule = require('@/hooks/data/useTracks');
    originalModule.useTrack = () => ({
      track,
      isLoading: false,
      isError: false,
      error: null,
    });
  }, [track]);

  return <>{children}</>;
}