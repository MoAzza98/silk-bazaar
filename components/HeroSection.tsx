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
  const [loaded, setLoaded] = useState(false)

  // Card system: render 4 cards, slide them up as a group
  const [cardBase, setCardBase] = useState(0)
  const [slidePhase, setSlidePhase] = useState<'idle' | 'sliding'>('idle')

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Pixelation sweep — strip moves UP, takes 1.2 seconds
  const runPixelSweep = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !img.complete) return

    const w = canvas.width
    const h = canvas.height
    const duration = 1200
    const stripHeight = h * 0.15
    const start = performance.now()

    function animatePixel(now: number) {
      const currentCtx = canvasRef.current?.getContext('2d')
      const currentImg = imgRef.current
      if (!currentCtx || !currentImg) return

      const elapsed = now - start
      const progress = clamp(elapsed / duration, 0, 1)
      // Smooth ease-in-out
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2

      // Strip moves from bottom to top
      const stripCenter = h * (1 - eased)
      const top = Math.max(0, stripCenter - stripHeight / 2)
      const bottom = Math.min(h, stripCenter + stripHeight / 2)

      currentCtx.clearRect(0, 0, w, h)

      if (bottom > top) {
        const blockSize = 10
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
        currentCtx.rect(0, top, w, bottom - top)
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

  // Verb rotation + card slide
  useEffect(() => {
    const interval = setInterval(() => {
      setVerbState('out')
      setSlidePhase('sliding')
      runPixelSweep()

      setTimeout(() => {
        setVerbIndex((i) => (i + 1) % VERBS.length)
        setVerbState('in')
      }, 600)

      // After the slide animation finishes, snap cardBase forward and reset
      setTimeout(() => {
        setCardBase((b) => (b + 1) % LISTINGS.length)
        setSlidePhase('idle')
      }, 900)
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

  // Render 4 cards: indices [cardBase, +1, +2, +3]
  // When idle: cards 0-2 visible, card 3 hidden below
  // When sliding: all shift up, card 0 fades/blurs out, card 3 fades/unblurs in
  const cardIndices = [0, 1, 2, 3].map((i) => (cardBase + i) % LISTINGS.length)
  const CARD_HEIGHT = 118 // approximate card height + gap

  // Aggressive radial fade mask for the image
  const fadeMask = 'radial-gradient(ellipse 72% 75% at 42% 48%, black 30%, transparent 72%)'

  return (
    <section
      ref={sectionRef}
      style={{
        minHeight: '100vh',
        position: 'relative',
        background: 'var(--color-bg)',
      }}
    >
      {/* Hero image — soft bleed from ALL sides */}
      <div
        ref={imageWrapRef}
        style={{
          position: 'absolute',
          top: 20,
          left: '4%',
          width: '58%',
          height: 'calc(100% - 40px)',
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
            opacity: 0.9,
            maskImage: fadeMask,
            WebkitMaskImage: fadeMask,
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
            maskImage: fadeMask,
            WebkitMaskImage: fadeMask,
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
        {/* LEFT — Card stack */}
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
          {/* Clip container — only shows 3 cards worth of height */}
          <div style={{
            height: CARD_HEIGHT * 3,
            overflow: 'hidden',
            position: 'relative',
          }}>
            {/* Inner sliding track — holds 4 cards, shifts up by 1 card height when sliding */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              transform: slidePhase === 'sliding'
                ? `translateY(-${CARD_HEIGHT}px)`
                : 'translateY(0)',
              transition: slidePhase === 'sliding'
                ? 'transform 800ms cubic-bezier(0.25, 1, 0.5, 1)'
                : 'none',
            }}>
              {cardIndices.map((listingIdx, i) => {
                const card = LISTINGS[listingIdx]
                const num = String(listingIdx + 1).padStart(2, '0')
                const isExiting = i === 0
                const isEntering = i === 3

                let cardOpacity = 1
                let cardBlur = '0px'
                if (slidePhase === 'sliding') {
                  if (isExiting) { cardOpacity = 0; cardBlur = '8px' }
                  if (isEntering) { cardOpacity = 1; cardBlur = '0px' }
                }
                if (slidePhase === 'idle' && isEntering) {
                  cardOpacity = 0
                }

                return (
                  <div
                    key={`${listingIdx}-${cardBase}`}
                    style={{
                      background: 'rgba(245, 237, 228, 0.65)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '1px solid var(--color-mauve)',
                      borderRadius: 4,
                      padding: '14px 16px',
                      minHeight: CARD_HEIGHT - 6,
                      opacity: cardOpacity,
                      filter: `blur(${cardBlur})`,
                      transition: slidePhase === 'sliding'
                        ? 'opacity 700ms ease, filter 700ms ease'
                        : 'none',
                    }}
                  >
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontWeight: 500,
                      fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 8,
                    }}>
                      {num}
                    </div>
                    <p style={{
                      fontFamily: 'var(--font-display)', fontWeight: 400,
                      fontSize: 13, color: 'var(--color-text)',
                      lineHeight: 1.5, margin: 0, marginBottom: 10,
                    }}>
                      {card.body}
                    </p>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontWeight: 500,
                      fontSize: 10, color: 'var(--color-twilight)', textAlign: 'right',
                    }}>
                      /query
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

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
                fontFamily: 'var(--font-display)', fontWeight: 300,
                fontSize: 88, lineHeight: 1.05, color: '#1a1208',
              }}
              className="hero-title"
            >
              Silk Bazaar
            </div>
            <div style={{ position: 'relative', height: 95, overflow: 'hidden' }} className="hero-verb-wrap">
              <span
                key={verbIndex}
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 300,
                  fontSize: 88, color: 'var(--color-twilight)',
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
