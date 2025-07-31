import { useState, useEffect, useRef } from 'react';

interface UseAutoSaveOptions {
  enabled: boolean;
  delay: number; // milliseconds
  onSave: (data: any) => Promise<any>;
  onSuccess?: (savedData: any) => void;
  onError?: (error: Error) => void;
}

interface AutoSaveStatus {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSave: Date | null;
  error: string | null;
}

export const useAutoSave = (
  data: any,
  options: UseAutoSaveOptions
): AutoSaveStatus => {
  const [status, setStatus] = useState<AutoSaveStatus>({
    status: 'idle',
    lastSave: null,
    error: null
  });

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const previousDataRef = useRef<string>();

  useEffect(() => {
    if (!options.enabled || !data) return;

    // Serialize data to compare changes
    const currentDataString = JSON.stringify(data);
    
    // Skip if data hasn't changed
    if (previousDataRef.current === currentDataString) {
      return;
    }
    
    previousDataRef.current = currentDataString;

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeoutRef.current = setTimeout(async () => {
      try {
        setStatus(prev => ({ ...prev, status: 'saving', error: null }));
        
        const savedData = await options.onSave(data);
        
        setStatus({
          status: 'saved',
          lastSave: new Date(),
          error: null
        });
        
        options.onSuccess?.(savedData);
        
        // Reset to idle after showing saved status
        setTimeout(() => {
          setStatus(prev => ({ ...prev, status: 'idle' }));
        }, 2000);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Auto-save failed';
        
        setStatus({
          status: 'error',
          lastSave: null,
          error: errorMessage
        });
        
        options.onError?.(error as Error);
        
        // Reset to idle after showing error
        setTimeout(() => {
          setStatus(prev => ({ ...prev, status: 'idle' }));
        }, 3000);
      }
    }, options.delay);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [data, options]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  return status;
}; 