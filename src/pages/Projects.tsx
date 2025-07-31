import { Plus, Search, Filter, MoreHorizontal, FolderOpen, Music, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/useTranslation";

export default function Projects() {
  const { t } = useTranslation();
  
  // Mock data - will be replaced with real data from Supabase
  const projects = [
    {
      id: "1",
      title: "Электронные мечты",
      description: "Коллекция эмбиент электронных треков с эфирными звуковыми ландшафтами",
      type: "album",
      status: "published",
      coverUrl: null,
      tracksCount: 8,
      createdAt: "2024-01-15",
      updatedAt: "2024-01-20",
      artist: {
        name: "Digital Soundscapes"
      }
    },
    {
      id: "2", 
      title: "Полуночные вибрации",
      description: "Поздние ночные chill треки, идеальные для расслабления",
      type: "ep",
      status: "draft",
      coverUrl: null,
      tracksCount: 4,
      createdAt: "2024-01-10",
      updatedAt: "2024-01-18",
      artist: {
        name: "Chill Masters"
      }
    },
    {
      id: "3",
      title: "Летний гимн",
      description: "Оптимистичный летний сингл с тропическими вибрациями",
      type: "single",
      status: "published",
      coverUrl: null,
      tracksCount: 1,
      createdAt: "2024-01-05",
      updatedAt: "2024-01-15",
      artist: {
        name: "Tropical Beats"
      }
    },
    {
      id: "4",
      title: "Классический фьюжн",
      description: "Современный взгляд на классические композиции",
      type: "album",
      status: "draft",
      coverUrl: null,
      tracksCount: 12,
      createdAt: "2023-12-20",
      updatedAt: "2024-01-12",
      artist: {
        name: "Neo Classical"
      }
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-success/10 text-success hover:bg-success/20';
      case 'draft':
        return 'bg-warning/10 text-warning hover:bg-warning/20';
      case 'archived':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return 'опубликован';
      case 'draft':
        return 'черновик';
      case 'archived':
        return 'архив';
      default:
        return status;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'album':
        return 'bg-primary/10 text-primary hover:bg-primary/20';
      case 'ep':
        return 'bg-secondary/10 text-secondary hover:bg-secondary/20';
      case 'single':
        return 'bg-accent/10 text-accent-foreground hover:bg-accent/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'album':
        return 'альбом';
      case 'ep':
        return 'EP';
      case 'single':
        return 'сингл';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("projectsTitle")}</h1>
          <p className="text-muted-foreground">Управляйте вашими музыкальными проектами и альбомами</p>
        </div>
        <Button className="shadow-glow">
          <Plus className="mr-2 h-4 w-4" />
          Новый проект
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Поиск проектов..." 
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Фильтр
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="shadow-card hover:shadow-elevated transition-all duration-200 group cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={getTypeColor(project.type)}>
                      {getTypeText(project.type).toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(project.status)}>
                      {getStatusText(project.status)}
                    </Badge>
                  </div>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {project.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    от {project.artist.name}
                  </CardDescription>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Открыть
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Music className="mr-2 h-4 w-4" />
                      Добавить трек
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {project.description}
              </p>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Music className="h-4 w-4" />
                  <span>{project.tracksCount} треков</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  Открыть проект
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="text-center py-12">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Пока нет проектов</h3>
          <p className="text-muted-foreground mb-4">
            Создайте ваш первый музыкальный проект, чтобы начать
          </p>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Создать проект
          </Button>
        </div>
      )}
    </div>
  );
}