'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DrillPreview from './DrillPreview'
import { getClientAuthenticatedUser } from '@/lib/clientAuth'
import { ignoreClientAuthExpiredError, loadSessions } from '@/lib/stats'

export default function HomeClient({ redirectReturning = true }: { redirectReturning?: boolean }) {
  const router = useRouter()
  const [ready, setReady] = useState(!redirectReturning)

  useEffect(() => {
    if (!redirectReturning) return
    let active = true
    loadSessions().then(sessions => {
      if (!active) return
      if (sessions.length || getClientAuthenticatedUser()) { router.replace('/today'); return }
      setReady(true)
    }).catch(error => { ignoreClientAuthExpiredError(error); if (active) setReady(true) })
    return () => { active = false }
  }, [router, redirectReturning])

  if (!ready) return <div className="learning-page" role="status">Loading…</div>

  return <div className="landing-page">
    <section className="landing-hero" aria-labelledby="landing-heading">
      <div className="landing-intro">
        <h1 id="landing-heading">Practice the sentences<br /><em>you need.</em></h1>
        <p>Build your English with focused exercises, immediate feedback, and AI coaching to help you understand your mistakes.</p>
        <Link href="/drill?language=en&type=mixed&count=5" className="btn-primary landing-start">Start practicing <span aria-hidden="true">→</span></Link>
        <span className="landing-start-note">Start with five questions. No account needed.</span>
      </div>
      <DrillPreview />
    </section>

    <section className="landing-languages" aria-label="Available languages">
      <p>AI coaching in English. Exercises and flashcards in</p>
      <ul>{['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean'].map(language => <li key={language}>{language}</li>)}</ul>
    </section>

    <section id="how-it-works" className="landing-method" aria-labelledby="method-heading">
      <div className="landing-method-intro"><h2 id="method-heading">Make each session<br /><em>count.</em></h2><p>Your answers shape what comes next. Keep the questions that need work, understand the answer, and try again.</p></div>
      <div className="landing-method-steps">
        <article><h3>Build an answer from memory.</h3><p>Translate a sentence, change its structure, or work with a new expression. Get feedback as soon as you respond.</p></article>
        <article><h3>Work through your mistakes.</h3><p>Return to the exact questions you missed. Study the answers at your own pace, with explanations available in English Study.</p></article>
        <article><h3>Know where to pick up.</h3><p>Your Today page brings together your next practice and recent sessions. See what’s improving and what deserves another try.</p></article>
      </div>
    </section>
    <footer className="landing-footer"><span>LinguaFlow</span><Link href="/today">Go to your practice <span aria-hidden="true">→</span></Link></footer>
  </div>
}
