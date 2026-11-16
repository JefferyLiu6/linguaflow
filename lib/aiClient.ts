export class AiRequestError extends Error {
  readonly occurredAt = Date.now()
  constructor(message: string, public retryAt = 0, public status = 0) { super(message); this.name = 'AiRequestError' }
}

export function retryTime(value: string | null, now = Date.now()): number {
  const seconds = value ? Number(value) : NaN
  if (Number.isFinite(seconds)) return now + Math.max(1, seconds) * 1000
  const date = value ? Date.parse(value) : NaN
  return Number.isFinite(date) && date > now ? date : now + 60_000
}

export function aiResponseError(response: Response): AiRequestError {
  if (response.status === 429) return new AiRequestError('AI usage limit reached. Your input is still here; you can continue practicing while you wait.', retryTime(response.headers.get('Retry-After')), 429)
  if (response.status === 401) return new AiRequestError('Please sign in again to use your coach. Your question is still here.', 0, 401)
  if (response.status === 400 || response.status === 422) return new AiRequestError('Your coach could not use this request. Check your question and try again.', 0, response.status)
  return new AiRequestError('Your coach is temporarily unavailable. Your question is still here. Please try again.', 0, response.status)
}

export function asAiError(error: unknown): AiRequestError {
  if (error instanceof AiRequestError) return error
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) return new AiRequestError('Your coach is taking longer than expected. Your question is still here. Please try again.')
  return new AiRequestError('Could not reach your coach. Check your connection and try again. Your question is still here.')
}

// One explicit request per user action: retries are never automatic or billable surprises.
export async function aiFetch(url: string, init: RequestInit, timeoutMs = 65_000) {
  const timeout = AbortSignal.timeout(timeoutMs)
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout
  try {
    const response = await fetch(url, { ...init, signal })
    if (!response.ok) throw aiResponseError(response)
    return response
  } catch (error) {
    if (init.signal?.aborted) throw error
    throw asAiError(error)
  }
}
