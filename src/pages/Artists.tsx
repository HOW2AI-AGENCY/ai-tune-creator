import { Plus, Search, MoreHorizontal, User, Music, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CreateArtistDialog } from "@/components/artists/CreateArtistDialog";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function Artists() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const fetchArtists = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setArtists(data || []);
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

  useEffect(() => {
    fetchArtists();
  }, []);

  const filteredArtists = artists.filter(artist =>
    artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artist.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    artist.metadata?.genre?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("artistsTitle")}</h1>
          <p className="text-muted-foreground">Управляйте вашими музыкальными артистами и коллаборациями</p>
        </div>
        <CreateArtistDialog onArtistCreated={fetchArtists} />
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
      {loading && (
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-12 bg-muted rounded"></div>
                    <div className="h-12 bg-muted rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Artists Grid */}
      {!loading && (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredArtists.map((artist) => (
            <Card key={artist.id} className="shadow-card hover:shadow-elevated transition-all duration-200 group cursor-pointer">
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
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <User className="mr-2 h-4 w-4" />
                            Посмотреть профиль
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Music className="mr-2 h-4 w-4" />
                            Посмотреть проекты
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
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
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <div className="font-semibold text-foreground">0</div>
                    <div className="text-muted-foreground text-xs">Проекты</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <div className="font-semibold text-foreground">0</div>
                    <div className="text-muted-foreground text-xs">Треки</div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>Создан {new Date(artist.created_at).toLocaleDateString()}</span>
                </div>

                <div className="pt-2 border-t border-border">
                  <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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
      {!loading && artists.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Пока нет артистов</h3>
          <p className="text-muted-foreground mb-4">
            Добавьте вашего первого артиста, чтобы начать организовывать вашу музыку
          </p>
          <CreateArtistDialog onArtistCreated={fetchArtists} />
        </div>
      )}

      {/* No Search Results */}
      {!loading && artists.length > 0 && filteredArtists.length === 0 && (
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