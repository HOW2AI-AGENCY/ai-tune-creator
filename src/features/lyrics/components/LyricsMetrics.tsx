import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Clock, Type, Hash, Music } from 'lucide-react';
import { type LyricsMetrics } from '../utils/lyricsUtils';

interface LyricsMetricsProps {
  metrics: LyricsMetrics;
  className?: string;
}

export function LyricsMetrics({ metrics, className }: LyricsMetricsProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="h-4 w-4" />
          Метрики лирики
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Слов</p>
              <p className="text-sm font-medium">{metrics.wordCount}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Строк</p>
              <p className="text-sm font-medium">{metrics.lineCount}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Music className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Секций</p>
              <p className="text-sm font-medium">{metrics.sectionCount}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Примерно</p>
              <p className="text-sm font-medium">{metrics.estimatedDuration}</p>
            </div>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Слогов</span>
            <Badge variant="outline" className="text-xs">
              {metrics.syllableCount}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}