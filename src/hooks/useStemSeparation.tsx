/**
 * @fileoverview Hook for stem separation functionality
 * @author Claude Code Assistant
 * @version 1.0.0
 * 
 * Provides unified interface for both Suno and Mureka stem separation
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Track {
  id: string;
  title: string;
  audio_url?: string;
  metadata?: Record<string, any>;
}

interface StemUrls {
  original?: string;
  vocals?: string;
  instrumental?: string;
  backingVocals?: string;
  drums?: string;
  bass?: string;
  guitar?: string;
  keyboard?: string;
  percussion?: string;
  strings?: string;
  synth?: string;
  fx?: string;
  brass?: string;
  woodwinds?: string;
}

interface SeparationResult {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stems?: StemUrls;
  error?: string;
  progress?: number;
}

export interface StemSeparationHook {
  // Core functions
  startSeparation: (
    track: Track, 
    type?: 'separate_vocal' | 'split_stem'
  ) => Promise<string>;
  
  // Status checking
  getSeparationStatus: (taskId: string, service: 'suno' | 'mureka') => Promise<SeparationResult>;
  
  // Polling
  startPolling: (
    taskId: string, 
    service: 'suno' | 'mureka',
    onUpdate: (result: SeparationResult) => void
  ) => () => void;
  
  // Utilities
  downloadStem: (url: string, filename: string, trackTitle: string) => Promise<void>;
  downloadAllStems: (stems: StemUrls, trackTitle: string) => Promise<void>;
  
  // State
  isProcessing: boolean;
  currentTask: string | null;
}

export function useStemSeparation(): StemSeparationHook {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const { toast } = useToast();

  // ====================================
  // 🎵 START SEPARATION
  // ====================================
  
  const startSeparation = useCallback(async (
    track: Track, 
    type: 'separate_vocal' | 'split_stem' = 'separate_vocal'
  ): Promise<string> => {
    const service = track.metadata?.service;
    
    if (!service || (service !== 'suno' && service !== 'mureka')) {
      throw new Error('Stem separation is only available for Suno and Mureka tracks');
    }

    setIsProcessing(true);
    
    try {
      let taskId: string;
      
      if (service === 'suno') {
        // Suno stem separation
        const sunoTaskId = track.metadata?.suno_task_id;
        const audioId = track.metadata?.suno_audio_id;

        if (!sunoTaskId || !audioId) {
          throw new Error('Suno track metadata is incomplete');
        }

        const { data, error } = await supabase.functions.invoke('separate-suno-vocals', {
          body: {
            taskId: sunoTaskId,
            audioId,
            type
          }
        });

        if (error) throw new Error(error.message);
        taskId = data.taskId;
        
        toast({
          title: "🎵 Suno separation started",
          description: `${type === 'split_stem' ? 'Full stem' : 'Vocal'} separation in progress`
        });
        
      } else if (service === 'mureka' && track.audio_url) {
        // Mureka stem separation
        const { data, error } = await supabase.functions.invoke('mureka-stem-separation', {
          body: {
            url: track.audio_url
          }
        });

        if (error) throw new Error(error.message);
        taskId = data.taskId || `mureka_${Date.now()}`;
        
        toast({
          title: "🎵 Mureka separation started",
          description: "Processing stem separation"
        });
        
      } else {
        throw new Error('Track audio URL is missing for Mureka separation');
      }

      setCurrentTask(taskId);
      return taskId;
      
    } catch (error: any) {
      setIsProcessing(false);
      console.error('Stem separation error:', error);
      
      toast({
        title: "❌ Separation failed",
        description: error.message,
        variant: "destructive"
      });
      
      throw error;
    }
  }, [toast]);

  // ====================================
  // 📊 STATUS CHECKING
  // ====================================
  
  const getSeparationStatus = useCallback(async (
    taskId: string, 
    service: 'suno' | 'mureka'
  ): Promise<SeparationResult> => {
    try {
      if (service === 'suno') {
        const { data, error } = await supabase.functions.invoke('get-suno-vocal-separation-info', {
          body: { taskId }
        });

        if (error) throw new Error(error.message);

        return {
          taskId,
          status: data.isCompleted ? 'completed' : data.isFailed ? 'failed' : 'processing',
          stems: data.stems,
          error: data.errorMessage
        };
        
      } else {
        // TODO: Implement Mureka status checking
        // For now, assume immediate completion for Mureka
        return {
          taskId,
          status: 'completed',
          stems: {} // Would come from Mureka response
        };
      }
      
    } catch (error: any) {
      console.error('Status check error:', error);
      return {
        taskId,
        status: 'failed',
        error: error.message
      };
    }
  }, []);

  // ====================================
  // 🔄 POLLING
  // ====================================
  
  const startPolling = useCallback((
    taskId: string, 
    service: 'suno' | 'mureka',
    onUpdate: (result: SeparationResult) => void
  ) => {
    const pollInterval = setInterval(async () => {
      try {
        const result = await getSeparationStatus(taskId, service);
        
        onUpdate(result);
        
        if (result.status === 'completed' || result.status === 'failed') {
          clearInterval(pollInterval);
          setIsProcessing(false);
          setCurrentTask(null);
          
          if (result.status === 'completed') {
            toast({
              title: "✅ Separation completed",
              description: "All stems are ready for download"
            });
          } else {
            toast({
              title: "❌ Separation failed",
              description: result.error || "Unknown error occurred",
              variant: "destructive"
            });
          }
        }
        
      } catch (error: any) {
        console.error('Polling error:', error);
        clearInterval(pollInterval);
        setIsProcessing(false);
      }
    }, 5000); // Poll every 5 seconds

    // Timeout after 10 minutes
    const timeoutId = setTimeout(() => {
      clearInterval(pollInterval);
      setIsProcessing(false);
      
      toast({
        title: "⏰ Timeout",
        description: "Separation is taking longer than expected",
        variant: "destructive"
      });
    }, 600000);

    // Return cleanup function
    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeoutId);
    };
  }, [getSeparationStatus, toast]);

  // ====================================
  // 📥 DOWNLOAD UTILITIES
  // ====================================
  
  const downloadStem = useCallback(async (
    url: string, 
    filename: string, 
    trackTitle: string
  ): Promise<void> => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${trackTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${filename}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "📥 Download started",
        description: `Downloading ${filename} stem`
      });
      
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "❌ Download failed",
        description: `Failed to download ${filename}`,
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);

  const downloadAllStems = useCallback(async (
    stems: StemUrls, 
    trackTitle: string
  ): Promise<void> => {
    const stemEntries = Object.entries(stems).filter(([key, url]) => 
      key !== 'original' && url
    );
    
    try {
      for (const [key, url] of stemEntries) {
        if (url) {
          await downloadStem(url, key, trackTitle);
          // Small delay between downloads to avoid overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      toast({
        title: "📦 Bulk download started",
        description: `Downloading ${stemEntries.length} stems`
      });
      
    } catch (error: any) {
      console.error('Bulk download error:', error);
      toast({
        title: "❌ Bulk download failed",
        description: "Some downloads may have failed",
        variant: "destructive"
      });
    }
  }, [downloadStem, toast]);

  return {
    startSeparation,
    getSeparationStatus,
    startPolling,
    downloadStem,
    downloadAllStems,
    isProcessing,
    currentTask
  };
}