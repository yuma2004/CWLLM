export const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback
