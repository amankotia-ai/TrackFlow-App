/**
 * Utility functions for adding timeouts to promises to prevent hanging operations
 */

export class TimeoutError extends Error {
  constructor(message: string, public timeoutMs: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a timeout
 */
export function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number, 
  errorMessage?: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new TimeoutError(
          errorMessage || `Operation timed out after ${timeoutMs}ms`,
          timeoutMs
        ));
      }, timeoutMs);
      
      // Clean up timeout if promise resolves first
      promise.finally(() => clearTimeout(timeoutId));
    })
  ]);
}

/**
 * Creates a timeout promise that can be cancelled
 */
export function createCancellableTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): { promise: Promise<T>; cancel: () => void } {
  let timeoutId: NodeJS.Timeout;
  let isCancelled = false;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      if (!isCancelled) {
        reject(new TimeoutError(
          errorMessage || `Operation timed out after ${timeoutMs}ms`,
          timeoutMs
        ));
      }
    }, timeoutMs);
  });
  
  const wrappedPromise = Promise.race([promise, timeoutPromise])
    .finally(() => {
      clearTimeout(timeoutId);
    });
    
  return {
    promise: wrappedPromise,
    cancel: () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    }
  };
}

/**
 * Wraps fetch with timeout and abort controller
 */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 10000, ...fetchOptions } = init;
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);
  
  return fetch(input, {
    ...fetchOptions,
    signal: controller.signal
  }).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Safe async operation wrapper that handles cleanup
 */
export function safeAsyncOperation<T>(
  operation: () => Promise<T>,
  cleanup?: () => void,
  timeoutMs: number = 15000
): Promise<T> {
  return withTimeout(
    operation().finally(() => {
      if (cleanup) {
        cleanup();
      }
    }),
    timeoutMs,
    'Async operation timed out'
  );
} 