import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';

const MAX_RETRIES = 2;

/** A 4xx will not fix itself on retry; 5xx and network errors (status 0) might. */
function shouldRetry(failureCount: number, error: Error): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < MAX_RETRIES;
}

// refetchOnWindowFocus stays at its default (true): the editor's early warning relies on it.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: shouldRetry } },
});
