import Link from 'next/link'
import type { Language } from '@/lib/drills'

export default function LanguageSupport({ language }: { language: Language }) {
  return <p className="language-support">{language === 'en'
    ? <><strong>English with AI coaching.</strong> Practice, review answers, and ask for explanations when you need them.</>
    : <>Exercises and flashcards are available in this language. AI coaching is currently available in <Link href="/drill?language=en">English practice</Link> and <Link href="/study?language=en">English Study</Link>.</>}
  </p>
}
