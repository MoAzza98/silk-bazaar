'use client'
import { useEffect, useRef, useMemo, useState } from 'react'
import { clamp } from '@/lib/scrollUtils'
import dynamic from 'next/dynamic'

const ThreeRibbon = dynamic(() => import('./ThreeRibbon'), { ssr: false })

const HEADING = 'Silk Bazaar surfaces.'

// ====== SMALL PETAL CONFIG (canvas-rendered) ======
interface SmallPetal {
  imgIdx: number
  size: number
  startY: number
  speed: number
  swayAmp: number
  swayFreq: number
  rotation: number
  enterStart: number
  exitEnd: number
}

function generateSmallPetals(): SmallPetal[] {
  const petals: SmallPetal[] = []
  // 200 small petals, exponential density
  // Spread across d 0.00 - 0.25 (was 0-0.10, now 2.5x slower)
  for (let i = 0; i < 200; i++) {
    const t = i / 200
    const enterStart = t * t * 0.25
    petals.push({
      imgIdx: i % 7,
      size: 60 + (i % 5) * 30,
      startY: (i * 137 % 200) / 200,
      speed: 0.7 + (i % 8) * 0.08,
      swayAmp: 8 + (i % 6) * 4,
      swayFreq: 0.5 + (i % 5) * 0.2,
      rotation: (i * 47) % 360,
      enterStart,
      exitEnd: enterStart + 0.12 + (i % 3) * 0.04, // longer lifespan
    })
  }
  return petals
}

// ====== BIG PETAL CONFIG (DOM for CSS blur + transform) ======
interface BigPetal {
  src: string
  size: number
  gridY: number
  enterStart: number
  exitEnd: number
  driftSpeed: number // how fast it moves across (vw per d unit)
  startX: number     // starting X in vw (off-screen right)
  blurStartRatio: number // fraction of lifespan where blur starts (e.g. 0.7)
}

function generateBigPetals(): BigPetal[] {
  // 10 big petals — each drifts continuously from right to left
  // Heavily staggered entry times and varied speeds for natural feel
  // They all pass through the center covering the screen, then continue left
  const defs: Omit<BigPetal, 'src'>[] = [
    // Row 1 top — fast mover, arrives early
    { size: 1000, gridY: -15, enterStart: 0.14, exitEnd: 0.42, driftSpeed: 220, startX: 110, blurStartRatio: 0.65 },
    // Row 1 top-right — slower, arrives later
    { size: 900,  gridY: -8,  enterStart: 0.19, exitEnd: 0.50, driftSpeed: 180, startX: 120, blurStartRatio: 0.70 },
    // Row 2 — medium speed, early
    { size: 1100, gridY: 10,  enterStart: 0.16, exitEnd: 0.46, driftSpeed: 200, startX: 105, blurStartRatio: 0.68 },
    // Row 2 right — fast, late
    { size: 950,  gridY: 18,  enterStart: 0.22, exitEnd: 0.48, driftSpeed: 240, startX: 130, blurStartRatio: 0.62 },
    // Row 3 center — slowest, arrives mid
    { size: 1200, gridY: 32,  enterStart: 0.18, exitEnd: 0.52, driftSpeed: 160, startX: 100, blurStartRatio: 0.72 },
    // Row 3 right — fast
    { size: 1000, gridY: 40,  enterStart: 0.24, exitEnd: 0.50, driftSpeed: 250, startX: 125, blurStartRatio: 0.60 },
    // Row 4 — medium
    { size: 1100, gridY: 55,  enterStart: 0.17, exitEnd: 0.48, driftSpeed: 190, startX: 115, blurStartRatio: 0.67 },
    // Row 4 right — slow, late
    { size: 950,  gridY: 60,  enterStart: 0.25, exitEnd: 0.54, driftSpeed: 170, startX: 135, blurStartRatio: 0.72 },
    // Row 5 bottom — early fast
    { size: 1050, gridY: 75,  enterStart: 0.15, exitEnd: 0.44, driftSpeed: 210, startX: 108, blurStartRatio: 0.66 },
    // Row 5 bottom-right — latest, slow
    { size: 1150, gridY: 80,  enterStart: 0.26, exitEnd: 0.56, driftSpeed: 150, startX: 140, blurStartRatio: 0.75 },
  ]

  return defs.map((def, i) => ({
    ...def,
    src: `/petals/petal-${(i % 7) + 1}.png`,
  }))
}

export default function PetalRibbonSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const charsRef = useRef<(HTMLSpanElement | null)[]>([])
  const bigPetalsRef = useRef<(HTMLImageElement | null)[]>([])
  const ribbonBgRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0)
  const petalImagesRef = useRef<HTMLImageElement[]>([])
  const [imagesLoaded, setImagesLoaded] = useState(false)

  const smallPetals = useMemo(() => generateSmallPetals(), [])
  const bigPetals = useMemo(() => generateBigPetals(), [])

  // Preload petal images AND ribbon-bg so there's no hiccup when revealing
  useEffect(() => {
    let loaded = 0
    const totalToLoad = 8 // 7 petals + 1 ribbon bg
    const images: HTMLImageElement[] = []

    // Preload ribbon background first
    const ribbonImg = new Image()
    ribbonImg.src = '/ribbon-bg.jpg'
    ribbonImg.onload = () => {
      loaded++
      if (loaded === totalToLoad) {
        petalImagesRef.current = images
        setImagesLoaded(true)
      }
    }

    // Preload petal images
    for (let i = 0; i < 7; i++) {
      const img = new Image()
      img.src = `/petals/petal-${i + 1}.png`
      img.onload = () => {
        loaded++
        if (loaded === totalToLoad) {
          petalImagesRef.current = images
          setImagesLoaded(true)
        }
      }
      images.push(img)
    }
  }, [])

  useEffect(() => {
    if (!imagesLoaded) return

    function resizeCanvas() {
      const canvas = canvasRef.current
      const container = sectionRef.current?.querySelector('.petal-sticky') as HTMLElement
      if (!canvas || !container) return
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width = container.clientWidth * dpr
      canvas.height = container.clientHeight * dpr
      canvas.style.width = container.clientWidth + 'px'
      canvas.style.height = container.clientHeight + 'px'
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    function onScroll() {
      const el = sectionRef.current
      if (!el) return
      const top = el.getBoundingClientRect().top
      const height = el.offsetHeight
      const vh = window.innerHeight
      // Start petals when section is still 40vh from reaching viewport top
      // This means petals begin while the manifesto is still blurring out
      const earlyStart = vh * 0.4
      const d = clamp((-top + earlyStart) / (height - vh + earlyStart), 0, 1)
      progressRef.current = d

      // === RIBBON BG: gradual fizzle-in behind the petals ===
      if (ribbonBgRef.current) {
        const bgOpacity = clamp((d - 0.24) / 0.16, 0, 1)
        ribbonBgRef.current.style.opacity = String(bgOpacity)
      }

      // === SMALL PETALS on canvas ===
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (ctx && canvas) {
        const cw = canvas.width
        const ch = canvas.height
        ctx.clearRect(0, 0, cw, ch)

        for (let i = 0; i < smallPetals.length; i++) {
          const p = smallPetals[i]
          if (d < p.enterStart || d > p.exitEnd) continue

          const lifespan = p.exitEnd - p.enterStart
          const progress = (d - p.enterStart) / lifespan
          const fadeIn = clamp(progress / 0.2, 0, 1)
          const fadeOut = clamp((1 - progress) / 0.2, 0, 1)
          let alpha = fadeIn * fadeOut

          const x = cw * (1.1 - progress * 1.5 * p.speed)
          const y = p.startY * ch + Math.sin(progress * p.swayFreq * Math.PI * 4) * p.swayAmp
          const rot = progress * p.rotation * (Math.PI / 180)
          const size = p.size * (cw / 1440)

          // Edge fade: fade out near all 4 screen edges
          const edgeMargin = cw * 0.1 // 10% of width
          const edgeMarginY = ch * 0.08
          const edgeFadeL = clamp(x / edgeMargin, 0, 1)
          const edgeFadeR = clamp((cw - x) / edgeMargin, 0, 1)
          const edgeFadeT = clamp(y / edgeMarginY, 0, 1)
          const edgeFadeB = clamp((ch - y) / edgeMarginY, 0, 1)
          alpha *= edgeFadeL * edgeFadeR * edgeFadeT * edgeFadeB

          if (alpha < 0.01) continue

          const img = petalImagesRef.current[p.imgIdx]
          if (!img) continue

          ctx.save()
          ctx.globalAlpha = alpha
          ctx.translate(x, y)
          ctx.rotate(rot)
          ctx.drawImage(img, -size / 2, -size / 2, size, size)
          ctx.restore()
        }
      }

      // === BIG PETALS — continuous drift from right to left, never parks ===
      for (let i = 0; i < bigPetalsRef.current.length; i++) {
        const el = bigPetalsRef.current[i]
        if (!el) continue
        const cfg = bigPetals[i]

        const lifespan = cfg.exitEnd - cfg.enterStart
        const lifeP = clamp((d - cfg.enterStart) / lifespan, 0, 1)

        // Continuous X position: starts at startX vw, drifts left at driftSpeed
        const xPos = cfg.startX - lifeP * cfg.driftSpeed

        // Opacity: quick fade in at start, fade out at end
        const fadeIn = clamp(lifeP / 0.15, 0, 1)
        const fadeOut = clamp((1 - lifeP) / 0.15, 0, 1)
        let alpha = fadeIn * fadeOut

        // Big petals are exempt from edge fading — they should cover the full screen

        // Blur: starts at blurStartRatio through the lifespan
        const blurP = clamp((lifeP - cfg.blurStartRatio) / (1 - cfg.blurStartRatio), 0, 1)
        const blur = blurP * 30

        el.style.opacity = String(clamp(alpha, 0, 1))
        el.style.filter = blur > 0.5 ? `blur(${blur.toFixed(0)}px)` : 'none'
        el.style.transform = `translateX(${xPos}vw)`
      }

      // === HEADING CHARS — enter d 0.55-0.75 ===
      for (let i = 0; i < charsRef.current.length; i++) {
        const span = charsRef.current[i]
        if (!span) continue
        const charStart = 0.55 + i * 0.003
        const charEnd = charStart + 0.06
        const enterP = clamp((d - charStart) / (charEnd - charStart), 0, 1)
        const easedEnter = cubicBezier(0.12, 1, 0.72, 1, enterP)

        const exitStart = 0.88 + i * 0.003
        const exitEnd = exitStart + 0.04
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
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [imagesLoaded, smallPetals, bigPetals])

  const chars = useMemo(() => HEADING.split(''), [])

  return (
    <section
      ref={sectionRef}
      data-section="petal-ribbon"
      style={{ height: '600vh', position: 'relative' }}
    >
      <div
        className="petal-sticky"
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
          style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0, transition: 'none' }}
        >
          <img
            src="/ribbon-bg.jpg"
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(8, 5, 2, 0.55)' }} />
        </div>

        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}
        />

        <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none', overflow: 'hidden' }}>
          {bigPetals.map((cfg, i) => (
            <img
              key={i}
              ref={(el) => { bigPetalsRef.current[i] = el }}
              src={cfg.src}
              alt=""
              style={{
                position: 'absolute',
                left: 0,
                top: `${cfg.gridY}%`,
                width: cfg.size,
                height: 'auto',
                opacity: 0,
                pointerEvents: 'none',
                willChange: 'transform, opacity, filter',
              }}
            />
          ))}
        </div>

        <div style={{ position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none' }}>
          <ThreeRibbon progressRef={progressRef} />
        </div>

        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 7,
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
