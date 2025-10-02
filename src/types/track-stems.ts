/**
 * Stem Types and Interfaces
 */

export type StemType = 
  | 'vocals'
  | 'backingVocals'
  | 'instrumental'
  | 'drums'
  | 'bass'
  | 'guitar'
  | 'keyboard'
  | 'strings'
  | 'brass'
  | 'woodwinds'
  | 'percussion'
  | 'synth'
  | 'fx';

export type StemSeparationMode = 'simple' | 'detailed';

export interface Stem {
  id: string;
  track_id: string;
  variant_number: number;
  separation_mode: StemSeparationMode;
  stem_type: StemType;
  stem_name: string;
  stem_url: string;
  file_size: number;
  duration: number;
  waveform_data?: any;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface StemCache {
  track_id: string;
  variant_number: number;
  separation_mode: StemSeparationMode;
  stems: Stem[];
  created_at: string;
}

export interface SeparationRecord {
  id: string;
  track_id: string;
  separation_mode: StemSeparationMode;
  stems_count: number;
  created_at: string;
}

export const STEM_ICONS: Record<StemType, string> = {
  vocals: '🎤',
  backingVocals: '🎙️',
  instrumental: '🎸',
  drums: '🥁',
  bass: '🎸',
  guitar: '🎸',
  keyboard: '🎹',
  strings: '🎻',
  brass: '🎺',
  woodwinds: '🎷',
  percussion: '🥁',
  synth: '🎹',
  fx: '✨'
};

export const STEM_NAMES: Record<StemType, string> = {
  vocals: 'Вокал',
  backingVocals: 'Бэк-вокал',
  instrumental: 'Инструментал',
  drums: 'Ударные',
  bass: 'Бас',
  guitar: 'Гитара',
  keyboard: 'Клавишные',
  strings: 'Струнные',
  brass: 'Духовые (медные)',
  woodwinds: 'Духовые (деревянные)',
  percussion: 'Перкуссия',
  synth: 'Синтезатор',
  fx: 'Эффекты'
};
