export interface QuickPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  genre: string;
  mood: string;
  prompt: string;
  tags: string[];
  service: 'suno' | 'mureka';
}

export interface GenerationParams {
  prompt: string;
  service: 'suno' | 'mureka';
  projectId?: string;
  artistId?: string;
  stylePrompt?: string;
  genreTags?: string[];
  customLyrics?: string;
  mode: 'quick' | 'custom';
  tempo?: string;
  duration?: number;
  instrumental?: boolean;
  voiceStyle?: string;
  language?: string;
  inputType?: 'description' | 'lyrics';
  useInbox?: boolean;
}

export interface Option {
  id: string;
  name: string;
}