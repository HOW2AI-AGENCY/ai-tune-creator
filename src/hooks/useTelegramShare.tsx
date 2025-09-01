import { useToast } from '@/hooks/use-toast';

interface ShareOptions {
  url: string;
  text?: string;
  track?: any;
}

export const useTelegramShare = () => {
  const { toast } = useToast();

  const shareUrl = (options: ShareOptions) => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      try {
        window.Telegram.WebApp.openTelegramLink(
          `https://t.me/share/url?url=${encodeURIComponent(options.url)}&text=${encodeURIComponent(options.text || '')}`
        );
      } catch (error) {
        console.error('Failed to share via Telegram:', error);
        fallbackShare(options);
      }
    } else {
      fallbackShare(options);
    }
  };

  const shareTrackToTelegram = (options: ShareOptions) => shareUrl(options);
  const copyShareLink = (track: any) => {
    const url = track.audio_url || track.url || '';
    navigator.clipboard.writeText(url);
    toast({
      title: 'Ссылка скопирована',
      description: 'Ссылка скопирована в буфер обмена'
    });
  };
  const canShareToTelegram = typeof window !== 'undefined' && !!window.Telegram?.WebApp;

  const fallbackShare = (options: ShareOptions) => {
    if (navigator.share) {
      navigator.share({
        title: options.text,
        url: options.url
      });
    } else {
      navigator.clipboard.writeText(options.url);
      toast({
        title: 'Ссылка скопирована',
        description: 'Ссылка скопирована в буфер обмена'
      });
    }
  };

  return {
    shareUrl,
    shareTrackToTelegram,
    copyShareLink,
    canShareToTelegram,
    isAvailable: typeof window !== 'undefined' && !!window.Telegram?.WebApp
  };
};