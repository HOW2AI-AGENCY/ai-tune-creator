import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { GenerationSidebar, MusicService } from "@/features/ai-generation/components/GenerationSidebar";
import { GenerationFeed, GenerationItem } from "@/features/ai-generation/components/GenerationFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface Option { id: string; name: string }

export default function AIGeneration() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Sidebar state
  const [prompt, setPrompt] = useState("");
  const [selectedService, setSelectedService] = useState<MusicService>("suno");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedArtistId, setSelectedArtistId] = useState<string>("");
  const [selectedTrackId, setSelectedTrackId] = useState<string>("");
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(undefined);

  // Data
  const [projects, setProjects] = useState<Option[]>([]);
  const [artists, setArtists] = useState<Option[]>([]);
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [tracks, setTracks] = useState<{ id: string; name: string; projectId: string; currentVersion: number; trackNumber: number }[]>([]);

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

    const fetchGenerations = async () => {
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
      const { error } = await supabase
        .from("ai_generations")
        .insert({
          prompt,
          service: selectedService,
          status: "queued",
          track_id: selectedTrackId,
        } as any);
      if (error) throw error;
      toast({ title: "Запрос на генерацию добавлен", description: `Версия: v${selectedVersion}` });
      setPrompt("");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Ошибка генерации", description: e.message || "Не удалось отправить запрос", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickGenerate = async (opts: { trackId: string; nextVersion: number; prompt: string; service: MusicService }) => {
    if (!user) {
      toast({ title: "Требуется вход", description: "Войдите, чтобы генерировать треки", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const { error } = await supabase
        .from("ai_generations")
        .insert({
          prompt: opts.prompt,
          service: opts.service,
          status: "queued",
          track_id: opts.trackId,
        } as any);
      if (error) throw error;
      toast({ title: "Запрос на генерацию добавлен", description: `Версия: v${opts.nextVersion}` });
    } catch (e: any) {
      console.error(e);
      toast({ title: "Ошибка генерации", description: e.message || "Не удалось отправить запрос", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-primary" /> ИИ Генерация
        </h1>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        <GenerationSidebar
          prompt={prompt}
          setPrompt={setPrompt}
          selectedService={selectedService}
          setSelectedService={setSelectedService}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
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

        <main className="flex-1">
          {!user ? (
            <Card>
              <CardHeader>
                <CardTitle>Войдите, чтобы видеть свои генерации</CardTitle>
              </CardHeader>
              <CardContent>
                После входа здесь появится лента ваших генераций, сгруппированных по версиям трека.
              </CardContent>
            </Card>
          ) : (
            <GenerationFeed generations={filteredGenerations} onQuickGenerate={handleQuickGenerate} />
          )}
        </main>
      </div>
    </div>
  );
}
