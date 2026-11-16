import type { Metadata } from 'next'
import HomeClient from '@/components/HomeClient'

export const metadata: Metadata = {
  title: 'LinguaFlow — Practice the sentences you need.',
  description: 'Practice a language with short drills, immediate feedback, and a daily routine built around what you learn.',
}

export default function WelcomePage() {
  return <HomeClient redirectReturning={false} />
}
