import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { useState } from 'react';

interface TelegramMobilePlayerProps {
  audioUrl?: string;
  title?: string;
}

export const TelegramMobilePlayer = ({ audioUrl, title }: TelegramMobilePlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!audioUrl) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <div className="flex-1">
            <p className="text-sm font-medium">{title || 'Сгенерированный трек'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};