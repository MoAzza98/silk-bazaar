'use client'
import { useEffect, useRef, useMemo } from 'react'
import { clamp } from '@/lib/scrollUtils'
import dynamic from 'next/dynamic'
import FizzleCanvas from './FizzleCanvas'

const ThreeRibbon = dynamic(() => import('./ThreeRibbon'), { ssr: false })

const HEADING = 'Silk Bazaar surfaces.'

export default function RibbonSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const charsRef = useRef<(HTMLSpanElement | null)[]>([])
  const progressRef = useRef(0)

  useEffect(() => {
    function onScroll() {
      const el = sectionRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      const height = el.offsetHeight
      const vh = window.innerHeight
      const d = clamp(-top / (height - vh), 0, 1)
      progressRef.current = d

      // Heading chars — enter d 0.35-0.55, exit d 0.80-0.95
      for (let i = 0; i < charsRef.current.length; i++) {
        const span = charsRef.current[i]
        if (!span) continue
        const charStart = 0.35 + i * 0.004
        const charEnd = charStart + 0.08
        const enterP = clamp((d - charStart) / (charEnd - charStart), 0, 1)
        const easedEnter = cubicBezier(0.12, 1, 0.72, 1, enterP)

        const exitStart = 0.80 + i * 0.004
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
    <>
      {/* Fizzle canvas — fixed overlay that dissolves to reveal this section */}
      <FizzleCanvas sectionRef={sectionRef} />

      <section
        ref={sectionRef}
        data-section="ribbon"
        style={{ height: '400vh', position: 'relative' }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            height: '100dvh',
            overflow: 'hidden',
          }}
        >
          {/* Background image + dark overlay */}
          <img
            src="/ribbon-bg.jpg"
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(8, 5, 2, 0.55)',
              zIndex: 1,
            }}
          />

          {/* Three.js Ribbon */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
            <ThreeRibbon progressRef={progressRef} />
          </div>

          {/* Heading */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
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
        </div>

        <style>{`
          @media (max-width: 767px) {
            .ribbon-heading { font-size: 42px !important; }
          }
        `}</style>
      </section>
    </>
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
