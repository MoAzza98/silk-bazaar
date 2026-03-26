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

// Very gradual bleed — fade starts deep inside the image (25-30% in)
// and transitions slowly to transparent. Big blur radius, organic feel.
const EDGE_MASK = [
  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 8%, rgba(0,0,0,0.7) 18%, black 30%, black 70%, rgba(0,0,0,0.7) 82%, rgba(0,0,0,0.3) 92%, transparent 100%)',
  'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 6%, rgba(0,0,0,0.8) 15%, black 28%, black 72%, rgba(0,0,0,0.8) 85%, rgba(0,0,0,0.4) 94%, transparent 100%)',
].join(', ')

export default function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const imageWrapRef = useRef<HTMLDivElement>(null)
  const pixelAnimRef = useRef<number | null>(null)
  const [verbIndex, setVerbIndex] = useState(0)
  const [verbState, setVerbState] = useState<'in' | 'out'>('in')
  const [loaded, setLoaded] = useState(false)

  // Card animation using refs for smooth DOM manipulation
  const cardTrackRef = useRef<HTMLDivElement>(null)
  const cardBaseRef = useRef(0)
  const [cardBase, setCardBase] = useState(0)
  const slidingRef = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Pixelation sweep — thick strip, slow, fully exits top
  const runPixelSweep = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img || !img.complete) return

    const w = canvas.width
    const h = canvas.height
    const duration = 1800 // slower
    const stripHeight = h * 0.35 // much thicker
    const start = performance.now()

    function animatePixel(now: number) {
      const currentCtx = canvasRef.current?.getContext('2d')
      const currentImg = imgRef.current
      if (!currentCtx || !currentImg) return

      const elapsed = now - start
      const progress = clamp(elapsed / duration, 0, 1)
      // Smooth linear with slight ease
      const eased = progress < 0.3
        ? (progress / 0.3) * (progress / 0.3) * 0.3
        : 0.3 + (progress - 0.3) / 0.7 * 0.7

      // Strip travels from below the image to above it (fully exits)
      // Start: center at h + stripHeight/2 (below image)
      // End: center at -stripHeight/2 (above image, fully gone)
      const totalTravel = h + stripHeight
      const stripCenter = h + stripHeight / 2 - eased * totalTravel

      const top = Math.max(0, stripCenter - stripHeight / 2)
      const bottom = Math.min(h, stripCenter + stripHeight / 2)

      currentCtx.clearRect(0, 0, w, h)

      if (bottom > top && top < h && bottom > 0) {
        const blockSize = 8
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

  // Card slide using direct DOM manipulation for smoothness
  const slideCards = useCallback(() => {
    if (slidingRef.current) return
    slidingRef.current = true

    const track = cardTrackRef.current
    if (!track) { slidingRef.current = false; return }

    const cards = track.children
    if (cards.length < 4) { slidingRef.current = false; return }

    // Measure the first card height
    const firstCard = cards[0] as HTMLElement
    const cardH = firstCard.offsetHeight + 6 // + gap

    // Apply slide transition
    track.style.transition = 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)'
    track.style.transform = `translateY(-${cardH}px)`

    // Fade/blur the exiting top card
    const exitCard = cards[0] as HTMLElement
    exitCard.style.transition = 'opacity 800ms ease, filter 800ms ease'
    exitCard.style.opacity = '0'
    exitCard.style.filter = 'blur(6px)'

    // Fade in the entering bottom card
    const enterCard = cards[3] as HTMLElement
    enterCard.style.transition = 'opacity 800ms ease, filter 800ms ease'
    enterCard.style.opacity = '1'
    enterCard.style.filter = 'blur(0px)'

    // After animation completes, snap state
    setTimeout(() => {
      // Reset track position without transition
      track.style.transition = 'none'
      track.style.transform = 'translateY(0)'

      // Update React state to shift the window
      cardBaseRef.current = (cardBaseRef.current + 1) % LISTINGS.length
      setCardBase(cardBaseRef.current)

      // Reset card styles
      requestAnimationFrame(() => {
        const newCards = track.children
        for (let i = 0; i < newCards.length; i++) {
          const c = newCards[i] as HTMLElement
          c.style.transition = 'none'
          c.style.opacity = i < 3 ? '1' : '0'
          c.style.filter = 'blur(0px)'
        }
        slidingRef.current = false
      })
    }, 950)
  }, [])

  // Verb rotation + card slide + pixelation
  useEffect(() => {
    const interval = setInterval(() => {
      setVerbState('out')
      runPixelSweep()
      slideCards()

      setTimeout(() => {
        setVerbIndex((i) => (i + 1) % VERBS.length)
        setVerbState('in')
      }, 600)
    }, 3000)
    return () => clearInterval(interval)
  }, [runPixelSweep, slideCards])

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

  // 4 card indices: 3 visible + 1 hidden entering from bottom
  const cardIndices = [0, 1, 2, 3].map((i) => (cardBase + i) % LISTINGS.length)

  return (
    <section
      ref={sectionRef}
      style={{
        minHeight: '100vh',
        position: 'relative',
        background: 'var(--color-bg)',
      }}
    >
      {/* Hero image — ~85% of viewport, slightly left of center, deep gradual bleed */}
      <div
        ref={imageWrapRef}
        style={{
          position: 'absolute',
          top: -20,
          left: '-3%',
          width: '88%',
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
            opacity: 0.9,
            maskImage: EDGE_MASK,
            WebkitMaskImage: EDGE_MASK,
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
            maskImage: EDGE_MASK,
            WebkitMaskImage: EDGE_MASK,
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
          <div style={{ overflow: 'hidden', position: 'relative' }}>
            <div
              ref={cardTrackRef}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {cardIndices.map((listingIdx, i) => {
                const card = LISTINGS[listingIdx]
                const num = String(listingIdx + 1).padStart(2, '0')
                return (
                  <div
                    key={`slot-${i}`}
                    style={{
                      background: 'rgba(245, 237, 228, 0.65)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '1px solid var(--color-mauve)',
                      borderRadius: 4,
                      padding: '14px 16px',
                      opacity: i < 3 ? 1 : 0,
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
            {/* Taller container so descenders and tall letters aren't clipped */}
            <div style={{ position: 'relative', height: 110, overflow: 'hidden' }} className="hero-verb-wrap">
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
          .hero-verb-wrap { height: 60px !important; }
        }
      `}</style>
    </section>
  )
}
