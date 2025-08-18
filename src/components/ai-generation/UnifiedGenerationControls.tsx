/**
 * Unified Generation Controls
 * 
 * Modern replacement for TrackGenerationSidebar using the unified generation system
 */

import { useState, useCallback } from 'react';
import { useUnifiedGeneration } from '@/features/ai-generation/hooks/useUnifiedGeneration';
import { CanonicalGenerationInput } from '@/features/ai-generation/types/canonical';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Music, Mic, Settings } from 'lucide-react';

interface Option {
  id: string;
  name: string;
}

interface UnifiedGenerationControlsProps {
  projects: Option[];
  artists: Option[];
  className?: string;
}

export function UnifiedGenerationControls({ 
  projects, 
  artists, 
  className 
}: UnifiedGenerationControlsProps) {
  const { generateTrack, activeGenerations, cancelGeneration, clearCompleted, error, clearError } = useUnifiedGeneration();

  // Form state
  const [inputType, setInputType] = useState<'description' | 'lyrics'>('description');
  const [description, setDescription] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [tags, setTags] = useState<string[]>(['energetic']);
  const [service, setService] = useState<'suno' | 'mureka'>('suno');
  const [projectId, setProjectId] = useState<string>('');
  const [artistId, setArtistId] = useState<string>('');
  const [instrumental, setInstrumental] = useState(false);
  const [language, setLanguage] = useState('ru');
  const [tempo, setTempo] = useState('');
  const [duration, setDuration] = useState(120);

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return;

    const input: CanonicalGenerationInput = {
      description: description.trim(),
      lyrics: inputType === 'lyrics' ? lyrics.trim() : undefined,
      tags,
      flags: {
        instrumental,
        language,
        voiceStyle: '',
        tempo,
        duration
      },
      mode: 'custom',
      inputType,
      context: {
        projectId: projectId || undefined,
        artistId: artistId || undefined,
        useInbox: !projectId
      },
      service
    };

    try {
      await generateTrack(input);
    } catch (error) {
      console.error('Generation failed:', error);
    }
  }, [description, lyrics, tags, instrumental, language, tempo, duration, inputType, projectId, artistId, service, generateTrack]);

  const addTag = useCallback((tag: string) => {
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
    }
  }, [tags]);

  const removeTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  }, []);

  const isGenerating = activeGenerations.size > 0;

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Unified AI Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Service Selection */}
          <div className="space-y-2">
            <Label>AI Service</Label>
            <Select value={service} onValueChange={(value: 'suno' | 'mureka') => setService(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suno">Suno AI</SelectItem>
                <SelectItem value="mureka">Mureka AI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Input Type Tabs */}
          <Tabs value={inputType} onValueChange={(value: 'description' | 'lyrics') => setInputType(value)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="description" className="flex items-center gap-2">
                <Music className="h-4 w-4" />
                Description
              </TabsTrigger>
              <TabsTrigger value="lyrics" className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Lyrics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Music Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the music you want to create..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="lyrics" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Style Description</Label>
                <Input
                  id="description"
                  placeholder="Musical style and genre..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lyrics">Custom Lyrics</Label>
                <Textarea
                  id="lyrics"
                  placeholder="Enter your custom lyrics here..."
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  rows={6}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                  {tag} ×
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Add tag and press Enter"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const target = e.target as HTMLInputElement;
                  addTag(target.value);
                  target.value = '';
                }
              }}
            />
          </div>

          {/* Project and Artist */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Inbox</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Artist</Label>
              <Select value={artistId} onValueChange={setArtistId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select artist" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No artist</SelectItem>
                  {artists.map(artist => (
                    <SelectItem key={artist.id} value={artist.id}>
                      {artist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="instrumental"
                checked={instrumental}
                onCheckedChange={setInstrumental}
              />
              <Label htmlFor="instrumental">Instrumental (no vocals)</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ru">Russian</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tempo</Label>
                <Select value={tempo} onValueChange={setTempo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto</SelectItem>
                    <SelectItem value="slow">Slow</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">{error.message}</p>
              {error.details && (
                <p className="text-xs text-destructive/80 mt-1">{error.details}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={clearError}
                className="mt-2"
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!description.trim() || isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Track
              </>
            )}
          </Button>

          {/* Active Generations Management */}
          {activeGenerations.size > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Active Generations ({activeGenerations.size})</Label>
                <Button variant="outline" size="sm" onClick={clearCompleted}>
                  Clear Completed
                </Button>
              </div>
              <div className="space-y-2">
                {Array.from(activeGenerations.entries()).map(([id, generation]) => (
                  <div key={id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{generation.title}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelGeneration(id)}
                        disabled={generation.status === 'completed' || generation.status === 'failed'}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="w-full bg-background rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${generation.overallProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {generation.status} • {generation.overallProgress}%
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}