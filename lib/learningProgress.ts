import { LANGUAGES, type DrillItem, type Language, type SessionRecord } from './drills'

export function sessionLanguage(session: SessionRecord): Language {
  return session.language ?? 'es'
}

export function validLanguage(value: string | null): Language | null {
  return value && Object.hasOwn(LANGUAGES, value) ? value as Language : null
}

export function newestSessions(sessions: SessionRecord[]) {
  return [...sessions].sort((a, b) => b.date - a.date)
}

// Include content because imported lists and different languages can reuse IDs.
function itemKey(item: DrillItem) {
  return JSON.stringify([item.id, item.prompt, item.answer])
}

export function reviewItems(sessions: SessionRecord[], language: Language, sessionId?: string | null): DrillItem[] {
  const history = newestSessions(sessions).filter(s => sessionLanguage(s) === language && (!sessionId || s.id === sessionId))
  const seen = new Set<string>()
  return history.flatMap(session => [...session.results].reverse().flatMap(result => {
    const key = itemKey(result.item)
    if (seen.has(key)) return []
    seen.add(key)
    return result.correct ? [] : [result.item]
  }))
}

export function reviewHref(path: '/study' | '/drill', language: Language, sessionId?: string) {
  const query = new URLSearchParams({ review: 'mistakes', language })
  if (sessionId) query.set('session', sessionId)
  return `${path}?${query}`
}

export const PRACTICE_LABELS: Record<string, string> = {
  sentence: 'Sentences', vocab: 'Vocabulary', phrase: 'Everyday phrases', mixed: 'Mixed practice',
  custom: 'Custom practice', translation: 'Translation', substitution: 'Sentence patterns', transformation: 'Grammar',
}

export function learningProgress(sessions: SessionRecord[]) {
  const history = newestSessions(sessions)
  const results = history.flatMap(s => [...s.results].reverse())
  const recent = results.slice(0, 10)
  const previous = results.slice(10, 20)
  const accuracy = (items: typeof results) => items.length ? Math.round(items.filter(r => r.correct).length / items.length * 100) : null
  const recentAccuracy = accuracy(recent)
  const previousAccuracy = accuracy(previous)
  const trend = recent.length === 10 && previous.length === 10 ? recentAccuracy! - previousAccuracy! : null
  const groups = new Map<string, { correct: number; total: number }>()
  for (const r of results) {
    const key = r.item.category ?? r.item.type
    const group = groups.get(key) ?? { correct: 0, total: 0 }
    group.total++
    if (r.correct) group.correct++
    groups.set(key, group)
  }
  const areas = [...groups].map(([key, g]) => ({ key, label: PRACTICE_LABELS[key] ?? key, ...g, accuracy: Math.round(g.correct / g.total * 100) }))
    .filter(g => g.total >= 3).sort((a, b) => b.accuracy - a.accuracy)
  return { history, results, recentAccuracy, recentCount: recent.length, trend, strongest: areas[0], weakest: areas.findLast(g => g.accuracy < 80) }
}
