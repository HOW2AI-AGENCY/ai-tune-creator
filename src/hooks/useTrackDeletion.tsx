import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useTrackDeletion() {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const deleteTrack = async (trackId: string) => {
    try {
      setIsDeleting(true);
      
      // Call the delete-track edge function
      const { data, error } = await supabase.functions.invoke('delete-track', {
        body: { trackId }
      });

      if (error) {
        console.error('Track deletion error:', error);
        toast({
          title: 'Ошибка удаления',
          description: 'Не удалось удалить трек. Попробуйте еще раз.',
          variant: 'destructive'
        });
        return false;
      }

      toast({
        title: 'Трек удален',
        description: 'Трек успешно удален из базы данных и хранилища.',
        variant: 'default'
      });

      return true;
    } catch (error) {
      console.error('Track deletion error:', error);
      toast({
        title: 'Ошибка удаления',
        description: 'Произошла ошибка при удалении трека.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteTrack,
    isDeleting
  };
}