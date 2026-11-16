'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { SessionRecord, DrillTopic } from '@/lib/drills'
import { TOPICS } from '@/lib/drills'
import { TAXONOMY_DISPLAY, type TaxonomyLabel } from '@/lib/englishTaxonomy'
import { PRACTICE_LABELS, reviewHref } from '@/lib/learningProgress'

interface Plan {
  weakPoints: { label: string }[]
  nextSessionPlan: { drillType: string; topic: string; count: number }
  studyCardsToReview: { itemId: string; prompt: string; reason: string }[]
}

export default function PlannerPanel({ sessions }: { sessions: SessionRecord[] }) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // Parent filters can create a new array; the request depends on saved content.
  const sessionKey = JSON.stringify(sessions)
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true); setError(false)
      try {
        const response = await fetch('/api/plan-session', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ language: 'en', sessions: JSON.parse(sessionKey) }), signal: controller.signal,
        })
        if (!response.ok) throw new Error('Plan unavailable')
        const result = await response.json() as Plan
        if (!result.nextSessionPlan || !Array.isArray(result.weakPoints)) throw new Error('Plan unavailable')
        if (!controller.signal.aborted) setPlan(result)
      } catch { if (!controller.signal.aborted) setError(true) }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => controller.abort()
  }, [sessionKey, attempt])
  if (loading) return <p role="status">Preparing your coach’s suggestion…</p>
  if (error || !plan) return <div className="learning-panel" style={{ marginBottom: 24 }}><h2>Keep practicing</h2><p>Your coach’s suggestion is unavailable right now. You can still review mistakes or choose a practice.</p><button className="learning-link" onClick={() => setAttempt(a => a + 1)}>Try again</button></div>
  const next = plan.nextSessionPlan
  const type = Object.hasOwn(PRACTICE_LABELS, next.drillType) && next.drillType !== 'custom' ? next.drillType : 'mixed'
  const topic = Object.hasOwn(TOPICS, next.topic) ? next.topic as DrillTopic : 'daily'
  const count = Number.isFinite(next.count) ? Math.max(1, Math.min(20, Math.round(next.count))) : 5
  const focus = plan.weakPoints[0]?.label
  const focusLabel = focus ? TAXONOMY_DISPLAY[focus as TaxonomyLabel] : null
  return <section className="learning-panel" style={{ marginBottom: 24 }}>
    <h2>A suggestion from your coach</h2>
    <p>Try {count} questions on {TOPICS[topic].label.toLowerCase()}{focusLabel ? `, with attention to ${focusLabel.toLowerCase()}` : ''}. This suggestion is based on your recent English sessions.</p>
    <div className="learning-actions"><Link className="learning-link" data-testid="planner-begin-session" href={`/drill?language=en&type=${type}&topic=${topic}&count=${count}&source=planner`}>Try this practice →</Link><Link className="learning-link" href={reviewHref('/study', 'en')}>Review English mistakes →</Link></div>
  </section>
}
