'use client'
import { useEffect, useRef, useMemo } from 'react'
import { clamp, remap } from '@/lib/scrollUtils'
import dynamic from 'next/dynamic'

const ThreeRibbon = dynamic(() => import('./ThreeRibbon'), { ssr: false })

const HEADING = 'Silk Bazaar surfaces.'

interface PetalConfig {
  src: string
  size: number
  startX: number
  startY: number
  speed: number
  yDrift: number
}

function usePetalConfigs(): PetalConfig[] {
  return useMemo(() => {
    const petals: PetalConfig[] = []
    for (let i = 0; i < 12; i++) {
      petals.push({
        src: `/petals/petal-${(i % 7) + 1}.png`,
        size: 120 + Math.random() * 160,
        startX: 110 + Math.random() * 30,
        startY: 10 + Math.random() * 80,
        speed: 0.7 + Math.random() * 0.6,
        yDrift: -15 + Math.random() * 30,
      })
    }
    return petals
  }, [])
}

export default function PetalRibbonSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const charsRef = useRef<HTMLSpanElement[]>([])
  const petalsRef = useRef<HTMLImageElement[]>([])
  const progressRef = useRef(0)

  const petalConfigs = usePetalConfigs()

  useEffect(() => {
    function onScroll() {
      const el = sectionRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      const height = el.offsetHeight
      const vh = window.innerHeight
      const d = clamp(-top / (height - vh), 0, 1)
      progressRef.current = d

      // Petals
      petalsRef.current.forEach((petal, i) => {
        if (!petal) return
        const cfg = petalConfigs[i]
        const isEarlyPetal = i < 5

        let petalAlpha: number
        let petalX: number

        if (isEarlyPetal) {
          // Phase 1-2 petals: enter d 0-0.35
          const enterProgress = clamp(d / 0.35, 0, 1)
          const exitProgress = clamp((d - 0.5) / 0.22, 0, 1)
          petalAlpha = enterProgress * (1 - exitProgress)
          petalX = cfg.startX - enterProgress * cfg.startX * cfg.speed
        } else {
          // Phase 2 petals: enter d 0.2-0.5
          const enterProgress = clamp((d - 0.2) / 0.3, 0, 1)
          const exitProgress = clamp((d - 0.5) / 0.22, 0, 1)
          petalAlpha = enterProgress * (1 - exitProgress)
          petalX = cfg.startX - enterProgress * cfg.startX * cfg.speed
        }

        const yOffset = cfg.yDrift * clamp(d * 2, 0, 1)
        petal.style.transform = `translate(${petalX}vw, ${yOffset}px) rotate(${d * 120 * cfg.speed}deg)`
        petal.style.opacity = String(clamp(petalAlpha, 0, 1))
      })

      // Heading chars — enter phase (d: 0.5 → 0.72)
      charsRef.current.forEach((span, i) => {
        if (!span) return
        const charStart = 0.5 + i * 0.003
        const charEnd = charStart + 0.06

        // Enter
        const enterP = clamp((d - charStart) / (charEnd - charStart), 0, 1)
        const easedEnter = cubicBezier(0.12, 1, 0.72, 1, enterP)

        // Exit (d: 0.88 → 1.0)
        const exitStart = 0.88 + i * 0.003
        const exitEnd = exitStart + 0.04
        const exitP = clamp((d - exitStart) / (exitEnd - exitStart), 0, 1)
        const easedExit = cubicBezier(0.45, 0, 0.55, 1, exitP)

        const opacity = easedEnter * (1 - easedExit)
        const blurIn = (1 - easedEnter) * 16
        const blurOut = easedExit * 12
        const yIn = (1 - easedEnter) * 10
        const yOut = easedExit * -14

        span.style.opacity = String(opacity)
        span.style.filter = `blur(${(blurIn + blurOut).toFixed(1)}px)`
        span.style.transform = `translateY(${yIn + yOut}px)`
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [petalConfigs])

  const chars = useMemo(() => HEADING.split(''), [])

  return (
    <section
      ref={sectionRef}
      data-section="petal-ribbon"
      style={{ height: '280vh', position: 'relative' }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: '100dvh',
          overflow: 'hidden',
        }}
      >
        {/* Background image */}
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
        {/* Dark overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(8, 5, 2, 0.55)',
            zIndex: 1,
          }}
        />

        {/* Petals */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden' }}>
          {petalConfigs.map((cfg, i) => (
            <img
              key={i}
              ref={(el) => { if (el) petalsRef.current[i] = el }}
              src={cfg.src}
              alt=""
              style={{
                position: 'absolute',
                top: `${cfg.startY}%`,
                left: 0,
                width: cfg.size,
                height: 'auto',
                opacity: 0,
                mixBlendMode: 'screen',
                pointerEvents: 'none',
                willChange: 'transform, opacity',
              }}
            />
          ))}
        </div>

        {/* Three.js Ribbon */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
          <ThreeRibbon progressRef={progressRef} />
        </div>

        {/* Heading */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 4,
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
                ref={(el) => { if (el) charsRef.current[i] = el }}
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
  )
}

// Simple cubic bezier approximation
function cubicBezier(x1: number, y1: number, x2: number, y2: number, t: number): number {
  // Newton-Raphson approximation for cubic bezier
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by

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
