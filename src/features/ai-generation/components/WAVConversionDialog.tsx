import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, FileAudio, Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface WAVConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId?: string;
  audioId?: string;
  trackTitle?: string;
  onConversionComplete?: (wavUrl: string) => void;
}

interface WAVConversionResult {
  taskId: string;
  musicId?: string;
  wavUrl?: string;
  isCompleted: boolean;
  isFailed: boolean;
  isPending: boolean;
  errorMessage?: string;
  completeTime?: string;
  createTime?: string;
}

export function WAVConversionDialog({ 
  open, 
  onOpenChange, 
  taskId, 
  audioId, 
  trackTitle, 
  onConversionComplete 
}: WAVConversionDialogProps) {
  const [isConverting, setIsConverting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [wavTaskId, setWavTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<WAVConversionResult | null>(null);
  
  const { toast } = useToast();

  const checkConversionStatus = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-suno-wav-info', {
        body: { taskId: id }
      });

      if (error) {
        throw new Error(error.message || 'Failed to check conversion status');
      }

      setResult(data);

      if (data.isCompleted && data.wavUrl) {
        setIsPolling(false);
        toast({
          title: "WAV Conversion Complete!",
          description: "Your track has been converted to WAV format and is ready for download.",
        });
        onConversionComplete?.(data.wavUrl);
        return true;
      }

      if (data.isFailed) {
        setIsPolling(false);
        toast({
          title: "WAV Conversion Failed",
          description: data.errorMessage || "Failed to convert to WAV format",
          variant: "destructive"
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking conversion status:', error);
      setIsPolling(false);
      return true;
    }
  };

  const startPolling = (id: string) => {
    setIsPolling(true);
    
    const poll = async () => {
      const shouldStop = await checkConversionStatus(id);
      
      if (!shouldStop && isPolling) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      }
    };

    poll();
  };

  const handleConvertToWAV = async () => {
    if (!taskId && !audioId) {
      toast({
        title: "Missing Information",
        description: "Cannot convert without a valid task ID or audio ID.",
        variant: "destructive"
      });
      return;
    }

    setIsConverting(true);

    try {
      const { data, error } = await supabase.functions.invoke('convert-suno-to-wav', {
        body: { taskId, audioId }
      });

      if (error) {
        console.error('WAV conversion error:', error);
        throw new Error(error.message || 'Failed to start WAV conversion');
      }

      const newWavTaskId = data.wavTaskId;
      setWavTaskId(newWavTaskId);

      toast({
        title: "WAV Conversion Started",
        description: `WAV conversion has been queued. Task ID: ${newWavTaskId}`,
      });

      // Start polling for results
      startPolling(newWavTaskId);

    } catch (error) {
      console.error('Error converting to WAV:', error);
      toast({
        title: "WAV Conversion Failed",
        description: error instanceof Error ? error.message : "Failed to start WAV conversion",
        variant: "destructive"
      });
    } finally {
      setIsConverting(false);
    }
  };

  const downloadWAV = async (url: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${trackTitle || 'track'}.wav`;
      link.target = '_blank';
      link.click();
      
      toast({
        title: "Download Started",
        description: "WAV file download has started.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download WAV file.",
        variant: "destructive"
      });
    }
  };

  React.useEffect(() => {
    if (open) {
      setResult(null);
      setWavTaskId(null);
      setIsPolling(false);
    }
  }, [open]);

  if (!taskId && !audioId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cannot Convert to WAV
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              No valid task ID or audio ID available for WAV conversion.
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
            <FileAudio className="h-5 w-5" />
            Convert to WAV Format{trackTitle ? ` - "${trackTitle}"` : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Track Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            {taskId && <p className="text-sm text-muted-foreground">Task ID: {taskId}</p>}
            {audioId && <p className="text-sm text-muted-foreground">Audio ID: {audioId}</p>}
            {trackTitle && <p className="font-medium">{trackTitle}</p>}
          </div>

          {/* Convert Button */}
          {!wavTaskId && (
            <div className="space-y-3">
              <Button
                onClick={handleConvertToWAV}
                disabled={isConverting}
                className="w-full"
              >
                {isConverting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Starting Conversion...
                  </>
                ) : (
                  <>
                    <FileAudio className="h-4 w-4 mr-2" />
                    Convert to WAV Format
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Convert your track to high-quality WAV format for professional use.
              </p>
            </div>
          )}

          {/* Status Section */}
          {wavTaskId && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  {isPolling && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span className="font-medium">WAV Conversion</span>
                </div>
                <Badge variant={result?.isCompleted ? "default" : result?.isFailed ? "destructive" : "secondary"}>
                  {result?.isCompleted ? "Completed" : 
                   result?.isFailed ? "Failed" : 
                   "Converting"}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                WAV Task ID: {wavTaskId}
              </p>

              {result?.isFailed && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm text-destructive">
                    {result.errorMessage || 'WAV conversion failed'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Download Section */}
          {result?.isCompleted && result.wavUrl && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-green-800">Conversion Complete!</h4>
                  <Badge variant="default" className="bg-green-600">
                    WAV Ready
                  </Badge>
                </div>
                <Button
                  onClick={() => downloadWAV(result.wavUrl!)}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download WAV File
                </Button>
              </div>
              
              {result.completeTime && (
                <p className="text-sm text-muted-foreground text-center">
                  Completed: {new Date(result.completeTime).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isConverting}
            >
              {isPolling ? 'Close' : 'Cancel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}