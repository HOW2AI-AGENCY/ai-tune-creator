import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { parseLyricsStructure } from "@/lib/lyricsUtils";
import { Music, Hash, Copy, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LyricsViewerProps {
  lyrics: string;
  title?: string;
  showStructurePanel?: boolean;
  className?: string;
}

export function LyricsViewer({ 
  lyrics, 
  title, 
  showStructurePanel = true, 
  className = "" 
}: LyricsViewerProps) {
  const { structure, sections } = useMemo(() => {
    return parseLyricsStructure(lyrics);
  }, [lyrics]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Скопировано",
      description: "Текст скопирован в буфер обмена"
    });
  };

  const formatSectionType = (type: string) => {
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
  };

  const getSectionColor = (type: string) => {
    const colorMap: { [key: string]: string } = {
      'verse': 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
      'chorus': 'bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800',
      'bridge': 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800',
      'pre-chorus': 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800',
      'outro': 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
      'intro': 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800',
      'hook': 'bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:border-pink-800',
      'refrain': 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800',
      'unknown': 'bg-muted/50 border-border'
    };
    return colorMap[type] || colorMap['unknown'];
  };

  if (!lyrics.trim()) {
    return (
      <div className={`text-center py-12 text-muted-foreground ${className}`}>
        <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Текст песни не добавлен</p>
      </div>
    );
  }

  return (
    <div className={`grid ${showStructurePanel ? 'grid-cols-1 lg:grid-cols-4' : 'grid-cols-1'} gap-6 ${className}`}>
      {/* Structure Panel */}
      {showStructurePanel && structure.length > 1 && (
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Структура песни
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {structure.map((section, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto p-2"
                  onClick={() => scrollToSection(section.id)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Badge variant="secondary" className="text-xs">
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
      <div className={showStructurePanel && structure.length > 1 ? "lg:col-span-3" : "col-span-1"}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {title || "Текст песни"}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(lyrics)}
            >
              <Copy className="h-4 w-4 mr-2" />
              Копировать
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {sections.map((section, index) => (
                  <div key={index} id={`section-${section.id}`}>
                    {section.type !== 'unknown' && (
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="font-medium">
                          {formatSectionType(section.type)}
                        </Badge>
                        {section.title && (
                          <span className="text-sm text-muted-foreground">
                            {section.title}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className={`p-4 rounded-lg border-l-4 ${getSectionColor(section.type)}`}>
                      <div className="space-y-2">
                        {section.content.split('\n').map((line, lineIndex) => {
                          const trimmedLine = line.trim();
                          if (!trimmedLine) {
                            return <div key={lineIndex} className="h-2" />;
                          }
                          
                          return (
                            <div 
                              key={lineIndex} 
                              className="text-sm leading-relaxed hover:bg-background/50 rounded px-2 py-1 transition-colors"
                            >
                              {trimmedLine}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {index < sections.length - 1 && (
                      <Separator className="my-6" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}