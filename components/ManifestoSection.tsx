'use client'
import { useEffect, useRef } from 'react'
import { clamp } from '@/lib/scrollUtils'

export default function ManifestoSection() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onScroll() {
      const el = ref.current
      if (!el) return
      const { top, height } = el.getBoundingClientRect()
      // Start blurring almost immediately when section starts scrolling up
      const exitProgress = clamp((-top - height * 0.05) / (height * 0.35), 0, 1)
      el.style.opacity = String(1 - exitProgress)
      el.style.filter = exitProgress > 0 ? `blur(${(exitProgress * 12).toFixed(1)}px)` : ''
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section
      ref={ref}
      style={{
        minHeight: 900,
        background: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '140px 32px',
        willChange: 'opacity, filter',
      }}
    >
      <div style={{ maxWidth: 'var(--max-content)', width: '100%' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 400,
            fontSize: 11,
            letterSpacing: '0.14em',
            color: 'var(--color-gold)',
            display: 'block',
            marginBottom: 40,
          }}
        >
          THE NARRATIVE
        </span>

        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 300,
            fontSize: 28,
            lineHeight: 1.65,
            color: 'var(--color-text)',
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
          }}
          className="manifesto-body"
        >
          <p>The place where the next Pudgy Penguins gets discovered.</p>
          <p>
            Builders are exceptional at zero to one. Operators are exceptional at one to
            one hundred. Silk Bazaar is where they find each other — and the infrastructure
            that lets them transact on their own terms.
          </p>
          <p>
            Alpha used to live in private Discord servers and closed group chats.
            We make the invisible visible.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .manifesto-body { font-size: 22px !important; }
        }
      `}</style>
    </section>
  )
}
