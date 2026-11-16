'use client'

import { useEffect, useState } from 'react'
import type { AiRequestError } from '@/lib/aiClient'

export function useAiCooldown(error: AiRequestError | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!error?.retryAt) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [error])
  return error?.retryAt ? Math.max(0, Math.ceil((error.retryAt - Math.max(now, error.occurredAt)) / 1000)) : 0
}

export function AiLoading({ active }: { active: boolean }) {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => setSlow(true), 8000)
    return () => clearTimeout(timer)
  }, [active])
  if (!active) return null
  return <p className="ai-loading" role="status">{slow ? 'Your coach is taking a little longer. You can keep your question here while it responds.' : 'Your coach is preparing a response…'}</p>
}

export function AiFailure({ error, retryIn, onRetry }: { error: AiRequestError | null; retryIn: number; onRetry: () => void }) {
  if (!error) return null
  const wait = retryIn < 60 ? `${retryIn}s` : retryIn < 3600 ? `${Math.ceil(retryIn / 60)} min` : `${Math.ceil(retryIn / 3600)} hr`
  return <div className="ai-failure" role="alert"><p>{error.message}</p><button className="btn-secondary" onClick={onRetry} disabled={retryIn > 0}>{retryIn > 0 ? `Try again in ${wait}` : 'Try again'}</button></div>
}
