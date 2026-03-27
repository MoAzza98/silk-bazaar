'use client'
import { useEffect, useRef } from 'react'
import { clamp } from '@/lib/scrollUtils'

const STEPS = [
  {
    num: '01',
    role: 'For Builders',
    title: 'List your project.',
    desc: 'Submit your project with on-chain data, community metrics, and what you\'ve built. We list it. Qualified operators come to you.',
  },
  {
    num: '02',
    role: 'For Operators',
    title: 'Browse and bid.',
    desc: 'Filter listings by category, chain, and opportunity type. Submit structured offers with your operator profile attached.',
  },
  {
    num: '03',
    role: 'Both sides',
    title: 'Diligence and close.',
    desc: 'Private deal room with shared data access, offer versioning, and escrow-ready structure. No handshakes, no side channels.',
  },
  {
    num: '04',
    role: 'Post-acquisition',
    title: 'Agents activate.',
    desc: 'On close, pre-trained agents spin up — built on the project\'s history, community voice, and operator playbook. Ready from day one.',
  },
]

const BG = 'rgb(249, 247, 245)'

export default function HowItWorksSection() {
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
      id="how-it-works"
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
        <div style={{ marginBottom: 80 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 400,
            fontSize: 11,
            letterSpacing: '0.14em',
            color: 'var(--color-gold)',
            display: 'block',
            marginBottom: 20,
          }}>
            HOW IT WORKS
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
            From listing to<br />live operation.
          </h2>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 160px 1fr',
                gap: '0 48px',
                alignItems: 'start',
                padding: '40px 0',
                borderTop: i === 0 ? '1px solid rgba(39, 26, 0, 0.1)' : '1px solid rgba(39, 26, 0, 0.07)',
              }}
              className="how-step"
            >
              {/* Step number */}
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 400,
                fontSize: 13,
                color: 'var(--color-text-secondary)',
                letterSpacing: '0.06em',
                paddingTop: 4,
              }}>
                {step.num}
              </span>

              {/* Role tag */}
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 400,
                fontSize: 11,
                letterSpacing: '0.1em',
                color: 'var(--color-twilight)',
                paddingTop: 5,
              }}>
                {step.role.toUpperCase()}
              </span>

              {/* Content */}
              <div>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 22,
                  color: 'var(--color-text)',
                  margin: '0 0 12px',
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 400,
                  fontSize: 15,
                  lineHeight: 1.65,
                  color: 'var(--color-text-secondary)',
                  margin: 0,
                  maxWidth: 560,
                }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
          {/* Bottom border */}
          <div style={{ borderTop: '1px solid rgba(39, 26, 0, 0.07)' }} />
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .how-step { grid-template-columns: 48px 1fr !important; grid-template-rows: auto auto; }
          .how-step > span:nth-child(2) { grid-column: 2; }
          .how-step > div { grid-column: 2; }
        }
      `}</style>
    </section>
  )
}
