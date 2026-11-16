'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ignoreClientAuthExpiredError, loadSessions } from '@/lib/stats'
import { LANGUAGES, type SessionRecord, type Language } from '@/lib/drills'
import { learningProgress, sessionLanguage, PRACTICE_LABELS } from '@/lib/learningProgress'
import { ProgressInsights } from './LearningOverview'
import PlannerPanel from './PlannerPanel'

export default function DashboardClient() {
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [language, setLanguage] = useState<Language | ''>('')
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(10)
  useEffect(() => {
    let active = true
    loadSessions().then(history => { if (active) { setSessions(history); setLoaded(true) } }).catch(e => { ignoreClientAuthExpiredError(e); if (active) setError('Your progress could not be loaded. Refresh to try again.') })
    return () => { active = false }
  }, [])
  const filtered = language ? sessions.filter(s => sessionLanguage(s) === language) : sessions
  const { history, results } = learningProgress(filtered)
  const correct = results.filter(r => r.correct).length
  const accuracy = results.length ? Math.round(correct / results.length * 100) : null
  const groups = new Map<string, { total: number; correct: number }>()
  for (const result of results) {
    const key = result.item.category ?? result.item.type
    const group = groups.get(key) ?? { total: 0, correct: 0 }
    group.total++; if (result.correct) group.correct++
    groups.set(key, group)
  }
  return <div className="learning-page">
    <header className="learning-header"><div><span className="product-eyebrow">Every session adds up</span><h1>Your <em>progress.</em></h1><p>Completed sessions, accuracy, and what to work on next.</p></div><label className="learning-select">Language<select aria-label="Language" value={language} onChange={e => { setLanguage(e.target.value as Language | ''); setVisible(10) }}><option value="">All languages</option>{Object.entries(LANGUAGES).map(([code, info]) => <option key={code} value={code}>{info.name}</option>)}</select></label></header>
    {!loaded ? <p role={error ? 'alert' : 'status'}>{error || 'Loading your progress…'}</p> : !history.length ? <section className="product-empty"><h2>{sessions.length ? 'No sessions in this language yet' : 'Your progress starts with a session'}</h2><p>After you finish practicing, you’ll see your results and the questions to review here.</p><Link className="btn-primary" href={`/drill${language ? `?language=${language}` : ''}`}>Start practice →</Link></section> : <>
      <dl className="learning-stat-strip"><div><dt>Sessions completed</dt><dd>{history.length}</dd></div><div><dt>Questions practiced</dt><dd>{results.length}</dd></div><div><dt>Overall accuracy<small>{correct} of {results.length} answers correct</small></dt><dd>{accuracy}%</dd></div></dl>
      <section className="product-progress-chart"><div className="product-chart-title"><h2>Accuracy over time</h2><p>Your last {Math.min(history.length, 8)} completed session{history.length === 1 ? '' : 's'}</p></div><ol>{history.slice(0, 8).reverse().map(session => { const pct = session.total ? Math.round(session.correct / session.total * 100) : 0; return <li key={session.id}><Link href={`/session/${encodeURIComponent(session.id)}`} aria-label={`${LANGUAGES[sessionLanguage(session)].name}, ${new Date(session.date).toLocaleDateString()}, ${pct}% accuracy`}><span>{pct}%</span><div className="product-chart-track"><div style={{ height: `${pct}%` }} /></div><small>{new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</small></Link></li> })}</ol></section>
      <ProgressInsights sessions={filtered} />
      {language === 'en' && <PlannerPanel sessions={filtered} />}
      <section className="product-history"><div className="product-list-heading"><h2>Session history</h2><Link className="learning-link" href={`/drill${language ? `?language=${language}` : ''}`}>New practice →</Link></div><ul className="practice-list">{history.slice(0, visible).map(session => <li key={session.id}><Link href={`/session/${encodeURIComponent(session.id)}`}><span><strong>{LANGUAGES[sessionLanguage(session)].name} · {PRACTICE_LABELS[session.drillType] ?? session.drillType}</strong><small>{new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</small></span><span>{session.correct}/{session.total} correct →</span></Link></li>)}</ul>{history.length > visible && <button className="btn-secondary product-show-more" onClick={() => setVisible(n => n + 10)}>Show more sessions</button>}</section>
      <details className="product-breakdown"><summary>Explore detailed progress</summary><div className="product-list-heading"><h2>Accuracy by exercise type</h2><span>All completed questions</span></div>{[...groups].map(([key, group]) => <div className="product-accuracy-row" key={key}><span>{PRACTICE_LABELS[key] ?? key}</span><meter min={0} max={group.total} value={group.correct} aria-label={`${PRACTICE_LABELS[key] ?? key} accuracy`} /><span>{group.correct}/{group.total} correct</span></div>)}{results.length < 20 && <p>Not enough practice yet</p>}<p>Accuracy counts skipped and timed-out questions as incorrect. Session results include the answers you submitted.</p></details>
    </>}
  </div>
}
