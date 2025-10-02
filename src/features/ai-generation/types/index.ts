/**
 * AI Generation Types
 */

export interface GenerationParams {
  service: 'suno' | 'mureka';
  prompt: string;
  lyrics?: string;
  style?: string;
  instrumental?: boolean;
  projectId?: string | null;
  artistId?: string | null;
  model?: string;
  duration?: number;
  language?: string;
  mode?: 'quick' | 'custom';
  tags?: string[];
}

export * from './canonical';
