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

// Page background color for gradient overlays
const BG = 'rgb(249, 247, 245)'
const BG0 = 'rgba(249, 247, 245, 0)'
const BG92 = 'rgba(249, 247, 245, 0.92)'

export default function HeroSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const glimmerRef = useRef<GlimmerHandle>(null)
  const [verbIndex, setVerbIndex] = useState(0)
  const [verbState, setVerbState] = useState<'idle' | 'exiting' | 'entering'>('idle')
  const [prevVerbIndex, setPrevVerbIndex] = useState(0)
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

  // Card slide — DOM recycling approach
  const slideCards = useCallback(() => {
    if (slidingRef.current) return
    slidingRef.current = true

    const track = cardTrackRef.current
    if (!track) { slidingRef.current = false; return }

    const cards = track.children
    if (cards.length < 4) { slidingRef.current = false; return }

    const firstCard = cards[0] as HTMLElement
    const cardH = firstCard.offsetHeight + 24 // card height + gap

    // Slide entire stack up by one card
    track.style.transition = 'transform 1000ms cubic-bezier(0.72, 0, 0.24, 1)'
    track.style.transform = `translateY(-${cardH}px)`

    // Fade/blur exiting top card
    const exitCard = cards[0] as HTMLElement
    exitCard.style.transition = 'opacity 800ms ease, filter 800ms ease'
    exitCard.style.opacity = '0'
    exitCard.style.filter = 'blur(6px)'

    // Fade in entering bottom card
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
    }, 1050)
  }, [])

  // Verb rotation + glimmer morph + card slide
  // Use ref for verbIndex to avoid re-creating interval on every verb change
  const verbIndexRef = useRef(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setPrevVerbIndex(verbIndexRef.current)
      setVerbState('exiting')
      glimmerRef.current?.morph()
      slideCards()

      setTimeout(() => {
        const next = (verbIndexRef.current + 1) % VERBS.length
        verbIndexRef.current = next
        setVerbIndex(next)
        setVerbState('entering')
      }, 600)

      setTimeout(() => {
        setVerbState('idle')
      }, 1200)
    }, 3500)
    return () => clearInterval(interval)
  }, [slideCards])

  const cardIndices = [0, 1, 2, 3].map((i) => (cardBase + i) % LISTINGS.length)

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative',
        height: '100vh',
        background: BG,
        zIndex: 1,
      }}
    >
      {/* ===== HERO-BG: clips the oversized image ===== */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {/* Oversized image container — centered, bleeds out of parent */}
        <div
          style={{
            position: 'absolute',
            width: 1610,
            height: '110%',
            top: -60,
            left: '50%',
            transform: 'translateX(-55%)',
          }}
        >
          <GlimmerEffect ref={glimmerRef} imageSrc="/hero-bg.jpg" />
        </div>

        {/* Edge bleed overlay — layered gradients of page bg color */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            pointerEvents: 'none',
            backgroundImage: [
              // Left edge: solid fade over 12%
              `linear-gradient(90deg, ${BG} 0%, ${BG0} 12%)`,
              // Right edge: fade from 80% to 100%
              `linear-gradient(270deg, ${BG0} 75%, ${BG} 100%)`,
              // Top and bottom: solid at edges, transparent in middle
              `linear-gradient(${BG} 0%, transparent 14%, transparent 62%, ${BG92} 90%, ${BG} 100%)`,
              // Radial vignette: fades corners
              `radial-gradient(800px 120% at calc(50% - 160px) 40%, ${BG0} 70%, ${BG} 100%)`,
            ].join(', '),
          }}
        />
      </div>

      {/* ===== CONTENT LAYER ===== */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          maxWidth: 'var(--max-page)',
          margin: '0 auto',
          padding: '0 32px',
        }}
      >
        {/* Query cards — absolute left */}
        <div
          className="hero-cards-col"
          style={{
            position: 'absolute',
            top: 168,
            left: 32,
            width: 240,
            zIndex: 2,
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div
              ref={cardTrackRef}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
              }}
            >
              {cardIndices.map((listingIdx, i) => {
                const card = LISTINGS[listingIdx]
                const num = String(listingIdx + 1).padStart(2, '0')
                return (
                  <div
                    key={`slot-${i}`}
                    style={{
                      position: 'relative',
                      width: 240,
                      minHeight: 140,
                      borderRadius: 4,
                      border: '1px solid rgba(39, 26, 0, 0.1)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      opacity: i < 3 ? 1 : 0,
                    }}
                  >
                    {/* Card background — semi-transparent white */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(255, 255, 255, 0.6)',
                      borderRadius: 4,
                      zIndex: 0,
                    }} />
                    {/* Card content */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontWeight: 500,
                        fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 10,
                      }}>
                        {num}
                      </div>
                      <p style={{
                        fontFamily: 'var(--font-display)', fontWeight: 400,
                        fontSize: 13, color: 'var(--color-text)',
                        lineHeight: 1.5, margin: 0,
                      }}>
                        {card.body}
                      </p>
                    </div>
                    <div style={{
                      position: 'relative', zIndex: 1,
                      fontFamily: 'var(--font-mono)', fontWeight: 500,
                      fontSize: 10, color: 'var(--color-twilight)', textAlign: 'right',
                      marginTop: 8,
                    }}>
                      /query
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Headline — absolute right */}
        <div
          className="hero-headlines"
          style={{
            position: 'absolute',
            top: 280,
            right: 32,
          }}
        >
          <div
            className={`load-fade ${loaded ? 'loaded-in' : ''}`}
            style={{
              textAlign: 'right',
              transition: 'opacity 1200ms ease, filter 1200ms ease',
            }}
          >
            {/* "Silk Bazaar" — static */}
            <h1
              style={{
                fontFamily: 'var(--font-display)', fontWeight: 300,
                fontSize: 96, lineHeight: '96px', textAlign: 'right',
                color: '#1a1208', margin: 0,
              }}
              className="hero-title"
            >
              Silk Bazaar
            </h1>

            {/* Verb rotator — overflow hidden clip mask */}
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                width: 600,
                height: 96,
                marginLeft: 'auto',
              }}
              className="hero-verb-wrap"
            >
              {/* Exiting word */}
              {verbState === 'exiting' && (
                <span
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    fontFamily: 'var(--font-display)', fontWeight: 300,
                    fontSize: 96, lineHeight: '96px', textAlign: 'right',
                    color: 'var(--color-twilight)',
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                    transform: 'translateY(-38px)',
                    opacity: 0,
                    filter: 'blur(12px)',
                    transition: 'transform 0.6s cubic-bezier(0.45, 0, 0.55, 1), opacity 0.6s cubic-bezier(0.45, 0, 0.55, 1), filter 0.6s cubic-bezier(0.45, 0, 0.55, 1)',
                  }}
                >
                  {VERBS[prevVerbIndex]}
                </span>
              )}

              {/* Current/entering word */}
              <span
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  fontFamily: 'var(--font-display)', fontWeight: 300,
                  fontSize: 96, lineHeight: '96px', textAlign: 'right',
                  color: 'var(--color-twilight)',
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                  transform: verbState === 'entering' ? 'translateY(0)' : verbState === 'idle' ? 'translateY(0)' : 'translateY(38px)',
                  opacity: verbState === 'entering' || verbState === 'idle' ? 1 : 0,
                  filter: verbState === 'entering' || verbState === 'idle' ? 'blur(0px)' : 'blur(12px)',
                  transition: verbState !== 'idle' ? 'transform 0.6s cubic-bezier(0.45, 0, 0.55, 1), opacity 0.6s cubic-bezier(0.45, 0, 0.55, 1), filter 0.6s cubic-bezier(0.45, 0, 0.55, 1)' : 'none',
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
          .hero-headlines { top: 200px !important; right: 16px !important; left: 16px !important; }
          .hero-title { font-size: 52px !important; line-height: 52px !important; }
          .hero-verb { font-size: 52px !important; line-height: 52px !important; }
          .hero-verb-wrap { width: 100% !important; height: 56px !important; }
        }
      `}</style>
    </section>
  )
}
