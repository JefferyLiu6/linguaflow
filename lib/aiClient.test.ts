import { afterEach, describe, expect, it, vi } from 'vitest'
import { aiFetch, AiRequestError, retryTime } from './aiClient'
import { streamSSE } from './aiStream'

afterEach(() => vi.unstubAllGlobals())
describe('AI request recovery', () => {
  it('respects numeric and date-based Retry-After values', () => {
    const now = Date.parse('2026-11-16T12:00:00Z')
    expect(retryTime('12', now)).toBe(now + 12000)
    expect(retryTime('Mon, 16 Nov 2026 12:01:00 GMT', now)).toBe(now + 60000)
    expect(retryTime('invalid', now)).toBe(now + 60000)
  })
  it('keeps rate-limit responses actionable without retrying automatically', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('internal detail', { status: 429, headers: { 'Retry-After': '30' } }))
    vi.stubGlobal('fetch', fetch)
    await expect(aiFetch('/api/study-assist', {})).rejects.toMatchObject({ status: 429, message: expect.stringContaining('usage limit') })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('treats incomplete streams as errors rather than leaving a spinner or accepting partial answers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('data: {"token":"Partial answer"}\n\n')))
    const token = vi.fn(), done = vi.fn(), error = vi.fn()
    await streamSSE({}, token, done, error, new AbortController().signal)
    expect(token).toHaveBeenCalledWith('Partial answer')
    expect(done).not.toHaveBeenCalled()
    expect(error).toHaveBeenCalledWith(expect.any(AiRequestError))
  })
  it('handles final SSE messages without a trailing newline', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('data: {"token":"Answer"}\r\n\r\ndata: {"done":true}')))
    const done = vi.fn(), error = vi.fn()
    await streamSSE({}, vi.fn(), done, error, new AbortController().signal)
    expect(done).toHaveBeenCalledOnce()
    expect(error).not.toHaveBeenCalled()
  })
  it('does not display raw provider errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('data: {"error":"secret provider configuration"}\n\n')))
    const error = vi.fn()
    await streamSSE({}, vi.fn(), vi.fn(), error, new AbortController().signal)
    expect(error.mock.calls[0][0].message).not.toContain('secret')
  })
})
