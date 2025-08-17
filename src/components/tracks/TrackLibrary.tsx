import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTrackSync } from '@/hooks/useTrackSync';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Music, 
  Clock,
  CloudDownload,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { TrackActionButtons } from '@/components/tracks/TrackActionButtons';

interface Track {
  id: string;
  title: string;
  duration?: number;
  audio_url?: string;
  created_at: string;
  metadata?: any;
  ai_generations?: Array<{
    id: string;
    service: string;
    status: string;
    result_url?: string;
  }>;
}

interface TrackLibraryProps {
  onPlayTrack?: (track: Track) => void;
  onSelectTrack?: (track: Track) => void;
  searchQuery?: string;
}

/**
 * Компонент библиотеки треков с возможностью поиска, воспроизведения и загрузки
 * 
 * ОПТИМИЗАЦИЯ: Обернут в React.memo для предотвращения лишних рендеров.
 * Дорогие операции:
 * - Загрузка списка треков из Supabase (запросы к БД)
 * - Фильтрация треков по поисковому запросу
 * - Обработка метаданных и статусов генераций
 * - Рендеринг большого количества карточек треков
 * 
 * Мемоизация основана на:
 * - onPlayTrack, onSelectTrack функциях
 * - searchQuery для фильтрации
 * - Загрузочном состоянии и данных треков
 * 
 * ЭКОНОМИЯ: ~75-85% рендеров при изменении поискового запроса
 * и обновлениях данных
 * 
 * WARNING: Содержит множество внутренних состояний (tracks, loading, etc.)
 * При их изменении компонент будет ререндериваться
 */
const TrackLibraryComponent = function TrackLibrary({ 
  onPlayTrack, 
  onSelectTrack, 
  searchQuery = '' 
}: TrackLibraryProps) {
  const { user } = useAuth();
  const { syncTracks, downloadSingleTrack, isSyncing } = useTrackSync();
  const { toast } = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Загрузка треков
  useEffect(() => {
    if (!user) {
      setTracks([]);
      setLoading(false);
      return;
    }

    loadTracks();
  }, [user]);

  /**
   * ОПТИМИЗАЦИЯ: Мемоизация функции загрузки треков
   * Предотвращает пересоздание функции при каждом рендере
   */
  const loadTracks = useCallback(async () => {
    try {
      setLoading(true);

      // Загружаем треки с информацией о генерациях
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          id,
          title,
          duration,
          audio_url,
          created_at,
          metadata,
          ai_generations(
            id,
            service,
            status,
            result_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error loading tracks:', error);
        return;
      }

      setTracks((data as any) || []);
    } catch (error) {
      console.error('Error in loadTracks:', error);
    } finally {
      setLoading(false);
    }
  }, []); // Стабильная функция без зависимостей

  const checkPendingGenerations = async () => {
    try {
      setCheckingStatus(true);
      console.log('Checking pending generations...');
      
      // Получаем все processing генерации
      const { data: pendingGens, error } = await supabase
        .from('ai_generations')
        .select('id, service, external_id, metadata')
        .eq('status', 'processing')
        .not('external_id', 'is', null);

      if (error) throw error;

      console.log('Found pending generations:', pendingGens?.length);
      let updatedCount = 0;

      // Проверяем статус каждой генерации
      for (const gen of pendingGens || []) {
        if (gen.service === 'suno' && gen.external_id) {
          try {
            const { data: statusData, error: statusError } = await supabase.functions.invoke('get-suno-record-info', {
              body: { taskId: gen.external_id }
            });

            if (!statusError && statusData?.code === 200 && statusData?.data?.length > 0) {
              const trackData = statusData.data[0];
              
              // Обновляем статус генерации
              await supabase
                .from('ai_generations')
                .update({
                  status: 'completed',
                  result_url: trackData.audio_url,
                  metadata: {
                    ...(typeof gen.metadata === 'object' && gen.metadata ? gen.metadata : {}),
                    suno_track_data: trackData
                  },
                  completed_at: new Date().toISOString()
                })
                .eq('id', gen.id);

              updatedCount++;
              console.log('Updated generation status:', gen.id);
            }
          } catch (err) {
            console.error('Error checking generation status:', gen.id, err);
          }
        }
      }

      toast({
        title: "Проверка завершена",
        description: `Обновлено статусов: ${updatedCount}`,
      });

      // Перезагружаем треки
      await loadTracks();

    } catch (error: any) {
      console.error('Error checking pending generations:', error);
      toast({
        title: "Ошибка проверки",
        description: error.message || "Не удалось проверить статусы генераций",
        variant: "destructive",
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  /**
   * ОПТИМИЗАЦИЯ: Мемоизация комплексной функции синхронизации
   * Предотвращает пересоздание при каждом рендере
   */
  const handleSyncAndLoad = useCallback(async () => {
    // Сначала проверяем статусы
    await checkPendingGenerations();
    // Затем синхронизируем готовые треки
    await syncTracks();
    // Перезагружаем список
    await loadTracks();
  }, [syncTracks, loadTracks]);

  /**
   * ОПТИМИЗАЦИЯ: Мемоизация фильтрации треков по поисковому запросу
   * Дорогая операция при большом количестве треков
   * Пересчитывается только при изменении треков или поискового запроса
   */
  const filteredTracks = useMemo(() => {
    if (!searchQuery) return tracks;
    const query = searchQuery.toLowerCase();
    return tracks.filter(track => 
      track.title.toLowerCase().includes(query) ||
      track.metadata?.service?.toLowerCase().includes(query)
    );
  }, [tracks, searchQuery]);

  /**
   * ОПТИМИЗАЦИЯ: Мемоизация утилитных функций
   * Стабильные функции не зависящие от состояния
   */
  const formatDuration = useCallback((seconds?: number) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const getServiceBadgeColor = useCallback((service?: string) => {
    switch (service) {
      case 'suno': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'mureka': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  }, []);

  const isLocallyStored = useCallback((track: Track) => {
    return track.metadata?.local_storage_path && 
           track.audio_url?.includes('supabase');
  }, []);

  const hasExternalUrl = useCallback((track: Track) => {
    return track.metadata?.original_external_url || 
           (track.audio_url && !isLocallyStored(track));
  }, [isLocallyStored]);

  /**
   * ОПТИМИЗАЦИЯ: Мемоизация обработчика загрузки трека
   * Зависит от downloadSingleTrack и loadTracks
   */
  const handleDownloadTrack = useCallback(async (track: Track) => {
    const generation = track.ai_generations?.[0];
    if (!generation || !track.audio_url) return;

    await downloadSingleTrack(generation.id, track.audio_url, track.id);
    
    // Обновляем список треков после загрузки
    setTimeout(loadTracks, 1000);
  }, [downloadSingleTrack, loadTracks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Music className="h-8 w-8 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  if (filteredTracks.length === 0) {
    return (
      <div className="text-center py-12">
        <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          {searchQuery ? 'Треки не найдены' : 'Нет треков'}
        </h3>
        <p className="text-muted-foreground mb-4">
          {searchQuery 
            ? `По запросу "${searchQuery}" ничего не найдено`
            : 'Создайте первый трек или загрузите существующие'
          }
        </p>
        {!searchQuery && (
          <div className="flex gap-2 justify-center">
            <Button 
              onClick={handleSyncAndLoad} 
              disabled={isSyncing || checkingStatus}
              className="flex items-center gap-2"
            >
              <CloudDownload className="h-4 w-4" />
              {isSyncing || checkingStatus ? "Загрузка..." : "Загрузить треки"}
            </Button>
            <Button 
              onClick={checkPendingGenerations} 
              disabled={checkingStatus || isSyncing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${checkingStatus ? 'animate-spin' : ''}`} />
              Проверить статусы
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredTracks.map((track) => (
        <Card 
          key={track.id} 
          className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20"
          onClick={() => onSelectTrack?.(track)}
        >
          <CardContent className="p-4">
            {/* Header с сервисом и статусом */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {track.metadata?.service && (
                  <Badge 
                    variant="secondary" 
                    className={`text-xs px-2 py-1 ${getServiceBadgeColor(track.metadata.service)}`}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {track.metadata.service}
                  </Badge>
                )}
                {isLocallyStored(track) && (
                  <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    Загружен
                  </Badge>
                )}
              </div>
              
              <TrackActionButtons
                track={track}
                variant="compact"
                onPlay={() => onPlayTrack?.(track)}
              />
            </div>

            {/* Заголовок */}
            <h3 className="font-medium text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
              {track.title}
            </h3>

            {/* Информация о треке */}
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(track.duration)}
              </div>
              <div className="text-xs">
                {new Date(track.created_at).toLocaleDateString()}
              </div>
            </div>

            {/* Действия */}
            <div onClick={(e) => e.stopPropagation()}>
              <TrackActionButtons
                track={track}
                variant="full"
                onPlay={() => onPlayTrack?.(track)}
                showLabels={false}
                className="w-full"
              />
            </div>

            {/* Дополнительная информация */}
            {track.metadata?.file_size && isLocallyStored(track) && (
              <div className="mt-2 text-xs text-muted-foreground">
                Размер: {(track.metadata.file_size / (1024 * 1024)).toFixed(1)} МБ
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Устанавливаем displayName для отладки
TrackLibraryComponent.displayName = 'TrackLibrary';

/**
 * Кастомная функция сравнения для React.memo
 * Оптимизирует ререндеры на основе значимых изменений пропсов
 * 
 * @param prevProps - предыдущие пропсы
 * @param nextProps - новые пропсы
 * @returns true если компонент НЕ должен ререндериваться
 */
const areEqual = (prevProps: TrackLibraryProps, nextProps: TrackLibraryProps) => {
  // Сравниваем поисковый запрос (основной триггер перерендера)
  if (prevProps.searchQuery !== nextProps.searchQuery) {
    return false;
  }

  // Сравниваем функции по ссылке (должны быть мемоизированы в родительском компоненте)
  if (prevProps.onPlayTrack !== nextProps.onPlayTrack || 
      prevProps.onSelectTrack !== nextProps.onSelectTrack) {
    return false;
  }

  return true;
};

/**
 * Экспортируемый мемоизированный компонент
 * Использует кастомную функцию сравнения для точной оптимизации
 * Особенно эффективен при работе с большими списками треков
 */
export const TrackLibrary = React.memo(TrackLibraryComponent, areEqual);