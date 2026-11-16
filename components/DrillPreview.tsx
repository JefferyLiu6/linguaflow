'use client'

import { useState } from 'react'
import { checkAnswer, type DrillItem } from '@/lib/drills'

const example: DrillItem = {
  id: 'landing-example', type: 'transformation', instruction: 'Make the sentence negative.',
  prompt: 'She works from home.', answer: "She doesn't work from home.",
  variants: ['She does not work from home.'], promptLang: 'en-US',
}

export default function DrillPreview() {
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | 'revealed' | null>(null)

  return <form className="landing-exercise" aria-label="Example English exercise" onSubmit={event => {
    event.preventDefault()
    if (answer.trim()) setFeedback(checkAnswer(answer, example) ? 'correct' : 'incorrect')
  }}>
    <div className="landing-exercise-header"><span>English</span><span>Sentence practice</span></div>
    <div className="landing-exercise-body">
      <p className="landing-exercise-instruction">Make this sentence negative.</p>
      <p className="landing-exercise-prompt">{example.prompt}</p>
      <label htmlFor="preview-response">Your answer</label>
      <input id="preview-response" aria-describedby="preview-feedback" autoComplete="off" spellCheck={false} placeholder="Type your answer" value={answer} onChange={event => { setAnswer(event.target.value); setFeedback(null) }} />
      <div className="landing-exercise-actions">
        <button type="submit" disabled={!answer.trim()}>Check answer</button>
        <button type="button" onClick={() => setFeedback('revealed')}>Show answer</button>
      </div>
      <div id="preview-feedback" className="landing-exercise-feedback" role="status" aria-live="polite">
        {feedback ? <>
          <strong>{feedback === 'correct' ? 'Correct.' : feedback === 'incorrect' ? 'Compare your answer.' : 'One way to say it:'}</strong>
          <p lang="en">{example.answer}</p>
          <span>Use “doesn’t” with “she,” followed by the base form “work.”</span>
        </> : <span>Try the exercise to see how feedback works.</span>}
      </div>
    </div>
  </form>
}
