export class RetryExhaustedError extends Error {
  readonly attempts: number
  readonly lastError: unknown

  constructor(message: string, attempts: number, lastError: unknown) {
    super(message)
    this.name = 'RetryExhaustedError'
    this.attempts = attempts
    this.lastError = lastError
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    delayMs?: number
    shouldRetry?: (error: unknown) => boolean
  } = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3
  const delayMs = options.delayMs ?? 800
  const shouldRetry = options.shouldRetry ?? (() => true)

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt >= maxAttempts || !shouldRetry(error)) {
        break
      }
      await new Promise((r) => setTimeout(r, delayMs * attempt))
    }
  }

  const msg =
    lastError instanceof Error
      ? lastError.message
      : '请求失败，请稍后重试'
  throw new RetryExhaustedError(
    `${msg}（已自动重试 ${maxAttempts} 次）`,
    maxAttempts,
    lastError,
  )
}
