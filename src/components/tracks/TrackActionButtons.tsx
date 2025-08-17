/**
 * @fileoverview Reusable track action buttons component
 * @version 0.01.036
 * @author Claude Code Assistant
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  Trash2, 
  Download, 
  Play, 
  Pause, 
  MoreHorizontal,
  Scissors,
  Music,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTrackActions } from '@/hooks/useTrackActions';
import { VocalSeparationDialog } from '@/features/ai-generation/components/VocalSeparationDialog';
import { WAVConversionDialog } from '@/features/ai-generation/components/WAVConversionDialog';

interface Track {
  id: string;
  title: string;
  audio_url?: string;
  metadata?: any;
  user_id?: string;
}

interface TrackActionButtonsProps {
  track: Track;
  variant?: 'compact' | 'full' | 'dropdown';
  onPlay?: (track: Track) => void;
  onDelete?: () => void;
  isPlaying?: boolean;
  showLabels?: boolean;
  className?: string;
}

export function TrackActionButtons({
  track,
  variant = 'full',
  onPlay,
  onDelete,
  isPlaying = false,
  showLabels = false,
  className = ''
}: TrackActionButtonsProps) {
  const {
    likeTrack,
    unlikeTrack,
    isLiked,
    deleteTrack,
    downloadMP3,
    isLiking,
    isDeleting,
    isDownloading,
  } = useTrackActions();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showVocalSeparation, setShowVocalSeparation] = useState(false);
  const [showWAVConversion, setShowWAVConversion] = useState(false);

  const liked = isLiked(track.id);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (liked) {
      await unlikeTrack(track.id);
    } else {
      await likeTrack(track.id);
    }
  };

  const handleDelete = async () => {
    if (onDelete) {
      onDelete();
    } else {
      await deleteTrack(track.id, true); // Soft delete by default
    }
    setShowDeleteDialog(false);
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay?.(track);
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await downloadMP3(track);
  };

  // Compact variant - just essential buttons
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {track.audio_url && onPlay && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePlay}
            className="h-8 w-8 p-0"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLike}
          disabled={isLiking}
          className={`h-8 w-8 p-0 ${liked ? 'text-red-500 hover:text-red-600' : ''}`}
        >
          {isLiking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {track.audio_url && (
              <DropdownMenuItem onClick={handleDownload} disabled={isDownloading}>
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? 'Загружается...' : 'Скачать MP3'}
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem onClick={() => setShowVocalSeparation(true)}>
              <Scissors className="h-4 w-4 mr-2" />
              Разделить стемы
            </DropdownMenuItem>
            
            {track.metadata?.service === 'suno' && (
              <DropdownMenuItem onClick={() => setShowWAVConversion(true)}>
                <Music className="h-4 w-4 mr-2" />
                Конвертировать в WAV
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Dropdown variant - all actions in dropdown
  if (variant === 'dropdown') {
    return (
      <div className={className}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {track.audio_url && onPlay && (
              <DropdownMenuItem onClick={handlePlay}>
                {isPlaying ? (
                  <><Pause className="h-4 w-4 mr-2" />Пауза</>
                ) : (
                  <><Play className="h-4 w-4 mr-2" />Воспроизвести</>
                )}
              </DropdownMenuItem>
            )}
            
            <DropdownMenuItem onClick={handleLike} disabled={isLiking}>
              <Heart className={`h-4 w-4 mr-2 ${liked ? 'fill-current text-red-500' : ''}`} />
              {liked ? 'Убрать лайк' : 'Лайк'}
            </DropdownMenuItem>
            
            {track.audio_url && (
              <DropdownMenuItem onClick={handleDownload} disabled={isDownloading}>
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? 'Загружается...' : 'Скачать MP3'}
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => setShowVocalSeparation(true)}>
              <Scissors className="h-4 w-4 mr-2" />
              Разделить стемы
            </DropdownMenuItem>
            
            {track.metadata?.service === 'suno' && (
              <DropdownMenuItem onClick={() => setShowWAVConversion(true)}>
                <Music className="h-4 w-4 mr-2" />
                Конвертировать в WAV
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить трек
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Full variant - all buttons visible
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {track.audio_url && onPlay && (
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlay}
          className="flex items-center gap-2"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {showLabels && (isPlaying ? 'Пауза' : 'Играть')}
        </Button>
      )}

      <Button
        variant={liked ? "default" : "outline"}
        size="sm"
        onClick={handleLike}
        disabled={isLiking}
        className={`flex items-center gap-2 ${liked ? 'bg-red-500 hover:bg-red-600 border-red-500' : ''}`}
      >
        {isLiking ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
        )}
        {showLabels && (liked ? 'Лайк' : 'Лайкнуть')}
      </Button>

      {track.audio_url && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center gap-2"
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {showLabels && (isDownloading ? 'Загружается...' : 'Скачать')}
        </Button>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowVocalSeparation(true)}
        className="flex items-center gap-2"
      >
        <Scissors className="h-4 w-4" />
        {showLabels && 'Стемы'}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDeleteDialog(true)}
        className="flex items-center gap-2 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        {showLabels && 'Удалить'}
      </Button>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить трек?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить трек "{track.title}"? 
              Трек будет помещен в корзину и может быть восстановлен.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Удаление...</>
              ) : (
                'Удалить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stem Separation Dialog */}
      <VocalSeparationDialog
        open={showVocalSeparation}
        onOpenChange={setShowVocalSeparation}
        track={track}
      />

      {/* WAV Conversion Dialog */}
      <WAVConversionDialog
        open={showWAVConversion}
        onOpenChange={setShowWAVConversion}
        track={track}
      />
    </div>
  );
}