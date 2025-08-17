import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SunoStyleGenerationForm } from "@/components/generation/SunoStyleGenerationForm";
import { useTrackGenerationWithProgress } from "@/features/ai-generation/hooks/useTrackGenerationWithProgress";
import { GenerationFeed } from "@/features/ai-generation/components/GenerationFeed";
import { FloatingPlayer } from "@/features/ai-generation/components/FloatingPlayer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Music, 
  Headphones, 
  TrendingUp,
  Clock,
  Zap
} from "lucide-react";
import { CanonicalGenerationInput } from "@/features/ai-generation/types/canonical";

interface Option { id: string; name: string }

export default function AIGenerationModern() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Data states
  const [projects, setProjects] = useState<Option[]>([]);
  const [artists, setArtists] = useState<Option[]>([]);
  const [generations, setGenerations] = useState<any[]>([]);
  const [allTracks, setAllTracks] = useState<any[]>([]);
  
  // UI states
  const [activeTab, setActiveTab] = useState("create");
  const [playerOpen, setPlayerOpen] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any | null>(null);

  // Generation hook
  const { generateTrack, isGenerating, generationProgress } = useTrackGenerationWithProgress();

  // Statistics
  const stats = useMemo(() => {
    const totalGenerations = generations.length;
    const completedGenerations = generations.filter(g => g.status === 'completed').length;
    const todayGenerations = generations.filter(g => {
      const today = new Date().toDateString();
      return new Date(g.createdAt).toDateString() === today;
    }).length;

    return {
      total: totalGenerations,
      completed: completedGenerations,
      today: todayGenerations,
      successRate: totalGenerations > 0 ? Math.round((completedGenerations / totalGenerations) * 100) : 0
    };
  }, [generations]);

  const fetchGenerations = async () => {
    if (!user) return;
    
    try {
      await supabase.functions.invoke('update-processing-status');
    } catch (updateError) {
      console.warn("Could not update processing statuses:", updateError);
    }
    
    const { data, error } = await supabase
      .from("ai_generations")
      .select("id, prompt, service, status, result_url, created_at, track_id")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching generations:", error);
      return;
    }
    
    const rows = data || [];
    const trackIds = Array.from(new Set(rows.map(r => r.track_id).filter(Boolean))) as string[];
    const trackMeta: Record<string, { title?: string; projectId?: string; projectName?: string; artistId?: string; artistName?: string }> = {};

    if (trackIds.length > 0) {
      const { data: tracksData } = await supabase
        .from("tracks")
        .select("id, title, project_id, projects(id, title, artists(id, name))")
        .in("id", trackIds);

      (tracksData || []).forEach((t: any) => {
        trackMeta[t.id] = {
          title: t.title,
          projectId: t.project_id,
          projectName: t.projects?.title,
          artistId: t.projects?.artists?.id,
          artistName: t.projects?.artists?.name,
        };
      });
    }

    const groups: Record<string, any[]> = {};
    rows.forEach(r => {
      const gid = r.track_id || r.id;
      groups[gid] = groups[gid] || [];
      groups[gid].push(r);
    });

    const items: any[] = [];
    Object.entries(groups).forEach(([gid, arr]) => {
      arr.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      arr.forEach((r: any, idx: number) => {
        const meta = trackMeta[gid] || {};
        items.push({
          id: r.id,
          groupId: gid,
          version: idx + 1,
          prompt: r.prompt,
          service: (r.service as "suno" | "mureka"),
          status: r.status,
          createdAt: r.created_at,
          resultUrl: r.result_url || undefined,
          title: meta.title,
          projectName: meta.projectName,
          artistName: meta.artistName,
          trackId: r.track_id || undefined,
        });
      });
    });

    setGenerations(items);
  };

  const fetchAllTracks = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          projects!inner (
            title,
            artist_id,
            is_inbox,
            artists!inner (
              name,
              user_id
            )
          )
        `)
        .eq('projects.artists.user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setAllTracks(data || []);
    } catch (error) {
      console.error('Error fetching all tracks:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setArtists([]);
      setGenerations([]);
      return;
    }

    const fetchMeta = async () => {
      const { data: artistsData } = await supabase
        .from("artists")
        .select("id, name")
        .order("name");
      setArtists((artistsData || []).map(a => ({ id: a.id, name: a.name })));

      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, title, artists(name)")
        .order("created_at", { ascending: false });
      setProjects((projectsData || []).map((p: any) => ({
        id: p.id,
        name: p.artists?.name ? `${p.title} (${p.artists.name})` : p.title,
      })));
    };

    fetchMeta();
    fetchGenerations();
    fetchAllTracks();
  }, [user]);

  const handleGenerate = async (input: CanonicalGenerationInput) => {
    if (!user) {
      toast({ title: "Требуется вход", description: "Войдите, чтобы генерировать треки", variant: "destructive" });
      return;
    }
    
    try {
      // Convert canonical input to legacy format for compatibility
      const legacyParams = {
        prompt: input.description,
        service: input.service,
        projectId: input.context?.projectId,
        artistId: input.context?.artistId,
        genreTags: input.tags || [],
        mode: input.mode,
        customLyrics: input.lyrics,
        duration: input.flags?.duration || 120,
        instrumental: input.flags?.instrumental || false,
        language: input.flags?.language || 'ru',
        inputType: input.inputType,
        useInbox: input.context?.useInbox || false
      };

      await generateTrack(legacyParams);
      
      setTimeout(async () => {
        await Promise.all([
          fetchGenerations(),
          fetchAllTracks()
        ]);
      }, 1000);
    } catch (e: any) {
      console.error("Generation error:", e);
    }
  };

  const handlePlayTrack = (track: any) => {
    if (!track.audio_url) return;
    setCurrentTrack(track);
    setPlayerOpen(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Создание музыки с ИИ</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              Войдите в аккаунт, чтобы начать создавать уникальную музыку с помощью искусственного интеллекта
            </p>
            <Button className="w-full" size="lg">
              Войти в аккаунт
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Hero Header */}
      <div className="bg-gradient-primary text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Zap className="h-4 w-4" />
              Powered by AI
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Создавайте музыку
              <br />
              <span className="text-gradient-accent">мгновенно</span>
            </h1>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Превратите свои идеи в полноценные музыкальные композиции за считанные минуты с помощью ИИ
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white/10 backdrop-blur-sm rounded-2xl p-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-white/70">Всего генераций</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.completed}</div>
                <div className="text-sm text-white/70">Завершено</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.today}</div>
                <div className="text-sm text-white/70">Сегодня</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.successRate}%</div>
                <div className="text-sm text-white/70">Успешность</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Создать
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Библиотека
            </TabsTrigger>
            <TabsTrigger value="generations" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              История
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-8">
            <SunoStyleGenerationForm
              projects={projects}
              artists={artists}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          </TabsContent>

          <TabsContent value="library" className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Ваша музыкальная библиотека</h2>
              <p className="text-muted-foreground">Все созданные треки в одном месте</p>
            </div>
            
            {allTracks.length === 0 ? (
              <Card className="border-2 border-dashed border-muted">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Headphones className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Библиотека пуста</h3>
                  <p className="text-muted-foreground text-center mb-6 max-w-sm">
                    Создайте свой первый трек с помощью ИИ, и он появится здесь
                  </p>
                  <Button 
                    onClick={() => setActiveTab('create')}
                    className="bg-gradient-primary hover:opacity-90"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Создать трек
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allTracks.map((track) => (
                  <Card key={track.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <h3 className="font-medium text-lg leading-tight">{track.title}</h3>
                          {track.audio_url ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Готов
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              В работе
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          {track.projects?.artists?.name && (
                            <div className="flex items-center gap-2">
                              <Music className="h-3 w-3" />
                              {track.projects.artists.name}
                            </div>
                          )}
                          {track.projects?.title && (
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              {track.projects.title}
                            </div>
                          )}
                        </div>

                        {track.audio_url && (
                          <Button 
                            size="sm" 
                            onClick={() => handlePlayTrack(track)}
                            className="w-full"
                          >
                            <Headphones className="h-4 w-4 mr-2" />
                            Прослушать
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="generations" className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">История генераций</h2>
              <p className="text-muted-foreground">Отслеживайте прогресс всех ваших генераций</p>
            </div>
            
            <GenerationFeed
              onPlay={(url) => {
                // Create a temporary track object for playing
                const tempTrack = { id: 'temp', title: 'Генерированный трек', audio_url: url };
                handlePlayTrack(tempTrack);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating Player */}
      <FloatingPlayer
        isOpen={playerOpen}
        track={currentTrack}
        onClose={() => setPlayerOpen(false)}
      />
    </div>
  );
}