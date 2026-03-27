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

        // Blur + fade starts immediately as section scrolls past viewport top,
        // fully dissolved at 45% of section height scrolled past.
        const progress = clamp(scrolledPast / (sectionH * 0.45), 0, 1)

        body.style.opacity = String(1 - progress)
        body.style.filter = progress > 0.001 ? `blur(${(progress * 14).toFixed(1)}px)` : ''
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      data-section="manifesto"
      style={{
        position: 'relative',
        zIndex: 2,
        background: 'transparent',
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 32px 20px',
      }}
    >
      <div
        ref={bodyRef}
        style={{
          maxWidth: 620,
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
            fontWeight: 500,
            fontSize: 28,
            lineHeight: 1.65,
            color: 'var(--color-text)',
            display: 'flex',
            flexDirection: 'column',
            gap: 32,
          }}
          className="manifesto-body"
        >
          <p>Silk Bazaar is where the next Pudgy Penguins gets discovered.</p>

          <p> Builders turn ideas into infra. Operators make it fly. 
              Silk Bazaar is where they find each other.
          </p>

          <p>
            Create, launch, and auction your project. Buy one worth running. 
            Every listing comes with agents trained to operate and grow it from day one.
          </p>
          <p>
            The open bazaar for projects worth building, and buying.
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
