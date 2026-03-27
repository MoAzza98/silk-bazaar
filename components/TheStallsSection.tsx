'use client'
import { useEffect, useRef } from 'react'
import { clamp } from '@/lib/scrollUtils'

const STALLS = [
  {
    icon: '⬡',
    title: 'Project Listings',
    desc: 'Browse dormant and underlevered crypto projects — from NFT communities to protocol infra — each vetted and listed with agent support from day one.',
  },
  {
    icon: '⬡',
    title: 'Operator Profiles',
    desc: 'Operators publish their track record, focus areas, and runway. Projects find the right hands. Operators find the right assets.',
  },
  {
    icon: '⬡',
    title: 'Deal Room',
    desc: 'Private diligence space for both sides. NDAs, data rooms, and structured offer flows — no side-channel negotiation.',
  },
  {
    icon: '⬡',
    title: 'Agent Handoff',
    desc: 'Every acquired project ships with pre-trained agents built to operate it: community management, growth, governance, analytics.',
  },
]

const BG = 'rgb(249, 247, 245)'

export default function TheStallsSection() {
  const bodyRef = useRef<HTMLDivElement>(null)
  const rafRef  = useRef<number | null>(null)

  useEffect(() => {
    function onScroll() {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const body = bodyRef.current
        if (!body) return
        const rect = body.getBoundingClientRect()
        const vh   = window.innerHeight
        const p    = clamp(1 - (rect.top - vh * 0.30) / (vh * 0.60), 0, 1)
        body.style.opacity = String(p)
        body.style.filter  = p < 0.999 ? `blur(${((1 - p) * 14).toFixed(1)}px)` : ''
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
  }, [])

  return (
    <section
      id="the-stalls"
      style={{
        position: 'relative',
        zIndex: 2,
        background: BG,
        padding: '120px 32px',
        borderTop: '1px solid rgba(39, 26, 0, 0.07)',
      }}
    >
      <div ref={bodyRef} style={{ maxWidth: 'var(--max-page)', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 72, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 32 }}>
          <div>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 400,
              fontSize: 11,
              letterSpacing: '0.14em',
              color: 'var(--color-gold)',
              display: 'block',
              marginBottom: 20,
            }}>
              THE STALLS
            </span>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 52,
              lineHeight: 1.1,
              color: 'var(--color-text)',
              margin: 0,
              maxWidth: 480,
            }}>
              Everything in the market,<br />in one place.
            </h2>
          </div>
          <p style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontSize: 16,
            lineHeight: 1.7,
            color: 'var(--color-text-secondary)',
            maxWidth: 340,
            margin: 0,
          }}>
            The Stalls are the trading floor — where builders list, operators browse, and deals get structured end to end.
          </p>
        </div>

        {/* Feature grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 2,
          border: '1px solid rgba(39, 26, 0, 0.1)',
          borderRadius: 6,
          overflow: 'hidden',
        }}>
          {STALLS.map((item, i) => (
            <div
              key={i}
              style={{
                padding: '40px 32px',
                background: 'rgba(255,255,255,0.5)',
                borderRight: i % 2 === 0 ? '1px solid rgba(39, 26, 0, 0.07)' : 'none',
                borderBottom: i < 2 ? '1px solid rgba(39, 26, 0, 0.07)' : 'none',
              }}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(var(--color-twilight-rgb, 139, 90, 43), 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
                fontSize: 14,
                color: 'var(--color-twilight)',
              }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 18,
                color: 'var(--color-text)',
                margin: '0 0 12px',
              }}>
                {item.title}
              </h3>
              <p style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 400,
                fontSize: 14,
                lineHeight: 1.65,
                color: 'var(--color-text-secondary)',
                margin: 0,
              }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
