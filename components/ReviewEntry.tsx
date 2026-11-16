'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { DrillItem, Language } from '@/lib/drills'
import { loadSessions, ignoreClientAuthExpiredError } from '@/lib/stats'
import { reviewItems, validLanguage } from '@/lib/learningProgress'
import dynamic from 'next/dynamic'

const DrillClient = dynamic(() => import('./DrillClient'))
const StudyClient = dynamic(() => import('./StudyClient'))

export default function ReviewEntry({ surface }: { surface: 'study' | 'drill' }) {
  const params = useSearchParams()
  const review = params.get('review') === 'mistakes'
  const language = validLanguage(params.get('language'))
  const sessionId = params.get('session')
  const [state, setState] = useState<{ key: string; items: DrillItem[]; language: Language } | null>(null)
  const [error, setError] = useState('')
  const key = `${language}:${sessionId ?? ''}`
  useEffect(() => {
    if (!review || !language) return
    let active = true
    loadSessions().then(sessions => {
      if (active) setState({ key, items: reviewItems(sessions, language, sessionId), language })
    }).catch(e => { ignoreClientAuthExpiredError(e); if (active) setError('Your review could not be loaded. Refresh to try again.') })
    return () => { active = false }
  }, [review, language, sessionId, key])
  if (!review) return surface === 'drill' ? <DrillClient key={params.toString()} /> : <StudyClient />
  if (!language || error || (state?.key === key && !state.items.length)) return <div className="learning-page"><h1>{error ? 'Review unavailable' : 'Nothing to review here'}</h1><p>{error || 'These questions are no longer available, or there are no mistakes in this selection.'}</p><Link className="btn-primary" href="/today">Back to Today</Link></div>
  if (!state || state.key !== key) return <div className="learning-page" role="status">Loading your review…</div>
  return surface === 'drill'
    ? <DrillClient key={key} reviewItems={state.items} reviewLanguage={state.language} />
    : <StudyClient key={key} reviewItems={state.items} reviewLanguage={state.language} reviewSessionId={sessionId ?? undefined} />
}
