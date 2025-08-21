/**
 * @fileoverview Независимая страница для работы с Mureka AI
 * Полностью отделённая от Suno унификации
 * @version 1.0.0
 * @author Claude Code Assistant
 */

import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Music, 
  Sparkles, 
  Users, 
  Clock,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { MurekaGenerationForm } from '@/components/mureka/MurekaGenerationForm';
import { MurekaTrackCard } from '@/components/mureka/MurekaTrackCard';
import { useMurekaGeneration } from '@/hooks/useMurekaGeneration';
import { FloatingPlayer } from '@/features/ai-generation/components/FloatingPlayer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ==========================================
// ТИПЫ
// ==========================================

interface MurekaTrack {
  id: string;
  title: string;
  lyrics: string;
  audio_url: string;
  instrumental_url?: string;
  duration: number;
  metadata: Record<string, any>;
  created_at?: string;
}

// ==========================================
// ОСНОВНОЙ КОМПОНЕНТ
// ==========================================

export default function MurekaStudio() {
  
  // ====================================
  // СОСТОЯНИЕ
  // ====================================
  
  const { user } = useAuth();
  const [recentTracks, setRecentTracks] = useState<MurekaTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<MurekaTrack | null>(null);
  const [isPlayerVisible, setIsPlayerVisible] = useState(false);
  
  // Хук для генерации
  const { 
    activeGenerations,
    isGenerating,
    clearCompleted,
    getCompletedTracks 
  } = useMurekaGeneration();
  
  // ====================================
  // ЭФФЕКТЫ
  // ====================================
  
  /**
   * Загрузка последних треков пользователя
   */
  useEffect(() => {
    const loadRecentTracks = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        console.log('[MUREKA STUDIO] Loading recent tracks for user:', user.id);
        
        const { data: tracks, error } = await supabase
          .from('tracks')
          .select(`
            id,
            title,
            lyrics,
            audio_url,
            duration,
            metadata,
            created_at,
            projects!inner (
              artists!inner (
                user_id
              )
            )
          `)
          .eq('projects.artists.user_id', user.id)
          .eq('metadata->>service', 'mureka')
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) {
          console.error('[MUREKA STUDIO] Error loading tracks:', error);
          return;
        }
        
        console.log('[MUREKA STUDIO] Loaded tracks:', tracks?.length || 0);
        setRecentTracks((tracks || []).map(track => ({
          ...track,
          metadata: {
            ...(track.metadata as Record<string, any> || {}),
            service: 'mureka'
          }
        })) as MurekaTrack[]);
        
      } catch (error) {
        console.error('[MUREKA STUDIO] Exception loading tracks:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRecentTracks();
  }, [user]);
  
  /**
   * Обновление треков при завершении генерации
   */
  useEffect(() => {
    const completedTracks = getCompletedTracks();
    if (completedTracks.length > 0) {
      console.log('[MUREKA STUDIO] Adding completed tracks:', completedTracks.length);
      setRecentTracks(prev => [...completedTracks, ...prev]);
    }
  }, [getCompletedTracks]);
  
  // ====================================
  // ОБРАБОТЧИКИ
  // ====================================
  
  const handleTrackPlay = (track: MurekaTrack) => {
    console.log('[MUREKA STUDIO] Playing track:', track.title);
    setCurrentTrack(track);
    setIsPlayerVisible(true);
  };
  
  const handleTrackPause = () => {
    console.log('[MUREKA STUDIO] Pausing track');
    setCurrentTrack(null);
    setIsPlayerVisible(false);
  };
  
  const handleGenerationComplete = (tracks: MurekaTrack[]) => {
    console.log('[MUREKA STUDIO] Generation completed with tracks:', tracks.length);
    setRecentTracks(prev => [...tracks, ...prev]);
  };
  
  // ====================================
  // РЕНДЕР СТАТИСТИКИ
  // ====================================
  
  const renderStatistics = () => {
    const totalGenerations = activeGenerations.size;
    const completedGenerations = Array.from(activeGenerations.values())
      .filter(gen => gen.status === 'completed').length;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Music className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{recentTracks.length}</p>
                <p className="text-sm text-muted-foreground">Всего треков</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{completedGenerations}</p>
                <p className="text-sm text-muted-foreground">Завершено</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalGenerations}</p>
                <p className="text-sm text-muted-foreground">Активные</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  // ====================================
  // РЕНДЕР АКТИВНЫХ ГЕНЕРАЦИЙ
  // ====================================
  
  const renderActiveGenerations = () => {
    if (activeGenerations.size === 0) return null;
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Активные генерации
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={clearCompleted}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Очистить завершённые
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {Array.from(activeGenerations.values()).map((generation) => (
              <div 
                key={generation.id} 
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{generation.message}</p>
                  <p className="text-sm text-muted-foreground">
                    Время: {Math.floor((Date.now() - generation.startTime) / 1000)}s
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${generation.progress}%` }}
                    />
                  </div>
                  <Badge 
                    variant={
                      generation.status === 'completed' ? 'default' : 
                      generation.status === 'failed' ? 'destructive' : 'secondary'
                    }
                  >
                    {generation.progress}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // ====================================
  // ОСНОВНОЙ РЕНДЕР
  // ====================================
  
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Требуется авторизация</h1>
          <p className="text-muted-foreground">
            Войдите в систему для работы с Mureka AI
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Helmet>
        <title>Mureka AI Studio - Независимая генерация музыки</title>
        <meta name="description" content="Создавайте уникальную музыку с помощью Mureka AI" />
      </Helmet>
      
      {/* Заголовок */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Music className="h-8 w-8 text-purple-500" />
          <h1 className="text-3xl font-bold">Mureka AI Studio</h1>
          <Badge variant="secondary" className="ml-2">Независимая интеграция</Badge>
        </div>
        <p className="text-muted-foreground">
          Создавайте уникальную музыку с помощью передовых возможностей Mureka AI
        </p>
      </div>
      
      {/* Статистика */}
      {renderStatistics()}
      
      {/* Активные генерации */}
      {renderActiveGenerations()}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Форма генерации */}
        <div>
          <MurekaGenerationForm 
            onGenerationComplete={handleGenerationComplete}
          />
        </div>
        
        {/* Недавние треки */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Ваши треки
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-32 bg-muted rounded-lg" />
                    </div>
                  ))}
                </div>
              ) : recentTracks.length > 0 ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {recentTracks.map((track) => (
                     <MurekaTrackCard
                       key={track.id}
                       track={{
                         ...track,
                         metadata: {
                           ...track.metadata,
                           service: 'mureka'
                         }
                       }}
                       isPlaying={currentTrack?.id === track.id}
                       onPlay={handleTrackPlay}
                       onPause={handleTrackPause}
                       showLyrics={true}
                     />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Пока нет сгенерированных треков.
                    <br />
                    Создайте первый трек с помощью формы слева!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Плеер */}
      {isPlayerVisible && currentTrack && (
         <FloatingPlayer 
           isOpen={isPlayerVisible}
           track={{
             id: currentTrack.id,
             title: currentTrack.title,
             audio_url: currentTrack.audio_url,
             duration: currentTrack.duration,
             metadata: currentTrack.metadata
           } as any}
           onClose={() => setIsPlayerVisible(false)}
         />
      )}
    </div>
  );
}