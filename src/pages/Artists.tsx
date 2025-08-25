import { Plus, Search, MoreHorizontal, User, Music, Calendar, ArrowLeft, MapPin, Users, FolderOpen, Play, Clock, Upload, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/useTranslation";
import { CreateArtistDialog, ArtistBannerUploadDialog } from "@/features/artists";
import { CreateProjectDialog } from "@/features/projects";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGetArtists, useDeleteArtist, Artist } from "@/hooks/data/useArtists";
import { useGetProjectsByArtistId } from "@/hooks/data/useArtistProjects";
import type { Project } from "@/lib/api/projects";

export default function Artists() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: artists = [], isLoading: isLoadingArtists, refetch: refetchArtists } = useGetArtists();
  const deleteArtistMutation = useDeleteArtist();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showBannerUpload, setShowBannerUpload] = useState(false);
  const [showEditArtist, setShowEditArtist] = useState(false);
  const [artistToDelete, setArtistToDelete] = useState<Artist | null>(null);

  const { data: projects = [], isLoading: isLoadingProjects } = useGetProjectsByArtistId(selectedArtistId);

  const selectedArtist = useMemo(() => {
    if (!selectedArtistId) return null;
    return artists.find(artist => artist.id === selectedArtistId) || null;
  }, [artists, selectedArtistId]);

  const handleSelectArtist = (artistId: string) => {
    setSelectedArtistId(artistId);
  };

  const handleBackToArtists = () => {
    setSelectedArtistId(null);
  };

  const filteredArtists = useMemo(() => {
    if (!searchQuery) return artists;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return artists.filter((artist: Artist) =>
      artist.name.toLowerCase().includes(lowerCaseQuery) ||
      (artist.description || "").toLowerCase().includes(lowerCaseQuery) ||
      (artist.metadata?.genre || "").toLowerCase().includes(lowerCaseQuery)
    );
  }, [artists, searchQuery]);

  const handleProjectCreated = () => {
    // Invalidation should be handled by a useCreateProject hook if it existed.
    // For now, just refetching the projects for the current artist is a good enough solution.
    if (selectedArtistId) {
       // This is a bit of a hack, a better solution would be to use queryClient.invalidateQueries
    }
    setShowCreateProject(false);
  };

  const handleEditArtist = () => {
    setShowEditArtist(true);
  };

  const handleDeleteArtist = (artist: any) => {
    setArtistToDelete(artist);
    setShowDeleteAlert(true);
  };

  const confirmDeleteArtist = () => {
    if (!artistToDelete) return;
    deleteArtistMutation.mutate(artistToDelete.id, {
      onSuccess: () => {
        toast({ title: "Успешно", description: "Артист удален" });
        if (selectedArtistId === artistToDelete.id) {
          setSelectedArtistId(null);
        }
        setArtistToDelete(null);
        refetchArtists();
      },
      onError: (error) => {
        toast({ title: "Ошибка", description: `Не удалось удалить артиста: ${error.message}`, variant: "destructive" });
        setArtistToDelete(null);
      }
    });
  };

  const handleArtistUpdated = () => {
    refetchArtists();
    setShowEditArtist(false);
  };

  const handleBannerUploaded = (bannerUrl: string) => {
    if (selectedArtist) {
      refetchArtists();
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'in_progress':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20';
      case 'draft':
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20';
      default:
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'album':
        return <Music className="h-4 w-4" />;
      case 'single':
        return <Play className="h-4 w-4" />;
      case 'ep':
        return <FolderOpen className="h-4 w-4" />;
      default:
        return <Music className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Если выбран артист, показываем его детали
  if (selectedArtistId && selectedArtist) {
    const metadata = selectedArtist.metadata || {};

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Кнопка назад */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={handleBackToArtists}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к артистам
          </Button>
        </div>

        {/* Social media style profile header */}
        <div className="relative">
          {/* Banner section */}
          <div 
            className="h-48 sm:h-64 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg relative overflow-hidden group cursor-pointer"
            style={metadata.banner_url ? {
              backgroundImage: `url(${metadata.banner_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : {}}
            onClick={() => setShowBannerUpload(true)}
          >
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Button variant="secondary" size="sm">
                <Upload className="mr-2 h-4 w-4" />
                {metadata.banner_url ? 'Изменить баннер' : 'Добавить баннер'}
              </Button>
            </div>
          </div>

          {/* Artist avatar and info */}
          <div className="relative -mt-16 ml-6 flex items-end gap-4">
            <Avatar className="h-32 w-32 border-4 border-background">
              <AvatarImage src={selectedArtist.avatar_url} alt={selectedArtist.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {getInitials(selectedArtist.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="mb-4">
              <h1 className="text-3xl font-bold">{selectedArtist.name}</h1>
              <p className="text-muted-foreground">
                {metadata.genre && `${metadata.genre} • `}
                {projects.length} проектов
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={handleEditArtist} size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Редактировать
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setArtistToDelete(selectedArtist)}
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить
          </Button>
        </div>

        <div className="space-y-6">
          {/* Основная информация */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Информация об артисте
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedArtist.description && (
                <div>
                  <h4 className="font-medium mb-2">Описание</h4>
                  <p className="text-muted-foreground">{selectedArtist.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metadata.genre && (
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Жанр:</strong> {metadata.genre}
                    </span>
                  </div>
                )}

                {metadata.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <strong>Локация:</strong> {metadata.location}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <strong>Создан:</strong> {formatDate(selectedArtist.created_at)}
                  </span>
                </div>
              </div>

              {metadata.influences && metadata.influences.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Влияния</h4>
                  <div className="flex flex-wrap gap-2">
                    {metadata.influences.map((influence: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {influence}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {metadata.style && (
                <div>
                  <h4 className="font-medium mb-2">Стиль</h4>
                  <p className="text-sm text-muted-foreground">{metadata.style}</p>
                </div>
              )}

              {metadata.background && (
                <div>
                  <h4 className="font-medium mb-2">Предыстория</h4>
                  <p className="text-sm text-muted-foreground">{metadata.background}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Проекты */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  Проекты ({projects.length})
                </CardTitle>
                <Button
                  onClick={() => setShowCreateProject(true)}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Создать проект
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingProjects ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
                  Загрузка проектов...
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderOpen className="h-8 w-8 mx-auto mb-2" />
                  <p>У этого артиста пока нет проектов</p>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateProject(true)}
                    className="mt-4 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Создать первый проект
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project: Project) => (
                    <Card key={project.id} className="border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {getTypeIcon(project.type)}
                            </div>
                            <div className="space-y-1">
                              <h4 className="font-medium">{project.title}</h4>
                              {project.description && (
                                <p className="text-sm text-muted-foreground">
                                  {project.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>Тип: {project.type}</span>
                                <span>•</span>
                                <span>Обновлен: {formatDate(project.updated_at)}</span>
                              </div>
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={getStatusColor(project.status)}
                          >
                            {project.status === 'published' && 'Опубликован'}
                            {project.status === 'in_progress' && 'В работе'}
                            {project.status === 'draft' && 'Черновик'}
                            {!['published', 'in_progress', 'draft'].includes(project.status) && project.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Диалоги */}
        <CreateProjectDialog
          artist={selectedArtist}
          open={showCreateProject}
          onOpenChange={setShowCreateProject}
          onProjectCreated={handleProjectCreated}
        />

        <ArtistBannerUploadDialog
          open={showBannerUpload}
          onOpenChange={setShowBannerUpload}
          artistId={selectedArtist.id}
          artistName={selectedArtist.name}
          onBannerUploaded={handleBannerUploaded}
        />

        <CreateArtistDialog
          open={showEditArtist}
          onOpenChange={setShowEditArtist}
          onArtistCreated={handleArtistUpdated}
          editingArtist={selectedArtist}
        />

          <AlertDialog open={!!artistToDelete} onOpenChange={() => setArtistToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить артиста?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. Артист "{artistToDelete?.name}" и все связанные с ним проекты будут удалены навсегда.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteArtist}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteArtistMutation.isPending ? "Удаление..." : "Удалить"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("artistsTitle")}</h1>
          <p className="text-muted-foreground">Управляйте вашими музыкальными артистами и коллаборациями</p>
        </div>
        <CreateArtistDialog onArtistCreated={refetchArtists} />
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Поиск артистов..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoadingArtists && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-muted"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-4/5"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Artists Grid */}
      {!isLoadingArtists && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredArtists.map((artist: Artist) => (
            <Card key={artist.id} className="shadow-card hover:shadow-elevated transition-all duration-200 group cursor-pointer" onClick={() => handleSelectArtist(artist.id)}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={artist.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                      {getInitials(artist.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="group-hover:text-primary transition-colors">
                        {artist.name}
                      </CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleSelectArtist(artist.id)}>
                            <User className="mr-2 h-4 w-4" />
                            Посмотреть профиль
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSelectArtist(artist.id)}>
                            <Music className="mr-2 h-4 w-4" />
                            Посмотреть проекты
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setArtistToDelete(artist); }} className="text-destructive">
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {artist.metadata?.genre && (
                      <Badge variant="secondary" className="text-xs">
                        {artist.metadata.genre}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <CardDescription className="text-sm line-clamp-2">
                  {artist.description || "Описание не указано"}
                </CardDescription>

                {artist.metadata?.location && (
                  <p className="text-xs text-muted-foreground">
                    📍 {artist.metadata.location}
                  </p>
                )}

                 <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t mt-2">
                   <Calendar className="h-3 w-3" />
                   <span>Создан {new Date(artist.created_at).toLocaleDateString()}</span>
                 </div>

                 <div className="pt-2 border-t border-border">
                   <Button 
                     variant="outline" 
                     size="sm" 
                     className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                     onClick={() => handleSelectArtist(artist.id)}
                   >
                     <User className="mr-2 h-4 w-4" />
                     Посмотреть артиста
                   </Button>
                 </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoadingArtists && artists.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Пока нет артистов</h3>
          <p className="text-muted-foreground mb-4">
            Добавьте вашего первого артиста, чтобы начать организовывать вашу музыку
          </p>
          <CreateArtistDialog onArtistCreated={refetchArtists} />
        </div>
      )}

      {/* No Search Results */}
      {!isLoadingArtists && artists.length > 0 && filteredArtists.length === 0 && (
        <div className="text-center py-12">
          <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Артисты не найдены</h3>
          <p className="text-muted-foreground mb-4">
            Попробуйте изменить поисковый запрос
          </p>
          <Button variant="outline" onClick={() => setSearchQuery("")}>
            Очистить поиск
          </Button>
        </div>
      )}

    </div>
  );
}