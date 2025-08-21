import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Download, RefreshCw, Zap, Settings } from 'lucide-react';

export function TrackCleanupTools() {
  const [loading, setLoading] = useState({
    cleanup: false,
    download: false,
    comprehensive: false,
    optimize: false
  });
  const { user } = useAuth();
  const { toast } = useToast();

  const handleCleanupBrokenTracks = async () => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, cleanup: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-broken-tracks');
      
      if (error) throw error;
      
      toast({
        title: "Очистка завершена",
        description: `Удалено ${data.details.deleted} нерабочих треков из ${data.details.found_broken} найденных`
      });
      
      // Обновить страницу для отображения изменений
      window.location.reload();
      
    } catch (error: any) {
      console.error('Cleanup error:', error);
      toast({
        title: "Ошибка очистки",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, cleanup: false }));
    }
  };

  const handleMassDownload = async () => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, download: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('mass-download-tracks', {
        body: { user_id: user.id }
      });
      
      if (error) throw error;
      
      toast({
        title: "Массовая загрузка запущена",
        description: `Запущено ${data.details.downloads_started} загрузок из ${data.details.external_tracks} внешних треков`
      });
      
    } catch (error: any) {
      console.error('Mass download error:', error);
      toast({
        title: "Ошибка загрузки",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, download: false }));
    }
  };

  const handleComprehensiveCleanup = async () => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, comprehensive: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('comprehensive-data-cleanup', {
        body: { user_id: user.id, deep_clean: true }
      });
      
      if (error) throw error;
      
      toast({
        title: "Комплексная очистка завершена",
        description: `Удалено ${data.stats.tracks_removed} треков, ${data.stats.generations_removed} генераций`
      });
      
      // Обновить страницу для отображения изменений
      window.location.reload();
      
    } catch (error: any) {
      console.error('Comprehensive cleanup error:', error);
      toast({
        title: "Ошибка комплексной очистки",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, comprehensive: false }));
    }
  };

  const handleOptimizeStructure = async () => {
    if (!user) return;
    
    setLoading(prev => ({ ...prev, optimize: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('optimize-data-structure', {
        body: { user_id: user.id }
      });
      
      if (error) throw error;
      
      toast({
        title: "Оптимизация завершена",
        description: `Оптимизировано ${data.stats.tracks_optimized} треков, связано ${data.stats.generations_linked} генераций`
      });
      
    } catch (error: any) {
      console.error('Optimization error:', error);
      toast({
        title: "Ошибка оптимизации",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(prev => ({ ...prev, optimize: false }));
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Инструменты очистки треков
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Button
            onClick={handleCleanupBrokenTracks}
            disabled={loading.cleanup}
            variant="destructive"
            className="w-full"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {loading.cleanup ? 'Очистка...' : 'Удалить нерабочие треки'}
          </Button>
          
          <Button
            onClick={handleMassDownload}
            disabled={loading.download}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {loading.download ? 'Загрузка...' : 'Загрузить в хранилище'}
          </Button>
        </div>
        
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3">Комплексная очистка и оптимизация</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <Button
              onClick={handleComprehensiveCleanup}
              disabled={loading.comprehensive}
              variant="destructive"
              className="w-full"
            >
              <Zap className="h-4 w-4 mr-2" />
              {loading.comprehensive ? 'Очистка...' : 'Полная очистка данных'}
            </Button>
            
            <Button
              onClick={handleOptimizeStructure}
              disabled={loading.optimize}
              variant="secondary"
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              {loading.optimize ? 'Оптимизация...' : 'Оптимизировать структуру'}
            </Button>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Удалить нерабочие треки:</strong> Найдет и удалит треки без audio_url или с недоступными ссылками
          </p>
          <p>
            <strong>Загрузить в хранилище:</strong> Скачает все треки с внешних URL в Supabase Storage
          </p>
          <p>
            <strong>Полная очистка данных:</strong> Удаляет все проблемные треки, генерации, старые логи и оптимизирует структуру
          </p>
          <p>
            <strong>Оптимизировать структуру:</strong> Связывает генерации с треками, убирает дубликаты, очищает метаданные
          </p>
        </div>
      </CardContent>
    </Card>
  );
}