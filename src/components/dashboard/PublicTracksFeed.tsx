import { useState, useEffect } from 'react';
import { Music, User, Calendar, Play } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Track {
  id: string;
  title: string;
  created_at: string;
  audio_url?: string;
  metadata?: Record<string, any>;
  artist: {
    name: string;
    avatar_url?: string;
  };
  profile?: {
    display_name?: string;
    avatar_url?: string;
  };
}

interface PublicTracksFeedProps {
  limit?: number;
  showHeader?: boolean;
}

export const PublicTracksFeed = ({ limit = 10, showHeader = true }: PublicTracksFeedProps) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);

  useEffect(() => {
    const loadPublicTracks = async () => {
      try {
        const { data, error } = await supabase
          .from('tracks')
          .select(`
            id,
            title,
            created_at,
            audio_url,
            metadata,
            project_id,
            projects (
              artist_id,
              artists (
                name,
                avatar_url,
                user_id,
                profiles!inner (
                  display_name,
                  avatar_url
                )
              )
            )
          `)
          .not('audio_url', 'is', null)
          .not('metadata->>deleted', 'eq', 'true')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          console.error('Error loading public tracks:', error);
          return;
        }

        const formattedTracks = data?.map(track => ({
          id: track.id,
          title: track.title,
          created_at: track.created_at,
          audio_url: track.audio_url,
          metadata: track.metadata as Record<string, any> || {},
          artist: {
            name: track.projects?.artists?.name || 'Неизвестный артист',
            avatar_url: track.projects?.artists?.avatar_url
          },
          profile: track.projects?.artists?.profiles ? {
            display_name: (track.projects.artists.profiles as any).display_name,
            avatar_url: (track.projects.artists.profiles as any).avatar_url
          } : undefined
        })) || [];

        setTracks(formattedTracks);
      } catch (error) {
        console.error('Failed to load tracks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPublicTracks();
  }, [limit]);

  const playTrack = (trackId: string, audioUrl: string) => {
    if (currentlyPlaying === trackId) {
      setCurrentlyPlaying(null);
      // Остановить воспроизведение
      const audio = document.querySelector(`audio[data-track-id="${trackId}"]`) as HTMLAudioElement;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    } else {
      // Остановить предыдущий трек
      if (currentlyPlaying) {
        const prevAudio = document.querySelector(`audio[data-track-id="${currentlyPlaying}"]`) as HTMLAudioElement;
        if (prevAudio) {
          prevAudio.pause();
          prevAudio.currentTime = 0;
        }
      }
      setCurrentlyPlaying(trackId);
      // Начать воспроизведение нового трека
      const audio = document.querySelector(`audio[data-track-id="${trackId}"]`) as HTMLAudioElement;
      if (audio) {
        audio.play().catch(console.error);
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Последние треки сообщества
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-6">
        {tracks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Пока нет опубликованных треков</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tracks.map((track) => {
              const artistName = track.profile?.display_name || track.artist.name;
              const avatarUrl = track.profile?.avatar_url || track.artist.avatar_url;
              const isPlaying = currentlyPlaying === track.id;
              const service = track.metadata?.service;

              return (
                <div key={track.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  {/* Аватар артиста */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={avatarUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>

                  {/* Информация о треке */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{track.title}</h4>
                      {service && (
                        <Badge variant="secondary" className="text-xs">
                          {service}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {artistName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(track.created_at), { 
                          addSuffix: true, 
                          locale: ru 
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Кнопка воспроизведения */}
                  {track.audio_url && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={isPlaying ? "default" : "outline"}
                        onClick={() => playTrack(track.id, track.audio_url!)}
                        className="w-8 h-8 p-0"
                      >
                        <Play className={`h-3 w-3 ${isPlaying ? 'fill-current' : ''}`} />
                      </Button>
                      <audio
                        data-track-id={track.id}
                        src={track.audio_url}
                        onEnded={() => setCurrentlyPlaying(null)}
                        preload="none"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};