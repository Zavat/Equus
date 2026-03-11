/**
 * Retry Helper - Utilities for retrying failed operations
 */

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoffMultiplier?: number;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 500, backoffMultiplier = 2 } = options;

  let lastError: Error | undefined;
  let currentDelay = delayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retryable (network/connection errors)
      const errorMessage = lastError.message.toLowerCase();
      const isRetryable =
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('socket') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('econnreset');

      if (!isRetryable) {
        throw lastError;
      }

      // Wait before retrying with exponential backoff
      console.log(
        `⚠️  Retry attempt ${attempt + 1}/${maxRetries} after ${currentDelay}ms (${errorMessage})`
      );
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  throw lastError;
}
