import { useState } from 'react';
import { GitMerge, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useManualGroupTracks } from '@/hooks/useManualGroupTracks';

export function GroupTracksButton() {
  const [isGrouping, setIsGrouping] = useState(false);
  const { groupTracks } = useManualGroupTracks();

  const handleGroupTracks = async () => {
    setIsGrouping(true);
    try {
      const result = await groupTracks(); // Group all tracks
      if (result?.success && result.tracks_updated > 0) {
        // Reload the page to show updated tracks
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
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
      title="Объединяет треки с одинаковым task_id в варианты"
    >
      {isGrouping ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Группировка...
        </>
      ) : (
        <>
          <GitMerge className="h-4 w-4" />
          Объединить версии
        </>
      )}
    </Button>
  );
}
