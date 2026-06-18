'use client'

import { useState } from 'react'

const VALID_EMAIL = 'admin@example.com'
const VALID_PASSWORD = '54321'

interface LoginScreenProps {
  onLogin: () => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    setTimeout(() => {
      if (email.trim() === VALID_EMAIL && password === VALID_PASSWORD) {
        sessionStorage.setItem('arc_auth', '1')
        onLogin()
      } else {
        setError('Invalid email or password.')
      }
      setLoading(false)
    }, 400)
  }

  return (
    <div className="flex items-center justify-center h-screen w-screen"
      style={{ background: 'var(--ink)' }}>

      {/* Card */}
      <div className="w-[380px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--deep)', border: '1px solid var(--line-2)' }}>

        {/* Top brand bar */}
        <div className="flex flex-col items-center gap-3 px-8 pt-10 pb-7"
          style={{ borderBottom: '1px solid var(--line)' }}>
          {/* Logo mark */}
          <div className="w-12 h-12 rounded-[28%] flex items-center justify-center"
            style={{
              background: 'radial-gradient(120% 120% at 28% 18%, #7A6CFF 0%, #5847E6 42%, #4536C2 100%)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.2) inset, 0 12px 32px -10px rgba(67,54,194,0.7)',
            }}>
            <svg viewBox="0 0 96 96" className="w-7 h-7">
              <path d="M24,75 L24,29 L48,57 L72,29 L72,75" fill="none"
                stroke="white" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M48,8 L52,19 L63,23 L52,27 L48,38 L44,27 L33,23 L44,19 Z" fill="#DBD2FF" />
            </svg>
          </div>

          <div className="text-center">
            <h1 style={{
              fontFamily: 'var(--serif)',
              fontSize: '26px',
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--paper)',
              margin: 0,
              lineHeight: 1,
            }}>
              Arc
            </h1>
            <p className="text-[12px] mt-1.5" style={{ color: 'var(--grey)', fontFamily: 'var(--mono)' }}>
              Job tracker
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-7 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: 'var(--grey)', fontFamily: 'var(--mono)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full rounded-xl px-4 py-2.5 text-[13px] outline-none transition-all"
              style={{
                background: 'var(--panel)',
                border: `1px solid ${error ? '#f87171' : 'var(--line-2)'}`,
                color: 'var(--paper)',
                fontFamily: 'var(--sans)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--indigo)')}
              onBlur={e => (e.currentTarget.style.borderColor = error ? '#f87171' : 'var(--line-2)')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: 'var(--grey)', fontFamily: 'var(--mono)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full rounded-xl px-4 py-2.5 text-[13px] outline-none transition-all"
              style={{
                background: 'var(--panel)',
                border: `1px solid ${error ? '#f87171' : 'var(--line-2)'}`,
                color: 'var(--paper)',
                fontFamily: 'var(--sans)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--indigo)')}
              onBlur={e => (e.currentTarget.style.borderColor = error ? '#f87171' : 'var(--line-2)')}
            />
          </div>

          {error && (
            <p className="text-[12px] text-center" style={{ color: '#f87171', fontFamily: 'var(--mono)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-[0.12em] transition-all mt-1 flex items-center justify-center gap-2"
            style={{
              background: loading ? 'var(--indigo-700)' : 'var(--indigo)',
              color: 'var(--paper)',
              fontFamily: 'var(--mono)',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: 'white' }} />
                Signing in
              </>
            ) : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
