/**
 * Complete Mureka AI Service Implementation
 * Implements ALL Mureka API methods including generation, covers, stems, etc.
 */

import { supabase } from '@/integrations/supabase/client';

export interface MurekaGenerateRequest {
  lyrics?: string;
  prompt?: string;
  model?: 'V7' | 'V7_5' | 'O1' | 'V6' | 'auto';
  referenceId?: string;
  vocalId?: string;
  melodyId?: string;
  stream?: boolean;
  duration?: number;
  // Enhanced for better API compliance
  inputType?: 'description' | 'lyrics';
  instrumental?: boolean;
  language?: string;
  style?: string;
  tempo?: string;
  key?: string;
}

export interface MurekaCoverRequest {
  originalUrl: string;
  style: string;
  preserveVocals?: boolean;
  model?: 'V7' | 'V7_5' | 'O1' | 'V6';
  callbackUrl?: string;
  quality?: 'standard' | 'high' | 'lossless';
}

export interface MurekaExtendRequest {
  trackId: string;
  additionalLyrics?: string;
  continuationPrompt?: string;
  extendDuration?: number;
}

export interface MurekaStemRequest {
  trackUrl: string;
  stemType: 'vocals' | 'instrumental' | 'drums' | 'bass' | 'melody' | 'harmony' | 'all';
  quality?: 'standard' | 'high' | 'lossless';
}

export interface MurekaRemixRequest {
  originalTrackUrl: string;
  remixStyle: string;
  intensity?: 'light' | 'moderate' | 'heavy';
  preserveElements?: ('vocals' | 'melody' | 'rhythm' | 'harmony')[];
}

export interface MurekaInstrumentalRequest {
  style: string;
  mood?: string;
  tempo?: number;
  key?: string;
  duration?: number;
  instruments?: string[];
}

export interface MurekaMasteringRequest {
  trackUrl: string;
  targetLoudness?: number;
  enhanceClarity?: boolean;
  genre?: string;
}

export class MurekaCompleteService {
  private baseUrl = '/api/mureka';
  private readonly SUPPORTED_MODELS = ['V7', 'V7_5', 'O1', 'V6'] as const;
  private readonly DEFAULT_MODEL = 'V7';
  private readonly API_VERSION = 'v1';
  private readonly MAX_POLLING_TIME = 300000; // 5 minutes in milliseconds
  private readonly POLLING_INTERVAL = 3000; // 3 seconds
  
  /**
   * Validates and normalizes model name according to current API spec
   */
  private normalizeModel(model?: string): string {
    if (!model || model === 'auto') {
      return this.DEFAULT_MODEL;
    }
    
    // Handle current Mureka model formats
    const modelMapping: Record<string, string> = {
      'V7': 'V7',
      'V7_5': 'V7.5', // API expects dot notation for V7.5
      'V7.5': 'V7.5',
      'O1': 'O1',
      'V6': 'V6',
      'V8': 'V7', // V8 is deprecated, fallback to V7
      'AUTO': 'V7'
    };
    
    const normalized = model.toUpperCase().replace('_', '.');
    return modelMapping[normalized] || this.DEFAULT_MODEL;
  }
  
  /**
   * Enhanced content preparation logic - simplified and more reliable
   */
  private prepareContent(request: MurekaGenerateRequest): { lyrics: string; prompt: string } {
    const isInstrumental = request.instrumental;
    const isLyricsMode = request.inputType === 'lyrics';
    
    let lyrics = '';
    let prompt = '';
    
    if (isInstrumental) {
      lyrics = '[Instrumental]';
      prompt = request.prompt || request.style || 'Instrumental music';
    } else if (isLyricsMode && request.lyrics) {
      lyrics = request.lyrics;
      prompt = request.style || request.prompt || 'Pop music with vocals';
    } else {
      // Auto-generate lyrics based on description
      lyrics = request.lyrics || '[Auto-generated lyrics based on prompt]';
      prompt = request.prompt || 'Creative music composition';
    }
    
    return { lyrics: lyrics.trim(), prompt: prompt.trim() };
  }

  /**
   * 1. GENERATE - Основная генерация музыки с улучшенной обработкой ошибок
   */
  async generateMusic(request: MurekaGenerateRequest) {
    // Validate and prepare request
    const { lyrics, prompt } = this.prepareContent(request);
    const normalizedRequest = {
      ...request,
      lyrics,
      prompt,
      model: this.normalizeModel(request.model),
      inputType: request.inputType || 'description'
    };
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-mureka-track', {
        body: normalizedRequest
      });

      if (error) {
        console.error('Mureka API error:', error);
        throw new Error(`Mureka generation failed: ${error.message || error}`);
      }
      
      return data;
    } catch (err: any) {
      console.error('Mureka service error:', err);
      throw new Error(`Mureka service unavailable: ${err.message || err}`);
    }
  }

  /**
   * 2. CREATE COVER - Создание кавер-версии
   */
  async createCover(request: MurekaCoverRequest) {
    const { data, error } = await supabase.functions.invoke('mureka-create-cover', {
      body: request
    });

    if (error) throw error;
    return data;
  }

  /**
   * 3. EXTEND TRACK - Расширение трека
   */
  async extendTrack(request: MurekaExtendRequest) {
    const { data, error } = await supabase.functions.invoke('extend-mureka-song', {
      body: request
    });

    if (error) throw error;
    return data;
  }

  /**
   * 4. STEM SEPARATION - Разделение на стемы
   */
  async separateStems(request: MurekaStemRequest) {
    const { data, error } = await supabase.functions.invoke('mureka-stem-separation', {
      body: request
    });

    if (error) throw error;
    return data;
  }

  /**
   * 5. CREATE REMIX - Создание ремикса
   */
  async createRemix(request: MurekaRemixRequest) {
    const { data, error } = await supabase.functions.invoke('mureka-create-remix', {
      body: request
    });

    if (error) throw error;
    return data;
  }

  /**
   * 6. GENERATE INSTRUMENTAL - Генерация инструментала
   */
  async generateInstrumental(request: MurekaInstrumentalRequest) {
    const { data, error } = await supabase.functions.invoke('generate-mureka-instrumental', {
      body: request
    });

    if (error) throw error;
    return data;
  }

  /**
   * 7. ADD VOCALS TO INSTRUMENTAL - Добавить вокал к инструменталу
   */
  async addVocalsToInstrumental(instrumentalUrl: string, lyrics: string, vocalStyle?: string) {
    const { data, error } = await supabase.functions.invoke('mureka-add-vocals', {
      body: {
        instrumentalUrl,
        lyrics,
        vocalStyle: vocalStyle || 'auto',
        model: 'V8'
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 8. ADD INSTRUMENTAL TO VOCALS - Добавить инструментал к вокалу
   */
  async addInstrumentalToVocals(vocalUrl: string, style: string, mood?: string) {
    const { data, error } = await supabase.functions.invoke('mureka-add-instrumental', {
      body: {
        vocalUrl,
        style,
        mood,
        model: 'V8'
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 9. GENERATE LYRICS - Генерация текста
   */
  async generateLyrics(prompt: string, style?: string, language?: string) {
    const { data, error } = await supabase.functions.invoke('generate-mureka-lyrics', {
      body: {
        prompt,
        style,
        language: language || 'en'
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 10. MASTER TRACK - Мастеринг трека
   */
  async masterTrack(request: MurekaMasteringRequest) {
    const { data, error } = await supabase.functions.invoke('mureka-master-track', {
      body: request
    });

    if (error) throw error;
    return data;
  }

  /**
   * 11. CHANGE TEMPO - Изменение темпа без изменения высоты
   */
  async changeTempo(trackUrl: string, newTempo: number) {
    const { data, error } = await supabase.functions.invoke('mureka-change-tempo', {
      body: {
        trackUrl,
        targetTempo: newTempo,
        preservePitch: true
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 12. CHANGE KEY - Изменение тональности
   */
  async changeKey(trackUrl: string, semitones: number) {
    const { data, error } = await supabase.functions.invoke('mureka-change-key', {
      body: {
        trackUrl,
        semitones,
        preserveTempo: true
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 13. VOCAL CLONE - Клонирование голоса
   */
  async cloneVocal(referenceVocalUrl: string, targetLyrics: string) {
    const { data, error } = await supabase.functions.invoke('mureka-vocal-clone', {
      body: {
        referenceUrl: referenceVocalUrl,
        lyrics: targetLyrics,
        model: 'V8'
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 14. STYLE TRANSFER - Перенос стиля
   */
  async transferStyle(sourceTrackUrl: string, styleReferenceUrl: string, intensity?: number) {
    const { data, error } = await supabase.functions.invoke('mureka-style-transfer', {
      body: {
        sourceUrl: sourceTrackUrl,
        styleUrl: styleReferenceUrl,
        intensity: intensity || 0.7
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 15. GET STATUS - Получить статус генерации
   */
  async getTaskStatus(taskId: string) {
    const { data, error } = await supabase.functions.invoke('get-mureka-task-status', {
      body: { taskId }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 16. GET CREDITS - Получить баланс
   */
  async getCredits() {
    const { data, error } = await supabase.functions.invoke('check-mureka-status');

    if (error) throw error;
    return data;
  }

  /**
   * 17. BATCH PROCESS - Массовая обработка
   */
  async batchProcess(tasks: any[]) {
    const { data, error } = await supabase.functions.invoke('mureka-batch-process', {
      body: { tasks }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 18. ANALYZE AUDIO - Анализ аудио (BPM, ключ, энергия)
   */
  async analyzeAudio(audioUrl: string) {
    const { data, error } = await supabase.functions.invoke('mureka-analyze-audio', {
      body: { audioUrl }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 19. CREATE VARIATION - Создание вариации
   */
  async createVariation(trackUrl: string, variationType: 'acoustic' | 'electronic' | 'orchestral' | 'lofi' | 'jazz') {
    const { data, error } = await supabase.functions.invoke('mureka-create-variation', {
      body: {
        trackUrl,
        variationType,
        model: 'V8'
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 20. HARMONIZE - Добавление гармонии
   */
  async harmonize(vocalUrl: string, harmonyType: 'thirds' | 'fifths' | 'octaves' | 'full') {
    const { data, error } = await supabase.functions.invoke('mureka-harmonize', {
      body: {
        vocalUrl,
        harmonyType,
        voices: harmonyType === 'full' ? 4 : 2
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 21. GENERATE SOUNDSCAPE - Генерация звукового ландшафта
   */
  async generateSoundscape(environment: string, duration: number, elements?: string[]) {
    const { data, error } = await supabase.functions.invoke('mureka-soundscape', {
      body: {
        environment,
        duration,
        elements: elements || [],
        model: 'V8'
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 22. MIX TRACKS - Микширование треков
   */
  async mixTracks(trackUrls: string[], mixSettings?: any) {
    const { data, error } = await supabase.functions.invoke('mureka-mix-tracks', {
      body: {
        tracks: trackUrls,
        settings: mixSettings || {
          autoBalance: true,
          normalizeVolume: true
        }
      }
    });

    if (error) throw error;
    return data;
  }
}

// Экспортируем singleton instance
export const murekaService = new MurekaCompleteService();