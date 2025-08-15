import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Play, 
  Pause,
  Download, 
  Heart, 
  Share2,
  Music,
  FileText,
  Settings,
  Eye,
  Clock,
  Calendar,
  Tag,
  User,
  Folder,
  Activity,
  Mic,
  Music2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

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

interface TrackDetailsDrawerProps {
  track: Track | null;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (track: Track) => void;
}

export function TrackDetailsDrawer({ 
  track, 
  isOpen, 
  onClose, 
  onPlay 
}: TrackDetailsDrawerProps) {
  if (!track) return null;

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getServiceIcon = (metadata?: any) => {
    const service = metadata?.service || metadata?.ai_service;
    return service === 'suno' ? <Mic className="h-4 w-4" /> : <Music2 className="h-4 w-4" />;
  };

  const getServiceName = (metadata?: any) => {
    const service = metadata?.service || metadata?.ai_service;
    return service === 'suno' ? 'Suno AI' : service === 'mureka' ? 'Mureka' : 'Неизвестно';
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-96 sm:w-[480px]">
        <SheetHeader className="space-y-4">
          <div className="flex items-start gap-4">
            {/* Track Cover */}
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Music className="h-8 w-8 text-primary/60" />
            </div>
            
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg line-clamp-2 mb-1">
                {track.title}
              </SheetTitle>
              
              {track.project?.artist?.name && (
                <SheetDescription className="text-base">
                  {track.project.artist.name}
                </SheetDescription>
              )}
              
              {track.project?.title && (
                <p className="text-sm text-muted-foreground mt-1">
                  из альбома "{track.project.title}"
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => onPlay(track)}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Воспроизвести
            </Button>
            
            <Button variant="outline" size="icon">
              <Heart className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <Separator className="my-6" />

        <ScrollArea className="h-[calc(100vh-16rem)]">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <FileText className="h-3 w-3" />
                Детали
              </TabsTrigger>
              <TabsTrigger value="lyrics" className="flex items-center gap-2">
                <Mic className="h-3 w-3" />
                Лирика
              </TabsTrigger>
              <TabsTrigger value="technical" className="flex items-center gap-2">
                <Settings className="h-3 w-3" />
                Технические
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              {/* Basic Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Основная информация</h4>
                
                <div className="space-y-2">
                  {track.duration && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Длительность
                      </span>
                      <span>{formatDuration(track.duration)}</span>
                    </div>
                  )}
                  
                  {track.track_number && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Music className="h-3 w-3" />
                        Номер трека
                      </span>
                      <span>#{track.track_number}</span>
                    </div>
                  )}
                  
                  {track.current_version && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Activity className="h-3 w-3" />
                        Версия
                      </span>
                      <span>v{track.current_version}</span>
                    </div>
                  )}
                  
                  {track.created_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Создан
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(track.created_at), { 
                          addSuffix: true, 
                          locale: ru 
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Project & Artist */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Контекст</h4>
                
                <div className="space-y-2">
                  {track.project?.title && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Folder className="h-3 w-3" />
                        Проект
                      </span>
                      <span className="truncate max-w-48 text-right">
                        {track.project.title}
                      </span>
                    </div>
                  )}
                  
                  {track.project?.artist?.name && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <User className="h-3 w-3" />
                        Артист
                      </span>
                      <span className="truncate max-w-48 text-right">
                        {track.project.artist.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Genre Tags */}
              {track.genre_tags && track.genre_tags.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Tag className="h-3 w-3" />
                    Жанры и теги
                  </h4>
                  
                  <div className="flex flex-wrap gap-2">
                    {track.genre_tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {track.description && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Описание</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {track.description}
                    </p>
                  </div>
                </>
              )}

              {/* Style Prompt */}
              {track.style_prompt && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Стиль-промпт</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed bg-muted/50 p-3 rounded-lg">
                      {track.style_prompt}
                    </p>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="lyrics" className="space-y-4">
              {track.lyrics ? (
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Текст песни</h4>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                      {track.lyrics}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Mic className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Лирика недоступна для этого трека
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="technical" className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Техническая информация</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">ID трека</span>
                    <span className="font-mono text-xs">{track.id}</span>
                  </div>
                  
                  {track.metadata && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        {getServiceIcon(track.metadata)}
                        AI сервис
                      </span>
                      <span>{getServiceName(track.metadata)}</span>
                    </div>
                  )}
                  
                  {track.audio_url && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Формат аудио</span>
                      <span>MP3</span>
                    </div>
                  )}
                  
                  {track.updated_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Обновлен</span>
                      <span>
                        {formatDistanceToNow(new Date(track.updated_at), { 
                          addSuffix: true, 
                          locale: ru 
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              {track.metadata && Object.keys(track.metadata).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Метаданные</h4>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                        {JSON.stringify(track.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}