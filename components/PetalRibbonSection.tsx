'use client'
import { useEffect, useRef, useMemo } from 'react'
import { clamp } from '@/lib/scrollUtils'
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
  swayAmp: number
  swayFreq: number
  rotationSpeed: number
  delay: number
}

function usePetalConfigs(): PetalConfig[] {
  return useMemo(() => {
    const petals: PetalConfig[] = []
    // Use seeded-style random for consistent SSR/client
    const sizes = [100, 140, 180, 220, 260, 300, 160, 200, 120, 280, 150, 240]
    for (let i = 0; i < 12; i++) {
      petals.push({
        src: `/petals/petal-${(i % 7) + 1}.png`,
        size: sizes[i],
        startX: 105 + (i * 7) % 35,
        startY: 5 + (i * 13) % 85,
        speed: 0.6 + (i * 0.08),
        yDrift: -20 + (i * 5) % 40,
        swayAmp: 15 + (i * 3) % 25,
        swayFreq: 0.8 + (i * 0.15) % 1.2,
        rotationSpeed: 40 + (i * 15) % 100,
        delay: i * 0.02,
      })
    }
    return petals
  }, [])
}

export default function PetalRibbonSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const charsRef = useRef<HTMLSpanElement[]>([])
  const petalsRef = useRef<HTMLImageElement[]>([])
  const ribbonBgRef = useRef<HTMLDivElement>(null)
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

      // ===== PHASE TIMELINE =====
      // d 0.00 - 0.35: Petals drift in from the right over CREAM background
      // d 0.35 - 0.50: Petals accumulate, covering screen
      // d 0.40 - 0.55: ribbon-bg image fades in UNDERNEATH the petals
      // d 0.50 - 0.72: Petals drift further left and fade out, revealing ribbon-bg
      // d 0.50 - 0.72: Heading text chars animate in (staggered blur)
      // d 0.58 - 0.88: Three.js ribbon draws in
      // d 0.88 - 1.00: Heading chars exit upward

      // Ribbon background opacity: starts at 0, fades in d 0.35-0.55
      if (ribbonBgRef.current) {
        const bgOpacity = clamp((d - 0.35) / 0.20, 0, 1)
        ribbonBgRef.current.style.opacity = String(bgOpacity)
      }

      // Petals
      petalsRef.current.forEach((petal, i) => {
        if (!petal) return
        const cfg = petalConfigs[i]
        const isEarlyPetal = i < 6

        const enterStart = isEarlyPetal ? cfg.delay : 0.15 + cfg.delay
        const enterEnd = isEarlyPetal ? 0.35 : 0.50
        const exitStart = 0.50
        const exitEnd = 0.72

        const enterProgress = clamp((d - enterStart) / (enterEnd - enterStart), 0, 1)
        const exitProgress = clamp((d - exitStart) / (exitEnd - exitStart), 0, 1)
        const petalAlpha = enterProgress * (1 - exitProgress)

        // Drift from right to center, then continue left on exit
        const driftIn = enterProgress * cfg.startX * cfg.speed
        const driftOut = exitProgress * 40 * cfg.speed
        const petalX = cfg.startX - driftIn - driftOut

        // Swaying Y motion
        const swayPhase = d * cfg.swayFreq * Math.PI * 4
        const swayY = Math.sin(swayPhase) * cfg.swayAmp * enterProgress

        const yBase = cfg.yDrift * enterProgress
        const rotation = d * cfg.rotationSpeed

        petal.style.transform = `translate(${petalX}vw, ${yBase + swayY}px) rotate(${rotation}deg)`
        petal.style.opacity = String(clamp(petalAlpha, 0, 1))
      })

      // Heading chars — enter phase (d: 0.50 → 0.72)
      charsRef.current.forEach((span, i) => {
        if (!span) return
        const charStart = 0.50 + i * 0.003
        const charEnd = charStart + 0.06

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
          background: 'var(--color-bg)',
        }}
      >
        {/* Ribbon background — starts invisible, fades in during phase 3 */}
        <div
          ref={ribbonBgRef}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            opacity: 0,
          }}
        >
          <img
            src="/ribbon-bg.jpg"
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Dark overlay on ribbon image */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(8, 5, 2, 0.55)',
            }}
          />
        </div>

        {/* Petals — on top of everything during entry, z=2 */}
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
