import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Copy, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StyleBoostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStyleGenerated?: (boostedStyle: string) => void;
  initialStyle?: string;
}

interface StyleBoostResult {
  taskId: string;
  originalContent: string;
  boostedStyle: string;
  creditsConsumed: number;
  creditsRemaining: number;
  isSuccess: boolean;
  isPending: boolean;
  isFailed: boolean;
  errorMessage?: string;
}

export function StyleBoostDialog({ open, onOpenChange, onStyleGenerated, initialStyle = '' }: StyleBoostDialogProps) {
  const [inputStyle, setInputStyle] = useState(initialStyle);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<StyleBoostResult | null>(null);
  
  const { toast } = useToast();

  React.useEffect(() => {
    if (open) {
      setInputStyle(initialStyle);
      setResult(null);
    }
  }, [open, initialStyle]);

  const handleGenerate = async () => {
    if (!inputStyle.trim()) {
      toast({
        title: "Missing Style Description",
        description: "Please enter a style description to boost.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('boost-suno-style', {
        body: { content: inputStyle.trim() }
      });

      if (error) {
        console.error('Style boost error:', error);
        throw new Error(error.message || 'Failed to boost style');
      }

      console.log('Style boost result:', data);
      setResult(data);

      if (data.isSuccess) {
        toast({
          title: "Style Boosted Successfully!",
          description: `Used ${data.creditsConsumed} credits. ${data.creditsRemaining} remaining.`,
        });
        onStyleGenerated?.(data.boostedStyle);
      } else if (data.isFailed) {
        throw new Error(data.errorMessage || 'Style boost failed');
      }

    } catch (error) {
      console.error('Error boosting style:', error);
      toast({
        title: "Style Boost Failed",
        description: error instanceof Error ? error.message : "Failed to boost style",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to Clipboard",
      description: "Style has been copied to clipboard",
    });
  };

  const useGeneratedStyle = () => {
    if (result?.boostedStyle) {
      onStyleGenerated?.(result.boostedStyle);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Boost Music Style
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Input Section */}
          <div className="space-y-3">
            <Label htmlFor="style-input">Style Description</Label>
            <Textarea
              id="style-input"
              value={inputStyle}
              onChange={(e) => setInputStyle(e.target.value)}
              placeholder="Enter your basic style description (e.g., 'Pop, Mysterious')"
              rows={3}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              Describe the music style you want to enhance in concise, clear language.
            </p>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !inputStyle.trim()}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Boosting Style...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Boost Style
              </>
            )}
          </Button>

          {/* Result Section */}
          {result && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Boosted Style</h4>
                  <div className="flex gap-2">
                    <Badge variant={result.isSuccess ? "default" : "destructive"}>
                      {result.isSuccess ? "Success" : result.isFailed ? "Failed" : "Pending"}
                    </Badge>
                    {result.isSuccess && (
                      <Badge variant="outline">
                        Credits: {result.creditsConsumed}
                      </Badge>
                    )}
                  </div>
                </div>

                {result.isSuccess && result.boostedStyle && (
                  <div className="space-y-3">
                    <div className="p-3 bg-muted rounded border">
                      <p className="text-sm font-medium mb-1">Original:</p>
                      <p className="text-sm">{result.originalContent}</p>
                    </div>
                    
                    <div className="p-3 bg-primary/5 rounded border border-primary/20">
                      <p className="text-sm font-medium mb-1">Enhanced:</p>
                      <p className="text-sm">{result.boostedStyle}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(result.boostedStyle)}
                        className="flex-1"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button
                        size="sm"
                        onClick={useGeneratedStyle}
                        className="flex-1"
                      >
                        Use This Style
                      </Button>
                    </div>
                  </div>
                )}

                {result.isFailed && (
                  <p className="text-sm text-destructive">
                    {result.errorMessage || 'Style boost failed'}
                  </p>
                )}
              </div>

              {result.isSuccess && (
                <div className="text-sm text-muted-foreground text-center">
                  Credits remaining: {result.creditsRemaining}
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}