'use client'

import { useEffect, useState } from 'react'

type Limit = { perMinute: number; perDay: number }
export default function AiUsage({ feature }: { feature: 'study' | 'coach' | 'generate' | 'planner' }) {
  const [limit, setLimit] = useState<Limit | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/ai-limits', { signal: controller.signal }).then(res => res.ok ? res.json() : null)
      .then(data => { if (!controller.signal.aborted) setLimit(data?.[feature] ?? null) }).catch(() => {})
    return () => controller.abort()
  }, [feature])
  return <details className="ai-usage"><summary>AI usage limits</summary><p>{limit ? `This feature allows up to ${limit.perMinute} requests per minute and checks a ${limit.perDay}-request daily allowance. ` : 'AI requests have minute and daily limits. '}Daily usage is shared across AI features. Network and service-wide limits can also apply. If a limit is reached, we’ll show when you can retry. Exercises and flashcards remain available.</p></details>
}
