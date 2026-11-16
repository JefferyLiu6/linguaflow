import { aiFetch, AiRequestError, asAiError } from './aiClient'

export async function streamSSE(
  payload: object,
  onToken: (token: string) => void,
  onDone: (metadata: Record<string, unknown>) => void,
  onError: (error: AiRequestError) => void,
  signal: AbortSignal,
) {
  try {
    const response = await aiFetch('/api/tutor/stream', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal,
    })
    if (!response.body) throw new AiRequestError('Your coach returned an empty response. Please try again.')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let complete = false
    function consume(line: string) {
      if (!line.startsWith('data:')) return
      let event: Record<string, unknown>
      try { event = JSON.parse(line.slice(5).trim()) } catch { return }
      if (event.error) throw new AiRequestError('Your coach could not finish the response. Your question is still here. Please try again.')
      if (typeof event.token === 'string') onToken(event.token)
      if (event.done) { complete = true; onDone(event) }
    }
    try {
      while (!complete) {
        const { done, value } = await reader.read()
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) { consume(line); if (complete) break }
        if (done) { if (!complete && buffer.trim()) consume(buffer); break }
      }
      if (!complete) throw new AiRequestError('The connection ended before your coach finished. Your question is still here. Please try again.')
    } finally { await reader.cancel().catch(() => {}) }
  } catch (error) {
    if (!signal.aborted) onError(asAiError(error))
  }
}
