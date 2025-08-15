import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Play, 
  Download, 
  Sparkles,
  RefreshCw,
  Music,
  User,
  Folder,
  Mic,
  Music2,
  Settings,
  Zap,
  Heart,
  Share2,
  Clock
} from "lucide-react";

interface Track {
  id: string;
  title: string;
  project?: {
    title: string;
    artist?: {
      name: string;
    };
  };
}

interface Option {
  id: string;
  name: string;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string, data?: any) => void;
  tracks: Track[];
  projects: Option[];
  artists: Option[];
}

export function CommandPalette({
  isOpen,
  onClose,
  onAction,
  tracks,
  projects,
  artists
}: CommandPaletteProps) {
  const [searchValue, setSearchValue] = useState("");

  const handleAction = (action: string, data?: any) => {
    onAction(action, data);
    setSearchValue("");
    onClose();
  };

  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchValue.toLowerCase()) ||
    track.project?.title?.toLowerCase().includes(searchValue.toLowerCase()) ||
    track.project?.artist?.name?.toLowerCase().includes(searchValue.toLowerCase())
  ).slice(0, 5);

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchValue.toLowerCase())
  ).slice(0, 3);

  const filteredArtists = artists.filter(artist =>
    artist.name.toLowerCase().includes(searchValue.toLowerCase())
  ).slice(0, 3);

  const quickActions = [
    {
      id: "sync",
      label: "Синхронизация треков",
      description: "Загрузить треки с внешних сервисов",
      icon: RefreshCw,
      action: "sync",
      shortcut: "⌘S"
    },
    {
      id: "generate-suno",
      label: "Новый трек (Suno AI)",
      description: "Создать трек с помощью Suno AI",
      icon: Mic,
      action: "generate",
      data: { service: "suno" },
      shortcut: "⌘N"
    },
    {
      id: "generate-mureka",
      label: "Новый трек (Mureka)",
      description: "Создать трек с помощью Mureka",
      icon: Music2,
      action: "generate",
      data: { service: "mureka" },
      shortcut: "⌘M"
    }
  ];

  const searchActions = [
    {
      id: "search-tracks",
      label: `Поиск треков: "${searchValue}"`,
      description: "Найти треки по названию или исполнителю",
      icon: Search,
      action: "search",
      data: { query: searchValue, type: "tracks" }
    },
    {
      id: "search-projects",
      label: `Поиск проектов: "${searchValue}"`,
      description: "Найти проекты по названию",
      icon: Folder,
      action: "search",
      data: { query: searchValue, type: "projects" }
    },
    {
      id: "search-artists",
      label: `Поиск артистов: "${searchValue}"`,
      description: "Найти артистов по имени",
      icon: User,
      action: "search",
      data: { query: searchValue, type: "artists" }
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-2xl">
        <Command>
          <CommandInput 
            placeholder="Поиск команд, треков, проектов..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          
          <CommandList className="max-h-[70vh]">
            <CommandEmpty>Ничего не найдено.</CommandEmpty>

            {/* Quick Actions */}
            {!searchValue && (
              <CommandGroup heading="Быстрые действия">
                {quickActions.map((action) => (
                  <CommandItem
                    key={action.id}
                    onSelect={() => handleAction(action.action, action.data)}
                    className="flex items-center gap-3 py-3"
                  >
                    <action.icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{action.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {action.description}
                      </div>
                    </div>
                    {action.shortcut && (
                      <Badge variant="outline" className="text-xs">
                        {action.shortcut}
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Search Results */}
            {searchValue && (
              <>
                <CommandGroup heading="Поиск">
                  {searchActions.map((action) => (
                    <CommandItem
                      key={action.id}
                      onSelect={() => handleAction(action.action, action.data)}
                      className="flex items-center gap-3 py-3"
                    >
                      <action.icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{action.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {action.description}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>

                <CommandSeparator />
              </>
            )}

            {/* Tracks */}
            {(filteredTracks.length > 0 || (!searchValue && tracks.length > 0)) && (
              <CommandGroup heading="Треки">
                {(searchValue ? filteredTracks : tracks.slice(0, 5)).map((track) => (
                  <CommandItem
                    key={track.id}
                    onSelect={() => handleAction("play", { track })}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-accent/30 rounded flex items-center justify-center flex-shrink-0">
                      <Music className="h-4 w-4 text-primary/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{track.title}</div>
                      {track.project?.artist?.name && (
                        <div className="text-xs text-muted-foreground truncate">
                          {track.project.artist.name}
                          {track.project?.title && ` • ${track.project.title}`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Play className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Projects */}
            {filteredProjects.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Проекты">
                  {filteredProjects.map((project) => (
                    <CommandItem
                      key={project.id}
                      onSelect={() => handleAction("open-project", { project })}
                      className="flex items-center gap-3 py-3"
                    >
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{project.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Открыть проект
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Artists */}
            {filteredArtists.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Артисты">
                  {filteredArtists.map((artist) => (
                    <CommandItem
                      key={artist.id}
                      onSelect={() => handleAction("open-artist", { artist })}
                      className="flex items-center gap-3 py-3"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="font-medium">{artist.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Открыть профиль артиста
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Help */}
            {!searchValue && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Справка">
                  <CommandItem className="flex items-center gap-3 py-3">
                    <div className="h-4 w-4" />
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">
                        Нажмите ⌘K чтобы открыть команды • ESC чтобы закрыть
                      </div>
                    </div>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}