import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Track {
  id: string;
  title: string;
  duration?: number;
  style_prompt?: string;
  metadata?: any;
}

interface TrackExtendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track | null;
  onExtensionStarted?: () => void;
}

const SUNO_MODELS = [
  { value: 'V3_5', label: 'V3.5 - Better song structure, max 4 min', maxDuration: 240 },
  { value: 'V4', label: 'V4 - Improved vocal quality, max 4 min', maxDuration: 240 },
  { value: 'V4_5', label: 'V4.5 - Smarter prompts, faster generations, max 8 min', maxDuration: 480 },
  { value: 'V4_5PLUS', label: 'V4.5+ - Richer sound, new ways to create, max 8 min', maxDuration: 480 }
];

export function TrackExtendDialog({ open, onOpenChange, track, onExtensionStarted }: TrackExtendDialogProps) {
  const [isExtending, setIsExtending] = useState(false);
  const [customMode, setCustomMode] = useState(true);
  const [continueAt, setContinueAt] = useState(60);
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('');
  const [title, setTitle] = useState('');
  const [model, setModel] = useState('V3_5');
  const [negativeTags, setNegativeTags] = useState('');
  const [vocalGender, setVocalGender] = useState<'m' | 'f' | ''>('');
  const [styleWeight, setStyleWeight] = useState([0.65]);
  const [weirdnessConstraint, setWeirdnessConstraint] = useState([0.65]);
  const [audioWeight, setAudioWeight] = useState([0.65]);
  
  const { toast } = useToast();

  React.useEffect(() => {
    if (track && open) {
      setTitle(`${track.title} (Extended)`);
      setStyle(track.style_prompt || '');
      setPrompt(`Extend the music with more sections and variations`);
      
      // Set continueAt to 80% of track duration or 60 seconds, whichever is smaller
      const defaultContinueAt = track.duration 
        ? Math.min(Math.floor(track.duration * 0.8), 60)
        : 60;
      setContinueAt(defaultContinueAt);
    }
  }, [track, open]);

  const maxContinueAt = track?.duration ? track.duration - 5 : 300; // Leave 5 seconds buffer
  const selectedModel = SUNO_MODELS.find(m => m.value === model);

  const handleExtend = async () => {
    if (!track) return;

    // Validate inputs
    if (customMode && (!prompt.trim() || !title.trim())) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in the prompt and title fields.",
        variant: "destructive"
      });
      return;
    }

    if (continueAt <= 0 || continueAt >= maxContinueAt) {
      toast({
        title: "Invalid Extension Point",
        description: `Extension point must be between 1 and ${maxContinueAt} seconds.`,
        variant: "destructive"
      });
      return;
    }

    setIsExtending(true);

    try {
      const requestBody = {
        trackId: track.id,
        continueAt,
        model,
        defaultParamFlag: customMode
      };

      if (customMode) {
        Object.assign(requestBody, {
          prompt: prompt.trim(),
          style: style.trim() || track.style_prompt,
          title: title.trim(),
          negativeTags: negativeTags.trim() || undefined,
          vocalGender: vocalGender || undefined,
          styleWeight: styleWeight[0],
          weirdnessConstraint: weirdnessConstraint[0],
          audioWeight: audioWeight[0]
        });
      }

      const { data, error } = await supabase.functions.invoke('extend-suno-track', {
        body: requestBody
      });

      if (error) {
        console.error('Extension error:', error);
        throw new Error(error.message || 'Failed to start track extension');
      }

      toast({
        title: "Extension Started",
        description: `Track extension has been queued. Task ID: ${data.taskId}`,
      });

      onExtensionStarted?.();
      onOpenChange(false);

    } catch (error) {
      console.error('Error extending track:', error);
      toast({
        title: "Extension Failed",
        description: error instanceof Error ? error.message : "Failed to start track extension",
        variant: "destructive"
      });
    } finally {
      setIsExtending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!track) return null;

  const hasExternalId = track.metadata?.external_id || track.metadata?.suno_id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Extend Track: {track.title}
          </DialogTitle>
        </DialogHeader>

        {!hasExternalId ? (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Cannot Extend Track</p>
              <p className="text-sm text-muted-foreground">
                This track was not generated with Suno or is missing the external ID required for extension.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Track Info */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">{track.title}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Duration: {track.duration ? formatTime(track.duration) : 'Unknown'}
                </div>
              </div>
            </div>

            {/* Extension Point */}
            <div className="space-y-3">
              <Label>Extension Point</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <Slider
                    value={[continueAt]}
                    onValueChange={(value) => setContinueAt(value[0])}
                    max={maxContinueAt}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={continueAt}
                    onChange={(e) => setContinueAt(parseInt(e.target.value) || 1)}
                    min={1}
                    max={maxContinueAt}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">seconds</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Extension will start at {formatTime(continueAt)}
                </p>
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label>Model Version</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUNO_MODELS.map((modelOption) => (
                    <SelectItem key={modelOption.value} value={modelOption.value}>
                      {modelOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedModel && (
                <p className="text-xs text-muted-foreground">
                  Max output duration: {formatTime(selectedModel.maxDuration)}
                </p>
              )}
            </div>

            {/* Custom vs Original Parameters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Use Custom Parameters</Label>
                <Switch checked={customMode} onCheckedChange={setCustomMode} />
              </div>
              <p className="text-sm text-muted-foreground">
                {customMode 
                  ? "Specify custom prompt and style for the extension"
                  : "Use the original track's parameters for consistent extension"
                }
              </p>
            </div>

            {/* Custom Parameters */}
            {customMode && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Extended Track Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter title for extended track"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">Extension Prompt</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe how the music should be extended..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="style">Style (Optional)</Label>
                  <Input
                    id="style"
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    placeholder="e.g., Jazz, Classical, Electronic"
                  />
                </div>

                {/* Advanced Parameters */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium">Advanced Parameters</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="negativeTags">Negative Tags</Label>
                      <Input
                        id="negativeTags"
                        value={negativeTags}
                        onChange={(e) => setNegativeTags(e.target.value)}
                        placeholder="Styles to avoid"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Vocal Gender</Label>
                      <Select value={vocalGender} onValueChange={(value) => setVocalGender(value as 'm' | 'f' | '')}>
                        <SelectTrigger>
                          <SelectValue placeholder="Auto" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Auto</SelectItem>
                          <SelectItem value="m">Male</SelectItem>
                          <SelectItem value="f">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Style Weight: {styleWeight[0]}</Label>
                      <Slider
                        value={styleWeight}
                        onValueChange={setStyleWeight}
                        max={1}
                        min={0}
                        step={0.01}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Creativity: {weirdnessConstraint[0]}</Label>
                      <Slider
                        value={weirdnessConstraint}
                        onValueChange={setWeirdnessConstraint}
                        max={1}
                        min={0}
                        step={0.01}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Audio Influence: {audioWeight[0]}</Label>
                      <Slider
                        value={audioWeight}
                        onValueChange={setAudioWeight}
                        max={1}
                        min={0}
                        step={0.01}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleExtend}
                disabled={isExtending}
                className="flex-1"
              >
                {isExtending ? 'Starting Extension...' : 'Extend Track'}
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isExtending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}