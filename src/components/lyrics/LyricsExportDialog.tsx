import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Download, Copy, FileText } from 'lucide-react';
import { formatLyricsForExport } from '@/lib/lyricsUtils';

interface LyricsExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lyrics: string;
  trackTitle?: string;
}

type ExportFormat = 'plain' | 'markdown' | 'html';

export function LyricsExportDialog({ 
  open, 
  onOpenChange, 
  lyrics, 
  trackTitle = 'Track' 
}: LyricsExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('plain');
  
  const formattedLyrics = formatLyricsForExport(lyrics, format);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedLyrics);
      toast({
        title: "Скопировано",
        description: "Лирика скопирована в буфер обмена",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось скопировать текст",
        variant: "destructive",
      });
    }
  };
  
  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([formattedLyrics], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    
    const extension = format === 'markdown' ? 'md' : format === 'html' ? 'html' : 'txt';
    element.download = `${trackTitle.replace(/[^a-zA-Z0-9]/g, '_')}_lyrics.${extension}`;
    
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Экспорт завершен",
      description: "Файл с лирикой загружен",
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Экспорт лирики
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Формат экспорта</Label>
            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="plain" id="plain" />
                <Label htmlFor="plain" className="text-sm">
                  Обычный текст (.txt)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="markdown" id="markdown" />
                <Label htmlFor="markdown" className="text-sm">
                  Markdown (.md) - с заголовками секций
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="html" id="html" />
                <Label htmlFor="html" className="text-sm">
                  HTML (.html) - для веб-страниц
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Предварительный просмотр</Label>
            <Textarea
              value={formattedLyrics}
              readOnly
              className="mt-2 min-h-[300px] font-mono text-sm"
              placeholder="Лирика будет отображена здесь..."
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button onClick={handleCopy} variant="outline" className="gap-2">
              <Copy className="h-4 w-4" />
              Скопировать
            </Button>
            
            <Button onClick={handleDownload} className="gap-2">
              <Download className="h-4 w-4" />
              Скачать файл
            </Button>
            
            <Button variant="outline" onClick={() => onOpenChange(false)} className="ml-auto">
              Закрыть
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}