/**
 * Simplified Canonical Types for AI Generation
 * Simplified from complex types to basic essentials
 */

export interface CanonicalGenerationInput {
  service: 'suno' | 'mureka';
  inputType: 'description' | 'lyrics';
  description: string;
  lyrics?: string;
  tags: string[];
  mode: 'quick' | 'custom';
  flags: {
    instrumental: boolean;
    language: string;
    voiceStyle?: string;
    tempo?: string;
    duration?: number;
    model?: string;
  };
  context: {
    projectId?: string | null;
    artistId?: string | null;
    useInbox?: boolean;
  };
}

export type UnifiedTaskStatus = 'pending' | 'queued' | 'generating' | 'completed' | 'failed' | 'timeout' | 'cancelled' | 'processing' | 'initializing' | 'finalizing';

export interface UnifiedProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  progress?: number;
  eta?: number;
}

export interface UnifiedTaskProgress {
  taskId: string;
  generationId: string;
  service: 'suno' | 'mureka';
  status: UnifiedTaskStatus;
  overallProgress: number;
  steps: UnifiedProgressStep[];
  title: string;
  subtitle?: string;
  estimatedCompletion?: Date;
  metadata?: {
    input?: CanonicalGenerationInput;
    [key: string]: any;
  };
}

// Simplified standard steps
export const STANDARD_STEPS = {
  validate: { id: 'validate', label: 'Проверка параметров', status: 'pending' as const },
  queue: { id: 'queue', label: 'Добавление в очередь', status: 'pending' as const },
  generate: { id: 'generate', label: 'Генерация музыки', status: 'pending' as const },
  process: { id: 'process', label: 'Обработка результата', status: 'pending' as const },
  save: { id: 'save', label: 'Сохранение', status: 'pending' as const }
};

export interface StandardError {
  type: 'network' | 'auth' | 'quota' | 'validation' | 'unknown';
  message: string;
  details?: string;
}

export function createStandardError(type: StandardError['type'], message: string, details?: string): StandardError {
  return { type, message, details };
}