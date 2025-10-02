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
import { useState, memo, useCallback, useMemo } from "react";
import { GroupedTrackCard } from "./GroupedTrackCard";
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
  variant_group_id?: string;
  variant_number?: number;
  is_master_variant?: boolean;
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

export const TrackResultsGrid = memo<TrackResultsGridProps>(function TrackResultsGrid({
  tracks,
  onTrackClick,
  onPlayTrack,
  currentPlayingTrack,
  isPlaying,
  isSyncing,
  onTrackDeleted
}: TrackResultsGridProps) {
  const { t } = useTranslation();
  const { likeTrack, unlikeTrack, isLiked, downloadMP3, deleteTrack, isDeleting, setMasterVariant } = useTrackActions();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null);

  // Group tracks by variant_group_id
  const groupedTracks = useMemo(() => {
    const groups = new Map<string, Track[]>();
    const standalone: Track[] = [];

    tracks.forEach(track => {
      if (track.variant_group_id) {
        const existing = groups.get(track.variant_group_id) || [];
        groups.set(track.variant_group_id, [...existing, track]);
      } else {
        standalone.push(track);
      }
    });

    return { groups, standalone };
  }, [tracks]);

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
      <div className="p-1 sm:p-2 md:p-4 w-full">
        <div className="space-y-2">
          {/* Render grouped tracks */}
          {Array.from(groupedTracks.groups.entries()).map(([groupId, variants]) => {
            const masterTrack = variants.find(v => v.is_master_variant) || variants[0];
            return (
              <GroupedTrackCard
                key={groupId}
                masterTrack={masterTrack}
                variants={variants}
                onTrackClick={onTrackClick}
                onPlayTrack={onPlayTrack}
                currentPlayingTrack={currentPlayingTrack}
                isPlaying={isPlaying}
                onDownload={(track) => downloadMP3(track)}
                onSetMaster={(trackId) => setMasterVariant(trackId)}
              />
            );
          })}

          {/* Render standalone tracks */}
          {groupedTracks.standalone.map((track) => (
            <Card 
              key={track.id} 
              className="bg-card/80 border-border/50 hover:bg-accent/10 transition-all cursor-pointer group backdrop-blur-sm"
              onClick={(e) => {
                if (import.meta.env.DEV) console.log('🎯 Card clicked:', track.title);
                onTrackClick(track);
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Cover Image */}
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-accent/30 relative overflow-hidden rounded-lg flex-shrink-0">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Music className="h-6 w-6 text-primary/60" />
                    </div>
                    
                    {/* Playing Indicator */}
                    {isCurrentTrackPlaying(track) && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="flex items-center gap-0.5">
                          <div className="h-1 w-1 bg-primary rounded-full animate-pulse" />
                          <div className="h-1 w-1 bg-primary rounded-full animate-pulse delay-100" />
                          <div className="h-1 w-1 bg-primary rounded-full animate-pulse delay-200" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-foreground line-clamp-1">
                          {track.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {track.project?.artist?.name && (
                            <span className="text-xs text-muted-foreground">
                              {track.project.artist.name}
                            </span>
                          )}
                          {track.project?.title && (
                            <>
                              <span className="text-xs text-muted-foreground/60">•</span>
                              <span className="text-xs text-muted-foreground/80 truncate">
                                {track.project.title}
                              </span>
                            </>
                          )}
                        </div>
                        
                        {/* Genre Tags and Duration */}
                        <div className="flex items-center gap-2 mt-1">
                          {track.genre_tags && track.genre_tags.length > 0 && (
                            <Badge 
                              variant="outline" 
                              className="text-xs px-1.5 py-0 h-5 bg-secondary/20"
                            >
                              {track.genre_tags[0]}
                            </Badge>
                          )}
                          {track.duration && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDuration(track.duration)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className={`h-8 w-8 p-0 hover:bg-accent/20 ${isLiked(track.id) ? 'text-red-500' : 'text-muted-foreground'}`}
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
                          className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 p-0 shadow-sm disabled:opacity-50"
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
                            <Pause className="h-3 w-3" />
                          ) : (
                            <Play className="h-3 w-3 ml-0.5" />
                          )}
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-muted-foreground hover:bg-accent/20"
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

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-8 w-8 p-0 text-muted-foreground hover:bg-accent/20"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              aria-label={t('moreOptions')}
                            >
                              <MoreHorizontal className="h-4 w-4" />
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
});