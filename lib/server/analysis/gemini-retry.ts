import { MAX_RETRIES, BASE_DELAY_MS } from "@/server/analysis/constants";

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("429") || msg.includes("rate limit") || msg.includes("quota exceeded") || msg.includes("resource_exhausted");
  }
  return false;
}

function getRetryDelay(attempt: number, error: unknown): number {
  if (error instanceof Error && error.message.includes("429")) {
    return BASE_DELAY_MS * Math.pow(2, attempt) * 2;
  }
  return BASE_DELAY_MS * Math.pow(2, attempt);
}

export async function withRetry<T>(operation: () => Promise<T>, context: string): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableError(error) || attempt === MAX_RETRIES - 1) {
        throw error;
      }
      const delay = getRetryDelay(attempt, error);
      console.warn(`${context} rate limited (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`${context} failed after ${MAX_RETRIES} retries`);
}
