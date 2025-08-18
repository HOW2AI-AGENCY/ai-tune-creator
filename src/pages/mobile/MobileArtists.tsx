import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, User, Music, MapPin, ArrowLeft, Edit, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { CreateArtistDialog } from "@/features/artists";
import { MobilePageWrapper } from "@/components/mobile/MobilePageWrapper";
import { MobileCard } from "@/components/mobile/MobileCard";
import { MobileFAB } from "@/components/mobile/MobileFAB";
import { MobileBottomSheet } from "@/components/mobile/MobileBottomSheet";

interface Artist {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  created_at: string;
  metadata?: {
    genre?: string;
    location?: string;
    influences?: string[];
    style?: string;
    background?: string;
    banner_url?: string;
  };
}

export default function MobileArtists() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [showCreateArtist, setShowCreateArtist] = useState(false);
  const [artistDetailsOpen, setArtistDetailsOpen] = useState(false);

  const fetchArtists = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setArtists(data || []);
      
      if (data && data.length > 0) {
        await fetchProjectCounts(data.map(artist => artist.id));
      }
    } catch (error: any) {
      console.error('Fetch artists error:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить артистов",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectCounts = async (artistIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('artist_id')
        .in('artist_id', artistIds);

      if (error) throw error;

      const counts: Record<string, number> = {};
      artistIds.forEach(id => counts[id] = 0);
      
      data?.forEach(project => {
        counts[project.artist_id] = (counts[project.artist_id] || 0) + 1;
      });

      setProjectCounts(counts);
    } catch (error: any) {
      console.error('Error fetching project counts:', error);
    }
  };

  const loadProjects = async (artistId: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error('Error loading projects:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить проекты",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchArtists();
    }
  }, [user]);

  const filteredArtists = artists.filter(artist =>
    artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artist.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artist.metadata?.genre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleArtistClick = async (artist: Artist) => {
    setSelectedArtist(artist);
    setArtistDetailsOpen(true);
    await loadProjects(artist.id);
  };

  const handleArtistCreated = () => {
    fetchArtists();
    setShowCreateArtist(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) return 'сегодня';
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}д назад`;
    return date.toLocaleDateString('ru-RU');
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

  const getTypeText = (type: string) => {
    switch (type) {
      case 'album': return 'Альбом';
      case 'ep': return 'EP';
      case 'single': return 'Сингл';
      default: return type;
    }
  };

  if (!user) {
    return (
      <MobilePageWrapper>
        <MobileCard className="text-center">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2">Требуется вход</h3>
            <p className="text-muted-foreground">Войдите, чтобы видеть артистов.</p>
          </div>
        </MobileCard>
      </MobilePageWrapper>
    );
  }

  return (
    <MobilePageWrapper>
      {/* Search */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск артистов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Artists List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <MobileCard key={i} className="h-20 animate-pulse bg-muted" />
          ))}
        </div>
      ) : filteredArtists.length === 0 ? (
        <MobileCard className="text-center">
          <div className="p-8">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Артистов не найдено</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? "Попробуйте изменить поисковый запрос"
                : "Создайте профиль первого артиста"}
            </p>
            <Button onClick={() => setShowCreateArtist(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Создать артиста
            </Button>
          </div>
        </MobileCard>
      ) : (
        <div className="space-y-3">
          {filteredArtists.map((artist) => (
            <MobileCard
              key={artist.id}
              interactive
              onClick={() => handleArtistClick(artist)}
              className="p-0 overflow-hidden"
            >
              <div className="flex items-center p-4">
                {/* Avatar */}
                <Avatar className="h-14 w-14 mr-3">
                  <AvatarImage src={artist.avatar_url} alt={artist.name} />
                  <AvatarFallback className="text-sm font-medium">
                    {getInitials(artist.name)}
                  </AvatarFallback>
                </Avatar>

                {/* Artist Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{artist.name}</h3>
                  
                  {artist.metadata?.genre && (
                    <div className="flex items-center gap-1 mt-1">
                      <Music className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{artist.metadata.genre}</span>
                    </div>
                  )}

                  {artist.metadata?.location && (
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{artist.metadata.location}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {projectCounts[artist.id] || 0} проектов
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(artist.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Influences Tags */}
              {artist.metadata?.influences && artist.metadata.influences.length > 0 && (
                <div className="px-4 pb-4">
                  <div className="flex flex-wrap gap-1">
                    {artist.metadata.influences.slice(0, 3).map((influence, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {influence}
                      </Badge>
                    ))}
                    {artist.metadata.influences.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{artist.metadata.influences.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </MobileCard>
          ))}
        </div>
      )}

      {/* FAB */}
      <MobileFAB onClick={() => setShowCreateArtist(true)}>
        <Plus className="h-6 w-6" />
      </MobileFAB>

      {/* Artist Details Bottom Sheet */}
      <MobileBottomSheet
        isOpen={artistDetailsOpen}
        onClose={() => setArtistDetailsOpen(false)}
        title={selectedArtist?.name}
        height="full"
      >
        {selectedArtist && (
          <div className="space-y-6">
            {/* Banner */}
            <div 
              className="h-32 bg-gradient-to-r from-primary/20 to-primary/10 relative overflow-hidden"
              style={selectedArtist.metadata?.banner_url ? {
                backgroundImage: `url(${selectedArtist.metadata.banner_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : {}}
            >
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
                <Avatar className="h-16 w-16 border-2 border-background">
                  <AvatarImage src={selectedArtist.avatar_url} alt={selectedArtist.name} />
                  <AvatarFallback className="text-lg">
                    {getInitials(selectedArtist.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="text-white font-semibold text-lg drop-shadow">
                    {selectedArtist.name}
                  </h2>
                  <p className="text-white/80 text-sm drop-shadow">
                    {selectedArtist.metadata?.genre && `${selectedArtist.metadata.genre} • `}
                    {projectCounts[selectedArtist.id] || 0} проектов
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-6">
              {/* Description */}
              {selectedArtist.description && (
                <div>
                  <h3 className="font-medium mb-2">Описание</h3>
                  <p className="text-sm text-muted-foreground">{selectedArtist.description}</p>
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedArtist.metadata?.location && (
                  <div>
                    <span className="font-medium">Локация:</span>
                    <br />
                    <span className="text-muted-foreground">{selectedArtist.metadata.location}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium">Создан:</span>
                  <br />
                  <span className="text-muted-foreground">{formatDate(selectedArtist.created_at)}</span>
                </div>
              </div>

              {/* Influences */}
              {selectedArtist.metadata?.influences && selectedArtist.metadata.influences.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">Влияния</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedArtist.metadata.influences.map((influence, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {influence}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Style */}
              {selectedArtist.metadata?.style && (
                <div>
                  <h3 className="font-medium mb-2">Стиль</h3>
                  <p className="text-sm text-muted-foreground">{selectedArtist.metadata.style}</p>
                </div>
              )}

              {/* Background */}
              {selectedArtist.metadata?.background && (
                <div>
                  <h3 className="font-medium mb-2">Предыстория</h3>
                  <p className="text-sm text-muted-foreground">{selectedArtist.metadata.background}</p>
                </div>
              )}

              {/* Projects */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Проекты ({projects.length})</h3>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Создать
                  </Button>
                </div>

                {projects.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Music className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">У этого артиста пока нет проектов</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projects.map((project) => (
                      <div key={project.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <Music className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium truncate">{project.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{getTypeText(project.type)}</span>
                            <span>•</span>
                            <span>{formatDate(project.updated_at)}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(project.status)}`}>
                          {project.status === 'published' && 'Опубликован'}
                          {project.status === 'in_progress' && 'В работе'}
                          {project.status === 'draft' && 'Черновик'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1 gap-2">
                  <Edit className="h-4 w-4" />
                  Редактировать
                </Button>
                <Button variant="outline" className="flex-1 gap-2">
                  <Upload className="h-4 w-4" />
                  Баннер
                </Button>
              </div>
            </div>
          </div>
        )}
      </MobileBottomSheet>

      {/* Create Artist Dialog */}
      <CreateArtistDialog
        open={showCreateArtist}
        onOpenChange={setShowCreateArtist}
        onArtistCreated={handleArtistCreated}
      />
    </MobilePageWrapper>
  );
}