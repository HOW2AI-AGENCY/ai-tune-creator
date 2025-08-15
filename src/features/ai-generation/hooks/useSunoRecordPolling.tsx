import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseSunoStatusPollingProps {
  taskId?: string;
  enabled?: boolean;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
  pollInterval?: number;
  maxRetries?: number;
}

interface SunoRecordInfo {
  taskId: string;
  parentMusicId?: string;
  status: string;
  type: string;
  operationType: string;
  errorCode?: number;
  errorMessage?: string;
  parameters?: any;
  tracks: any[];
  isCompleted: boolean;
  isFailed: boolean;
  isPending: boolean;
}

export function useSunoRecordPolling({
  taskId,
  enabled = false,
  onComplete,
  onError,
  pollInterval = 10000, // 10 seconds
  maxRetries = 60 // 10 minutes max
}: UseSunoStatusPollingProps) {
  const [data, setData] = useState<SunoRecordInfo | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const { toast } = useToast();

  const checkRecordInfo = useCallback(async (id: string): Promise<SunoRecordInfo | null> => {
    try {
      console.log('Checking Suno record info for task:', id);
      
      const { data: result, error } = await supabase.functions.invoke('get-suno-record-info', {
        body: { taskId: id },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        console.error('Error calling get-suno-record-info:', error);
        throw new Error(error.message || 'Failed to get record info');
      }

      console.log('Suno record info result:', result);
      
      const recordData = result as SunoRecordInfo;
      setData(recordData);
      setError(null);

      // Check if completed
      if (recordData.isCompleted) {
        console.log('Task completed successfully:', recordData);
        setIsPolling(false);
        setRetryCount(0);
        
        toast({
          title: "Extension Completed",
          description: `Your track extension has been completed successfully!`,
        });
        
        onComplete?.(recordData);
        return recordData;
      }

      // Check if failed
      if (recordData.isFailed) {
        console.log('Task failed:', recordData);
        setIsPolling(false);
        setRetryCount(0);
        
        const errorMsg = recordData.errorMessage || 'Track extension failed';
        setError(errorMsg);
        
        toast({
          title: "Extension Failed",
          description: errorMsg,
          variant: "destructive"
        });
        
        onError?.(errorMsg);
        return recordData;
      }

      // Still pending
      console.log('Task still pending:', recordData.status);
      return recordData;

    } catch (err) {
      console.error('Error checking record info:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      
      if (retryCount >= maxRetries) {
        setIsPolling(false);
        setRetryCount(0);
        
        toast({
          title: "Polling Timeout",
          description: "Failed to get status after maximum retries",
          variant: "destructive"
        });
        
        onError?.(errorMessage);
      }
      
      return null;
    }
  }, [onComplete, onError, retryCount, maxRetries, toast]);

  const startPolling = useCallback((id: string) => {
    if (!id || isPolling) return;
    
    console.log('Starting polling for task:', id);
    setIsPolling(true);
    setError(null);
    setRetryCount(0);
    setData(null);

    const poll = async () => {
      if (retryCount >= maxRetries) {
        setIsPolling(false);
        toast({
          title: "Polling Timeout",
          description: "Maximum polling time exceeded (10 minutes)",
          variant: "destructive"
        });
        return;
      }

      const result = await checkRecordInfo(id);
      
      if (result && (result.isCompleted || result.isFailed)) {
        return; // Polling stopped in checkRecordInfo
      }

      setRetryCount(prev => prev + 1);
      
      // Continue polling if still pending
      if (isPolling && !result?.isCompleted && !result?.isFailed) {
        setTimeout(poll, pollInterval);
      }
    };

    poll();
  }, [checkRecordInfo, isPolling, retryCount, maxRetries, pollInterval, toast]);

  const stopPolling = useCallback(() => {
    console.log('Stopping polling');
    setIsPolling(false);
    setRetryCount(0);
  }, []);

  // Auto-start polling when enabled and taskId is provided
  React.useEffect(() => {
    if (enabled && taskId && !isPolling) {
      startPolling(taskId);
    }
    
    return () => {
      if (isPolling) {
        stopPolling();
      }
    };
  }, [enabled, taskId, startPolling, stopPolling, isPolling]);

  return {
    data,
    isPolling,
    error,
    checkRecordInfo,
    startPolling,
    stopPolling,
    retryCount,
    maxRetries
  };
}