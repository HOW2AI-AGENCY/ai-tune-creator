import { useState } from 'react';
import { Layers, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTrackVariants } from '@/hooks/useTrackVariants';

export function GroupTracksButton() {
  const [isGrouping, setIsGrouping] = useState(false);
  const { groupExistingTracks } = useTrackVariants();

  const handleGroupTracks = async () => {
    setIsGrouping(true);
    try {
      await groupExistingTracks();
      // Reload the page to show updated tracks
      window.location.reload();
    } finally {
      setIsGrouping(false);
    }
  };

  return (
    <Button
      onClick={handleGroupTracks}
      disabled={isGrouping}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isGrouping ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Группировка...
        </>
      ) : (
        <>
          <Layers className="h-4 w-4" />
          Объединить версии
        </>
      )}
    </Button>
  );
}
