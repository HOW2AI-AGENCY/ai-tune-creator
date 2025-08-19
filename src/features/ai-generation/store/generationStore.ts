/**
 * Unified Generation Store
 * 
 * Centralized store for AI generation state using React Context + useReducer
 * Replaces scattered Map/Refs with single source of truth
 */

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { eventBus } from '@/lib/events/event-bus';
import { 
  UnifiedTaskProgress, 
  UnifiedTaskStatus,
  STANDARD_STEPS,
  StandardError,
  createStandardError 
} from '../types/canonical';

// State interface
interface GenerationState {
  activeGenerations: Map<string, UnifiedTaskProgress>;
  error: StandardError | null;
}

// Action types
type GenerationAction =
  | { type: 'START_GENERATION'; payload: { generationId: string; taskId: string; service: 'suno' | 'mureka'; input: any } }
  | { type: 'UPDATE_PROGRESS'; payload: { generationId: string; update: Partial<UnifiedTaskProgress> } }
  | { type: 'UPDATE_STEP'; payload: { generationId: string; stepId: string; update: { status?: 'pending' | 'running' | 'done' | 'error'; progress?: number; eta?: number } } }
  | { type: 'COMPLETE_GENERATION'; payload: { generationId: string } }
  | { type: 'FAIL_GENERATION'; payload: { generationId: string; error?: string } }
  | { type: 'CANCEL_GENERATION'; payload: { generationId: string } }
  | { type: 'CLEAR_COMPLETED' }
  | { type: 'SET_ERROR'; payload: StandardError | null }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: GenerationState = {
  activeGenerations: new Map(),
  error: null
};

// Reducer
function generationReducer(state: GenerationState, action: GenerationAction): GenerationState {
  switch (action.type) {
    case 'START_GENERATION': {
      const { generationId, taskId, service, input } = action.payload;
      const newGeneration: UnifiedTaskProgress = {
        taskId,
        generationId,
        service,
        status: 'pending',
        overallProgress: 0,
        steps: Object.values(STANDARD_STEPS).map(step => ({ ...step })),
        title: `Генерация ${service === 'suno' ? 'Suno AI' : 'Mureka'}`,
        subtitle: input.description?.slice(0, 60) + (input.description?.length > 60 ? '...' : '') || 'AI generation',
        metadata: { input }
      };
      
      const newMap = new Map(state.activeGenerations);
      newMap.set(generationId, newGeneration);
      
      // Emit event
      eventBus.emit('generation-started', { generationId, service, input });
      
      return {
        ...state,
        activeGenerations: newMap
      };
    }

    case 'UPDATE_PROGRESS': {
      const { generationId, update } = action.payload;
      const newMap = new Map(state.activeGenerations);
      const current = newMap.get(generationId);
      
      if (current) {
        newMap.set(generationId, { ...current, ...update });
      }
      
      return {
        ...state,
        activeGenerations: newMap
      };
    }

    case 'UPDATE_STEP': {
      const { generationId, stepId, update } = action.payload;
      const newMap = new Map(state.activeGenerations);
      const current = newMap.get(generationId);
      
      if (current) {
        const updatedSteps = current.steps.map(step => 
          step.id === stepId ? { ...step, ...update } : step
        );
        newMap.set(generationId, { ...current, steps: updatedSteps });
      }
      
      return {
        ...state,
        activeGenerations: newMap
      };
    }

    case 'COMPLETE_GENERATION': {
      const { generationId } = action.payload;
      const newMap = new Map(state.activeGenerations);
      const current = newMap.get(generationId);
      
      if (current) {
        const completedGeneration = {
          ...current,
          status: 'completed' as UnifiedTaskStatus,
          overallProgress: 100,
          steps: current.steps.map(step => ({ ...step, status: 'done' as const, progress: 100 }))
        };
        newMap.set(generationId, completedGeneration);
        
        // Emit completion event
        eventBus.emit('generation-completed', { 
          generationId, 
          service: current.service, 
          input: current.metadata?.input 
        });
        
        // Emit tracks updated event
        eventBus.emit('tracks-updated');
      }
      
      return {
        ...state,
        activeGenerations: newMap
      };
    }

    case 'FAIL_GENERATION': {
      const { generationId, error } = action.payload;
      const newMap = new Map(state.activeGenerations);
      const current = newMap.get(generationId);
      
      if (current) {
        const failedGeneration = {
          ...current,
          status: 'failed' as UnifiedTaskStatus,
          error: error || 'Generation failed'
        };
        newMap.set(generationId, failedGeneration);
        
        // Emit failure event
        eventBus.emit('generation-failed', { 
          generationId, 
          service: current.service, 
          error: error || 'Unknown error',
          input: current.metadata?.input 
        });
      }
      
      return {
        ...state,
        activeGenerations: newMap
      };
    }

    case 'CANCEL_GENERATION': {
      const { generationId } = action.payload;
      const newMap = new Map(state.activeGenerations);
      const current = newMap.get(generationId);
      
      if (current) {
        newMap.set(generationId, { ...current, status: 'cancelled' });
      }
      
      return {
        ...state,
        activeGenerations: newMap
      };
    }

    case 'CLEAR_COMPLETED': {
      const newMap = new Map(state.activeGenerations);
      for (const [id, generation] of newMap.entries()) {
        if (generation.status === 'completed' || generation.status === 'failed' || generation.status === 'cancelled') {
          newMap.delete(id);
        }
      }
      
      return {
        ...state,
        activeGenerations: newMap
      };
    }

    case 'SET_ERROR': {
      return {
        ...state,
        error: action.payload
      };
    }

    case 'CLEAR_ERROR': {
      return {
        ...state,
        error: null
      };
    }

    default:
      return state;
  }
}

// Context
interface GenerationContextType {
  state: GenerationState;
  startGeneration: (generationId: string, taskId: string, service: 'suno' | 'mureka', input: any) => void;
  updateProgress: (generationId: string, update: Partial<UnifiedTaskProgress>) => void;
  updateStep: (generationId: string, stepId: string, update: { status?: 'pending' | 'running' | 'done' | 'error'; progress?: number; eta?: number }) => void;
  completeGeneration: (generationId: string) => void;
  failGeneration: (generationId: string, error?: string) => void;
  cancelGeneration: (generationId: string) => void;
  clearCompleted: () => void;
  setError: (error: StandardError | null) => void;
  clearError: () => void;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

// Provider component
interface GenerationProviderProps {
  children: ReactNode;
}

export function GenerationProvider({ children }: GenerationProviderProps) {
  const [state, dispatch] = useReducer(generationReducer, initialState);

  const startGeneration = useCallback((generationId: string, taskId: string, service: 'suno' | 'mureka', input: any) => {
    dispatch({ type: 'START_GENERATION', payload: { generationId, taskId, service, input } });
  }, []);

  const updateProgress = useCallback((generationId: string, update: Partial<UnifiedTaskProgress>) => {
    dispatch({ type: 'UPDATE_PROGRESS', payload: { generationId, update } });
  }, []);

  const updateStep = useCallback((generationId: string, stepId: string, update: { status?: 'pending' | 'running' | 'done' | 'error'; progress?: number; eta?: number }) => {
    dispatch({ type: 'UPDATE_STEP', payload: { generationId, stepId, update } });
  }, []);

  const completeGeneration = useCallback((generationId: string) => {
    dispatch({ type: 'COMPLETE_GENERATION', payload: { generationId } });
  }, []);

  const failGeneration = useCallback((generationId: string, error?: string) => {
    dispatch({ type: 'FAIL_GENERATION', payload: { generationId, error } });
  }, []);

  const cancelGeneration = useCallback((generationId: string) => {
    dispatch({ type: 'CANCEL_GENERATION', payload: { generationId } });
  }, []);

  const clearCompleted = useCallback(() => {
    dispatch({ type: 'CLEAR_COMPLETED' });
  }, []);

  const setError = useCallback((error: StandardError | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value: GenerationContextType = {
    state,
    startGeneration,
    updateProgress,
    updateStep,
    completeGeneration,
    failGeneration,
    cancelGeneration,
    clearCompleted,
    setError,
    clearError
  };

  return (
    <GenerationContext.Provider value={value}>
      {children}
    </GenerationContext.Provider>
  );
}

// Hook to use the context
export function useGenerationStore() {
  const context = useContext(GenerationContext);
  if (context === undefined) {
    throw new Error('useGenerationStore must be used within a GenerationProvider');
  }
  return context;
}