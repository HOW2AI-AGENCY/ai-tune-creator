import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Music, Sparkles, Clock, Download, Play, Pause, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCleanGeneration } from '@/hooks/useCleanGeneration';

interface Track {
  id: string;
  title: string;
  audio_url?: string;
  duration?: number;
  created_at: string;
  metadata?: any;
  lyrics?: string;
  genre_tags?: string[];
}

export function GenerationInterface() {
  const {
    tracks,
    activeGenerations,
    loading,
    generateTrack,
    deleteTrack,
    playTrack,
    currentTrack,
    isPlaying,
    refresh
  } = useCleanGeneration();

  const [prompt, setPrompt] = useState('');
  const [selectedService, setSelectedService] = useState<'suno' | 'mureka'>('suno');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customSettings, setCustomSettings] = useState({
    style: '',
    title: '',
    instrumental: false,
    language: 'ru',
    model: 'V3_5'
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const fullPrompt = isCustomMode && customSettings.title
      ? `${customSettings.title}: ${prompt}`
      : prompt;

    await generateTrack(fullPrompt, selectedService);
    
    if (!isCustomMode) {
      setPrompt('');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} ч назад`;
    return `${Math.floor(diffMins / 1440)} дн назад`;
  };

  return (
    <div className="space-y-6">
      {/* Generation Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Генерация музыки
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={loading}
              className="ml-auto"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Service Selection */}
          <div className="flex gap-2">
            <Button
              variant={selectedService === 'suno' ? 'default' : 'outline'}
              onClick={() => setSelectedService('suno')}
              size="sm"
            >
              Suno AI
            </Button>
            <Button
              variant={selectedService === 'mureka' ? 'default' : 'outline'}
              onClick={() => setSelectedService('mureka')}
              size="sm"
            >
              Mureka
            </Button>
          </div>

          {/* Custom Mode Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="custom-mode"
              checked={isCustomMode}
              onCheckedChange={setIsCustomMode}
            />
            <Label htmlFor="custom-mode">Расширенные настройки</Label>
          </div>

          {/* Custom Settings */}
          {isCustomMode && (
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/20">
              <div>
                <Label htmlFor="title">Название трека</Label>
                <Input
                  id="title"
                  value={customSettings.title}
                  onChange={(e) => setCustomSettings(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Введите название..."
                />
              </div>
              <div>
                <Label htmlFor="style">Стиль</Label>
                <Input
                  id="style"
                  value={customSettings.style}
                  onChange={(e) => setCustomSettings(prev => ({ ...prev, style: e.target.value }))}
                  placeholder="Pop, Rock, Electronic..."
                />
              </div>
              <div>
                <Label htmlFor="language">Язык</Label>
                <Select
                  value={customSettings.language}
                  onValueChange={(value) => setCustomSettings(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ru">Русский</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="auto">Авто</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="model">Модель</Label>
                <Select
                  value={customSettings.model}
                  onValueChange={(value) => setCustomSettings(prev => ({ ...prev, model: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="V3_5">V3.5</SelectItem>
                    <SelectItem value="V4">V4</SelectItem>
                    <SelectItem value="V4_5">V4.5</SelectItem>
                    <SelectItem value="V4_5PLUS">V4.5+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center space-x-2">
                <Switch
                  id="instrumental"
                  checked={customSettings.instrumental}
                  onCheckedChange={(checked) => setCustomSettings(prev => ({ ...prev, instrumental: checked }))}
                />
                <Label htmlFor="instrumental">Инструментальная версия</Label>
              </div>
            </div>
          )}

          {/* Prompt Input */}
          <div>
            <Label htmlFor="prompt">
              {isCustomMode ? 'Описание музыки или текст песни' : 'Опишите музыку, которую хотите создать'}
            </Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={isCustomMode 
                ? "Введите лирику или подробное описание стиля и настроения..."
                : "Например: энергичная поп-песня о дружбе с припевом на русском языке"
              }
              rows={isCustomMode ? 6 : 3}
              className="resize-none"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleGenerate} 
              disabled={!prompt.trim() || activeGenerations.length > 0}
              className="flex-1"
            >
              {activeGenerations.length > 0 ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Создать трек
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Generations */}
      {activeGenerations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Активные генерации
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeGenerations.map((gen) => (
                <div key={gen.taskId} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">
                        {gen.service === 'suno' ? 'Suno AI' : 'Mureka'}
                      </span>
                      <span className="text-xs text-muted-foreground">{gen.progress}%</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div 
                        className="bg-primary h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${gen.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 capitalize">
                      {gen.status === 'pending' && 'Ожидание...'}
                      {gen.status === 'running' && 'Генерация...'}
                      {gen.status === 'completed' && 'Завершено'}
                      {gen.status === 'failed' && 'Ошибка'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracks Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tracks.map((track) => (
          <Card key={track.id} className={cn(
            "overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer group",
            currentTrack?.id === track.id && "ring-2 ring-primary"
          )}>
            <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <Music className="h-12 w-12 text-primary/60" />
              </div>
              
              {/* Play Button */}
              <Button
                size="sm"
                variant="secondary"
                className="absolute bottom-2 right-2 h-8 w-8 p-0 bg-background/80 hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  playTrack(track);
                }}
              >
                {currentTrack?.id === track.id && isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>

              {/* Duration Badge */}
              {track.duration && (
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 right-2 bg-background/80 text-foreground"
                >
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDuration(track.duration)}
                </Badge>
              )}

              {/* Genre Tags */}
              {track.genre_tags && track.genre_tags.length > 0 && (
                <Badge 
                  variant="outline" 
                  className="absolute top-2 left-2 bg-background/80"
                >
                  {track.genre_tags[0]}
                </Badge>
              )}
            </div>
            
            <CardContent className="p-4">
              <h3 className="font-medium truncate mb-2" title={track.title}>
                {track.title}
              </h3>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>{formatTimeAgo(track.created_at)}</span>
                <div className="flex gap-1">
                  {track.audio_url && (
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Скачать">
                      <Download className="h-3 w-3" />
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTrack(track.id);
                    }}
                    title="Удалить"
                  >
                    ×
                  </Button>
                </div>
              </div>
              
              {/* Lyrics preview */}
              {track.lyrics && (
                <div className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                  <div className="line-clamp-2">
                    {track.lyrics.slice(0, 100)}
                    {track.lyrics.length > 100 && '...'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {tracks.length === 0 && activeGenerations.length === 0 && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Создайте первый трек</h3>
            <p className="text-muted-foreground">
              Опишите музыку, которую хотите создать, и мы сгенерируем её для вас
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && tracks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Загрузка треков...</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}