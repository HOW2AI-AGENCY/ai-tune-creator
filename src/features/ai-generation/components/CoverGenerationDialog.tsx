import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Image, Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CoverGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: string;
  trackTitle?: string;
  onCoverGenerated?: (images: string[]) => void;
}

interface CoverGenerationResult {
  coverTaskId: string;
  originalTaskId: string;
  isCompleted: boolean;
  isFailed: boolean;
  isGenerating: boolean;
  isPending: boolean;
  images: string[];
  errorMessage?: string;
}

export function CoverGenerationDialog({ 
  open, 
  onOpenChange, 
  taskId, 
  trackTitle, 
  onCoverGenerated 
}: CoverGenerationDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [coverTaskId, setCoverTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<CoverGenerationResult | null>(null);
  
  const { toast } = useToast();

  const checkCoverStatus = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-suno-cover-info', {
        body: { taskId: id }
      });

      if (error) {
        throw new Error(error.message || 'Failed to check cover status');
      }

      setResult(data);

      if (data.isCompleted) {
        setIsPolling(false);
        toast({
          title: "Cover Generated!",
          description: `${data.images.length} cover image(s) generated successfully.`,
        });
        onCoverGenerated?.(data.images);
        return true;
      }

      if (data.isFailed) {
        setIsPolling(false);
        toast({
          title: "Cover Generation Failed",
          description: data.errorMessage || "Failed to generate cover",
          variant: "destructive"
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking cover status:', error);
      setIsPolling(false);
      return true;
    }
  };

  const startPolling = (id: string) => {
    setIsPolling(true);
    
    const poll = async () => {
      const shouldStop = await checkCoverStatus(id);
      
      if (!shouldStop && isPolling) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    };

    poll();
  };

  const handleGenerateCover = async () => {
    if (!taskId) {
      toast({
        title: "Missing Task ID",
        description: "Cannot generate cover without a valid task ID.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-suno-cover', {
        body: { taskId }
      });

      if (error) {
        console.error('Cover generation error:', error);
        throw new Error(error.message || 'Failed to start cover generation');
      }

      const newCoverTaskId = data.coverTaskId;
      setCoverTaskId(newCoverTaskId);

      toast({
        title: "Cover Generation Started",
        description: `Cover generation has been queued. Task ID: ${newCoverTaskId}`,
      });

      // Start polling for results
      startPolling(newCoverTaskId);

    } catch (error) {
      console.error('Error generating cover:', error);
      toast({
        title: "Cover Generation Failed",
        description: error instanceof Error ? error.message : "Failed to start cover generation",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadImage = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `cover-${trackTitle || 'track'}-${index + 1}.png`;
      link.click();
      
      URL.revokeObjectURL(downloadUrl);
      
      toast({
        title: "Download Started",
        description: "Cover image download has started.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download cover image.",
        variant: "destructive"
      });
    }
  };

  React.useEffect(() => {
    if (open) {
      setResult(null);
      setCoverTaskId(null);
      setIsPolling(false);
    }
  }, [open]);

  if (!taskId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cannot Generate Cover
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              No valid task ID available for cover generation.
            </p>
          </div>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Generate Cover Image{trackTitle ? ` for "${trackTitle}"` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Track Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Task ID: {taskId}</p>
            {trackTitle && <p className="font-medium">{trackTitle}</p>}
          </div>

          {/* Generate Button */}
          {!coverTaskId && (
            <Button
              onClick={handleGenerateCover}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Starting Generation...
                </>
              ) : (
                <>
                  <Image className="h-4 w-4 mr-2" />
                  Generate Cover Images
                </>
              )}
            </Button>
          )}

          {/* Status Section */}
          {coverTaskId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  {isPolling && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span className="font-medium">Cover Generation</span>
                </div>
                <Badge variant={result?.isCompleted ? "default" : result?.isFailed ? "destructive" : "secondary"}>
                  {result?.isCompleted ? "Completed" : 
                   result?.isFailed ? "Failed" : 
                   result?.isGenerating ? "Generating" : "Pending"}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                Cover Task ID: {coverTaskId}
              </p>

              {result?.isFailed && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-destructive">
                    {result.errorMessage || 'Cover generation failed'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Generated Images */}
          {result?.isCompleted && result.images.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium">Generated Cover Images</h4>
              <div className="grid grid-cols-2 gap-4">
                {result.images.map((imageUrl, index) => (
                  <div key={index} className="space-y-2">
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={imageUrl}
                        alt={`Cover ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadImage(imageUrl, index)}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
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