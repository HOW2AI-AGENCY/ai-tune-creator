import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseLyricsAutoSaveOptions {
  enabled?: boolean;
  delay?: number;
  onSave?: (lyrics: string) => Promise<void>;
  onError?: (error: Error) => void;
}

export function useLyricsAutoSave(
  lyrics: string,
  options: UseLyricsAutoSaveOptions = {}
) {
  const {
    enabled = true,
    delay = 3000, // 3 seconds
    onSave,
    onError,
  } = options;
  
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedLyricsRef = useRef(lyrics);
  const isSavingRef = useRef(false);
  
  const save = useCallback(async (lyricsToSave: string) => {
    if (!onSave || isSavingRef.current) return;
    
    try {
      isSavingRef.current = true;
      await onSave(lyricsToSave);
      lastSavedLyricsRef.current = lyricsToSave;
      
      toast({
        title: "Автосохранение",
        description: "Лирика сохранена",
        duration: 1500,
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
      
      // Retry once after 2 seconds
      setTimeout(async () => {
        if (!isSavingRef.current) {
          try {
            isSavingRef.current = true;
            await onSave(lyricsToSave);
            lastSavedLyricsRef.current = lyricsToSave;
            toast({
              title: "Автосохранение",
              description: "Лирика сохранена (повторная попытка)",
              duration: 1500,
            });
          } catch (retryError) {
            console.error('Auto-save retry failed:', retryError);
            if (onError) {
              onError(retryError as Error);
            } else {
              toast({
                title: "Ошибка автосохранения",
                description: "Не удалось сохранить изменения после повторной попытки",
                variant: "destructive",
                duration: 5000,
              });
            }
          } finally {
            isSavingRef.current = false;
          }
        }
      }, 2000);
      
      if (onError) {
        onError(error as Error);
      } else {
        toast({
          title: "Ошибка автосохранения",
          description: "Повторная попытка через 2 секунды...",
          variant: "destructive",
          duration: 3000,
        });
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [onSave, onError, toast]);
  
  useEffect(() => {
    if (!enabled || !onSave) return;
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Only save if lyrics have changed
    if (lyrics !== lastSavedLyricsRef.current && lyrics.trim()) {
      timeoutRef.current = setTimeout(() => {
        save(lyrics);
      }, delay);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [lyrics, enabled, delay, save]);
  
  const forceSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    save(lyrics);
  }, [lyrics, save]);
  
  const hasUnsavedChanges = lyrics !== lastSavedLyricsRef.current;
  
  return {
    forceSave,
    hasUnsavedChanges,
    isSaving: isSavingRef.current,
  };
}