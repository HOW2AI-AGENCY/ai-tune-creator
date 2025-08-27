import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles } from 'lucide-react';

interface StarPurchaseProps {
  title: string;
  description: string;
  payload: string;
  amount: number; // in stars
}

export const StarPurchaseButton = ({ title, description, payload, amount }: StarPurchaseProps) => {
  const { webApp } = useTelegramWebApp();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    if (!webApp) {
      toast({
        title: 'Ошибка',
        description: 'Функция доступна только в Telegram.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create an invoice on the backend
      const { data, error } = await supabase.functions.invoke('create-star-invoice', {
        body: { title, description, payload, amount },
      });

      if (error) {
        throw new Error(error.message);
      }

      const { invoiceLink } = data;

      if (!invoiceLink) {
        throw new Error('Не удалось создать ссылку для оплаты.');
      }

      // 2. Open the invoice in Telegram
      if (webApp.openInvoice) {
        webApp.openInvoice(invoiceLink, (status) => {
          if (status === 'paid') {
            toast({
              title: 'Оплата прошла успешно!',
              description: `Вы приобрели "${title}" за ${amount} звезд.`,
            });
            // Here you might want to refetch user data to update their balance in the UI
          } else if (status === 'failed') {
            toast({
              title: 'Ошибка оплаты',
              description: 'Не удалось обработать платеж. Попробуйте еще раз.',
              variant: 'destructive',
            });
          } else if (status === 'cancelled') {
            toast({
              title: 'Оплата отменена',
              description: 'Вы отменили процесс оплаты.',
            });
          }
        });
      } else if (webApp.openLink) {
        // Fallback: open link using Telegram's openLink
        webApp.openLink(invoiceLink);
        toast({
          title: 'Переход к оплате',
          description: 'Открываю страницу оплаты в Telegram.',
        });
      } else {
        // Last fallback: open in new window
        window.open(invoiceLink, '_blank');
        toast({
          title: 'Переход к оплате',
          description: 'Открываю страницу оплаты в новом окне.',
        });
      }

    } catch (error) {
      console.error('Star purchase error:', error);
      toast({
        title: 'Произошла ошибка',
        description: error instanceof Error ? error.message : 'Не удалось инициировать оплату.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={handlePurchase} disabled={isLoading}>
      <Sparkles className="mr-2 h-4 w-4" />
      {isLoading ? 'Обработка...' : `Купить за ${amount} звезд`}
    </Button>
  );
};
