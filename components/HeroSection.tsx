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
  const [transitioning, setTransitioning] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Pixelation sweep — a STRIP that moves UP the image, not covering it
  const runPixelSweep = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !img.complete) return

    const w = canvas.width
    const h = canvas.height
    const duration = 900
    const stripHeight = h * 0.18 // strip is 18% of image height
    const start = performance.now()

    function animatePixel(now: number) {
      const currentCtx = canvasRef.current?.getContext('2d')
      const currentImg = imgRef.current
      if (!currentCtx || !currentImg) return

      const elapsed = now - start
      const progress = clamp(elapsed / duration, 0, 1)
      // Ease: cubic ease-in-out
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2

      // Strip position moves from bottom to top
      const stripBottom = h - eased * (h + stripHeight)
      const stripTop = stripBottom + stripHeight

      const clampedTop = Math.max(0, stripBottom)
      const clampedBottom = Math.min(h, stripTop)

      currentCtx.clearRect(0, 0, w, h)

      if (clampedBottom > clampedTop) {
        const blockSize = 12
        const smallW = Math.ceil(w / blockSize)
        const smallH = Math.ceil(h / blockSize)

        const offscreen = document.createElement('canvas')
        offscreen.width = smallW
        offscreen.height = smallH
        const offCtx = offscreen.getContext('2d')
        if (!offCtx) { pixelAnimRef.current = requestAnimationFrame(animatePixel); return }

        offCtx.drawImage(currentImg, 0, 0, smallW, smallH)

        currentCtx.save()
        currentCtx.beginPath()
        currentCtx.rect(0, clampedTop, w, clampedBottom - clampedTop)
        currentCtx.clip()
        currentCtx.imageSmoothingEnabled = false
        currentCtx.drawImage(offscreen, 0, 0, w, h)
        currentCtx.restore()
      }

      if (progress < 1) {
        pixelAnimRef.current = requestAnimationFrame(animatePixel)
      }
    }

    if (pixelAnimRef.current) cancelAnimationFrame(pixelAnimRef.current)
    pixelAnimRef.current = requestAnimationFrame(animatePixel)
  }, [])

  // Verb rotation — triggers pixelation sweep and card shift
  useEffect(() => {
    const interval = setInterval(() => {
      setVerbState('out')
      setTransitioning(true)
      runPixelSweep()
      setTimeout(() => {
        setVerbIndex((i) => (i + 1) % VERBS.length)
        setCardOffset((o) => (o + 1) % LISTINGS.length)
        setVerbState('in')
        setTimeout(() => setTransitioning(false), 500)
      }, 600)
    }, 3000)
    return () => clearInterval(interval)
  }, [runPixelSweep])

  // Resize canvas
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

  // Card stack: show 3 cards
  const visibleCards = [0, 1, 2].map((i) => ({
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
      {/* Hero image — slightly left of center, ALL edges fade to background */}
      <div
        ref={imageWrapRef}
        style={{
          position: 'absolute',
          top: 40,
          left: '5%',
          width: '55%',
          height: 'calc(100% - 80px)',
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
            maskImage: 'radial-gradient(ellipse 85% 85% at 45% 50%, black 50%, transparent 90%)',
            WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 45% 50%, black 50%, transparent 90%)',
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
            maskImage: 'radial-gradient(ellipse 85% 85% at 45% 50%, black 50%, transparent 90%)',
            WebkitMaskImage: 'radial-gradient(ellipse 85% 85% at 45% 50%, black 50%, transparent 90%)',
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
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* LEFT — Cards (in the gap between image bleed and left page edge) */}
        <div
          className="hero-cards-col"
          style={{
            width: 260,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            overflow: 'hidden',
            position: 'relative',
          }}>
            {visibleCards.map((card, i) => {
              const isTop = i === 0
              return (
                <div
                  key={`card-${cardOffset}-${i}`}
                  style={{
                    background: 'rgba(245, 237, 228, 0.65)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid var(--color-mauve)',
                    borderRadius: 4,
                    padding: '14px 16px',
                    opacity: isTop && transitioning ? 0 : 1,
                    transform: transitioning
                      ? `translateY(-${isTop ? 20 : 8}px)`
                      : 'translateY(0)',
                    transition: transitioning
                      ? 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 400ms ease-out'
                      : 'none',
                  }}
                >
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 500,
                    fontSize: 11,
                    color: 'var(--color-text-secondary)',
                    marginBottom: 8,
                  }}>
                    {card.num}
                  </div>
                  <p style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 400,
                    fontSize: 13,
                    color: 'var(--color-text)',
                    lineHeight: 1.5,
                    margin: 0,
                    marginBottom: 10,
                  }}>
                    {card.body}
                  </p>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 500,
                    fontSize: 10,
                    color: 'var(--color-twilight)',
                    textAlign: 'right',
                  }}>
                    /query
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Spacer — pushes text to the right */}
        <div style={{ flex: 1 }} />

        {/* RIGHT — Headline text */}
        <div
          style={{
            width: '45%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
          className="hero-text-col"
        >
          <div
            className={`load-fade ${loaded ? 'loaded-in' : ''}`}
            style={{
              textAlign: 'right',
              transition: 'opacity 1200ms ease, filter 1200ms ease',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 300,
                fontSize: 88,
                lineHeight: 1.05,
                color: '#1a1208',
              }}
              className="hero-title"
            >
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
      </div>

      <style>{`
        @media (max-width: 767px) {
          .hero-cards-col { display: none !important; }
          .hero-text-col { width: 100% !important; justify-content: center !important; }
          .hero-title { font-size: 48px !important; }
          .hero-verb { font-size: 48px !important; }
          .hero-verb-wrap { height: 55px !important; }
        }
      `}</style>
    </section>
  )
}
