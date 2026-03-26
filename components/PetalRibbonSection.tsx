'use client'
import { useEffect, useRef, useMemo } from 'react'
import { clamp } from '@/lib/scrollUtils'
import dynamic from 'next/dynamic'

const ThreeRibbon = dynamic(() => import('./ThreeRibbon'), { ssr: false })

const HEADING = 'Silk Bazaar surfaces.'

// ====== PETAL WAVE SYSTEM ======
// 3 waves of petals, each wave fully enters and exits the screen:
//   Wave 1 (d 0.00–0.25): A few small petals drift across
//   Wave 2 (d 0.12–0.38): More medium petals, increasing frequency
//   Wave 3 (d 0.28–0.52): 2-3 very large "close-up" petals with gaussian blur
// All petals are transient — they enter from the right and exit left. None linger.
// After wave 3 fades, ribbon-bg is revealed underneath.

interface PetalConfig {
  src: string
  size: number
  startY: number // % from top
  speed: number  // horizontal speed multiplier
  swayAmp: number
  swayFreq: number
  rotation: number
  enterStart: number // d when this petal starts entering
  enterEnd: number   // d when fully on screen
  exitStart: number  // d when it starts leaving
  exitEnd: number    // d when fully gone
  blur: number       // gaussian blur amount (0 for distant, high for close-up)
  zIndex: number
}

function usePetalConfigs(): PetalConfig[] {
  return useMemo(() => {
    const petals: PetalConfig[] = []

    // Wave 1: 4 small petals, scattered
    const wave1: Partial<PetalConfig>[] = [
      { size: 90,  startY: 15, speed: 1.1, enterStart: 0.00, enterEnd: 0.10, exitStart: 0.14, exitEnd: 0.24, blur: 0, swayAmp: 20, swayFreq: 1.2, rotation: 60 },
      { size: 110, startY: 55, speed: 0.9, enterStart: 0.02, enterEnd: 0.12, exitStart: 0.16, exitEnd: 0.25, blur: 0, swayAmp: 15, swayFreq: 0.9, rotation: 90 },
      { size: 80,  startY: 75, speed: 1.3, enterStart: 0.04, enterEnd: 0.13, exitStart: 0.17, exitEnd: 0.26, blur: 0, swayAmp: 25, swayFreq: 1.0, rotation: 45 },
      { size: 100, startY: 35, speed: 1.0, enterStart: 0.06, enterEnd: 0.15, exitStart: 0.19, exitEnd: 0.27, blur: 0, swayAmp: 18, swayFreq: 1.1, rotation: 75 },
    ]

    // Wave 2: 6 medium petals, denser
    const wave2: Partial<PetalConfig>[] = [
      { size: 150, startY: 10, speed: 1.0, enterStart: 0.12, enterEnd: 0.20, exitStart: 0.26, exitEnd: 0.36, blur: 0, swayAmp: 22, swayFreq: 0.8, rotation: 55 },
      { size: 180, startY: 40, speed: 0.85, enterStart: 0.14, enterEnd: 0.22, exitStart: 0.27, exitEnd: 0.37, blur: 0, swayAmp: 18, swayFreq: 1.0, rotation: 80 },
      { size: 140, startY: 65, speed: 1.1, enterStart: 0.15, enterEnd: 0.23, exitStart: 0.28, exitEnd: 0.38, blur: 1, swayAmp: 20, swayFreq: 0.9, rotation: 100 },
      { size: 200, startY: 25, speed: 0.9, enterStart: 0.17, enterEnd: 0.25, exitStart: 0.30, exitEnd: 0.39, blur: 1, swayAmp: 16, swayFreq: 1.1, rotation: 65 },
      { size: 160, startY: 80, speed: 1.05, enterStart: 0.18, enterEnd: 0.26, exitStart: 0.31, exitEnd: 0.40, blur: 0, swayAmp: 24, swayFreq: 0.7, rotation: 40 },
      { size: 170, startY: 50, speed: 0.95, enterStart: 0.20, enterEnd: 0.28, exitStart: 0.32, exitEnd: 0.41, blur: 1, swayAmp: 14, swayFreq: 1.3, rotation: 110 },
    ]

    // Wave 3: 3 very large close-up petals with heavy blur — these "cover" the screen
    const wave3: Partial<PetalConfig>[] = [
      { size: 600, startY: 5,  speed: 0.6, enterStart: 0.28, enterEnd: 0.36, exitStart: 0.42, exitEnd: 0.52, blur: 12, swayAmp: 10, swayFreq: 0.5, rotation: 30, zIndex: 10 },
      { size: 700, startY: 30, speed: 0.5, enterStart: 0.31, enterEnd: 0.38, exitStart: 0.44, exitEnd: 0.53, blur: 16, swayAmp: 8,  swayFreq: 0.4, rotation: 20, zIndex: 10 },
      { size: 650, startY: 55, speed: 0.55, enterStart: 0.33, enterEnd: 0.40, exitStart: 0.46, exitEnd: 0.54, blur: 14, swayAmp: 12, swayFreq: 0.6, rotation: 25, zIndex: 10 },
    ]

    const allWaves = [...wave1, ...wave2, ...wave3]
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

      // ===== REVISED PHASE TIMELINE =====
      // d 0.00–0.27: Wave 1 — few small petals drift across (cream bg)
      // d 0.12–0.41: Wave 2 — more medium petals, building density
      // d 0.28–0.54: Wave 3 — large blurred close-up petals cover screen
      // d 0.40–0.55: ribbon-bg fades in underneath all petals
      // d 0.54–0.72: All petals gone, ribbon-bg fully revealed
      // d 0.55–0.75: Heading chars animate in
      // d 0.55–0.88: Three.js ribbon draws in
      // d 0.88–1.00: Heading chars + ribbon exit

      // Ribbon background opacity
      if (ribbonBgRef.current) {
        const bgOpacity = clamp((d - 0.40) / 0.15, 0, 1)
        ribbonBgRef.current.style.opacity = String(bgOpacity)
      }

      // Petals — all transient, enter from right → exit left
      petalsRef.current.forEach((petal, i) => {
        if (!petal) return
        const cfg = petalConfigs[i]

        // Enter: opacity 0→1, X from +110vw toward center
        const enterP = clamp((d - cfg.enterStart) / (cfg.enterEnd - cfg.enterStart), 0, 1)
        // Exit: opacity 1→0, X continues left off screen
        const exitP = clamp((d - cfg.exitStart) / (cfg.exitEnd - cfg.exitStart), 0, 1)

        const alpha = enterP * (1 - exitP)

        // Horizontal: starts at +110vw, drifts to ~20vw at enterEnd, then continues to -30vw at exitEnd
        const totalTravel = 140 // vw total from right edge to left edge
        const combinedProgress = clamp((d - cfg.enterStart) / (cfg.exitEnd - cfg.enterStart), 0, 1)
        const petalX = 110 - combinedProgress * totalTravel * cfg.speed

        // Sway
        const swayPhase = combinedProgress * cfg.swayFreq * Math.PI * 6
        const swayY = Math.sin(swayPhase) * cfg.swayAmp

        const rot = combinedProgress * cfg.rotation

        // Blur for close-up petals scales with alpha
        const blurAmount = cfg.blur * alpha

        petal.style.transform = `translate(${petalX}vw, ${swayY}px) rotate(${rot}deg) scale(${1 + cfg.blur * 0.02})`
        petal.style.opacity = String(clamp(alpha, 0, 1))
        petal.style.filter = blurAmount > 0.5 ? `blur(${blurAmount.toFixed(1)}px)` : ''
      })

      // Heading chars — enter phase (d: 0.55 → 0.75)
      charsRef.current.forEach((span, i) => {
        if (!span) return
        const charStart = 0.55 + i * 0.003
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
        {/* Ribbon background — starts invisible, fades in once large petals cover the view */}
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
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(8, 5, 2, 0.55)',
            }}
          />
        </div>

        {/* Petals layer */}
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
