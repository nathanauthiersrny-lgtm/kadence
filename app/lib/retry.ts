export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    attempts = 3,
    baseDelay = 1000,
    onRetry,
  }: {
    attempts?: number;
    baseDelay?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isUserRejection =
        err instanceof Error && /reject|denied|cancel/i.test(err.message);
      if (isUserRejection || i === attempts - 1) throw err;
      onRetry?.(i + 1, err);
      await new Promise((r) => setTimeout(r, baseDelay * 2 ** i));
    }
  }
  throw lastError;
}
