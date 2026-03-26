'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import type { GlimmerHandle } from './GlimmerEffect'

const GlimmerEffect = dynamic(() => import('./GlimmerEffect'), { ssr: false })

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

// Edge bleed mask — gradual fade on all sides
const EDGE_MASK = [
  'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.3) 8%, rgba(0,0,0,0.7) 18%, black 30%, black 70%, rgba(0,0,0,0.7) 82%, rgba(0,0,0,0.3) 92%, transparent 100%)',
  'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 6%, rgba(0,0,0,0.8) 15%, black 28%, black 60%, rgba(0,0,0,0.6) 72%, rgba(0,0,0,0.2) 82%, transparent 90%)',
].join(', ')

export default function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const glimmerRef = useRef<GlimmerHandle>(null)
  const [verbIndex, setVerbIndex] = useState(0)
  const [verbState, setVerbState] = useState<'in' | 'out'>('in')
  const [loaded, setLoaded] = useState(false)

  // Card animation
  const cardTrackRef = useRef<HTMLDivElement>(null)
  const cardBaseRef = useRef(0)
  const [cardBase, setCardBase] = useState(0)
  const slidingRef = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Card slide
  const slideCards = useCallback(() => {
    if (slidingRef.current) return
    slidingRef.current = true

    const track = cardTrackRef.current
    if (!track) { slidingRef.current = false; return }

    const cards = track.children
    if (cards.length < 4) { slidingRef.current = false; return }

    const firstCard = cards[0] as HTMLElement
    const cardH = firstCard.offsetHeight + 6

    track.style.transition = 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1)'
    track.style.transform = `translateY(-${cardH}px)`

    const exitCard = cards[0] as HTMLElement
    exitCard.style.transition = 'opacity 800ms ease, filter 800ms ease'
    exitCard.style.opacity = '0'
    exitCard.style.filter = 'blur(6px)'

    const enterCard = cards[3] as HTMLElement
    enterCard.style.transition = 'opacity 800ms ease, filter 800ms ease'
    enterCard.style.opacity = '1'
    enterCard.style.filter = 'blur(0px)'

    setTimeout(() => {
      track.style.transition = 'none'
      track.style.transform = 'translateY(0)'

      cardBaseRef.current = (cardBaseRef.current + 1) % LISTINGS.length
      setCardBase(cardBaseRef.current)

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

  // Verb rotation + glimmer morph + card slide — all in lockstep
  useEffect(() => {
    const interval = setInterval(() => {
      setVerbState('out')
      glimmerRef.current?.morph()
      slideCards()

      setTimeout(() => {
        setVerbIndex((i) => (i + 1) % VERBS.length)
        setVerbState('in')
      }, 600)
    }, 3000)
    return () => clearInterval(interval)
  }, [slideCards])

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
      {/* Hero image — rendered through Three.js glimmer shader */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          left: '-3%',
          width: '88%',
          height: 'calc(100% + 40px)',
          pointerEvents: 'none',
          opacity: 0.9,
          maskImage: EDGE_MASK,
          WebkitMaskImage: EDGE_MASK,
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in' as string,
        }}
      >
        <GlimmerEffect ref={glimmerRef} imageSrc="/hero-bg.jpg" />
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
