import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Zap, Loader2 } from 'lucide-react';

export function TestGenerationButton() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);

  const testGeneration = async () => {
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Необходимо войти в систему",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    try {
      // Test Suno generation with minimal parameters
      const { data, error } = await supabase.functions.invoke('generate-suno-track', {
        body: {
          prompt: "Создай короткий тестовый трек в жанре поп",
          style: "поп, энергичный",
          title: `Тест ${new Date().toLocaleTimeString()}`,
          mode: "quick",
          inputType: "description",
          make_instrumental: false,
          wait_audio: true,
          model: "chirp-v3-5"
        }
      });

      if (error) {
        throw error;
      }

      console.log('Test generation response:', data);

      toast({
        title: "Тест запущен!",
        description: data?.data?.message || "Тестовая генерация музыки запущена",
      });

    } catch (error: any) {
      console.error('Test generation error:', error);
      toast({
        title: "Ошибка теста",
        description: error.message || "Не удалось запустить тестовую генерацию",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Button 
      onClick={testGeneration}
      disabled={testing || !user}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {testing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Тестируется...
        </>
      ) : (
        <>
          <Zap className="h-4 w-4" />
          Тест генерации
        </>
      )}
    </Button>
  );
}