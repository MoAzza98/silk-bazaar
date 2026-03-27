'use client'
import { useEffect, useRef, useMemo, useState } from 'react'
import { clamp } from '@/lib/scrollUtils'
import ThreeRibbon from './ThreeRibbon'

const HEADING = 'an endless marketplace'

export default function RibbonSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const charsRef = useRef<(HTMLSpanElement | null)[]>([])
  const helixBackRef = useRef<HTMLDivElement>(null)
  const helixFrontRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    function onScroll() {
      const el = sectionRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      const height = el.offsetHeight
      const vh = window.innerHeight
      const d = clamp(-top / (height - vh), 0, 1)
      progressRef.current = d

      // Heading chars — enter d 0.15-0.30, exit d 0.65-0.80
      for (let i = 0; i < charsRef.current.length; i++) {
        const span = charsRef.current[i]
        if (!span) continue
        const charStart = 0.15 + i * 0.006
        const charEnd = charStart + 0.10
        const enterP = clamp((d - charStart) / (charEnd - charStart), 0, 1)
        const easedEnter = cubicBezier(0.12, 1, 0.72, 1, enterP)

        const exitStart = 0.65 + i * 0.004
        const exitEnd = exitStart + 0.05
        const exitP = clamp((d - exitStart) / (exitEnd - exitStart), 0, 1)
        const easedExit = cubicBezier(0.45, 0, 0.55, 1, exitP)

        const opacity = easedEnter * (1 - easedExit)
        span.style.opacity = String(opacity)
        span.style.filter = `blur(${((1 - easedEnter) * 16 + easedExit * 12).toFixed(1)}px)`
        span.style.transform = `translateY(${(1 - easedEnter) * 10 + easedExit * -14}px)`
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const chars = useMemo(() => HEADING.split(''), [])

  return (
    <section
      ref={sectionRef}
      data-section="ribbon"
      style={{
        height: '300vh',
        position: 'relative',
        zIndex: 1,
        background: 'transparent',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* z:4 — Helix BACK half (behind text) */}
        <div
          ref={helixBackRef}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 4,
            pointerEvents: 'none',
          }}
        />

        {/* z:5 — Heading text (sandwiched between ribbon halves) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 300,
              fontSize: 72,
              color: 'var(--color-text-on-dark)',
              textAlign: 'center',
            }}
            className="ribbon-heading"
          >
            {chars.map((char, i) => (
              <span
                key={i}
                ref={(el) => { charsRef.current[i] = el }}
                className="anim-char"
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </h2>
        </div>

        {/* z:6 — Helix FRONT half (in front of text) */}
        <div
          ref={helixFrontRef}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 6,
            pointerEvents: 'none',
          }}
        />

        {/* Three.js ribbon — renders into back/front containers */}
        {mounted && (
          <ThreeRibbon
            progressRef={progressRef}
            backRef={helixBackRef}
            frontRef={helixFrontRef}
          />
        )}
      </div>

      <style>{`
        @media (max-width: 767px) {
          .ribbon-heading { font-size: 42px ; }
        }
      `}</style>
    </section>
  )
}

function cubicBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
  function sampleX(t: number) { return ((ax * t + bx) * t + cx) * t }
  function sampleY(t: number) { return ((ay * t + by) * t + cy) * t }
  function sampleDerivX(t: number) { return (3 * ax * t + 2 * bx) * t + cx }
  let guessT = t
  for (let i = 0; i < 8; i++) {
    const currentX = sampleX(guessT) - t
    if (Math.abs(currentX) < 0.0001) break
    const deriv = sampleDerivX(guessT)
    if (Math.abs(deriv) < 0.0001) break
    guessT -= currentX / deriv
  }
  return sampleY(guessT)
}
