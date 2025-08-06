import React, { useMemo, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { parseLyricsStructure } from "../utils/lyricsUtils";
import { Music, Hash, Copy, Eye, Edit } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LyricsVirtualizedViewerProps {
  lyrics: string;
  title?: string;
  showStructurePanel?: boolean;
  className?: string;
  onEdit?: () => void;
  showEditButton?: boolean;
  maxLinesVisible?: number; // For virtualization
}

// Virtual line component for large lyrics
const VirtualLine = memo(({ line, index, isHighlighted }: { 
  line: string; 
  index: number; 
  isHighlighted?: boolean; 
}) => {
  const trimmedLine = line.trim();
  
  if (!trimmedLine) {
    return <div className="h-3" />;
  }
  
  return (
    <div 
      className={`text-base leading-7 tracking-wide hover:bg-background/80 rounded-lg px-3 py-2 transition-all duration-150 cursor-pointer font-medium text-foreground/90 ${
        isHighlighted ? 'bg-primary/10' : ''
      }`}
    >
      {trimmedLine}
    </div>
  );
});

const LyricsVirtualizedViewer = memo(function LyricsVirtualizedViewer({ 
  lyrics, 
  title, 
  showStructurePanel = true, 
  className = "",
  onEdit,
  showEditButton = false,
  maxLinesVisible = 100
}: LyricsVirtualizedViewerProps) {
  const { structure, sections } = useMemo(() => {
    return parseLyricsStructure(lyrics);
  }, [lyrics]);

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Скопировано",
        description: "Текст скопирован в буфер обмена"
      });
    } catch (error) {
      console.error('Failed to copy text:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать текст",
        variant: "destructive"
      });
    }
  }, [toast]);

  const formatSectionType = useCallback((type: string) => {
    const typeMap: { [key: string]: string } = {
      'verse': 'Куплет',
      'chorus': 'Припев',
      'bridge': 'Бридж',
      'pre-chorus': 'Пред-припев',
      'outro': 'Концовка',
      'intro': 'Вступление',
      'hook': 'Хук',
      'refrain': 'Рефрен',
      'unknown': 'Текст'
    };
    return typeMap[type] || type;
  }, []);

  const getSectionColor = useCallback((type: string) => {
    const colorMap: { [key: string]: string } = {
      'verse': 'bg-primary/5 border-l-primary/20 border-primary/20',
      'chorus': 'bg-secondary/10 border-l-secondary border-secondary/20',
      'bridge': 'bg-accent/10 border-l-accent border-accent/20',
      'pre-chorus': 'bg-muted/30 border-l-muted-foreground/40 border-muted-foreground/20',
      'outro': 'bg-destructive/5 border-l-destructive/40 border-destructive/20',
      'intro': 'bg-primary/10 border-l-primary/40 border-primary/20',
      'hook': 'bg-secondary/5 border-l-secondary/40 border-secondary/20',
      'refrain': 'bg-accent/5 border-l-accent/40 border-accent/20',
      'unknown': 'bg-muted/20 border-l-border border-border'
    };
    return colorMap[type] || colorMap['unknown'];
  }, []);

  // Check if virtualization is needed
  const totalLines = useMemo(() => {
    return lyrics.split('\n').length;
  }, [lyrics]);

  const shouldVirtualize = totalLines > maxLinesVisible;

  if (!lyrics.trim()) {
    return (
      <div className={`text-center py-12 text-muted-foreground ${className}`}>
        <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Текст песни не добавлен</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile Structure Navigation */}
      {showStructurePanel && structure.length > 1 && (
        <div className="block lg:hidden mb-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Структура песни
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {structure.map((section, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => scrollToSection(section.id)}
                  >
                    {formatSectionType(section.type)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Desktop Structure Panel */}
        {showStructurePanel && structure.length > 1 && (
          <div className="hidden lg:block lg:col-span-3">
            <Card className="sticky top-4 h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Структура песни
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {structure.map((section, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-left h-auto p-3 hover:bg-accent/50"
                    onClick={() => scrollToSection(section.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {formatSectionType(section.type)}
                      </Badge>
                      {section.title && (
                        <span className="text-xs text-muted-foreground truncate">
                          {section.title}
                        </span>
                      )}
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lyrics Content */}
        <div className={`${showStructurePanel && structure.length > 1 ? "lg:col-span-9" : "lg:col-span-12"}`}>
          <Card className="w-full">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Eye className="h-5 w-5 shrink-0" />
                <span className="truncate">{title || "Текст песни"}</span>
                {shouldVirtualize && (
                  <Badge variant="outline" className="text-xs">
                    {totalLines} строк
                  </Badge>
                )}
              </CardTitle>
              <div className="flex gap-2">
                {showEditButton && onEdit && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={onEdit}
                    className="h-9"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Редактировать
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(lyrics)}
                  className="h-9"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Копировать</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px] sm:h-[600px] lg:h-[700px]">
                <div className="p-6 space-y-8">
                  {sections.map((section, index) => (
                    <div key={index} id={`section-${section.id}`} className="scroll-mt-6">
                      {section.type !== 'unknown' && (
                        <div className="flex items-center gap-2 mb-4">
                          <Badge variant="outline" className="font-medium text-xs px-2 py-1">
                            {formatSectionType(section.type)}
                          </Badge>
                          {section.title && (
                            <span className="text-sm text-muted-foreground font-medium">
                              {section.title}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <div className={`rounded-xl border-l-4 p-6 transition-all duration-200 hover:shadow-sm ${getSectionColor(section.type)}`}>
                        <div className="space-y-3">
                          {section.content.split('\n').map((line, lineIndex) => (
                            <VirtualLine 
                              key={lineIndex} 
                              line={line} 
                              index={lineIndex}
                            />
                          ))}
                        </div>
                      </div>
                      
                      {index < sections.length - 1 && (
                        <Separator className="my-8 opacity-30" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

export { LyricsVirtualizedViewer };