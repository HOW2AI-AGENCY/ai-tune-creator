import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ViewModeToggle, type ViewMode } from "@/components/ui/view-mode-toggle";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrackEditDialog, TrackVersionsDialog, TrackGenerationDialog, TrackViewDialog } from "@/features/tracks";
import { TrackWaveformView } from "@/features/tracks/components/TrackWaveformView";
import { TrackTimelineView } from "@/features/tracks/components/TrackTimelineView";
import { TrackAnalyticsView } from "@/features/tracks/components/TrackAnalyticsView";
import { lazy, Suspense } from "react";
const FloatingPlayer = lazy(() => import("@/features/ai-generation/components/FloatingPlayer").then(m => ({ default: m.FloatingPlayer })));
import { 
  Plus, 
  Search, 
  Music, 
  Clock, 
  Edit, 
  History,
  Sparkles,
  Filter,
  SortAsc,
  Play,
  Loader2,
  FileText,
  Eye,
  RefreshCw,
  LayoutGrid,
  Settings2,
  TrendingUp
} from "lucide-react";

interface Track {
  id: string;
  title: string;
  track_number: number;
  duration: number | null;
  lyrics: string | null;
  audio_url: string | null;
  current_version: number;
  metadata: any;
  created_at: string;
  updated_at: string;
  description?: string | null;
  genre_tags?: string[] | null;
  style_prompt?: string | null;
  project_id: string;
  projects?: {
    id?: string;
    title: string;
    artist_id: string;
    is_inbox?: boolean;
    artists?: {
      id?: string;
      name: string;
      avatar_url?: string;
    };
  };
}

export default function TracksEnhanced() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("updated_at");
  const [projects, setProjects] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // Dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false);
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  
  // Player state
  const [playerOpen, setPlayerOpen] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);

  const loadTracks = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('tracks')
        .select(`
          *,
          projects (
            id,
            title,
            artist_id,
            is_inbox,
            artists (
              id,
              name,
              avatar_url
            )
          )
        `);

      // Project filtering
      if (selectedProject !== "all") {
        query = query.eq('project_id', selectedProject);
      }

      // Sorting
      query = query.order(sortBy, { ascending: sortBy === 'track_number' });

      const { data, error } = await query;

      if (error) throw error;

      let filteredTracks = data || [];

      // Search filtering
      if (searchTerm.trim()) {
        filteredTracks = filteredTracks.filter(track =>
          track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          track.lyrics?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          track.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Genre filtering
      if (selectedGenre !== "all") {
        filteredTracks = filteredTracks.filter(track =>
          track.genre_tags?.includes(selectedGenre)
        );
      }

      setTracks(filteredTracks as any);
    } catch (error: any) {
      console.error('Error loading tracks:', error);
      toast({
        title: "Error",
        description: "Failed to load tracks",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          is_inbox,
          artists (
            name
          )
        `)
        .order('title');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadTracks();
      loadProjects();
    }
  }, [user, selectedProject, selectedGenre, sortBy]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (user) {
        loadTracks();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleEdit = (track: Track) => {
    setSelectedTrack(track);
    setEditDialogOpen(true);
  };

  const handleViewTrack = (track: Track) => {
    setSelectedTrack(track);
    setViewDialogOpen(true);
  };

  const handleViewVersions = (track: Track) => {
    setSelectedTrack(track);
    setVersionsDialogOpen(true);
  };

  const handleGenerateAI = (track?: Track) => {
    setSelectedTrack(track || null);
    setGenerationDialogOpen(true);
  };

  const handleGenerationResult = (type: 'lyrics' | 'concept' | 'description', data: any) => {
    if (selectedTrack && type === 'lyrics') {
      setSelectedTrack({
        ...selectedTrack,
        lyrics: data.lyrics
      });
    }
  };

  const handlePlayTrack = (track: Track) => {
    if (!track.audio_url) {
      toast({
        title: "Audio unavailable",
        description: "This track doesn't have an audio file",
        variant: "destructive"
      });
      return;
    }
    setCurrentTrack(track);
    setPlayerOpen(true);
  };

  const syncInboxTracks = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('sync-generated-tracks');
      if (error) throw error;
      
      toast({
        title: "Sync started",
        description: "Tracks are being updated..."
      });
      
      loadTracks();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync tracks",
        variant: "destructive"
      });
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get unique genres for filter
  const allGenres = tracks.reduce((genres: string[], track) => {
    if (track.genre_tags) {
      track.genre_tags.forEach(genre => {
        if (!genres.includes(genre)) {
          genres.push(genre);
        }
      });
    }
    return genres;
  }, []);

  // Save view mode preference
  React.useEffect(() => {
    const savedViewMode = localStorage.getItem('tracks-view-mode') as ViewMode;
    if (savedViewMode && ['grid', 'list', 'timeline', 'analytics', 'waveform'].includes(savedViewMode)) {
      setViewMode(savedViewMode);
    }
  }, []);
  
  React.useEffect(() => {
    localStorage.setItem('tracks-view-mode', viewMode);
  }, [viewMode]);

  if (!user) {
    return (
      <Card className="container mx-auto p-6">
        <CardHeader>
          <CardTitle>Authentication Required</CardTitle>
        </CardHeader>
        <CardContent>Please sign in to view and manage your tracks.</CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full p-3 md:p-6 space-y-4 md:space-y-6 max-w-full overflow-hidden">
      {/* Enhanced Header with View Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl md:text-3xl font-bold truncate bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Music Tracks
            </h1>
            <p className="text-sm md:text-base text-muted-foreground hidden sm:block">
              Manage your music library with AI-powered tools and insights
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 min-w-0">
            <Button 
              onClick={syncInboxTracks}
              variant="outline"
              size="sm"
              className="gap-2 text-xs sm:text-sm whitespace-nowrap hover:scale-105 transition-transform"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Sync Tracks</span>
              <span className="sm:hidden">Sync</span>
            </Button>
            <Button 
              onClick={() => handleGenerateAI()}
              className="gap-2 text-xs sm:text-sm whitespace-nowrap bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 hover:scale-105 transition-all"
              size="sm"
            >
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Generate with AI</span>
              <span className="sm:hidden">AI</span>
            </Button>
          </div>
        </div>
        
        {/* View Mode Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ViewModeToggle 
              currentMode={viewMode} 
              onModeChange={setViewMode} 
              availableModes={['grid', 'list', 'timeline', 'analytics', 'waveform']}
            />
            <div className="flex items-center text-sm text-muted-foreground">
              <span>{tracks.length} tracks</span>
              {tracks.filter(t => t.audio_url).length > 0 && (
                <>
                  <span className="mx-2">•</span>
                  <span>{tracks.filter(t => t.audio_url).length} with audio</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`gap-2 ${showFilters ? 'bg-primary/10' : ''}`}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Filters - Collapsible */}
      {(showFilters || ['timeline', 'analytics'].includes(viewMode)) && (
        <Card className="border-primary/20 transition-all duration-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Smart Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tracks, lyrics, descriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 transition-colors focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Project
                </label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="transition-colors focus:border-primary">
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.is_inbox ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">Inbox</Badge>
                            {project.title}
                          </div>
                        ) : (
                          <span>
                            {project.title} 
                            {project.artists?.name && ` (${project.artists.name})`}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  Genre
                </label>
                <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                  <SelectTrigger className="transition-colors focus:border-primary">
                    <SelectValue placeholder="All genres" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genres</SelectItem>
                    {allGenres.map(genre => (
                      <SelectItem key={genre} value={genre}>
                        <div className="flex items-center gap-2">
                          <span>{genre}</span>
                          <Badge variant="secondary" className="text-xs">
                            {tracks.filter(t => t.genre_tags?.includes(genre)).length}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Sort By
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="transition-colors focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="updated_at">Recently Updated</SelectItem>
                    <SelectItem value="created_at">Recently Created</SelectItem>
                    <SelectItem value="title">Title (A-Z)</SelectItem>
                    <SelectItem value="track_number">Track Number</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dynamic View Rendering */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground">Loading your music library...</p>
            </div>
          </CardContent>
        </Card>
      ) : tracks.length === 0 ? (
        <Card className="border-dashed border-2 border-muted-foreground/25">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Music className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">No Tracks Found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchTerm || selectedProject !== "all" || selectedGenre !== "all"
                    ? "Try adjusting your search filters or create new content"
                    : "Start your music journey by creating your first track with AI"}
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => handleGenerateAI()} className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate with AI
                </Button>
                {(searchTerm || selectedProject !== "all" || selectedGenre !== "all") && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedProject('all');
                      setSelectedGenre('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Render based on selected view mode */}
          {viewMode === 'waveform' && (
            <TrackWaveformView
              tracks={tracks}
              onPlayTrack={handlePlayTrack}
              onEditTrack={handleEdit}
            />
          )}
          
          {viewMode === 'timeline' && (
            <TrackTimelineView
              tracks={tracks}
              onPlayTrack={handlePlayTrack}
              onEditTrack={handleEdit}
              onViewTrack={handleViewTrack}
            />
          )}
          
          {viewMode === 'analytics' && (
            <TrackAnalyticsView tracks={tracks} />
          )}
          
          {(viewMode === 'grid' || viewMode === 'list') && (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-6"
              : ""
            }>
              {viewMode === 'list' && (
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {tracks.map((track) => (
                        <div key={track.id} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="text-sm text-muted-foreground font-mono w-8">
                                #{track.track_number}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">{track.title}</h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {track.projects?.artists?.name && (
                                    <span>{track.projects.artists.name}</span>
                                  )}
                                  {track.projects?.title && (
                                    <>
                                      <span>•</span>
                                      <span>{track.projects.title}</span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(track.duration)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {track.audio_url && (
                                <Button size="sm" onClick={() => handlePlayTrack(track)}>
                                  <Play className="h-3 w-3" />
                                </Button>
                              )}
                              <Button size="sm" variant="outline" onClick={() => handleViewTrack(track)}>
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleEdit(track)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {viewMode === 'grid' && tracks.map((track) => (
                <Card key={track.id} className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 flex flex-col group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base md:text-lg mb-1 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                          {track.title}
                        </CardTitle>
                        <div className="space-y-1">
                          {track.projects?.artists?.name && (
                            <p className="text-xs md:text-sm text-muted-foreground truncate">
                              {track.projects.artists.name}
                            </p>
                          )}
                          {track.projects?.title && (
                            <p className="text-xs md:text-sm text-muted-foreground truncate">
                              {track.projects.title}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          #{track.track_number}
                        </div>
                        {track.current_version > 1 && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            v{track.current_version}
                          </Badge>
                        )}
                        {track.audio_url && (
                          <Badge variant="default" className="text-xs mt-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Ready
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3 flex-1">
                    {track.description && (
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                        {track.description}
                      </p>
                    )}

                    {track.genre_tags && track.genre_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {track.genre_tags.slice(0, 3).map((genre, index) => (
                          <Badge key={index} variant="outline" className="text-xs hover:bg-primary/10 transition-colors">
                            {genre}
                          </Badge>
                        ))}
                        {track.genre_tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{track.genre_tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(track.duration)}
                        </div>
                        {track.lyrics && (
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span className="hidden sm:inline">Lyrics</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 md:gap-2 mt-auto">
                      {track.audio_url && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handlePlayTrack(track)}
                          className="flex-1 h-8 text-xs hover:scale-105 transition-transform"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Play</span>
                          <span className="sm:hidden">▶</span>
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewTrack(track)}
                        className={`h-8 px-2 hover:scale-105 transition-transform ${track.audio_url ? "" : "flex-1"}`}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(track)}
                        className="h-8 px-2 hover:scale-105 transition-transform"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewVersions(track)}
                        className="h-8 px-2 hover:scale-105 transition-transform"
                      >
                        <History className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <TrackEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        track={selectedTrack}
        onTrackUpdated={loadTracks}
      />

      <TrackVersionsDialog
        open={versionsDialogOpen}
        onOpenChange={setVersionsDialogOpen}
        trackId={selectedTrack?.id || ""}
        trackTitle={selectedTrack?.title || ""}
      />

      <TrackGenerationDialog
        open={generationDialogOpen}
        onOpenChange={setGenerationDialogOpen}
        onGenerated={handleGenerationResult}
        artistInfo={selectedTrack?.projects?.artists}
        projectInfo={selectedTrack?.projects}
        trackId={selectedTrack?.id}
        existingTrackData={selectedTrack ? {
          stylePrompt: selectedTrack.style_prompt || "",
          genreTags: selectedTrack.genre_tags || [],
          lyrics: selectedTrack.lyrics || ""
        } : undefined}
      />

      <TrackViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        track={selectedTrack}
      />

      {/* Player */}
      <Suspense fallback={null}>
        <FloatingPlayer
          isOpen={playerOpen}
          onClose={() => setPlayerOpen(false)}
          track={currentTrack ? {
            id: currentTrack.id,
            title: currentTrack.title,
            audio_url: currentTrack.audio_url || '',
            project: {
              title: currentTrack.projects?.title || '',
              artist: {
                name: currentTrack.projects?.artists?.name || 'Unknown Artist'
              }
            }
          } : null}
        />
      </Suspense>
    </div>
  );
}