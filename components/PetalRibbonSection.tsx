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
  gridX: number
  gridY: number
  enterStart: number
  enterEnd: number
  blurStart: number
  exitEnd: number
  startOffX: number // starting X offset in vw (off-screen right)
}

function generateBigPetals(): BigPetal[] {
  const petals: BigPetal[] = []
  // 10 big petals, 2x5 grid
  // Enter at d ~0.20, fully covering by d ~0.28
  // Sharp on screen until d ~0.38, then blur and exit by d ~0.50
  const positions = [
    { x: -0.1, y: -0.15 }, { x: 0.45, y: -0.10 },
    { x: -0.05, y: 0.10 }, { x: 0.50, y: 0.15 },
    { x: -0.1, y: 0.35 }, { x: 0.45, y: 0.38 },
    { x: -0.05, y: 0.55 }, { x: 0.50, y: 0.58 },
    { x: -0.1, y: 0.75 }, { x: 0.45, y: 0.78 },
  ]
  positions.forEach((pos, i) => {
    petals.push({
      src: `/petals/petal-${(i % 7) + 1}.png`,
      size: 800 + (i % 3) * 200,
      gridX: pos.x,
      gridY: pos.y,
      startOffX: 60 + (i % 3) * 20, // start 60-80vw to the right
      enterStart: 0.20 + i * 0.005,
      enterEnd: 0.28 + i * 0.005,
      blurStart: 0.38 + i * 0.005,
      exitEnd: 0.50 + i * 0.005,
    })
  })
  return petals
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

  // Preload petal images
  useEffect(() => {
    let loaded = 0
    const images: HTMLImageElement[] = []
    for (let i = 0; i < 7; i++) {
      const img = new Image()
      img.src = `/petals/petal-${i + 1}.png`
      img.onload = () => {
        loaded++
        if (loaded === 7) {
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
      const d = clamp(-top / (height - vh), 0, 1)
      progressRef.current = d

      // === RIBBON BG: instant swap when big petals fully cover (d >= 0.30) ===
      if (ribbonBgRef.current) {
        ribbonBgRef.current.style.opacity = d >= 0.30 ? '1' : '0'
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
          const alpha = fadeIn * fadeOut
          if (alpha < 0.01) continue

          const x = cw * (1.1 - progress * 1.5 * p.speed)
          const y = p.startY * ch + Math.sin(progress * p.swayFreq * Math.PI * 4) * p.swayAmp
          const rot = progress * p.rotation * (Math.PI / 180)
          const size = p.size * (cw / 1440)

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

      // === BIG PETALS — slide in from right via transform ===
      for (let i = 0; i < bigPetalsRef.current.length; i++) {
        const el = bigPetalsRef.current[i]
        if (!el) continue
        const cfg = bigPetals[i]

        // Enter phase: slide from off-screen right to grid position
        const enterP = clamp((d - cfg.enterStart) / (cfg.enterEnd - cfg.enterStart), 0, 1)
        // Eased slide-in
        const easedEnter = 1 - Math.pow(1 - enterP, 3) // ease-out cubic

        // Blur phase
        const blurP = clamp((d - cfg.blurStart) / (cfg.exitEnd - cfg.blurStart), 0, 1)

        // Opacity: fade in during enter, fade out during blur
        const alpha = clamp(enterP * 3, 0, 1) * (1 - blurP)
        const blur = blurP * 30

        // Transform: start at startOffX vw to the right, ease to 0
        const xOffset = cfg.startOffX * (1 - easedEnter)

        el.style.opacity = String(clamp(alpha, 0, 1))
        el.style.filter = blur > 0.5 ? `blur(${blur.toFixed(0)}px)` : 'none'
        el.style.transform = `translateX(${xOffset}vw)`
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
                left: `${cfg.gridX * 100}%`,
                top: `${cfg.gridY * 100}%`,
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
