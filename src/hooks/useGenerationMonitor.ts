/**
 * Hook for using Generation Monitor
 */

import { useEffect, useState } from 'react';
import { 
  generationMonitor, 
  GenerationMonitorState 
} from '@/lib/generation/generation-monitor';

export function useGenerationMonitor(generationId?: string) {
  const [state, setState] = useState<GenerationMonitorState | undefined>(
    generationId ? generationMonitor.get(generationId) : undefined
  );
  const [activeStates, setActiveStates] = useState<GenerationMonitorState[]>([]);

  useEffect(() => {
    if (!generationId) return;

    // Подписываемся на обновления
    const unsubscribe = generationMonitor.subscribe(generationId, (newState) => {
      setState(newState);
    });

    // Получаем начальное состояние
    setState(generationMonitor.get(generationId));

    return unsubscribe;
  }, [generationId]);

  useEffect(() => {
    // Обновляем список активных генераций каждую секунду
    const interval = setInterval(() => {
      setActiveStates(generationMonitor.getActive());
    }, 1000);

    // Начальное обновление
    setActiveStates(generationMonitor.getActive());

    return () => clearInterval(interval);
  }, []);

  return {
    state,
    activeStates,
    monitor: generationMonitor
  };
}
