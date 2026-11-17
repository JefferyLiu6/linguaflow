import type { Metadata } from 'next'
import localFont from 'next/font/local'
import Script from 'next/script'
import './globals.css'
import { Nav } from '@/components/Nav'
import { getAuthState } from '@/lib/auth'

// Keep the existing families and CSS variables, without build-time font downloads.
const playfair = localFont({
  variable: '--font-fraunces',
  src: [
    { path: './fonts/playfair-display-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/playfair-display-normal.woff2', weight: '700', style: 'normal' },
    { path: './fonts/playfair-display-italic.woff2', weight: '400', style: 'italic' },
    { path: './fonts/playfair-display-italic.woff2', weight: '700', style: 'italic' },
  ],
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
})

// Body / UI — DM Sans per Grove design spec
const dmSans = localFont({
  variable: '--font-manrope',
  src: './fonts/dm-sans-normal.woff2',
  weight: '300 700',
  style: 'normal',
  display: 'swap',
})

// Code / prompts — JetBrains Mono per Grove design spec
const jetbrains = localFont({
  variable: '--font-jetbrains',
  src: [
    { path: './fonts/jetbrains-mono-normal.woff2', weight: '300 600', style: 'normal' },
    { path: './fonts/jetbrains-mono-italic.woff2', weight: '300 600', style: 'italic' },
  ],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'LinguaFlow — AI Language Coaching System',
  description: 'Build your language skills with short practice sessions, helpful coaching, and review that builds on your progress.',
}

function serializeInlineScript(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getAuthState()
  const authBootstrapScript = `window.__LINGUAFLOW_AUTH__ = ${serializeInlineScript(user)};`

  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">
        <Script
          id="auth-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: authBootstrapScript }}
        />
        <Nav initialUser={user} />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  )
}
