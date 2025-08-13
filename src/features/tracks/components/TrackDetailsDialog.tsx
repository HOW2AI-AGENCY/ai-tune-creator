import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrackDetailsView } from "./TrackDetailsView";
import { TrackVersionsDialog } from "./TrackVersionsDialog";
import { TrackGenerationDialog } from "./TrackGenerationDialog";
import { Button } from "@/components/ui/button";
import { History, Sparkles } from "lucide-react";

interface Track {
  id: string;
  title: string;
  track_number: number;
  duration?: number | null;
  lyrics?: string | null;
  audio_url?: string | null;
  current_version: number;
  description?: string | null;
  genre_tags?: string[] | null;
  style_prompt?: string | null;
  metadata?: any;
  created_at: string;
  updated_at: string;
  project_id: string;
  project?: {
    title: string;
    artist: {
      name: string;
      avatar_url?: string;
    };
  };
}

interface TrackDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track | null;
  onTrackUpdated: () => void;
}

export function TrackDetailsDialog({ open, onOpenChange, track, onTrackUpdated }: TrackDetailsDialogProps) {
  const [versionsDialogOpen, setVersionsDialogOpen] = useState(false);
  const [generationDialogOpen, setGenerationDialogOpen] = useState(false);

  if (!track) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden p-2">
          <div className="space-y-4">
            {/* Header Actions */}
            <div className="flex items-center justify-between px-4 py-2">
              <DialogTitle className="text-lg font-semibold">
                Детали трека: {track.title}
              </DialogTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setVersionsDialogOpen(true)}
                >
                  <History className="h-4 w-4 mr-2" />
                  История версий
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setGenerationDialogOpen(true)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  ИИ Генерация
                </Button>
              </div>
            </div>

            {/* Main Interactive View */}
            <div className="px-2">
              <TrackDetailsView
                trackId={track.id}
                editable={true}
                onClose={() => onOpenChange(false)}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TrackVersionsDialog
        open={versionsDialogOpen}
        onOpenChange={setVersionsDialogOpen}
        trackId={track?.id}
        trackTitle={track?.title}
      />

      <TrackGenerationDialog
        open={generationDialogOpen}
        onOpenChange={setGenerationDialogOpen}
        onGenerated={(type, data) => {
          onTrackUpdated();
        }}
        artistInfo={track.project?.artist}
        projectInfo={track.project}
        existingTrackData={{
          stylePrompt: track.style_prompt || undefined,
          genreTags: track.genre_tags || undefined,
          lyrics: track.lyrics || undefined
        }}
      />
    </>
  );
}