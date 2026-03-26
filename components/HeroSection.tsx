'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { clamp } from '@/lib/scrollUtils'

const VERBS = ['discovers', 'surfaces', 'auctions', 'acquires', 'scales', 'connects', 'activates']

const LISTINGS = [
  { body: 'NFT community of 12k with active Discord and daily engagement' },
  { body: 'DeFi protocol — audited contracts, 800 wallets, needs distribution' },
  { body: 'Gaming guild with tournament history and 3k Twitter followers' },
  { body: 'Meme token brand — strong visual identity, 5k holders, dormant team' },
  { body: 'Web3 newsletter with 15k subscribers, 42% open rate' },
  { body: 'Layer-2 tooling project, GitHub active, no marketing muscle' },
  { body: 'NFT launchpad — infrastructure complete, no deal flow' },
  { body: 'DAO with 2.1M treasury, governance fatigue, needs operator' },
]

export default function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const imageWrapRef = useRef<HTMLDivElement>(null)
  const pixelAnimRef = useRef<number | null>(null)
  const [verbIndex, setVerbIndex] = useState(0)
  const [verbState, setVerbState] = useState<'in' | 'out'>('in')
  const [cardOffset, setCardOffset] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Pixelation sweep — runs on a timer, not scroll
  const runPixelSweep = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !img.complete) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const duration = 800 // ms for sweep
    const start = performance.now()

    function animatePixel(now: number) {
      const currentCtx = canvasRef.current?.getContext('2d')
      const currentImg = imgRef.current
      if (!currentCtx || !currentImg) return

      const elapsed = now - start
      const progress = clamp(elapsed / duration, 0, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const threshold = eased * h

      if (progress >= 1) {
        setTimeout(() => {
          const c = canvasRef.current?.getContext('2d')
          if (c) c.clearRect(0, 0, w, h)
        }, 200)
        return
      }

      const blockSize = Math.max(2, Math.round(6 + eased * 18))
      const smallW = Math.ceil(w / blockSize)
      const smallH = Math.ceil(h / blockSize)

      const offscreen = document.createElement('canvas')
      offscreen.width = smallW
      offscreen.height = smallH
      const offCtx = offscreen.getContext('2d')
      if (!offCtx) { pixelAnimRef.current = requestAnimationFrame(animatePixel); return }

      offCtx.drawImage(currentImg, 0, 0, smallW, smallH)

      currentCtx.clearRect(0, 0, w, h)
      currentCtx.save()
      currentCtx.beginPath()
      currentCtx.rect(0, 0, w, threshold)
      currentCtx.clip()
      currentCtx.imageSmoothingEnabled = false
      currentCtx.drawImage(offscreen, 0, 0, w, h)
      currentCtx.restore()

      pixelAnimRef.current = requestAnimationFrame(animatePixel)
    }

    if (pixelAnimRef.current) cancelAnimationFrame(pixelAnimRef.current)
    pixelAnimRef.current = requestAnimationFrame(animatePixel)
  }, [])

  // Verb rotation — also triggers pixelation sweep and card shift
  useEffect(() => {
    const interval = setInterval(() => {
      setVerbState('out')
      runPixelSweep()
      setTimeout(() => {
        setVerbIndex((i) => (i + 1) % VERBS.length)
        setCardOffset((o) => (o + 1) % LISTINGS.length)
        setVerbState('in')
      }, 600)
    }, 3000)
    return () => clearInterval(interval)
  }, [runPixelSweep])

  // Resize canvas to match image
  useEffect(() => {
    function resize() {
      const wrap = imageWrapRef.current
      const canvas = canvasRef.current
      if (!wrap || !canvas) return
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width = wrap.clientWidth * dpr
      canvas.height = wrap.clientHeight * dpr
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [loaded])

  // Visible card stack: show 4 cards
  const visibleCards = [0, 1, 2, 3].map((i) => ({
    ...LISTINGS[(cardOffset + i) % LISTINGS.length],
    num: String((cardOffset + i) % LISTINGS.length + 1).padStart(2, '0'),
  }))

  return (
    <section
      ref={sectionRef}
      style={{
        minHeight: '100vh',
        position: 'relative',
        background: 'var(--color-bg)',
      }}
    >
      {/* Hero background image — anchored to LEFT, bleeds off top & left */}
      <div
        ref={imageWrapRef}
        style={{
          position: 'absolute',
          top: -40,
          left: -40,
          width: '60%',
          height: 'calc(100% + 40px)',
          pointerEvents: 'none',
        }}
      >
        <img
          ref={imgRef}
          src="/hero-bg.jpg"
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            opacity: 0.92,
            maskImage: 'linear-gradient(to left, transparent 0%, black 20%, black 100%), linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to left, transparent 0%, black 20%, black 100%), linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
            maskComposite: 'intersect',
            WebkitMaskComposite: 'source-in' as string,
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            maskImage: 'linear-gradient(to left, transparent 0%, black 20%, black 100%), linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to left, transparent 0%, black 20%, black 100%), linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
            maskComposite: 'intersect',
            WebkitMaskComposite: 'source-in' as string,
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          maxWidth: 'var(--max-page)',
          margin: '0 auto',
          padding: '120px 32px 80px',
          gap: 40,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Left — headline (over image) */}
        <div
          style={{
            width: '50%',
            display: 'flex',
            alignItems: 'center',
          }}
          className="hero-text-col"
        >
          <div
            className={`load-fade ${loaded ? 'loaded-in' : ''}`}
            style={{
              transition: 'opacity 1200ms ease, filter 1200ms ease',
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 88, lineHeight: 1.05, color: '#1a1208' }} className="hero-title">
              Silk Bazaar
            </div>
            <div style={{ position: 'relative', height: 95, overflow: 'hidden' }} className="hero-verb-wrap">
              <span
                key={verbIndex}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  fontSize: 88,
                  color: 'var(--color-twilight)',
                  display: 'inline-block',
                  transition: 'transform 600ms cubic-bezier(0.45, 0, 0.55, 1), opacity 600ms cubic-bezier(0.45, 0, 0.55, 1), filter 600ms cubic-bezier(0.45, 0, 0.55, 1)',
                  transform: verbState === 'out' ? 'translateY(-20px)' : 'translateY(0)',
                  opacity: verbState === 'out' ? 0 : 1,
                  filter: verbState === 'out' ? 'blur(12px)' : 'blur(0)',
                }}
                className="hero-verb"
              >
                {VERBS[verbIndex]}
              </span>
            </div>
          </div>
        </div>

        {/* Right — Perplexity-style query cards */}
        <div className="hero-cards-col" style={{ width: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', overflow: 'hidden', minHeight: 280 }}>
            {visibleCards.map((card, i) => (
              <div
                key={`${card.num}-${cardOffset}-${i}`}
                style={{
                  background: 'rgba(255, 255, 255, 0.82)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(201,149,108,0.15)',
                  borderRadius: 14,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  animation: i === 0 ? 'cardSlideIn 500ms ease-out' : undefined,
                  opacity: i === 0 ? 0.6 : 1,
                  transform: i === 0 ? 'scale(0.97)' : undefined,
                }}
              >
                {/* Search icon */}
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 13, color: 'var(--color-text)', lineHeight: 1.45, margin: 0 }}>
                    {card.body}
                  </p>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 10, color: 'var(--color-twilight)', flexShrink: 0, marginTop: 2, opacity: 0.7 }}>
                  {card.num}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes cardSlideIn {
          from { opacity: 0; transform: scale(0.95) translateY(12px); }
          to { opacity: 0.6; transform: scale(0.97) translateY(0); }
        }
        @media (max-width: 767px) {
          .hero-cards-col { display: none !important; }
          .hero-text-col { width: 100% !important; }
          .hero-title { font-size: 48px !important; }
          .hero-verb { font-size: 48px !important; }
          .hero-verb-wrap { height: 55px !important; }
        }
      `}</style>
    </section>
  )
}
