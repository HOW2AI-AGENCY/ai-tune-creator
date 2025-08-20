/**
 * @fileoverview Types for stem separation functionality
 * @author Claude Code Assistant
 * @version 1.0.0
 */

export interface StemUrls {
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

export interface SeparationMode {
  type: 'separate_vocal' | 'split_stem';
  label: string;
  description: string;
  stems: string[];
  credits: number;
  supportedServices: ('suno' | 'mureka')[];
}

export interface SeparationResult {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stems?: StemUrls;
  error?: string;
  progress?: number;
  service: 'suno' | 'mureka';
  mode?: 'separate_vocal' | 'split_stem';
  createdAt?: Date;
  completedAt?: Date;
}

export interface SeparationConfig {
  // Suno API settings
  suno: {
    endpoints: {
      generate: string;
      status: string;
    };
    modes: SeparationMode[];
    polling: {
      intervalMs: number;
      timeoutMs: number;
    };
  };
  
  // Mureka API settings  
  mureka: {
    endpoints: {
      separate: string;
    };
    modes: SeparationMode[];
    polling: {
      intervalMs: number;
      timeoutMs: number;
    };
  };
}

export const STEM_SEPARATION_CONFIG: SeparationConfig = {
  suno: {
    endpoints: {
      generate: 'separate-suno-vocals',
      status: 'get-suno-vocal-separation-info'
    },
    modes: [
      {
        type: 'separate_vocal',
        label: 'Vocal Separation',
        description: 'Split into vocals and instrumental tracks',
        stems: ['Vocals', 'Instrumental'],
        credits: 1,
        supportedServices: ['suno']
      },
      {
        type: 'split_stem',
        label: 'Full Stem Separation',
        description: 'Split into up to 12 individual instrument tracks',
        stems: [
          'Vocals', 'Backing Vocals', 'Drums', 'Bass', 'Guitar', 
          'Keyboard', 'Strings', 'Brass', 'Woodwinds', 'Percussion', 
          'Synth', 'FX'
        ],
        credits: 5,
        supportedServices: ['suno']
      }
    ],
    polling: {
      intervalMs: 5000,
      timeoutMs: 600000
    }
  },
  
  mureka: {
    endpoints: {
      separate: 'mureka-stem-separation'
    },
    modes: [
      {
        type: 'separate_vocal',
        label: 'Mureka Stem Separation',
        description: 'Automatic separation into available stems',
        stems: ['Vocals', 'Instrumental', 'Drums', 'Bass', 'Other'],
        credits: 1,
        supportedServices: ['mureka']
      }
    ],
    polling: {
      intervalMs: 3000,
      timeoutMs: 300000
    }
  }
};

export interface Track {
  id: string;
  title: string;
  audio_url?: string;
  metadata?: {
    service?: 'suno' | 'mureka';
    suno_task_id?: string;
    suno_audio_id?: string;
    external_id?: string;
    [key: string]: any;
  };
}