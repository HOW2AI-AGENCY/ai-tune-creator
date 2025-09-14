/**
 * Simplified Generation Hook
 * Clean, minimal implementation for AI music generation
 */

import { useState, useCallback } from 'react';
import { useUnifiedGeneration } from './useUnifiedGeneration';
import { convertGenerationParams } from '@/lib/ai-services/types/generation-converter';
import type { GenerationParams } from '@/features/ai-generation/types';

export function useSimpleGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<any>(null);
  
  const { generateTrack: generateUnified, activeGenerations, ...rest } = useUnifiedGeneration();

  // Simple wrapper to handle old GenerationParams format
  const generateTrack = useCallback(async (params: GenerationParams) => {
    setIsGenerating(true);
    try {
      const canonicalInput = convertGenerationParams(params);
      const generationId = await generateUnified(canonicalInput);
      
      // Monitor progress of this specific generation
      const generation = activeGenerations.get(generationId);
      setCurrentProgress(generation);
      
      return { success: true, generationId };
    } catch (error) {
      console.error('Generation failed:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [generateUnified, activeGenerations]);

  // Get current generation progress for UI compatibility
  const generationProgress = currentProgress ? {
    title: currentProgress.title,
    subtitle: currentProgress.subtitle,
    progress: currentProgress.overallProgress,
    steps: currentProgress.steps.map((step: any) => ({
      id: step.id,
      label: step.label,
      status: step.status === 'pending' ? 'pending' : 
              step.status === 'running' ? 'running' :
              step.status === 'done' ? 'done' : 'error'
    }))
  } : null;

  return {
    generateTrack,
    isGenerating,
    generationProgress,
    activeGenerations,
    ...rest
  };
}