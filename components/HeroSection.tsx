'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { clamp } from '@/lib/scrollUtils'

const VERBS = ['discovers', 'surfaces', 'auctions', 'acquires', 'scales', 'connects', 'activates']

const LISTINGS = [
  { num: '01', body: 'NFT community of 12k with active Discord and daily engagement', tag: '/auction' },
  { num: '02', body: 'DeFi protocol — audited contracts, 800 wallets, needs distribution', tag: '/auction' },
  { num: '03', body: 'Gaming guild with tournament history and 3k Twitter followers', tag: '/auction' },
  { num: '04', body: 'Meme token brand — strong visual identity, 5k holders, dormant team', tag: '/auction' },
  { num: '05', body: 'Web3 newsletter with 15k subscribers, 42% open rate', tag: '/auction' },
  { num: '06', body: 'Layer-2 tooling project, GitHub active, no marketing muscle', tag: '/auction' },
  { num: '07', body: 'NFT launchpad — infrastructure complete, no deal flow', tag: '/auction' },
  { num: '08', body: 'DAO with 2.1M treasury, governance fatigue, needs operator', tag: '/auction' },
]

export default function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [verbIndex, setVerbIndex] = useState(0)
  const [verbState, setVerbState] = useState<'in' | 'out'>('in')
  const [cardOffset, setCardOffset] = useState(0)
  const [loaded, setLoaded] = useState(false)

  // Load-in animation
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Verb rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setVerbState('out')
      setTimeout(() => {
        setVerbIndex((i) => (i + 1) % VERBS.length)
        setVerbState('in')
      }, 600)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Card cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setCardOffset((o) => (o + 1) % LISTINGS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Pixelation scroll effect
  const handleScroll = useCallback(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!section || !canvas || !img || !img.complete) return

    const heroScrollBudget = window.innerHeight * 0.8
    const progress = clamp(window.scrollY / heroScrollBudget, 0, 1)

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    if (progress < 0.01) {
      ctx.clearRect(0, 0, w, h)
      return
    }

    const blockSize = Math.max(2, Math.round(4 + progress * 20))
    const threshold = progress * h

    // Draw pixelated portion (top to threshold)
    const smallW = Math.ceil(w / blockSize)
    const smallH = Math.ceil(h / blockSize)

    const offscreen = document.createElement('canvas')
    offscreen.width = smallW
    offscreen.height = smallH
    const offCtx = offscreen.getContext('2d')
    if (!offCtx) return

    offCtx.drawImage(img, 0, 0, smallW, smallH)

    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, w, threshold)
    ctx.clip()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(offscreen, 0, 0, w, h)
    ctx.restore()
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Resize canvas to match image
  useEffect(() => {
    function resize() {
      const img = imgRef.current
      const canvas = canvasRef.current
      if (!img || !canvas) return
      canvas.width = img.clientWidth * (window.devicePixelRatio > 1 ? 2 : 1)
      canvas.height = img.clientHeight * (window.devicePixelRatio > 1 ? 2 : 1)
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [loaded])

  const visibleCards = [0, 1, 2].map((i) => LISTINGS[(cardOffset + i) % LISTINGS.length])

  return (
    <section
      ref={sectionRef}
      style={{
        minHeight: '100vh',
        paddingBottom: '80vh',
        position: 'relative',
        background: 'var(--color-bg)',
      }}
    >
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          maxWidth: 'var(--max-page)',
          margin: '0 auto',
          padding: '120px 32px 0',
          gap: 40,
          position: 'relative',
        }}
      >
        {/* Left — query cards */}
        <div className="hero-cards-col" style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
          {visibleCards.map((card, i) => (
            <div
              key={`${card.num}-${cardOffset}-${i}`}
              style={{
                background: 'rgba(245, 237, 228, 0.72)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '0.5px solid rgba(201,149,108,0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                animation: 'cardFadeIn 500ms ease-out',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 400, fontSize: 11, color: 'var(--color-gold)' }}>
                  {card.num}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 11, color: 'var(--color-twilight)' }}>
                  {card.tag}
                </span>
              </div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {card.body}
              </p>
            </div>
          ))}
        </div>

        {/* Right — hero image + headline */}
        <div
          style={{
            width: '60%',
            position: 'relative',
            borderRadius: 16,
            overflow: 'hidden',
            minHeight: '70vh',
          }}
          className="hero-image-col"
        >
          <img
            ref={imgRef}
            src="/hero-bg.jpg"
            alt=""
            onLoad={() => handleScroll()}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.9,
              maskImage: 'radial-gradient(ellipse 80% 80% at 60% 50%, black 40%, transparent 85%)',
              WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 60% 50%, black 40%, transparent 85%)',
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
              maskImage: 'radial-gradient(ellipse 80% 80% at 60% 50%, black 40%, transparent 85%)',
              WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 60% 50%, black 40%, transparent 85%)',
            }}
          />

          {/* Headline overlay */}
          <div
            className={`load-fade ${loaded ? 'loaded-in' : ''}`}
            style={{
              position: 'absolute',
              top: '50%',
              right: '10%',
              transform: 'translateY(-50%)',
              textAlign: 'right',
              transition: 'opacity 1200ms ease, filter 1200ms ease',
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: 96, lineHeight: 1.05, color: '#1a1208' }} className="hero-title">
              Silk Bazaar
            </div>
            <div style={{ position: 'relative', height: 100, overflow: 'hidden' }} className="hero-verb-wrap">
              <span
                key={verbIndex}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 300,
                  fontSize: 96,
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
        @keyframes cardFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 767px) {
          .hero-cards-col { display: none !important; }
          .hero-image-col { width: 100% !important; }
          .hero-title { font-size: 52px !important; }
          .hero-verb { font-size: 52px !important; }
          .hero-verb-wrap { height: 60px !important; }
        }
      `}</style>
    </section>
  )
}
