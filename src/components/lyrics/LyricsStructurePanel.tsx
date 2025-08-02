import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { List, ChevronRight } from 'lucide-react';
import { type LyricsSection } from '@/lib/lyricsUtils';

interface LyricsStructurePanelProps {
  sections: LyricsSection[];
  currentSection: LyricsSection | null;
  onSectionClick: (sectionIndex: number) => void;
  className?: string;
}

export function LyricsStructurePanel({ 
  sections, 
  currentSection, 
  onSectionClick,
  className 
}: LyricsStructurePanelProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <List className="h-4 w-4" />
          Структура песни
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-1 p-3">
            {sections.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Добавьте структурные теги<br />
                например: [Verse], [Chorus]
              </p>
            ) : (
              sections.map((section, index) => {
                const isActive = currentSection?.startLine === section.startLine;
                const lineCount = section.endLine - section.startLine + 1;
                
                return (
                  <Button
                    key={`${section.startLine}-${index}`}
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="w-full justify-start h-auto p-2"
                    onClick={() => onSectionClick(index)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <ChevronRight className={`h-3 w-3 transition-transform ${
                          isActive ? 'rotate-90' : ''
                        }`} />
                        <span className="text-xs font-medium">
                          {section.label}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {lineCount}
                      </Badge>
                    </div>
                  </Button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}