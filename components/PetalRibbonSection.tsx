'use client'
import { useEffect, useRef, useMemo } from 'react'
import { clamp } from '@/lib/scrollUtils'
import dynamic from 'next/dynamic'

const ThreeRibbon = dynamic(() => import('./ThreeRibbon'), { ssr: false })

const HEADING = 'Silk Bazaar surfaces.'

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

    function add(p: Partial<PetalConfig>) {
      petals.push({
        src: `/petals/petal-${(petals.length % 7) + 1}.png`,
        size: p.size ?? 150,
        startY: p.startY ?? 50,
        speed: p.speed ?? 1,
        swayAmp: p.swayAmp ?? 15,
        swayFreq: p.swayFreq ?? 1,
        rotation: p.rotation ?? 60,
        enterStart: p.enterStart ?? 0,
        enterEnd: p.enterEnd ?? 0.1,
        exitStart: p.exitStart ?? 0.15,
        exitEnd: p.exitEnd ?? 0.25,
        blur: p.blur ?? 0,
        zIndex: p.zIndex ?? 2,
      })
    }

    // === PHASE 1: Trickle (d 0.00-0.12) — 3 small scouts ===
    add({ size: 90,  startY: 20, speed: 1.1, enterStart: 0.00, enterEnd: 0.04, exitStart: 0.08, exitEnd: 0.14, swayAmp: 20, rotation: 50 })
    add({ size: 75,  startY: 55, speed: 1.2, enterStart: 0.01, enterEnd: 0.05, exitStart: 0.09, exitEnd: 0.15, swayAmp: 25, rotation: 70 })
    add({ size: 100, startY: 80, speed: 1.0, enterStart: 0.02, enterEnd: 0.06, exitStart: 0.10, exitEnd: 0.16, swayAmp: 18, rotation: 40 })

    // === PHASE 2: Building (d 0.06-0.20) — 8 medium, filling vertical space ===
    const buildYs = [5, 15, 28, 40, 52, 65, 75, 90]
    buildYs.forEach((y, i) => {
      add({
        size: 110 + (i % 3) * 30,
        startY: y,
        speed: 0.9 + (i % 4) * 0.08,
        enterStart: 0.06 + i * 0.008,
        enterEnd: 0.10 + i * 0.008,
        exitStart: 0.16 + i * 0.006,
        exitEnd: 0.24 + i * 0.006,
        swayAmp: 12 + (i % 3) * 6,
        swayFreq: 0.8 + (i % 4) * 0.15,
        rotation: 40 + i * 12,
      })
    })

    // === PHASE 3: Swarm (d 0.12-0.32) — 24 petals, dense, covering every area ===
    // Grid: 6 columns x 4 rows of Y positions, staggered entry
    const swarmYs = [2, 10, 18, 26, 34, 42, 50, 58, 66, 74, 82, 90,
                     6, 14, 22, 30, 38, 46, 54, 62, 70, 78, 86, 94]
    swarmYs.forEach((y, i) => {
      const row = Math.floor(i / 6)
      add({
        size: 130 + (i % 5) * 25,
        startY: y,
        speed: 0.75 + (i % 6) * 0.06,
        enterStart: 0.12 + i * 0.004,
        enterEnd: 0.17 + i * 0.004,
        exitStart: 0.26 + row * 0.01,
        exitEnd: 0.34 + row * 0.01,
        swayAmp: 10 + (i % 4) * 5,
        swayFreq: 0.6 + (i % 5) * 0.12,
        rotation: 30 + i * 8,
        blur: i % 3 === 0 ? 2 : 0,
      })
    })

    // === PHASE 4: Close-up curtain (d 0.28-0.42) — 4 huge blurred petals ===
    // Each covers a QUADRANT of the screen, NOT overlapping each other
    // Top-left
    add({ size: 1200, startY: -15, speed: 0.35, enterStart: 0.28, enterEnd: 0.33, exitStart: 0.40, exitEnd: 0.48, blur: 20, swayAmp: 4, swayFreq: 0.2, rotation: 8, zIndex: 10 })
    // Top-right — starts further right so it covers right side
    add({ size: 1100, startY: -10, speed: 0.25, enterStart: 0.29, enterEnd: 0.34, exitStart: 0.41, exitEnd: 0.49, blur: 24, swayAmp: 3, swayFreq: 0.15, rotation: 5, zIndex: 10 })
    // Bottom-left
    add({ size: 1300, startY: 45, speed: 0.30, enterStart: 0.30, enterEnd: 0.35, exitStart: 0.42, exitEnd: 0.50, blur: 22, swayAmp: 5, swayFreq: 0.25, rotation: 6, zIndex: 10 })
    // Bottom-right
    add({ size: 1150, startY: 50, speed: 0.22, enterStart: 0.31, enterEnd: 0.36, exitStart: 0.43, exitEnd: 0.51, blur: 26, swayAmp: 3, swayFreq: 0.18, rotation: 4, zIndex: 10 })

    return petals
  }, [])
}

export default function PetalRibbonSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const charsRef = useRef<(HTMLSpanElement | null)[]>([])
  const petalsRef = useRef<(HTMLImageElement | null)[]>([])
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

      // Ribbon bg: fades in ONLY once close-up petals are fully covering (d 0.35-0.45)
      if (ribbonBgRef.current) {
        const bgOpacity = clamp((d - 0.35) / 0.10, 0, 1)
        ribbonBgRef.current.style.opacity = String(bgOpacity)
      }

      // Petals
      for (let i = 0; i < petalsRef.current.length; i++) {
        const petal = petalsRef.current[i]
        if (!petal) continue
        const cfg = petalConfigs[i]

        const enterP = clamp((d - cfg.enterStart) / (cfg.enterEnd - cfg.enterStart), 0, 1)
        const exitP = clamp((d - cfg.exitStart) / (cfg.exitEnd - cfg.exitStart), 0, 1)
        const alpha = enterP * (1 - exitP)

        // Travel: petals drift from right (100vw) to left (-40vw)
        const totalDuration = cfg.exitEnd - cfg.enterStart
        const combinedProgress = clamp((d - cfg.enterStart) / totalDuration, 0, 1)
        const petalX = 100 - combinedProgress * 140 * cfg.speed

        const swayPhase = combinedProgress * cfg.swayFreq * Math.PI * 4
        const swayY = Math.sin(swayPhase) * cfg.swayAmp
        const rot = combinedProgress * cfg.rotation

        const blurAmount = cfg.blur * alpha

        petal.style.transform = `translate(${petalX}vw, ${swayY}px) rotate(${rot}deg)`
        petal.style.opacity = String(clamp(alpha, 0, 1))
        petal.style.filter = blurAmount > 0.5 ? `blur(${blurAmount.toFixed(1)}px)` : 'none'
      }

      // Heading chars — enter d 0.52-0.72
      for (let i = 0; i < charsRef.current.length; i++) {
        const span = charsRef.current[i]
        if (!span) continue
        const charStart = 0.52 + i * 0.003
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
      }
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
        {/* Ribbon bg — only visible after close-up petals cover screen */}
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

        {/* Petals */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', overflow: 'hidden' }}>
          {petalConfigs.map((cfg, i) => (
            <img
              key={i}
              ref={(el) => { petalsRef.current[i] = el }}
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

        {/* Three.js Ribbon */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
          <ThreeRibbon progressRef={progressRef} />
        </div>

        {/* Heading */}
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
