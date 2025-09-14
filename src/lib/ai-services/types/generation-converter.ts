/**
 * Simple converter from old GenerationParams to new CanonicalGenerationInput
 * Simplifies the transition to unified generation
 */

import { CanonicalGenerationInput } from '@/features/ai-generation/types/canonical';
import type { GenerationParams } from '@/features/ai-generation/types';

export function convertGenerationParams(params: any): CanonicalGenerationInput {
  return {
    service: params.service,
    inputType: params.inputType || 'description',
    description: params.prompt,
    lyrics: params.lyrics || params.customLyrics || '',
    tags: params.genreTags || params.tags || [],
    mode: params.mode || 'quick',
    flags: {
      instrumental: params.instrumental || false,
      language: params.language || 'ru',
      voiceStyle: params.voiceStyle || '',
      tempo: params.tempo || '',
      duration: params.duration || 120,
      model: params.model || 'auto'
    },
    context: {
      projectId: params.projectId || null,
      artistId: params.artistId || null,
      useInbox: params.useInbox || !params.projectId
    }
  };
}