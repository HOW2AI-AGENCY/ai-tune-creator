import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useManualGroupTracks } from '@/hooks/useManualGroupTracks';
import { Loader2, GitMerge } from 'lucide-react';

export const ManualGroupTracksButton = () => {
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState('');
  const { groupTracks, isGrouping } = useManualGroupTracks();

  const handleGroup = async () => {
    const result = await groupTracks(taskId || undefined);
    if (result?.success) {
      setOpen(false);
      setTaskId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <GitMerge className="mr-2 h-4 w-4" />
          Сгруппировать треки вручную
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ручная группировка треков</DialogTitle>
          <DialogDescription>
            Объединяет треки с одинаковым task_id в варианты. Можно указать конкретный task_id или оставить пустым для группировки всех треков.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taskId">Task ID (опционально)</Label>
            <Input
              id="taskId"
              placeholder="Оставьте пустым для всех треков"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              disabled={isGrouping}
            />
            <p className="text-sm text-muted-foreground">
              Например: 6798cb7a55bfa6ce3ce3ff92
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleGroup}
              disabled={isGrouping}
              className="flex-1"
            >
              {isGrouping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isGrouping ? 'Группирую...' : 'Сгруппировать'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isGrouping}
            >
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
