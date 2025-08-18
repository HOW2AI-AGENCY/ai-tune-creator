import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Music2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface GenerationRow {
  id: string;
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
    // Suno API responses we saved
    m?.all_tracks?.[0]?.audio_url,
    m?.all_tracks?.[0]?.audioUrl,
    m?.suno_track_data?.audio_url,
    m?.suno_track_data?.audioUrl,
    // Mureka API responses
    m?.choices?.[0]?.audio_url,
    gen.result_url,
    // Sometimes result_url holds provider url
    gen.result_url && /apiboxfiles|cdn1\.suno\.ai|mfile\.erweima|mureka\.ai/.test(gen.result_url) ? gen.result_url : null,
  ];
  return (candidates.find(Boolean) as string) || null;
}

export function ManualUploadLastTwo() {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<null | { processed: number; successes: number; fails: number }>(null);
  const { toast } = useToast();

  const handleUpload = async () => {
    setLoading(true);
    setLastResult(null);
    try {
      // Load recent Suno and Mureka generations
      const { data, error } = await supabase
        .from('ai_generations')
        .select('id, service, status, result_url, external_id, metadata, created_at')
        .in('service', ['suno', 'mureka'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      const rows = (data as GenerationRow[]) || [];

      // Filter those that are completed (or have tracks) but not yet saved to storage
      const candidates = rows.filter((g) => {
        const hasLocal = !!g.metadata?.local_storage_path || (g.result_url && /storage\.v1\/object\//.test(g.result_url));
        const audio = extractAudioUrl(g);
        return !hasLocal && (!!audio || g.status === 'completed');
      });

      const toProcess = candidates.slice(0, 2);
      if (toProcess.length === 0) {
        toast({ title: 'Нечего загружать', description: 'Последние 2 генерации уже в хранилище' });
        setLoading(false);
        return;
      }

      let successes = 0;
      let fails = 0;

      for (const gen of toProcess) {
        const audioUrl = extractAudioUrl(gen);
        if (!audioUrl) {
          fails++;
          console.warn('No audio URL for generation', gen.id);
          continue;
        }

        const filename = (gen.metadata?.title as string) || 
                        (gen.metadata?.choices?.[0]?.title as string) ||
                        `${gen.service}-${gen.external_id || gen.id}`;

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
          console.error('Manual upload failed:', dlError || dlData);
        } else {
          successes++;
        }
      }

      setLastResult({ processed: toProcess.length, successes, fails });

      toast({
        title: 'Ручная загрузка завершена',
        description: `Обработано: ${toProcess.length}, успешно: ${successes}, ошибок: ${fails}`,
      });

      // Refresh UI
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
          <Music2 className="h-5 w-5" />
          Ручная загрузка последних 2 треков
        </CardTitle>
        <CardDescription>Скачивает и сохраняет в Supabase Storage два последних трека (Suno/Mureka).</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleUpload} disabled={loading} className="flex items-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {loading ? 'Загружаю…' : 'Загрузить 2 трека'}
        </Button>

        {lastResult && (
          <Alert variant={lastResult.fails > 0 ? 'destructive' : 'default'} className="ml-2">
            {lastResult.fails > 0 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <AlertDescription>
              Обработано: {lastResult.processed}, успешно: {lastResult.successes}, ошибок: {lastResult.fails}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
