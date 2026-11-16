'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LANGUAGES, type SessionRecord } from '@/lib/drills'
import { loadSessions, ignoreClientAuthExpiredError } from '@/lib/stats'
import { getClientAuthenticatedUser } from '@/lib/clientAuth'
import { reviewHref, reviewItems, sessionLanguage } from '@/lib/learningProgress'

export default function SessionSummary({ id }: { id: string }) {
  const [session, setSession] = useState<SessionRecord | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    loadSessions().then(sessions => { if (active) { setSession(sessions.find(s => s.id === id) ?? null); setLoaded(true) } })
      .catch(e => { ignoreClientAuthExpiredError(e); if (active) setError('This session could not be loaded. Please refresh to try again.') })
    return () => { active = false }
  }, [id])
  if (error) return <div className="learning-page" role="alert">{error}</div>
  if (!loaded) return <div className="learning-page" role="status">Loading your session…</div>
  if (!session) return <div className="learning-page"><h1>Session unavailable</h1><p>This session is not in your saved history.</p><Link href="/today" className="btn-primary">Back to Today</Link></div>
  const language = sessionLanguage(session)
  const mistakes = reviewItems([session], language)
  return <div className="learning-page">
    <header className="learning-header"><div><h1>Practice <em>complete.</em></h1><p>{LANGUAGES[language].name} · {new Date(session.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</p></div><Link href="/today" className="learning-link">Back to Today →</Link></header>
    <section className="learning-panel next-practice"><h2>{mistakes.length ? 'Turn your mistakes into progress.' : 'A strong finish. Keep it going.'}</h2><p>You answered {session.correct} of {session.total} questions correctly. {mistakes.length ? `Review ${mistakes.length === 1 ? 'the question that needs' : `the ${mistakes.length} questions that need`} another try, then practice again.` : 'You got every answer right in this session. Try a new set when you’re ready.'}</p>
      <div className="learning-actions"><Link className="btn-primary" href={mistakes.length ? reviewHref('/study', language, session.id) : `/drill?language=${language}&type=mixed&count=5`}>{mistakes.length ? `Review ${mistakes.length} mistake${mistakes.length === 1 ? '' : 's'}` : 'Start next practice'} →</Link><Link href="/dashboard" className="learning-link">See your progress →</Link></div>
      <p className="learning-footnote">{getClientAuthenticatedUser() ? 'Session saved to your account.' : 'Session saved on this device.'}</p>
    </section>
    {mistakes.length > 0 && <section className="learning-panel"><h2>Understand your mistakes</h2><p>Skipped questions and timeouts are included. Open review to study the answers{language === 'en' ? ' and ask your coach for help' : ''}.</p>{session.results.filter(r => !r.correct).map((r, i) => <article className="review-result" key={`${r.item.id}-${i}`}><h3>{r.item.prompt}</h3><dl><dt>Your answer</dt><dd>{r.skipped ? 'Skipped' : r.timedOut ? 'Time ran out' : r.userAnswer || 'No answer'}</dd><dt>Answer</dt><dd>{r.item.answer}</dd></dl></article>)}</section>}
  </div>
}
