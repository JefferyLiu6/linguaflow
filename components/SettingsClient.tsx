'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ClientAuthenticatedUser } from '@/lib/clientAuth'
import { resetDemoLocalState } from '@/lib/stats'

export default function SettingsClient({ user }: { user: ClientAuthenticatedUser | null }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function signOut() {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Could not sign out')
      window.location.href = '/'
    } catch { setError('You could not be signed out. Please try again.'); setBusy(false) }
  }
  function clearProgress() {
    if (!window.confirm('Clear practice history and preferences saved on this device? This cannot be undone.')) return
    resetDemoLocalState()
    window.location.href = '/today'
  }
  return <div className="learning-page"><header className="learning-header"><div><h1>Settings</h1><p>Your account and saved practice.</p></div></header><section className="learning-panel"><h2>Account</h2><p>{user?.email ?? 'You’re practicing without an account. Progress is saved on this device.'}</p>{error && <p role="alert">{error}</p>}<div className="learning-actions">{user ? <button disabled={busy} className="btn-primary" onClick={() => void signOut()}>{busy ? 'Signing out…' : 'Sign out'}</button> : <Link className="btn-primary" href="/login">Sign in</Link>}<Link className="learning-link" href="/today">Change learning language →</Link></div></section>{!user && <section className="learning-panel" style={{ marginTop: 24 }}><h2>Saved on this device</h2><p>Clear your practice history, custom exercises, and language preference from this browser.</p><button className="learning-link" onClick={clearProgress}>Clear local progress</button></section>}</div>
}
