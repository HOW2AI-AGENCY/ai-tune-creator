import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause,
  Heart, 
  Download, 
  Music,
  Clock,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Trash2
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useTrackActions } from "@/hooks/useTrackActions";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Track {
  id: string;
  title: string;
  track_number?: number;
  duration?: number;
  lyrics?: string;
  description?: string;
  genre_tags?: string[];
  style_prompt?: string;
  current_version?: number;
  created_at?: string;
  updated_at?: string;
  audio_url?: string;
  metadata?: any;
  project?: {
    title: string;
    artist?: {
      name: string;
    };
  };
}

interface TrackResultsGridProps {
  tracks: Track[];
  onTrackClick: (track: Track) => void;
  onPlayTrack: (track: Track) => void;
  currentPlayingTrack: Track | null;
  isPlaying: boolean;
  isSyncing: boolean;
  onTrackDeleted?: () => void; // Callback для обновления списка после удаления
}

export function TrackResultsGrid({
  tracks,
  onTrackClick,
  onPlayTrack,
  currentPlayingTrack,
  isPlaying,
  isSyncing,
  onTrackDeleted
}: TrackResultsGridProps) {
  const { t } = useTranslation();
  const { likeTrack, unlikeTrack, isLiked, downloadMP3, deleteTrack, isDeleting } = useTrackActions();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const isCurrentTrackPlaying = (track: Track) => {
    return currentPlayingTrack?.id === track.id && isPlaying;
  };

  const handleDeleteTrack = async (track: Track) => {
    try {
      await deleteTrack(track.id);
      setShowDeleteDialog(false);
      setTrackToDelete(null);
      onTrackDeleted?.();
    } catch (error) {
      console.error('Delete track error:', error);
    }
  };

  if (isSyncing) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <RefreshCw className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t('syncingTracks')}
          </h3>
          <p className="text-muted-foreground">
            {t('syncingTracksDesc')}
          </p>
        </div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t('noTracks')}
          </h3>
          <p className="text-muted-foreground mb-4">
            {t('noTracksDesc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-2 sm:p-4 md:p-6 w-full max-w-full overflow-hidden">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
          {tracks.map((track) => (
            <Card 
              key={track.id} 
              className="bg-card border-border hover:bg-accent/10 transition-all cursor-pointer group hover:scale-[1.02] hover:shadow-lg"
              onClick={(e) => {
                console.log('🎯 Card clicked:', track.title);
                onTrackClick(track);
              }}
            >
              <CardContent className="p-0 relative">
                {/* Cover Image */}
                <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/30 relative overflow-hidden rounded-t-lg">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Music className="h-12 w-12 text-primary/60" />
                  </div>
                  
                  {/* Genre Tags */}
                  {track.genre_tags && track.genre_tags.length > 0 && (
                    <div className="absolute top-2 left-2">
                      <Badge 
                        variant="secondary" 
                        className="text-xs bg-black/20 text-white border-white/20 backdrop-blur-sm"
                      >
                        {track.genre_tags[0]}
                      </Badge>
                    </div>
                  )}
                  
                  {/* Duration */}
                  {track.duration && (
                    <div className="absolute top-2 right-2">
                      <Badge 
                        variant="secondary" 
                        className="text-xs bg-black/20 text-white border-white/20 backdrop-blur-sm flex items-center gap-1"
                      >
                        <Clock className="h-3 w-3" />
                        {formatDuration(track.duration)}
                      </Badge>
                    </div>
                  )}
                  
                  {/* Hover Controls */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className={`h-8 w-8 p-0 text-white hover:bg-white/20 ${isLiked(track.id) ? 'text-red-500' : ''}`}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          if (isLiked(track.id)) {
                            await unlikeTrack(track.id);
                          } else {
                            await likeTrack(track.id);
                          }
                        } catch (err) {
                          console.error('Like toggle error:', err);
                        }
                      }}
                      aria-label={t('likeTrack')}
                    >
                      <Heart className={`h-4 w-4 ${isLiked(track.id) ? 'fill-current' : ''}`} />
                    </Button>
                    
                    <Button 
                      size="sm" 
                      className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 p-0 shadow-lg disabled:opacity-50"
                      disabled={!track.audio_url}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        console.log('▶️ Play button clicked:', track.title, 'has audio_url:', !!track.audio_url);
                        e.stopPropagation();
                        if (track.audio_url) {
                          onPlayTrack(track);
                        } else {
                          console.warn('❌ Play button clicked but no audio_url');
                        }
                      }}
                      aria-label={isCurrentTrackPlaying(track) ? t('pauseTrack') : t('playTrack')}
                    >
                      {isCurrentTrackPlaying(track) ? (
                        <Pause className="h-5 w-5" />
                      ) : (
                        <Play className="h-5 w-5 ml-0.5" />
                      )}
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-white hover:bg-white/20"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          if (track.audio_url) {
                            await downloadMP3(track);
                          }
                        } catch (err) {
                          console.error('Download error:', err);
                        }
                      }}
                      aria-label={t('downloadTrack')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Playing Indicator */}
                  {isCurrentTrackPlaying(track) && (
                    <div className="absolute bottom-2 left-2">
                      <div className="flex items-center gap-1">
                        <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                        <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-100" />
                        <div className="h-2 w-2 bg-primary rounded-full animate-pulse delay-200" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Track Info */}
                <div className="p-3">
                  <h3 className="font-medium text-sm text-foreground mb-1 line-clamp-2 min-h-[2.5rem]">
                    {track.title}
                  </h3>
                  
                  {track.project?.artist?.name && (
                    <p className="text-xs text-muted-foreground mb-2 truncate">
                      {track.project.artist.name}
                    </p>
                  )}
                  
                  {track.project?.title && (
                    <p className="text-xs text-muted-foreground/80 mb-2 truncate">
                      из "{track.project.title}"
                    </p>
                  )}
                  
                  {/* Track Stats */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      <span>0</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      <span>0</span>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          aria-label={t('moreOptions')}
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent 
                        align="end" 
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setTrackToDelete(track);
                            setShowDeleteDialog(true);
                          }}
                          className="text-destructive focus:text-destructive"
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {isDeleting ? 'Удаление...' : 'Удалить трек'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить трек?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить трек "{trackToDelete?.title}"? 
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => trackToDelete && handleDeleteTrack(trackToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}