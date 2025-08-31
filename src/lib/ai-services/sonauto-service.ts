/**
 * Sonauto AI Service Implementation
 * Automatic AI-powered music generation with intelligent parameter optimization
 */

import { supabase } from '@/integrations/supabase/client';

export interface SonautoGenerateRequest {
  description: string;
  targetAudience?: 'general' | 'youth' | 'adult' | 'professional' | 'kids';
  mood?: 'happy' | 'sad' | 'energetic' | 'calm' | 'dramatic' | 'mysterious' | 'romantic';
  purpose?: 'background' | 'dance' | 'meditation' | 'workout' | 'focus' | 'party' | 'sleep';
  language?: string;
  duration?: 'short' | 'medium' | 'long' | 'custom';
  customDuration?: number;
  autoOptimize?: boolean;
}

export interface SonautoAnalysisResult {
  detectedGenre: string;
  suggestedTempo: number;
  recommendedInstruments: string[];
  moodAnalysis: {
    primary: string;
    secondary: string[];
    energy: number; // 0-100
    valence: number; // 0-100 (sad to happy)
  };
  styleRecommendations: string[];
  qualitySettings: {
    model: string;
    bitrate: string;
    sampleRate: number;
  };
}

export interface SonautoGenerationResult {
  taskId: string;
  analysis: SonautoAnalysisResult;
  optimizedPrompt: string;
  estimatedQuality: number; // 0-100
  tracks: Array<{
    id: string;
    url?: string;
    title: string;
    duration: number;
    confidence: number; // 0-100
  }>;
}

export class SonautoService {
  private readonly API_ENDPOINT = 'https://api.sonauto.ai/v1';
  
  /**
   * Analyze description and auto-generate optimal parameters
   */
  private async analyzeDescription(description: string, request: SonautoGenerateRequest): Promise<SonautoAnalysisResult> {
    // Genre detection
    const genre = this.detectGenre(description);
    
    // Mood analysis
    const moodAnalysis = this.analyzeMood(description, request.mood);
    
    // Tempo suggestion based on purpose and mood
    const tempo = this.suggestTempo(request.purpose, moodAnalysis.energy);
    
    // Instrument recommendations
    const instruments = this.recommendInstruments(genre, request.purpose);
    
    // Style recommendations
    const styleRecommendations = this.generateStyleTags(genre, moodAnalysis, request.targetAudience);
    
    // Quality settings based on target audience
    const qualitySettings = this.determineQualitySettings(request.targetAudience);
    
    return {
      detectedGenre: genre,
      suggestedTempo: tempo,
      recommendedInstruments: instruments,
      moodAnalysis,
      styleRecommendations,
      qualitySettings
    };
  }
  
  private detectGenre(description: string): string {
    const genres = {
      'pop': ['catchy', 'mainstream', 'radio', 'chart', 'popular'],
      'rock': ['guitar', 'drums', 'rock', 'metal', 'punk', 'grunge'],
      'electronic': ['synth', 'beat', 'edm', 'techno', 'house', 'dubstep', 'electronic'],
      'classical': ['orchestra', 'symphony', 'piano', 'violin', 'classical', 'baroque'],
      'jazz': ['jazz', 'swing', 'blues', 'sax', 'improvisation', 'bebop'],
      'hip-hop': ['rap', 'hip-hop', 'trap', 'beat', 'flow', 'rhyme'],
      'country': ['country', 'folk', 'acoustic', 'banjo', 'fiddle'],
      'r&b': ['soul', 'r&b', 'groove', 'smooth', 'funk'],
      'ambient': ['ambient', 'atmospheric', 'soundscape', 'texture', 'drone'],
      'world': ['ethnic', 'world', 'traditional', 'cultural', 'folk']
    };
    
    const desc = description.toLowerCase();
    let bestMatch = 'pop';
    let maxScore = 0;
    
    for (const [genre, keywords] of Object.entries(genres)) {
      const score = keywords.filter(kw => desc.includes(kw)).length;
      if (score > maxScore) {
        maxScore = score;
        bestMatch = genre;
      }
    }
    
    return bestMatch;
  }
  
  private analyzeMood(description: string, requestedMood?: string): any {
    const moodKeywords = {
      happy: ['happy', 'joy', 'cheerful', 'upbeat', 'positive', 'bright'],
      sad: ['sad', 'melancholy', 'somber', 'blue', 'down', 'grief'],
      energetic: ['energetic', 'powerful', 'intense', 'dynamic', 'explosive'],
      calm: ['calm', 'peaceful', 'relaxing', 'serene', 'tranquil', 'gentle'],
      dramatic: ['dramatic', 'epic', 'cinematic', 'intense', 'emotional'],
      mysterious: ['mysterious', 'enigmatic', 'dark', 'suspense', 'haunting'],
      romantic: ['romantic', 'love', 'passionate', 'intimate', 'tender']
    };
    
    const desc = description.toLowerCase();
    let detectedMood = requestedMood || 'calm';
    let maxScore = 0;
    
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      const score = keywords.filter(kw => desc.includes(kw)).length;
      if (score > maxScore) {
        maxScore = score;
        detectedMood = mood;
      }
    }
    
    // Calculate energy and valence
    const energyMoods = { energetic: 90, dramatic: 75, happy: 70, mysterious: 40, calm: 20, sad: 30, romantic: 35 };
    const valenceMoods = { happy: 90, romantic: 75, energetic: 70, calm: 60, mysterious: 40, dramatic: 50, sad: 20 };
    
    return {
      primary: detectedMood,
      secondary: [],
      energy: energyMoods[detectedMood as keyof typeof energyMoods] || 50,
      valence: valenceMoods[detectedMood as keyof typeof valenceMoods] || 50
    };
  }
  
  private suggestTempo(purpose?: string, energy?: number): number {
    const purposeTempos = {
      dance: 120 + Math.random() * 20,
      workout: 130 + Math.random() * 20,
      party: 125 + Math.random() * 15,
      meditation: 60 + Math.random() * 20,
      sleep: 50 + Math.random() * 20,
      focus: 70 + Math.random() * 20,
      background: 85 + Math.random() * 25
    };
    
    if (purpose && purposeTempos[purpose as keyof typeof purposeTempos]) {
      return Math.round(purposeTempos[purpose as keyof typeof purposeTempos]);
    }
    
    // Use energy level to determine tempo
    const baseTempo = 60 + (energy || 50) * 1.4;
    return Math.round(baseTempo);
  }
  
  private recommendInstruments(genre: string, purpose?: string): string[] {
    const genreInstruments: Record<string, string[]> = {
      'pop': ['synth', 'piano', 'guitar', 'drums', 'bass'],
      'rock': ['electric guitar', 'bass', 'drums', 'vocals'],
      'electronic': ['synthesizer', 'drum machine', 'sampler', 'effects'],
      'classical': ['strings', 'piano', 'woodwinds', 'brass'],
      'jazz': ['saxophone', 'piano', 'double bass', 'drums', 'trumpet'],
      'hip-hop': ['drums', 'bass', '808', 'samples', 'synthesizer'],
      'country': ['acoustic guitar', 'fiddle', 'banjo', 'harmonica'],
      'r&b': ['piano', 'bass', 'drums', 'strings', 'vocals'],
      'ambient': ['pads', 'textures', 'field recordings', 'synthesizer'],
      'world': ['percussion', 'ethnic instruments', 'vocals']
    };
    
    return genreInstruments[genre] || ['piano', 'strings', 'drums'];
  }
  
  private generateStyleTags(genre: string, moodAnalysis: any, audience?: string): string[] {
    const tags = [genre];
    
    // Add mood tags
    tags.push(moodAnalysis.primary);
    
    // Add energy descriptors
    if (moodAnalysis.energy > 70) tags.push('high-energy');
    else if (moodAnalysis.energy < 30) tags.push('low-energy');
    else tags.push('medium-energy');
    
    // Add audience-specific tags
    if (audience === 'professional') tags.push('sophisticated', 'polished');
    if (audience === 'youth') tags.push('trendy', 'modern');
    if (audience === 'kids') tags.push('playful', 'simple');
    
    return tags;
  }
  
  private determineQualitySettings(audience?: string): any {
    const settings = {
      general: { model: 'V4', bitrate: '256k', sampleRate: 44100 },
      professional: { model: 'V4_5PLUS', bitrate: '320k', sampleRate: 48000 },
      youth: { model: 'V4', bitrate: '256k', sampleRate: 44100 },
      adult: { model: 'V4_5', bitrate: '320k', sampleRate: 44100 },
      kids: { model: 'V3_5', bitrate: '192k', sampleRate: 44100 }
    };
    
    return settings[audience as keyof typeof settings] || settings.general;
  }
  
  private generateOptimizedPrompt(description: string, analysis: SonautoAnalysisResult): string {
    const parts = [
      description,
      `${analysis.detectedGenre} style`,
      `${Math.round(analysis.suggestedTempo)} BPM`,
      `Instruments: ${analysis.recommendedInstruments.slice(0, 3).join(', ')}`,
      `Mood: ${analysis.moodAnalysis.primary}`,
      `Tags: ${analysis.styleRecommendations.join(', ')}`
    ];
    
    return parts.filter(Boolean).join(', ');
  }
  
  /**
   * Main generation method with auto-optimization
   */
  async generate(request: SonautoGenerateRequest): Promise<SonautoGenerationResult> {
    // Analyze the description
    const analysis = await this.analyzeDescription(request.description, request);
    
    // Generate optimized prompt
    const optimizedPrompt = this.generateOptimizedPrompt(request.description, analysis);
    
    // Determine duration
    const durationMap = {
      short: 30,
      medium: 60,
      long: 180,
      custom: request.customDuration || 60
    };
    const duration = durationMap[request.duration || 'medium'];
    
    // Call the actual generation API (using Suno as backend)
    const { data, error } = await supabase.functions.invoke('sonauto-generate', {
      body: {
        prompt: optimizedPrompt,
        analysis,
        duration,
        model: analysis.qualitySettings.model,
        autoMode: true
      }
    });
    
    if (error) throw error;
    
    return {
      taskId: data.taskId,
      analysis,
      optimizedPrompt,
      estimatedQuality: this.estimateQuality(analysis),
      tracks: data.tracks || []
    };
  }
  
  private estimateQuality(analysis: SonautoAnalysisResult): number {
    let quality = 70; // Base quality
    
    // Model quality boost
    if (analysis.qualitySettings.model === 'V4_5PLUS') quality += 20;
    else if (analysis.qualitySettings.model === 'V4_5') quality += 15;
    else if (analysis.qualitySettings.model === 'V4') quality += 10;
    
    // Style clarity boost
    if (analysis.styleRecommendations.length > 3) quality += 5;
    
    // Instrument variety
    if (analysis.recommendedInstruments.length > 4) quality += 5;
    
    return Math.min(100, quality);
  }
  
  /**
   * Get generation status
   */
  async getStatus(taskId: string) {
    const { data, error } = await supabase.functions.invoke('sonauto-status', {
      body: { taskId }
    });
    
    if (error) throw error;
    return data;
  }
  
  /**
   * Generate with learning from previous generations
   */
  async generateWithLearning(request: SonautoGenerateRequest) {
    // Get user's previous successful generations
    const { data: previousGenerations } = await supabase
      .from('ai_generations')
      .select('metadata')
      .eq('service', 'sonauto')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Learn from previous preferences
    if (previousGenerations && previousGenerations.length > 0) {
      // Analyze patterns in previous generations
      // Adjust parameters based on learned preferences
      // This is a placeholder for ML-based optimization
    }
    
    return this.generate(request);
  }
}

// Export singleton instance
export const sonautoService = new SonautoService();