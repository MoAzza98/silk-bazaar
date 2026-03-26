'use client'
import { useEffect, useRef } from 'react'
import { clamp } from '@/lib/scrollUtils'

export default function ManifestoSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    function onScroll() {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const section = sectionRef.current
        const body = bodyRef.current
        if (!section || !body) return

        const rect = section.getBoundingClientRect()
        const scrolledPast = -rect.top
        const sectionH = section.offsetHeight

        // Blur starts at 35% scrolled past, fully blurred at 85%
        const progress = clamp(
          (scrolledPast - sectionH * 0.35) / (sectionH * 0.5),
          0, 1
        )

        body.style.opacity = String(1 - progress)
        body.style.filter = progress > 0.001 ? `blur(${(progress * 12).toFixed(1)}px)` : ''
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      style={{
        background: 'var(--color-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 32px 100px',
      }}
    >
      <div
        ref={bodyRef}
        style={{
          maxWidth: 'var(--max-content)',
          width: '100%',
          willChange: 'opacity, filter',
        }}
      >
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
