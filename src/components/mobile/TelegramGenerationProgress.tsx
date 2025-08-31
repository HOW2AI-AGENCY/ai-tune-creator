import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface TelegramGenerationProgressProps {
  progress: number;
  status: string;
}

export const TelegramGenerationProgress = ({ progress, status }: TelegramGenerationProgressProps) => {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="text-sm font-medium">{status}</div>
        <Progress value={progress} className="h-2" />
        <div className="text-xs text-muted-foreground text-center">
          {Math.round(progress)}%
        </div>
      </CardContent>
    </Card>
  );
};