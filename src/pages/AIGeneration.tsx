import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { GenerationSidebar, MusicService } from "@/features/ai-generation/components/GenerationSidebar";
import { GenerationFeed, GenerationItem } from "@/features/ai-generation/components/GenerationFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { useSunoStatusPolling } from '@/features/ai-generation/hooks/useSunoStatusPolling';

interface Option { id: string; name: string }

export default function AIGeneration() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Sidebar state
  const [prompt, setPrompt] = useState("");
  const [selectedService, setSelectedService] = useState<MusicService>("suno");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [selectedArtistId, setSelectedArtistId] = useState<string>("all");
  const [selectedTrackId, setSelectedTrackId] = useState<string>("none");
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(undefined);
  const [currentTaskId, setCurrentTaskId] = useState<string>("");

  // Data
  const [projects, setProjects] = useState<Option[]>([]);
  const [artists, setArtists] = useState<Option[]>([]);
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [tracks, setTracks] = useState<{ id: string; name: string; projectId: string; currentVersion: number; trackNumber: number }[]>([]);

  // Polling hook для отслеживания прогресса
  const { isPolling } = useSunoStatusPolling({
    taskId: currentTaskId,
    enabled: !!currentTaskId,
    onComplete: (data) => {
      console.log("Generation completed:", data);
      setCurrentTaskId("");
      setIsGenerating(false);
      fetchGenerations(); // Обновляем список
    },
    onError: (error) => {
      console.error("Generation failed:", error);
      setCurrentTaskId("");
      setIsGenerating(false);
    }
  });

  const fetchGenerations = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("ai_generations")
      .select("id, prompt, service, status, result_url, created_at, track_id")
      .order("created_at", { ascending: false });

    if (error) return;
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

    const items: GenerationItem[] = [];
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
  }, [user]);

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

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    if (!user) {
      toast({ title: "Требуется вход", description: "Войдите, чтобы генерировать треки", variant: "destructive" });
      return;
    }
    if (!selectedProjectId || !selectedTrackId || !selectedVersion) {
      toast({ title: "Укажите проект, трек и версию", description: "Выберите проект, трек и версию для генерации", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      console.log("=== TRACK GENERATION START ===");
      console.log("Service:", selectedService);
      console.log("Track ID:", selectedTrackId);
      console.log("Version:", selectedVersion);
      console.log("Params:", {
        prompt,
        service: selectedService,
        trackId: selectedTrackId,
        projectId: selectedProjectId,
        mode: "custom"
      });

      // Выбираем правильную Edge Function в зависимости от сервиса
      const functionName = selectedService === 'suno' ? 'generate-suno-track' : 'generate-mureka-track';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          prompt,
          trackId: selectedTrackId,
          projectId: selectedProjectId,
          mode: "custom",
          service: selectedService
        }
      });

      if (error) throw error;

      console.log("Generation response:", data);

      if (data?.success) {
        const taskId = data.data?.task_id;
        if (taskId) {
          setCurrentTaskId(taskId);
          toast({ 
            title: "Генерация запущена", 
            description: `Трек генерируется с помощью ${selectedService}. Отслеживаем прогресс...` 
          });
        } else {
          toast({ 
            title: "Генерация запущена", 
            description: `Трек генерируется с помощью ${selectedService}` 
          });
          setIsGenerating(false);
        }
        setPrompt("");
      } else {
        throw new Error(data?.error || 'Не удалось запустить генерацию');
      }
    } catch (e: any) {
      console.error("Generation error:", e);
      toast({ title: "Ошибка генерации", description: e.message || "Не удалось отправить запрос", variant: "destructive" });
    } finally {
      if (!currentTaskId) {
        setIsGenerating(false);
      }
    }
  };

  const handleQuickGenerate = async (opts: { trackId: string; nextVersion: number; prompt: string; service: MusicService }) => {
    if (!user) {
      toast({ title: "Требуется вход", description: "Войдите, чтобы генерировать треки", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      console.log("=== QUICK GENERATION START ===");
      console.log("Service:", opts.service);
      console.log("Track ID:", opts.trackId);
      console.log("Next Version:", opts.nextVersion);
      console.log("Prompt:", opts.prompt);

      // Выбираем правильную Edge Function в зависимости от сервиса
      const functionName = opts.service === 'suno' ? 'generate-suno-track' : 'generate-mureka-track';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          prompt: opts.prompt,
          trackId: opts.trackId,
          mode: "quick",
          service: opts.service
        }
      });

      if (error) throw error;

      console.log("Quick generation response:", data);

      if (data?.success) {
        const taskId = data.data?.task_id;
        if (taskId) {
          setCurrentTaskId(taskId);
          toast({ 
            title: "Генерация запущена", 
            description: `Версия v${opts.nextVersion} генерируется с помощью ${opts.service}. Отслеживаем прогресс...` 
          });
        } else {
          toast({ 
            title: "Генерация запущена", 
            description: `Версия v${opts.nextVersion} генерируется с помощью ${opts.service}` 
          });
          setIsGenerating(false);
        }
      } else {
        throw new Error(data?.error || 'Не удалось запустить быструю генерацию');
      }
    } catch (e: any) {
      console.error("Quick generation error:", e);
      toast({ title: "Ошибка генерации", description: e.message || "Не удалось отправить запрос", variant: "destructive" });
    } finally {
      if (!currentTaskId) {
        setIsGenerating(false);
      }
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
        {isPolling && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            Отслеживаем прогресс...
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        <div className="w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r bg-card">
          <GenerationSidebar
            prompt={prompt}
            setPrompt={setPrompt}
            selectedService={selectedService}
            setSelectedService={setSelectedService}
            onGenerate={handleGenerate}
            isGenerating={isGenerating || isPolling}
            projects={projects}
            artists={artists}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={setSelectedProjectId}
            selectedArtistId={selectedArtistId}
            setSelectedArtistId={setSelectedArtistId}
            trackOptions={trackOptions}
            versionOptions={versionOptions}
            selectedTrackId={selectedTrackId}
            setSelectedTrackId={setSelectedTrackId}
            selectedVersion={selectedVersion}
            setSelectedVersion={setSelectedVersion}
          />
        </div>

        <main className="flex-1 overflow-auto">
          {!user ? (
            <div className="p-4 sm:p-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">Войдите, чтобы видеть свои генерации</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    После входа здесь появится лента ваших генераций, сгруппированных по версиям трека.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <GenerationFeed generations={filteredGenerations} onQuickGenerate={handleQuickGenerate} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}