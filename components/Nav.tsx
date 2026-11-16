'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import type { ClientAuthenticatedUser } from '@/lib/clientAuth'

interface NavProps {
  initialUser: ClientAuthenticatedUser | null
}

export function Nav({ initialUser }: NavProps) {
  const path = usePathname()
  const publicPage = path === '/' || path === '/welcome'
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      window.location.href = '/'
    }
  }

  return (
    <nav
      aria-label={publicPage ? 'Website navigation' : 'Main navigation'}
      className={publicPage ? 'landing-nav' : 'product-nav'}
      style={{
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      <div
        className="mob-nav-pad"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          height: 60,
        }}
      >
        {/* Left: Wordmark */}
        <div style={{ flex: 1 }}>
          <Link href="/welcome" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink: 0 }}>
              <rect width="36" height="36" rx="8" fill="#1F5C3A"/>
              <path d="M 9 10 L 14.5 10 L 14.5 23.5 L 26.5 23.5 L 26.5 27.5 L 9 27.5 Z" fill="white"/>
              <rect x="7" y="7.5" width="9" height="2.5" rx="1" fill="white"/>
              <rect x="23.5" y="27.5" width="4.5" height="1.5" rx="0.75" fill="white"/>
            </svg>
            <span className="nav-wordmark-text" style={{ fontFamily: 'var(--font-fraunces), serif', fontSize: 17, fontWeight: 700, color: '#0B1E12', letterSpacing: '-0.02em', lineHeight: 1, whiteSpace: 'nowrap' }}>
              Lingua<em style={{ fontStyle: 'italic', color: '#1F5C3A' }}>Flow.</em>
            </span>
          </Link>
        </div>

        {publicPage ? <div className="landing-nav-links">
          <Link href="/welcome#how-it-works">How it works</Link>
          <Link href={initialUser ? '/today' : '/login'}>{initialUser ? 'Your practice →' : 'Sign in'}</Link>
        </div> : <>
        {/* Center: Nav links */}
        <div className="product-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {[
            { href: '/today',     label: 'Today',   mobileHide: true },
            { href: '/drill',     label: 'Practice',   mobileHide: false },
            { href: '/library',   label: 'Library', mobileHide: true  },
            { href: '/study',     label: 'Study',   mobileHide: true  },
            { href: '/dashboard', label: 'Progress', mobileHide: false },
          ].map(({ href, label }) => {
            const active = path === href || path.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className="nav-primary-link"
                aria-current={active ? 'page' : undefined}
                style={{
                  fontFamily: 'var(--font-manrope), sans-serif',
                  fontWeight: active ? 600 : 400,
                  fontSize: 14,
                  color: active ? '#0B1E12' : '#4A5A50',
                  textDecoration: 'none',
                  padding: '6px 16px',
                  borderBottom: active ? '2px solid #1F5C3A' : '2px solid transparent',
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>

        <div className="product-account"><Link href="/settings">Settings</Link>{initialUser ? <button onClick={handleLogout} disabled={isLoggingOut}>{isLoggingOut ? 'Signing out…' : 'Sign out'}</button> : <Link href="/login">Sign in</Link>}</div>
        </>}
      </div>
    </nav>
  )
}
