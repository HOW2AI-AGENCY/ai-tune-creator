import { useEffect, useMemo, useState, Suspense, startTransition } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { TrackGenerationSidebar } from "@/features/ai-generation/components/TrackGenerationSidebar";
import { useTrackGenerationWithProgress } from "@/features/ai-generation/hooks/useTrackGenerationWithProgress";
import { UnifiedGenerationSidebar } from "@/features/ai-generation/components/UnifiedGenerationSidebar";
import type { GenerationParams } from "@/features/ai-generation/types";
import { GenerationFeed } from "@/features/ai-generation/components/GenerationFeed";
import { FloatingPlayer } from "@/features/ai-generation/components/FloatingPlayer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskQueuePanel } from "@/components/ai-generation/TaskQueuePanel";
import { AIServiceStatusBanner } from "@/components/ai-generation/AIServiceStatusBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { SunoTrackRecovery } from '@/components/dev/SunoTrackRecovery';
import { UserDataReset } from '@/components/dev/UserDataReset';
import { AIGenerationAudit } from '@/components/dev/AIGenerationAudit';
import { ManualUploadLastTwo } from '@/components/dev/ManualUploadLastTwo';


interface Option { id: string; name: string }

type MusicService = 'suno' | 'mureka';

export default function AIGeneration() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Sidebar state
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedArtistId, setSelectedArtistId] = useState<string>("all");
  const [selectedTrackId, setSelectedTrackId] = useState<string>("none");
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(undefined);
  const [currentTaskId, setCurrentTaskId] = useState<string>("");

  // Data
  const [projects, setProjects] = useState<Option[]>([]);
  const [artists, setArtists] = useState<Option[]>([]);
  const [generations, setGenerations] = useState<any[]>([]);
  const [tracks, setTracks] = useState<{ id: string; name: string; projectId: string; currentVersion: number; trackNumber: number }[]>([]);
  const [allTracks, setAllTracks] = useState<any[]>([]);
  
  // Tab and player state
  const [activeTab, setActiveTab] = useState("tracks");
  const [playerOpen, setPlayerOpen] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any | null>(null);

  // Polling hook для отслеживания прогресса
  const { generateTrack, isGenerating, generationProgress } = useTrackGenerationWithProgress();

  const fetchGenerations = async () => {
    if (!user) return;
    
    console.log("Fetching generations...");
    
    // Сначала пытаемся обновить старые статусы
    try {
      await supabase.functions.invoke('update-processing-status');
      console.log("Processing statuses updated");
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

    // Collect track ids
    const trackIds = Array.from(new Set(rows.map(r => r.track_id).filter(Boolean))) as string[];

    // Map of track meta
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

    // Group by groupId (track_id or self id)
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

    // Newest groups first will be handled in feed
    setGenerations(items);
  };

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setArtists([]);
      setGenerations([]);
      return;
    }

    const fetchMeta = async () => {
      // Artists
      const { data: artistsData } = await supabase
        .from("artists")
        .select("id, name")
        .order("name");
      setArtists((artistsData || []).map(a => ({ id: a.id, name: a.name })));

      // Projects (with artist hint)
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

  // Load tracks for generation context
  useEffect(() => {
    if (!user) {
      setTracks([]);
      setSelectedTrackId("");
      setSelectedVersion(undefined);
      return;
    }
    let query = supabase
      .from("tracks")
      .select("id, title, track_number, current_version, project_id, projects(title, artists(name))")
      .order("updated_at", { ascending: false });
    if (selectedProjectId) {
      query = query.eq("project_id", selectedProjectId);
    }
    query.then(({ data, error }) => {
      if (error) return;
      const items = (data || []).map((t: any) => ({
        id: t.id,
        name: `${t.title}${t.track_number ? ` · #${t.track_number}` : ""}${t.projects?.title ? ` (${t.projects.title})` : ""}`,
        projectId: t.project_id,
        currentVersion: t.current_version || 1,
        trackNumber: t.track_number || 0,
      }));
      setTracks(items);
      if (selectedTrackId && !items.some((i: any) => i.id === selectedTrackId)) {
        setSelectedTrackId("");
        setSelectedVersion(undefined);
      }
    });
  }, [user, selectedProjectId]);

  const filteredGenerations = useMemo(() => {
    return generations.filter(g => {
      if (selectedProjectId) {
        // We only have meta when track_id existed
        if ((g as any).projectId && (g as any).projectId !== selectedProjectId) return false;
      }
      if (selectedArtistId) {
        if ((g as any).artistId && (g as any).artistId !== selectedArtistId) return false;
      }
      return true;
    });
  }, [generations, selectedProjectId, selectedArtistId]);

  const trackOptions = useMemo(() => {
    const list = selectedProjectId ? tracks.filter(t => t.projectId === selectedProjectId) : tracks;
    return list.map(t => ({ id: t.id, name: t.name }));
  }, [tracks, selectedProjectId]);

  const versionOptions = useMemo(() => {
    const t = tracks.find(x => x.id === selectedTrackId);
    if (!t) return [] as number[];
    return Array.from({ length: t.currentVersion }, (_, i) => t.currentVersion - i);
  }, [tracks, selectedTrackId]);

  const handleGenerate = async (input: any) => {
    // Convert CanonicalGenerationInput to GenerationParams
    const params: GenerationParams = {
      prompt: input.description || input.lyrics || "",
      service: input.service || 'suno',
      mode: input.mode || 'quick',
      inputType: input.inputType || 'description',
      projectId: input.context?.projectId,
      artistId: input.context?.artistId,
      useInbox: input.context?.useInbox || false,
      genreTags: input.tags || [],
      instrumental: input.flags?.instrumental || false,
      language: input.flags?.language || 'ru',
      duration: input.flags?.duration || 120
    };
    
    if (!user) {
      toast({ title: "Требуется вход", description: "Войдите, чтобы генерировать треки", variant: "destructive" });
      return;
    }
    
    // CRITICAL: Ensure inputType is always provided  
    const paramsWithInputType = {
      ...params,
      inputType: input.inputType === 'lyrics' ? 'lyrics' as const : 'description' as const
    };
    
    try {
      await generateTrack(paramsWithInputType);
      // Принудительно обновляем данные после генерации
      console.log("Generation completed, refreshing data...");
      setTimeout(async () => {
        await Promise.all([
          fetchGenerations(),
          fetchAllTracks()
        ]);
        console.log("Data refreshed successfully");
      }, 1000);
    } catch (e: any) {
      console.error("Generation error:", e);
    }
  };

  const testSunoConnection = async () => {
    try {
      console.log("Testing Suno API connection...");
      const { data, error } = await supabase.functions.invoke('test-suno-connection');
      
      if (error) {
        console.error("Suno connection test error:", error);
        toast({
          title: "Ошибка соединения",
          description: `Не удалось подключиться к Suno API: ${error.message}`,
          variant: "destructive"
        });
      } else {
        console.log("Suno connection test result:", data);
        const success = data.tests.credits.success;
        toast({
          title: success ? "Соединение успешно" : "Проблема соединения",
          description: success 
            ? `Suno API работает. Кредитов: ${data.tests.credits.data?.data || 'н/а'}`
            : `Проблема с Suno API. Статус: ${data.tests.credits.status}`,
          variant: success ? "default" : "destructive"
        });
      }
    } catch (error: any) {
      console.error("Test error:", error);
      toast({
        title: "Ошибка тестирования",
        description: error.message,
        variant: "destructive"
      });
    }
  };


  const handlePlayTrack = (track: any) => {
    if (!track.audio_url) {
      return;
    }
    startTransition(() => {
      setCurrentTrack(track);
      setPlayerOpen(true);
    });
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!user) return;
    
    try {
      // Сначала проверяем, что трек принадлежит пользователю
      const { data: trackData, error: fetchError } = await supabase
        .from('tracks')
        .select(`
          id,
          projects (
            artist_id,
            artists (
              user_id
            )
          )
        `)
        .eq('id', trackId)
        .single();

      if (fetchError) throw fetchError;

      // Проверяем права доступа
      if (trackData?.projects?.artists?.user_id !== user.id) {
        throw new Error('У вас нет прав на удаление этого трека');
      }

      // Удаляем трек
      const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

      if (error) throw error;

      toast({
        title: "Трек удален",
        description: "Трек успешно удален из базы данных"
      });

      // Обновляем список треков
      fetchAllTracks();
    } catch (error: any) {
      console.error('Error deleting track:', error);
      toast({
        title: "Ошибка удаления",
        description: error.message || "Не удалось удалить трек",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <header className="flex items-center justify-between p-4 sm:p-6 border-b">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-primary" /> 
          <span className="hidden sm:inline">ИИ Генерация</span>
          <span className="sm:hidden">ИИ</span>
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={testSunoConnection}
            className="text-xs"
          >
            Тест Suno API
          </Button>
          {isGenerating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              Отслеживаем прогресс...
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r bg-card">
          <div className="p-4 space-y-4">
            <AIServiceStatusBanner />
            <Suspense fallback={<div className="p-4"><div className="h-6 bg-muted rounded mb-2"></div><div className="h-16 bg-muted rounded"></div></div>}>
              <TaskQueuePanel className="lg:max-h-80 overflow-auto" />
            </Suspense>
          </div>
            {/* Modern unified sidebar with Upload & Extend */}
            <UnifiedGenerationSidebar
              projects={projects}
              artists={artists}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
        </div>

        <main className="flex-1 overflow-auto">
          {!user ? (
            <div className="p-4 sm:p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Войдите, чтобы видеть контент</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    После входа здесь появятся ваши треки и генерации ИИ.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <Tabs value={activeTab} onValueChange={(v) => startTransition(() => setActiveTab(v))}>
                <TabsList className="mb-4">
                  <TabsTrigger value="tracks">Все треки</TabsTrigger>
                  <TabsTrigger value="generations">Генерации ИИ</TabsTrigger>
                  <TabsTrigger value="recovery" className="flex items-center gap-2">
                    <span>🔄</span>
                    Восстановление
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="flex items-center gap-2">
                    <span>📊</span>
                    Аудит системы
                  </TabsTrigger>
                  <TabsTrigger value="reset" className="flex items-center gap-2 text-destructive">
                    <span>🗑️</span>
                    Полный сброс
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="tracks">
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold">Все треки ({allTracks.length})</h2>
                    {allTracks.length === 0 ? (
                      <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <div className="h-12 w-12 text-muted-foreground mb-4">🎵</div>
                          <h3 className="text-lg font-semibold mb-2">Треков пока нет</h3>
                          <p className="text-muted-foreground text-center">
                            Создайте свой первый трек с помощью ИИ генерации или выполните полный сброс, чтобы начать с нуля
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-4">
                         {allTracks.map((track) => (
                           <Card key={track.id}>
                             <CardContent className="p-4">
                               <div className="flex items-center justify-between">
                                 <div className="flex-1">
                                   <div className="flex items-center gap-2 mb-1">
                                     <h3 className="font-medium">{track.title}</h3>
                                     {track.projects?.is_inbox && (
                                       <span className="text-xs bg-muted px-2 py-1 rounded">Inbox</span>
                                     )}
                                     {!track.audio_url && (
                                       <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                         Не сгенерирован
                                       </span>
                                     )}
                                   </div>
                                   <div className="text-sm text-muted-foreground">
                                     {track.projects?.artists?.name && (
                                       <span>{track.projects.artists.name}</span>
                                     )}
                                     {track.projects?.title && (
                                       <span> • {track.projects.title}</span>
                                     )}
                                   </div>
                                 </div>
                                 <div className="flex gap-2">
                                   {track.audio_url ? (
                                     <Button 
                                       size="sm" 
                                       onClick={() => handlePlayTrack(track)}
                                       className="gap-2"
                                     >
                                       ▶️ Играть
                                     </Button>
                                   ) : (
                                     <Button
                                       variant="outline"
                                       size="sm"
                                       onClick={() => handleDeleteTrack(track.id)}
                                       className="text-destructive hover:text-destructive"
                                     >
                                       Удалить
                                     </Button>
                                   )}
                                 </div>
                               </div>
                             </CardContent>
                           </Card>
                         ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="generations">
                  <GenerationFeed
                    onPlay={handlePlayTrack}
                    onDownload={(url, filename) => {
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = filename;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  />
                </TabsContent>

                <TabsContent value="recovery" className="space-y-6">
                  <UserDataReset />
                  <ManualUploadLastTwo />
                  <SunoTrackRecovery />
                </TabsContent>

                <TabsContent value="audit">
                  <AIGenerationAudit />
                </TabsContent>

                <TabsContent value="reset">
                  <UserDataReset />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </main>
      </div>
      
      {/* Player */}
      <FloatingPlayer
        isOpen={playerOpen}
        onClose={() => startTransition(() => setPlayerOpen(false))}
        track={currentTrack ? {
          id: currentTrack.id,
          title: currentTrack.title,
          audio_url: currentTrack.audio_url || '',
          project: {
            title: currentTrack.projects?.title || '',
            artist: {
              name: currentTrack.projects?.artists?.name || 'Unknown Artist'
            }
          }
        } : null}
      />
    </div>
  );
}