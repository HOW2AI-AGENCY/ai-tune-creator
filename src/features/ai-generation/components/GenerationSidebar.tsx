import { useState } from "react";
import { Zap, RefreshCw, Settings, Sparkles, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type MusicService = 'suno' | 'mureka';

interface Option { id: string; name: string }

interface GenerationSidebarProps {
  prompt: string;
  setPrompt: (v: string) => void;
  selectedService: MusicService;
  setSelectedService: (s: MusicService) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  projects?: Option[];
  artists?: Option[];
  selectedProjectId?: string;
  setSelectedProjectId?: (id?: string) => void;
  selectedArtistId?: string;
  setSelectedArtistId?: (id?: string) => void;
  trackOptions?: Option[];
  versionOptions?: number[];
  selectedTrackId?: string;
  setSelectedTrackId?: (id?: string) => void;
  selectedVersion?: number;
  setSelectedVersion?: (v?: number) => void;
}

export function GenerationSidebar({
  prompt,
  setPrompt,
  selectedService,
  setSelectedService,
  onGenerate,
  isGenerating,
  projects = [],
  artists = [],
  selectedProjectId,
  setSelectedProjectId,
  selectedArtistId,
  setSelectedArtistId,
}: GenerationSidebarProps) {
  return (
    <aside className="w-full md:w-80 shrink-0 space-y-4">
      {/* Генерация */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5" /> Параметры генерации
          </CardTitle>
          <CardDescription>
            Опишите трек и выберите сервис генерации
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ИИ сервис</Label>
            <Select value={selectedService} onValueChange={(v) => setSelectedService(v as MusicService)}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите ИИ сервис" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suno">Suno AI — полные песни</SelectItem>
                <SelectItem value="mureka">Mureka — креативные композиции</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Описание музыки</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите жанр, настроение, инструменты, вокал..."
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">Будьте конкретны для лучших результатов</p>
          </div>

          <Button onClick={onGenerate} disabled={!prompt.trim() || isGenerating} className="w-full shadow-glow">
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Генерируется...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Создать трек
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Фильтры (задел) */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <SlidersHorizontal className="h-5 w-5" /> Фильтры
          </CardTitle>
          <CardDescription>Основа для фильтрации по проектам и артистам</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Проект</Label>
            <Select value={selectedProjectId} onValueChange={(v) => setSelectedProjectId?.(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Все проекты" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все проекты</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Артист</Label>
            <Select value={selectedArtistId} onValueChange={(v) => setSelectedArtistId?.(v === "all" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Все артисты" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все артисты</SelectItem>
                {artists.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" className="w-full">
            <Settings className="mr-2 h-4 w-4" /> Настройки (скоро)
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}
