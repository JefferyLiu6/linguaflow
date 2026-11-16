import type { DrillItem, Language } from '@/lib/drills'
import { LANGUAGES } from '@/lib/drills'

export default function ExercisePreview({ item, language, label = 'Exercise preview' }: { item: DrillItem; language: Language; label?: string }) {
  return <section className="exercise-preview" aria-label={label}>
    <div className="exercise-preview-top"><span>{label}</span><span>{LANGUAGES[language].native}</span></div>
    <div className="exercise-preview-body"><p className="exercise-preview-instruction">{item.instruction}</p><p className="exercise-preview-prompt">{item.prompt}</p><details key={`${language}-${item.id}`}><summary>Reveal answer <span aria-hidden="true">↗</span></summary><p className="exercise-preview-answer">{item.answer}</p></details></div>
    <div className="exercise-preview-bottom"><span>{item.category === 'vocab' ? 'Vocabulary' : item.category === 'phrase' ? 'Everyday phrases' : 'Sentence practice'}</span><span>Read. Recall. Repeat.</span></div>
  </section>
}
