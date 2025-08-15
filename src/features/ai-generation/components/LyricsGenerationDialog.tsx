import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Copy, RefreshCw, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LyricsGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLyricsGenerated?: (lyrics: string, title?: string) => void;
  initialPrompt?: string;
}

interface LyricsResult {
  taskId: string;
  isCompleted: boolean;
  isFailed: boolean;
  isPending: boolean;
  lyrics: Array<{
    text: string;
    title: string;
    status: string;
    errorMessage?: string;
  }>;
  errorMessage?: string;
  parameters?: any;
}

export function LyricsGenerationDialog({ 
  open, 
  onOpenChange, 
  onLyricsGenerated, 
  initialPrompt = '' 
}: LyricsGenerationDialogProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<LyricsResult | null>(null);
  
  const { toast } = useToast();

  const wordCount = prompt.trim().split(/\s+/).filter(word => word.length > 0).length;
  const isPromptValid = prompt.trim().length > 0 && wordCount <= 200;

  const checkLyricsStatus = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-suno-lyrics-info', {
        body: { taskId: id }
      });

      if (error) {
        throw new Error(error.message || 'Failed to check lyrics status');
      }

      setResult(data);

      if (data.isCompleted) {
        setIsPolling(false);
        const firstLyrics = data.lyrics[0];
        if (firstLyrics && firstLyrics.status === 'complete') {
          toast({
            title: "Lyrics Generated!",
            description: `"${firstLyrics.title}" has been generated successfully.`,
          });
          onLyricsGenerated?.(firstLyrics.text, firstLyrics.title);
        }
        return true;
      }

      if (data.isFailed) {
        setIsPolling(false);
        toast({
          title: "Lyrics Generation Failed",
          description: data.errorMessage || "Failed to generate lyrics",
          variant: "destructive"
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking lyrics status:', error);
      setIsPolling(false);
      return true;
    }
  };

  const startPolling = (id: string) => {
    setIsPolling(true);
    
    const poll = async () => {
      const shouldStop = await checkLyricsStatus(id);
      
      if (!shouldStop && isPolling) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    };

    poll();
  };

  const handleGenerate = async () => {
    if (!isPromptValid) {
      toast({
        title: "Invalid Prompt",
        description: "Please enter a valid prompt (1-200 words).",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-suno-lyrics', {
        body: { prompt: prompt.trim() }
      });

      if (error) {
        console.error('Lyrics generation error:', error);
        throw new Error(error.message || 'Failed to start lyrics generation');
      }

      const newTaskId = data.taskId;
      setTaskId(newTaskId);

      toast({
        title: "Lyrics Generation Started",
        description: `Lyrics generation has been queued. Task ID: ${newTaskId}`,
      });

      // Start polling for results
      startPolling(newTaskId);

    } catch (error) {
      console.error('Error generating lyrics:', error);
      toast({
        title: "Lyrics Generation Failed",
        description: error instanceof Error ? error.message : "Failed to start lyrics generation",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyLyrics = (lyrics: string) => {
    navigator.clipboard.writeText(lyrics);
    toast({
      title: "Copied to Clipboard",
      description: "Lyrics have been copied to clipboard",
    });
  };

  const useLyrics = (lyrics: string, title: string) => {
    onLyricsGenerated?.(lyrics, title);
    onOpenChange(false);
  };

  const downloadLyrics = (lyrics: string, title: string) => {
    const blob = new Blob([lyrics], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_lyrics.txt`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Lyrics file download has started.",
    });
  };

  React.useEffect(() => {
    if (open) {
      setPrompt(initialPrompt);
      setResult(null);
      setTaskId(null);
      setIsPolling(false);
    }
  }, [open, initialPrompt]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Lyrics with AI
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Prompt Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="lyrics-prompt">Lyrics Prompt</Label>
              <Badge variant={wordCount <= 200 ? "outline" : "destructive"}>
                {wordCount}/200 words
              </Badge>
            </div>
            <Textarea
              id="lyrics-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the lyrics you want to generate (e.g., 'A song about peaceful night in the city with themes of reflection and hope')"
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Be specific about themes, moods, styles, and song structure. The more detailed your prompt, the better the results.
            </p>
          </div>

          {/* Generate Button */}
          {!taskId && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !isPromptValid}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating Lyrics...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Lyrics
                </>
              )}
            </Button>
          )}

          {/* Status Section */}
          {taskId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  {isPolling && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span className="font-medium">Lyrics Generation</span>
                </div>
                <Badge variant={result?.isCompleted ? "default" : result?.isFailed ? "destructive" : "secondary"}>
                  {result?.isCompleted ? "Completed" : 
                   result?.isFailed ? "Failed" : "Generating"}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                Task ID: {taskId}
              </p>

              {result?.isFailed && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-destructive">
                    {result.errorMessage || 'Lyrics generation failed'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Generated Lyrics */}
          {result?.isCompleted && result.lyrics.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Generated Lyrics</h4>
              <div className="grid gap-4">
                {result.lyrics.map((lyric, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">{lyric.title}</h5>
                        <div className="flex gap-2">
                          <Badge variant={lyric.status === 'complete' ? "default" : "destructive"}>
                            {lyric.status}
                          </Badge>
                        </div>
                      </div>

                      {lyric.status === 'complete' ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-muted rounded border max-h-40 overflow-y-auto">
                            <pre className="text-sm whitespace-pre-wrap font-mono">
                              {lyric.text}
                            </pre>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyLyrics(lyric.text)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadLyrics(lyric.text, lyric.title)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => useLyrics(lyric.text, lyric.title)}
                            >
                              Use These Lyrics
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-destructive">
                          {lyric.errorMessage || 'Generation failed'}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              {isPolling ? 'Close' : 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}