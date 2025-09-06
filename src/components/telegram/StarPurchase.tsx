import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTelegramWebApp } from '@/hooks/useTelegramWebApp';
import { useToast } from '@/hooks/use-toast';

interface StarPurchaseProps {
  amount: number;
  title: string;
  description: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const StarPurchase: React.FC<StarPurchaseProps> = ({
  amount,
  title,
  description,
  onSuccess,
  onError
}) => {
  const { webApp, isAvailable } = useTelegramWebApp();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handlePurchase = async () => {
    if (!isAvailable || !webApp) {
      toast({
        title: 'Ошибка',
        description: 'Telegram WebApp недоступен',
        variant: 'destructive'
      });
      onError?.('Telegram WebApp not available');
      return;
    }

    setIsLoading(true);

    try {
      // Create invoice via edge function
      const response = await fetch('/api/create-star-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          description,
          payload: `stars_${amount}_${Date.now()}`,
          amount
        })
      });

      const data = await response.json();

      if (data.invoiceLink) {
        // Open invoice link using Telegram WebApp
        webApp.openTelegramLink(data.invoiceLink);
        onSuccess?.();
      } else {
        throw new Error('Failed to create invoice');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Ошибка покупки',
        description: errorMessage,
        variant: 'destructive'
      });
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAvailable) {
    return null;
  }

  return (
    <Button
      onClick={handlePurchase}
      disabled={isLoading}
      variant="default"
      className="w-full"
    >
      {isLoading ? 'Создание счета...' : `Купить за ${amount} ⭐`}
    </Button>
  );
};