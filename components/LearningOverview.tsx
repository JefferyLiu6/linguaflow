import Link from 'next/link'
import type { Language, SessionRecord } from '@/lib/drills'
import { LANGUAGES } from '@/lib/drills'
import { learningProgress, reviewHref, reviewItems } from '@/lib/learningProgress'

export function NextPractice({ sessions, language }: { sessions: SessionRecord[]; language: Language }) {
  const mistakes = reviewItems(sessions, language)
  const hasHistory = sessions.length > 0
  return <section className="learning-panel next-practice">
    <h2>Your next practice</h2>
    <h3>{mistakes.length ? 'Review your recent mistakes' : hasHistory ? 'Keep your practice going' : `Start practicing ${LANGUAGES[language].name}`}</h3>
    <p>{mistakes.length
      ? `${mistakes.length} question${mistakes.length === 1 ? '' : 's'} to revisit. Review the answers, then put them into practice.`
      : hasHistory ? 'You have no unanswered mistakes to review. Build on your practice with a short mixed session.'
        : 'Try a short session. Your next recommendation will build on what you learn.'}</p>
    <div className="learning-actions">
      <Link className="btn-primary" href={mistakes.length ? reviewHref('/study', language) : `/drill?language=${language}&type=mixed&count=5`}>{mistakes.length ? 'Review mistakes' : 'Start practice'} <span aria-hidden="true">→</span></Link>
      <Link className="learning-link" href={`/drill?language=${language}`}>Choose a practice →</Link>
    </div>
  </section>
}

export function ProgressInsights({ sessions }: { sessions: SessionRecord[] }) {
  const progress = learningProgress(sessions)
  return <section className="learning-insights" aria-label="Learning insights">
    <div><h3>What’s improving</h3><p>{progress.trend === null ? 'Complete 20 questions to compare your recent accuracy.' : progress.trend > 0 ? `Your last 10 answers were ${progress.trend} percentage points more accurate than the previous 10.` : progress.trend === 0 ? 'Your accuracy is steady across your last two sets of 10 questions.' : 'Your recent accuracy dipped. Reviewing mistakes is a useful next step.'}</p></div>
    <div><h3>{progress.weakest ? 'Where to focus' : 'What’s going well'}</h3><p>{progress.weakest ? `${progress.weakest.label}: ${progress.weakest.correct} of ${progress.weakest.total} correct. Give these questions another try.` : progress.strongest ? `${progress.strongest.label}: ${progress.strongest.correct} of ${progress.strongest.total} correct so far. Keep practicing to see how it develops.` : 'Not enough practice yet. Your strengths and areas to revisit will appear here.'}</p></div>
  </section>
}

export function RecentPractice({ sessions }: { sessions: SessionRecord[] }) {
  const { history } = learningProgress(sessions)
  return <section className="learning-panel"><h2>Recent practice</h2>
    {!history.length ? <p>Your completed sessions will appear here.</p> : <ul className="practice-list">{history.slice(0, 5).map(s => <li key={s.id}><Link href={`/session/${encodeURIComponent(s.id)}`}><span><strong>{LANGUAGES[s.language ?? 'es'].name}</strong><small>{new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {s.total} question{s.total === 1 ? '' : 's'}</small></span><span>{s.correct}/{s.total} correct <span aria-hidden="true">→</span></span></Link></li>)}</ul>}
  </section>
}
