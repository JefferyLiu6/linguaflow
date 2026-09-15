import { afterEach, expect, it, vi } from 'vitest'
import { POST, maxDuration } from './route'

vi.mock('@/lib/aiRateLimit', () => ({
  enforceAiRateLimit: vi.fn(async () => ({ actorKey: 'test' })),
  applyRequestActorResponseHeaders: (response: Response) => response,
}))

afterEach(() => vi.restoreAllMocks())

function request() {
  return new Request('http://localhost/api/study-assist', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'show_similar_examples', currentItem: { id: 'en03' } }),
  })
}

it('allows startup time within the function budget and preserves source identity', async () => {
  const timeout = vi.spyOn(AbortSignal, 'timeout')
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
    assistant_message: 'Example', retrieval_hit: true,
    retrieved_sources: [{ id: 'note-1', title: 'Note' }], elapsed_ms: 3,
  })))
  const response = await POST(request())
  expect(response.status).toBe(200)
  expect(timeout).toHaveBeenCalledWith(55_000)
  expect(maxDuration * 1000).toBeGreaterThan(55_000)
  expect((await response.json()).retrievedSources).toEqual([{ id: 'note-1', title: 'Note' }])
})

it('returns a retryable user message when the agent times out', async () => {
  vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('Timed out', 'TimeoutError'))
  const response = await POST(request())
  expect(response.status).toBe(502)
  const body = await response.json()
  expect(body.error).toContain('try again shortly')
  expect(body.error).not.toContain('uvicorn')
})
