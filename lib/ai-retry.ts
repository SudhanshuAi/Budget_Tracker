export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 2000
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Check for 503 (Service Unavailable) or 429 (Too Many Requests)
    const status = error.status || (error as any).response?.status;
    const isRetryable = status === 503 || status === 429;

    if (isRetryable && retries > 0) {
      console.warn(`AI Service busy (Status ${status}), retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }

    throw error;
  }
}
