/**
 * Complete Suno API Service Implementation
 * Implements ALL Suno API methods including generation, covers, extensions, stems, etc.
 */

import { supabase } from '@/integrations/supabase/client';

export interface SunoGenerateRequest {
  prompt?: string;
  lyrics?: string;
  model?: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'auto';
  instrumental?: boolean;
  customMode?: boolean;
  title?: string;
  tags?: string;
  continueClipId?: string;
  continueAt?: number;
  referenceAudio?: string;
  // Enhanced for API compliance
  inputType?: 'description' | 'lyrics';
  stylePrompt?: string;
  voiceStyle?: string;
  tempo?: string;
  language?: string;
  duration?: number;
}

export interface SunoCoverRequest {
  audioUrl: string;
  prompt: string;
  model?: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS';
  // Enhanced for API compliance
  preserveVocals?: boolean;
  style?: string;
  callbackUrl?: string;
}

export interface SunoExtendRequest {
  audioUrl: string;
  prompt?: string;
  continueAt?: number;
  model?: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS';
}

export interface SunoStemSeparationRequest {
  trackId: string;
  separationType: 'vocals' | 'instrumental' | 'drums' | 'bass' | 'other' | 'all';
}

export interface SunoLyricsRequest {
  prompt: string;
  language?: string;
  style?: string;
  mood?: string;
}

export interface SunoVideoRequest {
  trackId: string;
  visualStyle?: 'abstract' | 'lyrics' | 'performance' | 'nature' | 'urban';
  duration?: number;
}

export interface SunoWAVConversionRequest {
  trackId: string;
  quality?: 'standard' | 'high' | 'lossless';
  sampleRate?: 44100 | 48000 | 96000;
}

export interface SunoStyleBoostRequest {
  content: string;
  enhancementLevel?: 'subtle' | 'moderate' | 'aggressive';
  targetGenre?: string;
}

export class SunoCompleteService {
  private baseUrl = '/api/suno';
  private readonly SUPPORTED_MODELS = ['V3_5', 'V4', 'V4_5', 'V4_5PLUS'] as const;
  private readonly DEFAULT_MODEL = 'V3_5';
  private readonly API_VERSION = 'v1';
  
  /**
   * Validates and normalizes model name according to current API spec
   */
  private normalizeModel(model?: string): string {
    if (!model || model === 'auto') {
      return this.DEFAULT_MODEL;
    }
    
    const normalized = model.toUpperCase().replace(/[.-]/g, '_');
    
    // Handle legacy format conversions
    const modelMapping: Record<string, string> = {
      'V3_5': 'V3_5',
      'V4': 'V4',
      'V4_5': 'V4_5',
      'V4_5PLUS': 'V4_5PLUS',
      'CHIRP_V3_5': 'V3_5',
      'CHIRP_V4': 'V4',
      'CHIRP_V4_5': 'V4_5',
      'CHIRP_BLUEJAY': 'V4_5PLUS'
    };
    
    return modelMapping[normalized] || this.DEFAULT_MODEL;
  }

  /**
   * 1. GENERATE - Основная генерация музыки с улучшенной обработкой ошибок
   */
  async generateMusic(request: SunoGenerateRequest) {
    // Validate and normalize the request
    const normalizedRequest = {
      ...request,
      model: this.normalizeModel(request.model),
      inputType: request.inputType || 'description',
      customMode: request.customMode ?? (request.inputType === 'lyrics')
    };
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-suno-track', {
        body: normalizedRequest
      });

      if (error) {
        console.error('Suno API error:', error);
        throw new Error(`Suno generation failed: ${error.message || error}`);
      }
      
      return data;
    } catch (err: any) {
      console.error('Suno service error:', err);
      throw new Error(`Suno service unavailable: ${err.message || err}`);
    }
  }

  /**
   * 2. COVER - Создание кавера на загруженное аудио
   */
  async createCover(request: SunoCoverRequest) {
    const { data, error } = await supabase.functions.invoke('generate-suno-cover', {
      body: request
    });

    if (error) throw error;
    return data;
  }

  /**
   * 3. EXTEND - Расширение существующего трека
   */
  async extendTrack(request: SunoExtendRequest) {
    const { data, error } = await supabase.functions.invoke('extend-suno-track', {
      body: request
    });

    if (error) throw error;
    return data;
  }

  /**
   * 4. UPLOAD & EXTEND - Загрузка и расширение аудио
   */
  async uploadAndExtend(file: File, prompt: string, continueAt?: number) {
    // Сначала загружаем файл
    const formData = new FormData();
    formData.append('audio', file);
    
    const { data: uploadData, error: uploadError } = await supabase.functions.invoke('upload-extend-suno-track', {
      body: formData
    });

    if (uploadError) throw uploadError;

    // Затем расширяем
    return this.extendTrack({
      audioUrl: uploadData.url,
      prompt,
      continueAt
    });
  }

  /**
   * 5. UPLOAD & COVER - Загрузка и создание кавера
   */
  async uploadAndCover(file: File, prompt: string) {
    // Загружаем файл
    const { data: { path }, error: uploadError } = await supabase.storage
      .from('audio-uploads')
      .upload(`covers/${Date.now()}-${file.name}`, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('audio-uploads')
      .getPublicUrl(path);

    // Создаем кавер
    return this.createCover({
      audioUrl: publicUrl,
      prompt
    });
  }

  /**
   * 6. STEM SEPARATION - Разделение на стемы (вокал, инструментал, etc)
   */
  async separateStems(request: SunoStemSeparationRequest) {
    const { data, error } = await supabase.functions.invoke('separate-suno-vocals', {
      body: request
    });

    if (error) throw error;
    return data;
  }

  /**
   * 7. ADD INSTRUMENTAL - Добавить инструментал к вокалу
   */
  async addInstrumental(vocalUrl: string, style: string) {
    const { data, error } = await supabase.functions.invoke('suno-add-instrumental', {
      body: {
        vocalUrl,
        style,
        mode: 'instrumental'
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 8. ADD VOCALS - Добавить вокал к инструменталу
   */
  async addVocals(instrumentalUrl: string, lyrics: string, voiceStyle?: string) {
    const { data, error } = await supabase.functions.invoke('suno-add-vocals', {
      body: {
        instrumentalUrl,
        lyrics,
        voiceStyle: voiceStyle || 'auto'
      }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 9. GENERATE LYRICS - Генерация текста песни
   */
  async generateLyrics(request: SunoLyricsRequest) {
    const { data, error } = await supabase.functions.invoke('generate-suno-lyrics', {
      body: request
    });

    if (error) throw error;
    return data;
  }

  /**
   * 10. GET TIMESTAMPED LYRICS - Получить текст с таймингами
   */
  async getTimestampedLyrics(trackId: string) {
    const { data, error } = await supabase.functions.invoke('get-suno-timestamped-lyrics', {
      body: { trackId }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 11. CREATE VIDEO - Создание музыкального видео
   */
  async createMusicVideo(request: SunoVideoRequest) {
    const { data, error } = await supabase.functions.invoke('generate-suno-video', {
      body: request
    });

    if (error) throw error;
    return data;
  }

  /**
   * 12. CONVERT TO WAV - Конвертация в WAV формат
   */
  async convertToWAV(request: SunoWAVConversionRequest) {
    const { data, error } = await supabase.functions.invoke('convert-suno-to-wav', {
      body: request
    });

    if (error) throw error;
    return data;
  }

  /**
   * 13. BOOST STYLE - Улучшение стиля/промпта
   */
  async boostStyle(request: SunoStyleBoostRequest) {
    const { data, error } = await supabase.functions.invoke('boost-suno-style', {
      body: request
    });

    if (error) throw error;
    return data;
  }

  /**
   * 14. GET CREDITS - Получить остаток кредитов
   */
  async getCredits() {
    const { data, error } = await supabase.functions.invoke('check-suno-status');

    if (error) throw error;
    return data;
  }

  /**
   * 15. GET GENERATION STATUS - Статус генерации
   */
  async getGenerationStatus(taskId: string) {
    const { data, error } = await supabase.functions.invoke('get-suno-record-info', {
      body: { taskId }
    });

    if (error) throw error;
    return data;
  }

  /**
   * 16. BATCH GENERATE - Массовая генерация
   */
  async batchGenerate(requests: SunoGenerateRequest[]) {
    const promises = requests.map(req => this.generateMusic(req));
    return Promise.allSettled(promises);
  }

  /**
   * 17. REMIX - Создание ремикса
   */
  async createRemix(originalTrackId: string, remixStyle: string) {
    // Получаем оригинальный трек
    const { data: track } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', originalTrackId)
      .single();

    if (!track) throw new Error('Track not found');

    // Создаем ремикс
    return this.generateMusic({
      prompt: `Remix of ${track.title} in ${remixStyle} style`,
      referenceAudio: track.audio_url,
      customMode: true
    });
  }

  /**
   * 18. MASHUP - Создание мэшапа из нескольких треков
   */
  async createMashup(trackIds: string[], style?: string) {
    const { data: tracks } = await supabase
      .from('tracks')
      .select('*')
      .in('id', trackIds);

    if (!tracks || tracks.length < 2) {
      throw new Error('Need at least 2 tracks for mashup');
    }

    return this.generateMusic({
      prompt: `Mashup combining elements from ${tracks.map(t => t.title).join(', ')}`,
      customMode: true,
      tags: style || 'mashup, creative, fusion'
    });
  }

  /**
   * 19. VARIATION - Создание вариации трека
   */
  async createVariation(trackId: string, variationType: 'slower' | 'faster' | 'acoustic' | 'electronic' | 'orchestral') {
    const { data: track } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (!track) throw new Error('Track not found');

    const variationPrompts = {
      slower: 'slower tempo, relaxed version',
      faster: 'faster tempo, energetic version',
      acoustic: 'acoustic, unplugged version',
      electronic: 'electronic, synth-heavy version',
      orchestral: 'orchestral, symphonic arrangement'
    };

    return this.generateMusic({
      prompt: `${track.title} - ${variationPrompts[variationType]}`,
      referenceAudio: track.audio_url,
      customMode: true
    });
  }

  /**
   * 20. ANALYZE TRACK - Анализ трека (BPM, ключ, настроение)
   */
  async analyzeTrack(trackId: string) {
    const { data, error } = await supabase.functions.invoke('analyze-suno-track', {
      body: { trackId }
    });

    if (error) throw error;
    return data;
  }
}

// Экспортируем singleton instance
export const sunoService = new SunoCompleteService();