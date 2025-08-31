import React, { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar,
  Clock,
  Music,
  TrendingUp,
  Filter,
  ChevronDown,
  ChevronUp,
  Play,
  Eye,
  Edit,
  MoreHorizontal
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Track {
  id: string;
  title: string;
  track_number: number;
  duration: number | null;
  audio_url: string | null;
  current_version: number;
  created_at: string;
  updated_at: string;
  description?: string | null;
  genre_tags?: string[] | null;
  projects?: {
    title: string;
    artists?: {
      name: string;
    };
  };
}

interface TrackTimelineViewProps {
  tracks: Track[];
  onPlayTrack: (track: Track) => void;
  onEditTrack: (track: Track) => void;
  onViewTrack: (track: Track) => void;
  className?: string;
}

type TimelineGrouping = 'day' | 'week' | 'month' | 'year';

const formatDate = (dateString: string, grouping: TimelineGrouping) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  // Relative dates for recent items
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  
  // Format based on grouping
  switch (grouping) {
    case 'day':
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
    case 'week':
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return `Week of ${weekStart.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })}`;
    case 'month':
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
    case 'year':
      return date.getFullYear().toString();
    default:
      return date.toLocaleDateString();
  }
};

const groupTracksByDate = (tracks: Track[], grouping: TimelineGrouping) => {
  const groups = new Map<string, Track[]>();
  
  tracks.forEach(track => {
    const groupKey = formatDate(track.created_at, grouping);
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(track);
  });
  
  // Convert to array and sort by date (most recent first)
  return Array.from(groups.entries())
    .map(([date, tracks]) => ({
      date,
      tracks: tracks.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
      totalDuration: tracks.reduce((sum, track) => sum + (track.duration || 0), 0),
      avgDuration: tracks.reduce((sum, track) => sum + (track.duration || 0), 0) / tracks.length
    }))
    .sort((a, b) => {
      // Sort groups by the most recent track in each group
      const aLatest = Math.max(...a.tracks.map(t => new Date(t.created_at).getTime()));
      const bLatest = Math.max(...b.tracks.map(t => new Date(t.created_at).getTime()));
      return bLatest - aLatest;
    });
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const TrackTimelineView = memo(({ 
  tracks, 
  onPlayTrack, 
  onEditTrack, 
  onViewTrack, 
  className 
}: TrackTimelineViewProps) => {
  const [grouping, setGrouping] = useState<TimelineGrouping>('week');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedGenre, setSelectedGenre] = useState<string>('all');

  // Filter tracks by genre if selected
  const filteredTracks = selectedGenre === 'all' 
    ? tracks 
    : tracks.filter(track => track.genre_tags?.includes(selectedGenre));

  const groupedTracks = groupTracksByDate(filteredTracks, grouping);
  
  // Get all unique genres for filter
  const allGenres = Array.from(new Set(
    tracks.flatMap(track => track.genre_tags || [])
  )).sort();

  const toggleGroupCollapse = (date: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(date)) {
      newCollapsed.delete(date);
    } else {
      newCollapsed.add(date);
    }
    setCollapsedGroups(newCollapsed);
  };

  return (
    <TooltipProvider>
      <div className={`space-y-4 ${className}`}>
        {/* Controls */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Timeline View
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Genre Filter */}
                <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All genres" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All genres</SelectItem>
                    {allGenres.map(genre => (
                      <SelectItem key={genre} value={genre}>
                        {genre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Grouping */}
                <Select value={grouping} onValueChange={(value: TimelineGrouping) => setGrouping(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">By Day</SelectItem>
                    <SelectItem value="week">By Week</SelectItem>
                    <SelectItem value="month">By Month</SelectItem>
                    <SelectItem value="year">By Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>

        {groupedTracks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Tracks Found</h3>
              <p className="text-muted-foreground text-center">
                {selectedGenre !== 'all' 
                  ? `No tracks found for genre "${selectedGenre}"`
                  : 'No tracks available in the timeline'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {groupedTracks.map(({ date, tracks, totalDuration, avgDuration }) => {
              const isCollapsed = collapsedGroups.has(date);
              
              return (
                <Card key={date} className="overflow-hidden">
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleGroupCollapse(date)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          {isCollapsed ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronUp className="h-4 w-4" />
                          )}
                        </Button>
                        <div>
                          <CardTitle className="text-lg">{date}</CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{tracks.length} track{tracks.length !== 1 ? 's' : ''}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(totalDuration)} total
                            </span>
                            <span>•</span>
                            <span>{formatDuration(Math.round(avgDuration))} avg</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Quick Stats */}
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <TrendingUp className="h-4 w-4" />
                              <span>{tracks.filter(t => t.audio_url).length}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {tracks.filter(t => t.audio_url).length} tracks with audio
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {!isCollapsed && (
                    <CardContent className="space-y-3">
                      {/* Timeline Line */}
                      <div className="relative">
                        <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
                        
                        <div className="space-y-4">
                          {tracks.map((track, index) => {
                            const createdTime = new Date(track.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                            
                            return (
                              <div key={track.id} className="flex items-start gap-4 relative">
                                {/* Timeline Dot */}
                                <div className="relative z-10 flex-shrink-0">
                                  <div className="w-3 h-3 bg-primary rounded-full border-2 border-background shadow-sm" />
                                  <div className="absolute -top-1 -left-1 w-5 h-5 bg-primary/20 rounded-full animate-pulse" />
                                </div>
                                
                                {/* Track Card */}
                                <Card className="flex-1 hover:shadow-md transition-shadow">
                                  <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <h4 className="font-semibold truncate">{track.title}</h4>
                                          <span className="text-xs text-muted-foreground">#{track.track_number}</span>
                                          <span className="text-xs text-muted-foreground">•</span>
                                          <span className="text-xs text-muted-foreground">{createdTime}</span>
                                          {track.current_version > 1 && (
                                            <Badge variant="secondary" className="text-xs">
                                              v{track.current_version}
                                            </Badge>
                                          )}
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
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
                                        
                                        {track.description && (
                                          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                                            {track.description}
                                          </p>
                                        )}
                                        
                                        {track.genre_tags && track.genre_tags.length > 0 && (
                                          <div className="flex flex-wrap gap-1">
                                            {track.genre_tags.slice(0, 3).map((genre, idx) => (
                                              <Badge key={idx} variant="outline" className="text-xs">
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
                                      </div>
                                      
                                      {/* Actions */}
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        {track.audio_url && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => onPlayTrack(track)}
                                                className="h-8 w-8 p-0"
                                              >
                                                <Play className="h-3 w-3" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Play track</TooltipContent>
                                          </Tooltip>
                                        )}
                                        
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => onViewTrack(track)}
                                              className="h-8 w-8 p-0"
                                            >
                                              <Eye className="h-3 w-3" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>View details</TooltipContent>
                                        </Tooltip>
                                        
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => onEditTrack(track)}
                                              className="h-8 w-8 p-0"
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Edit track</TooltipContent>
                                        </Tooltip>
                                        
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="h-8 w-8 p-0"
                                            >
                                              <MoreHorizontal className="h-3 w-3" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>More actions</TooltipContent>
                                        </Tooltip>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
});

TrackTimelineView.displayName = 'TrackTimelineView';