import { describe, expect, it } from 'vitest'
import type { DrillItem, SessionRecord } from './drills'
import { learningProgress, reviewItems, validLanguage } from './learningProgress'

const item: DrillItem = { id: 'shared', type: 'translation', prompt: 'Hello', answer: 'Hola', instruction: 'Translate', promptLang: 'en' }
function session(id: string, date: number, correct: boolean, language: 'es' | 'fr' = 'es', questions: DrillItem[] = [item]): SessionRecord {
  return { id, date, language, drillType: 'mixed', correct: correct ? questions.length : 0, total: questions.length, accuracy: correct ? 100 : 0, avgTime: 4, results: questions.map(item => ({ item, correct, timedOut: false, timeUsed: 4, userAnswer: correct ? item.answer : '?' })) }
}

describe('learner progress', () => {
  it('removes corrected questions from the current review while preserving a past session review', () => {
    const history = [session('old', 1, false), session('new', 2, true)]
    expect(reviewItems(history, 'es')).toEqual([])
    expect(reviewItems(history, 'es', 'old')).toEqual([item])
  })
  it('keeps languages and reused custom IDs separate', () => {
    const custom = { ...item, prompt: 'Goodbye', answer: 'Adiós' }
    const history = [session('wrong', 1, false), session('other', 2, true, 'fr'), session('custom', 3, false, 'es', [custom])]
    expect(reviewItems(history, 'es')).toEqual([custom, item])
    expect(reviewItems(history, 'fr')).toEqual([])
  })
  it('includes skipped and timed-out questions once', () => {
    const history = session('missed', 1, false, 'es', [item, item])
    history.results[0].skipped = true
    history.results[1].timedOut = true
    expect(reviewItems([history], 'es')).toEqual([item])
  })
  it('withholds trends until there are two comparable sets of 10 answers', () => {
    expect(learningProgress([]).recentAccuracy).toBeNull()
    expect(learningProgress([session('one', 1, false)]).trend).toBeNull()
    const questions = Array.from({ length: 10 }, (_, i) => ({ ...item, id: String(i) }))
    expect(learningProgress([session('old', 1, false, 'es', questions), session('new', 2, true, 'es', questions)]).trend).toBe(100)
  })
  it('rejects invalid and inherited language names', () => {
    expect(validLanguage('en')).toBe('en')
    expect(validLanguage('constructor')).toBeNull()
    expect(validLanguage(null)).toBeNull()
  })
})
