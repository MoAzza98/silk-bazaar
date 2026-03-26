'use client'
import { useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import StatsBar from './StatsBar'

export default function RegisterSection() {
  const { data: session } = useSession()
  const [email, setEmail] = useState('')
  const [emailRegistered, setEmailRegistered] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isTwitterRegistered = !!session?.user?.username

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/register-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.status === 409) {
        setError('This email is already registered.')
      } else if (!res.ok) {
        setError('Something went wrong. Please try again.')
      } else {
        setEmailRegistered(true)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      id="register"
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 32px',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--max-page)',
          width: '100%',
          display: 'flex',
          gap: 64,
          alignItems: 'center',
        }}
        className="register-grid"
      >
        {/* Left column */}
        <div style={{ flex: 1 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 400,
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'var(--color-gold)',
              display: 'block',
              marginBottom: 24,
            }}
          >
            EARLY ACCESS
          </span>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize: 56,
              lineHeight: 1.15,
              marginBottom: 20,
            }}
            className="register-heading"
          >
            Be first to the bazaar.
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 300,
              fontSize: 18,
              lineHeight: 1.65,
              color: 'var(--color-text-secondary)',
              maxWidth: 440,
            }}
          >
            Register your interest and get notified when auctions go live.
            Connect your X account to see your reach included in our
            launch audience.
          </p>

          <div style={{ marginTop: 48 }}>
            <StatsBar />
          </div>
        </div>

        {/* Right column — Registration widget */}
        <div
          style={{
            flex: 1,
            maxWidth: 420,
            background: 'var(--color-card)',
            border: '0.5px solid rgba(201,149,108,0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: 32,
          }}
        >
          {isTwitterRegistered ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-gold)">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 14 }}>
                  @{session.user.username} — you&apos;re on the list.
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 12, color: 'var(--color-gold)' }}>
                Your audience of {(session.user.followerCount ?? 0).toLocaleString()} is counted.
              </span>
            </div>
          ) : emailRegistered ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--color-gold)">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 14 }}>
                You&apos;re on the list.
              </span>
            </div>
          ) : (
            <>
              <button
                onClick={() => signIn('twitter')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  background: '#000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 40,
                  padding: '14px 20px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Connect X Account
              </button>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  margin: '20px 0',
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 400,
                  fontSize: 10,
                }}
              >
                <div style={{ flex: 1, height: 0.5, background: 'rgba(201,149,108,0.3)' }} />
                or
                <div style={{ flex: 1, height: 0.5, background: 'rgba(201,149,108,0.3)' }} />
              </div>

              <form onSubmit={handleEmailSubmit}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{
                    width: '100%',
                    background: '#F9F7F5',
                    border: '0.5px solid rgba(201,149,108,0.4)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '12px 14px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 400,
                    fontSize: 13,
                    outline: 'none',
                    marginBottom: 12,
                    color: 'var(--color-text)',
                  }}
                />
                {error && (
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#c44', marginBottom: 8 }}>
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: 'var(--color-twilight)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 40,
                    padding: '14px 20px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 500,
                    fontSize: 13,
                    cursor: loading ? 'wait' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Registering...' : 'Register Email →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .register-grid { flex-direction: column !important; }
          .register-heading { font-size: 38px !important; }
        }
      `}</style>
    </section>
  )
}
