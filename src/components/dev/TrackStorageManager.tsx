import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CloudDownload, CheckCircle2, AlertCircle, Loader2, ListChecks } from 'lucide-react';

interface GenerationRow {
  id: string;
  user_id: string;
  service: 'suno' | 'mureka';
  status: string;
  result_url?: string | null;
  external_id?: string | null;
  metadata?: any;
  created_at: string;
}

function extractAudioUrl(gen: GenerationRow): string | null {
  const m = gen.metadata || {};
  const candidates: Array<string | null | undefined> = [
    m?.all_tracks?.[0]?.audio_url,
    m?.all_tracks?.[0]?.audioUrl,
    m?.suno_track_data?.audio_url,
    m?.suno_track_data?.audioUrl,
    m?.choices?.[0]?.audio_url,
    gen.result_url,
    gen.result_url && /apiboxfiles|cdn1\.suno\.ai|mfile\.erweima|mureka\.ai|cdn\.mureka\.ai/.test(gen.result_url) ? gen.result_url : null,
  ];
  return (candidates.find(Boolean) as string) || null;
}

export function TrackStorageManager() {
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState<null | { total: number; toProcess: number; successes: number; fails: number }>(null);
  const { toast } = useToast();

  const scanAndUpload = async () => {
    setLoading(true);
    setScanned(null);
    try {
      // Fetch latest completed generations without local storage save
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Необходима авторизация');

      const { data, error } = await supabase
        .from('ai_generations')
        .select('id, user_id, service, status, result_url, external_id, metadata, created_at')
        .eq('user_id', user.id)
        .in('service', ['suno', 'mureka'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      const rows = (data as GenerationRow[]) || [];

      const candidates = rows.filter((g) => {
        const hasLocal = !!g.metadata?.local_storage_path || (g.result_url && /storage\.v1\/object\//.test(g.result_url));
        const audio = extractAudioUrl(g);
        const isDone = g.status === 'completed' || g.metadata?.status === 'SUCCESS';
        return !hasLocal && (!!audio || isDone);
      });

      if (candidates.length === 0) {
        toast({ title: 'Все актуально', description: 'Незагруженных в хранилище треков не найдено' });
        setScanned({ total: rows.length, toProcess: 0, successes: 0, fails: 0 });
        setLoading(false);
        return;
      }

      let successes = 0;
      let fails = 0;

      for (const gen of candidates) {
        const audioUrl = extractAudioUrl(gen);
        if (!audioUrl) { fails++; continue; }

        const filename = (gen.metadata?.title as string)
          || (gen.metadata?.choices?.[0]?.title as string)
          || `${gen.service}-${gen.external_id || gen.id}`;

        const { data: dlData, error: dlError } = await supabase.functions.invoke('download-and-save-track', {
          body: {
            generation_id: gen.id,
            external_url: audioUrl,
            filename,
            taskId: gen.external_id || gen.metadata?.taskId || gen.metadata?.suno_task_id,
          },
        });

        if (dlError || !dlData?.success) {
          fails++;
          console.error('Upload failed:', dlError || dlData);
        } else {
          successes++;
        }
      }

      setScanned({ total: rows.length, toProcess: candidates.length, successes, fails });

      toast({
        title: 'Синхронизация завершена',
        description: `Обработано: ${candidates.length}, успешно: ${successes}, ошибок: ${fails}`,
      });

      // Notify UI to refresh
      window.dispatchEvent(new CustomEvent('tracks-updated'));
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Ошибка', description: e.message || 'Не удалось выполнить загрузку', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudDownload className="h-5 w-5" />
          Синхронизация аудио с хранилищем
        </CardTitle>
        <CardDescription>
          Находит завершённые генерации без локального файла и загружает их в Supabase Storage (albert-tracks/userId/service/taskId/*).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3 flex-wrap">
        <Button onClick={scanAndUpload} disabled={loading} className="flex items-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
          {loading ? 'Сканируем…' : 'Сканировать и загрузить'}
        </Button>

        {scanned && (
          <Alert variant={scanned.fails > 0 ? 'destructive' : 'default'} className="ml-2">
            {scanned.fails > 0 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <AlertDescription>
              Найдено: {scanned.total} · К загрузке: {scanned.toProcess} · Успешно: {scanned.successes} · Ошибки: {scanned.fails}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
