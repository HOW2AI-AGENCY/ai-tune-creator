/**
 * Canonical AI Generation Types
 * 
 * Unified data model for all AI music generation providers
 * This standardizes the chaos between Suno and Mureka terminology
 */

// ============================================
// CANONICAL INPUT MODEL
// ============================================

/**
 * Standardized input for any AI music generation service
 * This replaces the confusing mix of prompt/stylePrompt/customLyrics
 */
export interface CanonicalGenerationInput {
  // Content (what to generate)
  description: string;        // Main description (was prompt/stylePrompt)
  lyrics?: string;           // Custom lyrics if provided
  tags: string[];           // Genre, mood, style tags
  
  // Generation flags
  flags: {
    instrumental: boolean;   // No vocals
    language: string;       // Primary language
    voiceStyle?: string;    // Vocal style preference
    tempo?: string;         // Tempo preference
    duration?: number;      // Duration in seconds
  };
  
  // Mode and context
  mode: 'quick' | 'custom'; // Generation complexity
  inputType: 'description' | 'lyrics'; // What user provided
  
  // Project context
  context: {
    projectId?: string;
    artistId?: string;
    useInbox: boolean;
  };
  
  // Service selection
  service: 'suno' | 'mureka';
}

// ============================================
// PROVIDER MAPPING
// ============================================

/**
 * Maps canonical input to provider-specific formats
 */
export interface ProviderMappingRules {
  suno: {
    prompt: 'description' | 'lyrics';      // What goes to main prompt
    style: 'description' | 'tags';        // What goes to style field
    customMode: boolean;                   // Use custom mode flag
    lyrics: 'lyrics' | null;             // Custom lyrics field
  };
  mureka: {
    prompt: 'description' | 'tags';       // What goes to main prompt
    lyrics: 'lyrics' | 'description';     // What goes to lyrics field
    model: 'auto' | string;               // Model selection
  };
}

// ============================================
// UNIFIED PROGRESS TRACKING
// ============================================

/**
 * Standardized status progression for all providers
 */
export type UnifiedTaskStatus = 
  | 'pending'      // Task created, not yet started
  | 'queued'       // In provider's queue
  | 'initializing' // Starting generation
  | 'generating'   // Actively generating
  | 'processing'   // Post-processing audio
  | 'finalizing'   // Creating final track
  | 'completed'    // Success
  | 'failed'       // Error
  | 'timeout'      // Took too long
  | 'cancelled';   // User cancelled

/**
 * Standardized progress step definitions
 */
export interface UnifiedProgressStep {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'running' | 'done' | 'error';
  progress?: number; // 0-100 for individual step
  eta?: number;      // Estimated seconds remaining
}

/**
 * Complete task progress state
 */
export interface UnifiedTaskProgress {
  taskId: string;
  generationId: string;
  service: 'suno' | 'mureka';
  status: UnifiedTaskStatus;
  overallProgress: number; // 0-100
  estimatedCompletion?: Date;
  steps: UnifiedProgressStep[];
  title: string;
  subtitle?: string;
  metadata?: Record<string, any>;
}

// ============================================
// STATUS MAPPING
// ============================================

/**
 * Maps provider statuses to unified statuses
 */
export const STATUS_MAPPING = {
  suno: {
    'pending': 'queued',
    'processing': 'generating',
    'complete': 'completed',
    'error': 'failed'
  },
  mureka: {
    'queued': 'queued',
    'running': 'generating',
    'succeeded': 'completed',
    'failed': 'failed'
  }
} as const;

// ============================================
// STEP DEFINITIONS
// ============================================

/**
 * Standard step progression for all providers
 */
export const STANDARD_STEPS: Record<string, UnifiedProgressStep> = {
  validate: {
    id: 'validate',
    label: 'Валидация параметров',
    description: 'Проверка входных данных',
    status: 'pending'
  },
  queue: {
    id: 'queue',
    label: 'Отправка в очередь',
    description: 'Размещение задачи в очереди AI сервиса',
    status: 'pending'
  },
  generate: {
    id: 'generate',
    label: 'Генерация музыки',
    description: 'Создание аудио с помощью ИИ',
    status: 'pending'
  },
  process: {
    id: 'process',
    label: 'Обработка результата',
    description: 'Финализация и оптимизация трека',
    status: 'pending'
  },
  save: {
    id: 'save',
    label: 'Сохранение',
    description: 'Создание записи в библиотеке',
    status: 'pending'
  }
};

// ============================================
// PROVIDER ADAPTERS
// ============================================

/**
 * Convert canonical input to Suno format
 */
export function mapToSunoRequest(input: CanonicalGenerationInput) {
  const isLyricsMode = input.inputType === 'lyrics';
  
  return {
    prompt: isLyricsMode ? input.description : input.description,
    style: input.tags.join(', '),
    title: `AI Generated Track ${new Date().toLocaleDateString('ru-RU')}`,
    tags: input.tags.join(', '),
    make_instrumental: input.flags.instrumental,
    wait_audio: false,
    model: 'chirp-v3-5',
    mode: input.mode,
    custom_lyrics: isLyricsMode ? input.lyrics || input.description : '',
    voice_style: input.flags.voiceStyle || '',
    language: input.flags.language,
    tempo: input.flags.tempo || '',
    trackId: null,
    projectId: input.context.projectId || null,
    artistId: input.context.artistId || null,
    useInbox: input.context.useInbox
  };
}

/**
 * Convert canonical input to Mureka format  
 */
export function mapToMurekaRequest(input: CanonicalGenerationInput) {
  const isLyricsMode = input.inputType === 'lyrics';
  
  return {
    prompt: input.description,
    lyrics: isLyricsMode ? (input.lyrics || input.description) : '',
    custom_lyrics: isLyricsMode ? (input.lyrics || input.description) : '',
    style: input.tags.join(', '),
    duration: input.flags.duration || 120,
    genre: input.tags[0] || 'electronic',
    mood: input.tags[1] || 'energetic', 
    tempo: input.flags.tempo || 'medium',
    instrumental: input.flags.instrumental,
    language: input.flags.language,
    projectId: input.context.projectId || null,
    artistId: input.context.artistId || null,
    title: `AI Generated Track ${new Date().toLocaleDateString('ru-RU')}`
  };
}

// ============================================
// ERROR HANDLING
// ============================================

export interface StandardError {
  type: 'validation' | 'network' | 'api' | 'timeout' | 'unknown';
  code?: string;
  message: string;
  details?: string;
  retryable: boolean;
  provider?: 'suno' | 'mureka';
}

export function createStandardError(
  type: StandardError['type'],
  message: string,
  details?: string,
  code?: string,
  provider?: 'suno' | 'mureka'
): StandardError {
  return {
    type,
    message,
    details,
    code,
    retryable: type === 'network' || type === 'timeout',
    provider
  };
}