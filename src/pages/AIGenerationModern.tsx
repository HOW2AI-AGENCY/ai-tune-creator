import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SunoStyleGenerationForm } from "@/components/generation/SunoStyleGenerationForm";
import { useTrackGenerationWithProgress } from "@/features/ai-generation/hooks/useTrackGenerationWithProgress";
import { FloatingPlayer } from "@/features/ai-generation/components/FloatingPlayer";
import { TrackDetailsDrawer } from "@/features/ai-generation/components/TrackDetailsDrawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Sparkles, 
  Music, 
  Headphones, 
  Clock,
  Play,
  ChevronDown,
  ChevronRight,
  Eye,
  Download,
  FileText,
  RefreshCw
} from "lucide-react";
import { CanonicalGenerationInput } from "@/features/ai-generation/types/canonical";
import { SyncProgressNotification } from '@/components/ui/sync-progress-notification';
import { useTrackDeletion } from '@/hooks/useTrackDeletion';

interface Option { id: string; name: string }

interface Track {
  id: string;
  title: string;
  audio_url?: string;
  lyrics?: string;
  description?: string;
  style_prompt?: string;
  genre_tags?: string[];
  created_at: string;
  updated_at: string;
  duration?: number;
  current_version: number;
  track_number?: number;
  metadata?: any;
  project?: {
    title: string;
    artist?: {
      name: string;
    };
  };
  versions?: TrackVersion[];
}

interface TrackVersion {
  id: string;
  version_number: number;
  audio_url?: string; // Made optional since some versions may only have text changes
  change_description?: string;
  created_at: string;
  metadata?: any;
}

interface Generation {
  id: string;
  prompt: string;
  service: 'suno' | 'mureka';
  status: string;
  created_at: string;
  result_url?: string;
  track_id?: string;
  error_message?: string;
}

export default function AIGenerationModern() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Data states - Initialize with empty arrays
  const [projects, setProjects] = useState<Option[]>([]);
  const [artists, setArtists] = useState<Option[]>([]);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [generations, setGenerations] = useState<Generation[]>([]);
  
  // UI states - Initialize with safe defaults
  const [playerOpen, setPlayerOpen] = useState<boolean>(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(() => new Set());
  const [showSyncProgress, setShowSyncProgress] = useState(false);

  // Generation hook
  const { generateTrack, isGenerating, generationProgress } = useTrackGenerationWithProgress();
  const { deleteTrack } = useTrackDeletion();

  const fetchAllTracks = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          projects!inner (
            title,
            artist_id,
            is_inbox,
            artists!inner (
              name,
              user_id
            )
          )
        `)
        .eq('projects.artists.user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch versions for each track
      const tracksWithVersions = await Promise.all(
        (data || []).map(async (track) => {
          const { data: versions } = await supabase
            .from('track_versions')
            .select('*')
            .eq('track_id', track.id)
            .order('version_number', { ascending: false });

          return {
            ...track,
            project: track.projects,
            versions: versions || []
          };
        })
      );

      setAllTracks(tracksWithVersions);
    } catch (error) {
      console.error('Error fetching all tracks:', error);
    }
  };

  const fetchGenerations = async () => {
    if (!user) return;
    
    try {
      await supabase.functions.invoke('update-processing-status');
    } catch (updateError) {
      console.warn("Could not update processing statuses:", updateError);
    }
    
    const { data, error } = await supabase
      .from("ai_generations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching generations:", error);
      return;
    }
    
    setGenerations((data || []).map(g => ({
      ...g,
      service: g.service as 'suno' | 'mureka'
    })));
  };

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setArtists([]);
      setAllTracks([]);
      setGenerations([]);
      return;
    }

    const fetchMeta = async () => {
      const { data: artistsData } = await supabase
        .from("artists")
        .select("id, name")
        .order("name");
      setArtists((artistsData || []).map(a => ({ id: a.id, name: a.name })));

      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, title, artists(name)")
        .order("created_at", { ascending: false });
      setProjects((projectsData || []).map((p: any) => ({
        id: p.id,
        name: p.artists?.name ? `${p.title} (${p.artists.name})` : p.title,
      })));
    };

    fetchMeta();
    fetchAllTracks();
    fetchGenerations();
  }, [user]);

  const handleGenerate = async (input: CanonicalGenerationInput) => {
  if (!user) {
      toast({ title: "Требуется вход", description: "Войдите, чтобы генерировать треки", variant: "destructive" });
      return;
    }
    
    try {
      // Convert canonical input to legacy format for compatibility
      const legacyParams = {
        prompt: input.description,
        service: input.service,
        projectId: input.context?.projectId,
        artistId: input.context?.artistId,
        genreTags: input.tags || [],
        mode: input.mode,
        customLyrics: input.lyrics,
        duration: input.flags?.duration || 120,
        instrumental: input.flags?.instrumental || false,
        language: input.flags?.language || 'ru',
        inputType: input.inputType,
        useInbox: input.context?.useInbox || false
      };

      await generateTrack(legacyParams);
      
      setTimeout(async () => {
        await Promise.all([
          fetchGenerations(),
          fetchAllTracks()
        ]);
      }, 1000);
    } catch (e: any) {
      console.error("Generation error:", e);
    }
  };

  const handlePlayTrack = (track: Track | TrackVersion, isVersion = false) => {
    if (!track.audio_url) return;
    
    const playableTrack = isVersion ? {
      id: track.id,
      title: `${selectedTrack?.title || 'Трек'} (v${(track as TrackVersion).version_number})`,
      audio_url: track.audio_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      current_version: 1,
      project: selectedTrack?.project
    } : track;
    
    setCurrentTrack(playableTrack as Track);
    setPlayerOpen(true);
  };

  const handleTrackClick = (track: Track) => {
    setSelectedTrack(track);
    setDrawerOpen(true);
  };

  const toggleTrackExpansion = (trackId: string) => {
    setExpandedTracks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(trackId)) {
        newSet.delete(trackId);
      } else {
        newSet.add(trackId);
      }
      return newSet;
    });
  };

  // Determine version type and status
  const getVersionInfo = (version: TrackVersion) => {
    const hasAudio = !!version.audio_url;
    const isProcessing = version.metadata?.status === 'processing' || version.metadata?.status === 'pending';
    
    return {
      type: hasAudio ? 'audio' : 'prompt',
      status: hasAudio ? 'ready' : (isProcessing ? 'processing' : 'draft'),
      canPlay: hasAudio,
      icon: hasAudio ? Music : FileText,
      statusText: hasAudio ? 'Музыка готова' : (isProcessing ? 'Генерируется...' : 'Только текст'),
      statusColor: hasAudio ? 'text-green-600' : (isProcessing ? 'text-orange-600' : 'text-muted-foreground')
    };
  };

  const formatDescription = (description: any): string => {
    if (!description) return 'Нет описания';
    
    if (typeof description === 'string') {
      try {
        const parsed = JSON.parse(description);
        return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
      } catch {
        return description;
      }
    }
    
    return typeof description === 'object' 
      ? JSON.stringify(description, null, 2) 
      : String(description);
  };

  const formatLyrics = (lyrics: any): string => {
    if (!lyrics) return 'Нет текста';
    
    if (typeof lyrics === 'string') {
      try {
        const parsed = JSON.parse(lyrics);
        return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
      } catch {
        return lyrics;
      }
    }
    
    return typeof lyrics === 'object' 
      ? JSON.stringify(lyrics, null, 2) 
      : String(lyrics);
  };

  const formatStylePrompt = (stylePrompt: any): string => {
    if (!stylePrompt) return 'Нет промпта';
    
    if (typeof stylePrompt === 'string') {
      try {
        const parsed = JSON.parse(stylePrompt);
        return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
      } catch {
        return stylePrompt;
      }
    }
    
    return typeof stylePrompt === 'object' 
      ? JSON.stringify(stylePrompt, null, 2) 
      : String(stylePrompt);
  };

  const handleTrackPlay = useCallback((track: Track) => {
    setCurrentTrack(track);
    setPlayerOpen(true);
  }, []);

  const handleSyncTracks = useCallback(() => {
    setShowSyncProgress(true);
  }, []);

  const handleSyncComplete = useCallback(() => {
    setShowSyncProgress(false);
    fetchAllTracks(); // Refresh tracks after sync
  }, []);
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Создание музыки с ИИ</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Войдите в аккаунт, чтобы начать создавать уникальную музыку с помощью искусственного интеллекта
            </p>
            <Button className="w-full" size="lg">
              Войти в аккаунт
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar with Generation Form */}
      <div className="w-80 xl:w-96 border-r bg-card overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">ИИ Генерация</h1>
          </div>
          
          <SunoStyleGenerationForm
            projects={projects}
            artists={artists}
            tracks={allTracks.map(track => ({
              id: track.id,
              name: track.title,
              description: track.description,
              lyrics: track.lyrics,
              genre_tags: track.genre_tags
            }))}
            selectedTrack={selectedTrack ? {
              id: selectedTrack.id,
              name: selectedTrack.title,
              description: selectedTrack.description,
              lyrics: selectedTrack.lyrics,
              genre_tags: selectedTrack.genre_tags
            } : null}
            onTrackSelect={(track) => {
              if (!track) {
                setSelectedTrack(null);
                return;
              }
              const foundTrack = allTracks.find(t => t.id === track.id);
              setSelectedTrack(foundTrack || null);
            }}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            className="space-y-4"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Ваши треки</h2>
              <p className="text-muted-foreground">Всего: {allTracks.length}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAllTracks}
                disabled={false}
              >
                <RefreshCw className="h-4 w-4" />
                Обновить
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncTracks}
                disabled={showSyncProgress}
              >
                {showSyncProgress ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Синхронизация
              </Button>
            </div>
          </div>

          {allTracks.length === 0 ? (
            <Card className="border-2 border-dashed border-muted">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <Music className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Треков пока нет</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">
                  Создайте свой первый трек с помощью ИИ генерации слева
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Filter to show only tracks with audio */}
              {allTracks
                .filter(track => track.audio_url) // Only show tracks with generated music
                .map((track) => (
                  <Card key={track.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Track Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{track.title}</h3>
                            {track.audio_url ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Готов
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                В процессе
                              </Badge>
                            )}
                            {track.versions && track.versions.length > 0 && (
                              <Badge variant="outline">
                                {track.versions.length} версий
                              </Badge>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            {track.project?.artist?.name && (
                              <div className="flex items-center gap-2">
                                <Music className="h-3 w-3" />
                                {track.project.artist.name}
                              </div>
                            )}
                            {track.project?.title && (
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                {track.project.title}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {track.audio_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePlayTrack(track)}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Играть
                            </Button>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTrackClick(track)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Детали
                          </Button>

                          {track.versions && track.versions.length > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => toggleTrackExpansion(track.id)}
                            >
                              {expandedTracks.has(track.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Track Details Preview */}
                      <div className="space-y-2 text-sm">
                        {track.genre_tags && track.genre_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {track.genre_tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {track.description && (
                          <div>
                            <span className="font-medium">Описание: </span>
                            <span className="text-muted-foreground">
                              {formatDescription(track.description).slice(0, 100)}...
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Versions Collapsible */}
                      {track.versions && track.versions.length > 0 && (
                        <Collapsible 
                          open={expandedTracks.has(track.id)}
                          onOpenChange={() => toggleTrackExpansion(track.id)}
                        >
                          <CollapsibleContent className="space-y-2 pt-2 border-t">
                            <h4 className="font-medium text-sm">Версии трека:</h4>
                            {track.versions.map((version) => {
                              const versionInfo = getVersionInfo(version);
                              const VersionIcon = versionInfo.icon;
                              
                              return (
                                <div key={version.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-start gap-3 flex-1">
                                    <div className="flex-shrink-0 mt-1">
                                      <VersionIcon className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium">Версия {version.version_number}</span>
                                        <Badge 
                                          variant={versionInfo.type === 'audio' ? 'default' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {versionInfo.type === 'audio' ? 'Музыка' : 'Текст'}
                                        </Badge>
                                      </div>
                                      
                                      <div className={`text-xs ${versionInfo.statusColor} mb-1`}>
                                        {versionInfo.statusText}
                                      </div>
                                      
                                      {version.change_description && (
                                        <div className="text-sm text-muted-foreground line-clamp-2">
                                          {version.change_description}
                                        </div>
                                      )}
                                      
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {new Date(version.created_at).toLocaleDateString('ru-RU', {
                                          day: 'numeric',
                                          month: 'short',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-2 flex-shrink-0">
                                    {versionInfo.canPlay ? (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handlePlayTrack(version, true)}
                                        className="h-8 px-2"
                                      >
                                        <Play className="h-3 w-3 mr-1" />
                                        Играть
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          // Show version details or allow editing
                                          toast({
                                            title: "Текстовая версия",
                                            description: "Эта версия содержит только изменения промпта/лирики"
                                          });
                                        }}
                                        className="h-8 px-2"
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        Детали
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Track Details Drawer */}
      <TrackDetailsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        track={selectedTrack}
        onPlay={(track) => handlePlayTrack(track as Track)}
      />

      {/* Floating Player */}
      <FloatingPlayer
        isOpen={playerOpen}
        track={currentTrack}
        onClose={() => setPlayerOpen(false)}
      />
      {/* Sync Progress Notification */}
      <SyncProgressNotification
        isVisible={showSyncProgress}
        onComplete={handleSyncComplete}
      />
    </div>
  );
}