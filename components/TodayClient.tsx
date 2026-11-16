'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLearningLanguage } from '@/lib/useLearningLanguage'
import LanguageSupport from './LanguageSupport'
import { LANGUAGES, type Language, type SessionRecord } from '@/lib/drills'
import { loadSessions, ignoreClientAuthExpiredError } from '@/lib/stats'
import { getClientAuthenticatedUser } from '@/lib/clientAuth'
import { learningProgress, sessionLanguage } from '@/lib/learningProgress'
import { NextPractice, RecentPractice } from './LearningOverview'

export default function TodayClient() {
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const { language, setLanguage, languageError } = useLearningLanguage()
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    loadSessions().then(history => {
      if (!active) return
      setSessions(history); setLoaded(true)
    }).catch(e => { ignoreClientAuthExpiredError(e); if (active) setError('Your practice could not be loaded. Please refresh to try again.') })
    return () => { active = false }
  }, [])
  if (!loaded) return <div className="learning-page" role="status">{error || 'Loading your practice…'}</div>
  const filtered = sessions.filter(s => sessionLanguage(s) === language)
  const progress = learningProgress(filtered)
  return <div className="learning-page">
    <header className="learning-header"><div><span className="product-eyebrow">A good day to keep going</span><h1>Your <em>practice.</em></h1><p>Your next step in {LANGUAGES[language].name}{filtered.length ? ', based on your recent practice.' : ' starts here.'}</p></div>
      <label className="learning-select">Learning language<select aria-label="Learning language" value={language} onChange={e => setLanguage(e.target.value as Language)}>{Object.entries(LANGUAGES).map(([code, info]) => <option key={code} value={code}>{info.name}</option>)}</select></label>
    </header>
    {(error || languageError) && <p role="alert">{error || languageError}</p>}
    <LanguageSupport language={language} />
    {!sessions.length && <section className="first-practice-note"><strong>Start here</strong><p>Try five questions, review any mistakes, then continue in Study. {getClientAuthenticatedUser() ? 'Your completed sessions are saved to your account.' : 'No account is required; your progress stays on this device until you choose to save it to an account.'}</p></section>}
    <NextPractice sessions={filtered} language={language} />
    {filtered.length > 0 && <dl className="learning-stat-strip"><div><dt>Sessions completed</dt><dd>{filtered.length || '—'}</dd></div><div><dt>Questions practiced</dt><dd>{progress.results.length || '—'}</dd></div><div><dt>Recent accuracy<small>{progress.recentCount ? `Last ${progress.recentCount} question${progress.recentCount === 1 ? '' : 's'}` : 'Not enough practice yet'}</small></dt><dd>{progress.recentAccuracy === null ? '—' : `${progress.recentAccuracy}%`}</dd></div></dl>}
    {filtered.length > 0 && <RecentPractice sessions={filtered} />}
    <div className="product-resource-links"><Link href={`/library?language=${language}`}><strong>Browse the library</strong><span>Find exercises for a topic you want to use.</span></Link><Link href={`/study?language=${language}`}><strong>Study at your own pace</strong><span>Review answers and pronunciation before practicing.</span></Link><Link href="/dashboard"><strong>See your progress →</strong><span>Review completed sessions and areas to work on.</span></Link></div>
    <p className="learning-footnote">{getClientAuthenticatedUser() ? 'Your completed practice is saved to your account.' : <>Progress is saved on this device. <Link href="/login">Sign in to keep it with your account.</Link></>} <Link href="/settings">Settings</Link></p>
  </div>
}
