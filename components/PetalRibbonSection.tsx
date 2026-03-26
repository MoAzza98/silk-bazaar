'use client'
import { useEffect, useRef, useMemo } from 'react'
import { clamp } from '@/lib/scrollUtils'
import dynamic from 'next/dynamic'

const ThreeRibbon = dynamic(() => import('./ThreeRibbon'), { ssr: false })

const HEADING = 'Silk Bazaar surfaces.'

// ====== PETAL SYSTEM ======
// Exponential increase: 2 → 4 → 8 → then 3 huge close-up blurred ones
// Small/medium petals exit BEFORE the big ones arrive
// Big ones are staggered in Y to cover different screen thirds
// Big ones fade out to reveal the ribbon section underneath

interface PetalConfig {
  src: string
  size: number
  startY: number
  speed: number
  swayAmp: number
  swayFreq: number
  rotation: number
  enterStart: number
  enterEnd: number
  exitStart: number
  exitEnd: number
  blur: number
  zIndex: number
}

function usePetalConfigs(): PetalConfig[] {
  return useMemo(() => {
    const petals: PetalConfig[] = []

    // Trickle: 2 small petals
    const trickle: Partial<PetalConfig>[] = [
      { size: 100, startY: 30, speed: 1.1, enterStart: 0.00, enterEnd: 0.08, exitStart: 0.10, exitEnd: 0.18, blur: 0, swayAmp: 25, swayFreq: 1.1, rotation: 70 },
      { size: 85,  startY: 65, speed: 1.2, enterStart: 0.03, enterEnd: 0.10, exitStart: 0.12, exitEnd: 0.20, blur: 0, swayAmp: 20, swayFreq: 1.3, rotation: 55 },
    ]

    // Building: 4 petals, slightly larger
    const building: Partial<PetalConfig>[] = [
      { size: 130, startY: 12, speed: 1.0, enterStart: 0.08, enterEnd: 0.15, exitStart: 0.19, exitEnd: 0.27, blur: 0, swayAmp: 22, swayFreq: 0.9, rotation: 60 },
      { size: 120, startY: 45, speed: 0.95, enterStart: 0.09, enterEnd: 0.16, exitStart: 0.20, exitEnd: 0.28, blur: 0, swayAmp: 18, swayFreq: 1.0, rotation: 80 },
      { size: 140, startY: 72, speed: 1.05, enterStart: 0.10, enterEnd: 0.17, exitStart: 0.21, exitEnd: 0.29, blur: 0, swayAmp: 24, swayFreq: 0.8, rotation: 90 },
      { size: 110, startY: 88, speed: 1.1, enterStart: 0.11, enterEnd: 0.18, exitStart: 0.22, exitEnd: 0.30, blur: 0, swayAmp: 16, swayFreq: 1.2, rotation: 45 },
    ]

    // Swarm: 8 petals, arriving rapidly
    const swarm: Partial<PetalConfig>[] = [
      { size: 160, startY: 5,  speed: 0.9,  enterStart: 0.16, enterEnd: 0.22, exitStart: 0.28, exitEnd: 0.36, blur: 1, swayAmp: 20, swayFreq: 0.7, rotation: 100 },
      { size: 180, startY: 18, speed: 0.85, enterStart: 0.17, enterEnd: 0.23, exitStart: 0.29, exitEnd: 0.36, blur: 1, swayAmp: 18, swayFreq: 0.9, rotation: 65 },
      { size: 150, startY: 32, speed: 1.0,  enterStart: 0.17, enterEnd: 0.23, exitStart: 0.29, exitEnd: 0.37, blur: 0, swayAmp: 22, swayFreq: 1.0, rotation: 110 },
      { size: 200, startY: 45, speed: 0.8,  enterStart: 0.18, enterEnd: 0.24, exitStart: 0.30, exitEnd: 0.37, blur: 1, swayAmp: 14, swayFreq: 1.1, rotation: 50 },
      { size: 170, startY: 58, speed: 0.95, enterStart: 0.18, enterEnd: 0.24, exitStart: 0.30, exitEnd: 0.38, blur: 0, swayAmp: 26, swayFreq: 0.6, rotation: 85 },
      { size: 190, startY: 70, speed: 0.88, enterStart: 0.19, enterEnd: 0.25, exitStart: 0.31, exitEnd: 0.38, blur: 1, swayAmp: 16, swayFreq: 0.8, rotation: 75 },
      { size: 140, startY: 80, speed: 1.05, enterStart: 0.19, enterEnd: 0.25, exitStart: 0.31, exitEnd: 0.39, blur: 0, swayAmp: 20, swayFreq: 1.0, rotation: 95 },
      { size: 160, startY: 92, speed: 0.9,  enterStart: 0.20, enterEnd: 0.26, exitStart: 0.32, exitEnd: 0.39, blur: 1, swayAmp: 18, swayFreq: 0.9, rotation: 40 },
    ]

    // Close-up: 3 huge blurred petals, each covering a third of the screen vertically
    // These arrive AFTER the swarm, staggered so they tile the screen
    const closeup: Partial<PetalConfig>[] = [
      { size: 900,  startY: -10, speed: 0.45, enterStart: 0.30, enterEnd: 0.38, exitStart: 0.44, exitEnd: 0.53, blur: 18, swayAmp: 6,  swayFreq: 0.3, rotation: 15, zIndex: 10 },
      { size: 1000, startY: 25,  speed: 0.40, enterStart: 0.32, enterEnd: 0.39, exitStart: 0.45, exitEnd: 0.54, blur: 22, swayAmp: 5,  swayFreq: 0.25, rotation: 10, zIndex: 10 },
      { size: 950,  startY: 55,  speed: 0.42, enterStart: 0.34, enterEnd: 0.40, exitStart: 0.46, exitEnd: 0.55, blur: 20, swayAmp: 7,  swayFreq: 0.35, rotation: 12, zIndex: 10 },
    ]

    const allWaves = [...trickle, ...building, ...swarm, ...closeup]
    allWaves.forEach((w, i) => {
      petals.push({
        src: `/petals/petal-${(i % 7) + 1}.png`,
        size: w.size!,
        startY: w.startY!,
        speed: w.speed!,
        swayAmp: w.swayAmp!,
        swayFreq: w.swayFreq!,
        rotation: w.rotation!,
        enterStart: w.enterStart!,
        enterEnd: w.enterEnd!,
        exitStart: w.exitStart!,
        exitEnd: w.exitEnd!,
        blur: w.blur ?? 0,
        zIndex: w.zIndex ?? 2,
      })
    })

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

      // Ribbon bg: fades in while close-up petals are covering
      if (ribbonBgRef.current) {
        const bgOpacity = clamp((d - 0.38) / 0.12, 0, 1)
        ribbonBgRef.current.style.opacity = String(bgOpacity)
      }

      // Petals
      petalsRef.current.forEach((petal, i) => {
        if (!petal) return
        const cfg = petalConfigs[i]

        const enterP = clamp((d - cfg.enterStart) / (cfg.enterEnd - cfg.enterStart), 0, 1)
        const exitP = clamp((d - cfg.exitStart) / (cfg.exitEnd - cfg.exitStart), 0, 1)
        const alpha = enterP * (1 - exitP)

        const totalTravel = 150
        const combinedProgress = clamp((d - cfg.enterStart) / (cfg.exitEnd - cfg.enterStart), 0, 1)
        const petalX = 110 - combinedProgress * totalTravel * cfg.speed

        const swayPhase = combinedProgress * cfg.swayFreq * Math.PI * 6
        const swayY = Math.sin(swayPhase) * cfg.swayAmp
        const rot = combinedProgress * cfg.rotation

        const blurAmount = cfg.blur * alpha

        petal.style.transform = `translate(${petalX}vw, ${swayY}px) rotate(${rot}deg)`
        petal.style.opacity = String(clamp(alpha, 0, 1))
        petal.style.filter = blurAmount > 0.5 ? `blur(${blurAmount.toFixed(1)}px)` : ''
      })

      // Heading chars
      charsRef.current.forEach((span, i) => {
        if (!span) return
        const charStart = 0.55 + i * 0.003
        const charEnd = charStart + 0.06
        const enterP = clamp((d - charStart) / (charEnd - charStart), 0, 1)
        const easedEnter = cubicBezier(0.12, 1, 0.72, 1, enterP)

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
        <div
          ref={ribbonBgRef}
          style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0 }}
        >
          <img
            src="/ribbon-bg.jpg"
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(8, 5, 2, 0.55)' }} />
        </div>

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
                willChange: 'transform, opacity, filter',
                zIndex: cfg.zIndex,
              }}
            />
          ))}
        </div>

        <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
          <ThreeRibbon progressRef={progressRef} />
        </div>

        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 72,
              color: 'var(--color-text-on-dark)', textAlign: 'center',
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
