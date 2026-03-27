'use client'
import { useEffect, useRef } from 'react'
import { clamp } from '@/lib/scrollUtils'
import type Lenis from '@studio-freight/lenis'
declare global { interface Window { __lenis?: Lenis } }

const UPCOMING = [
  {
    label: '001',
    name: 'DAO Treasury Play',
    desc: 'Dormant DAO with 2.1M USDC, active governance contract, and 800-wallet holder base.',
    tags: ['DAO', 'Treasury', 'Governance'],
    status: 'Opening Soon',
  },
  {
    label: '002',
    name: 'NFT Community Shell',
    desc: '12k-holder NFT project, active Discord, daily engagement — team departed, brand intact.',
    tags: ['NFT', 'Community', 'Brand IP'],
    status: 'Opening Soon',
  },
  {
    label: '003',
    name: 'Layer-2 Dev Tooling',
    desc: 'Audited contracts, active GitHub, zero marketing. Infrastructure looking for distribution.',
    tags: ['Infra', 'DeFi', 'Open Source'],
    status: 'Opening Soon',
  },
]

const BG = 'rgb(249, 247, 245)'

export default function AuctionsSection() {
  const bodyRef = useRef<HTMLDivElement>(null)
  const rafRef  = useRef<number | null>(null)

  useEffect(() => {
    function onScroll() {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const body = bodyRef.current
        if (!body) return
        const rect = body.getBoundingClientRect()
        const vh   = window.innerHeight
        const p    = clamp(1 - (rect.top - vh * 0.30) / (vh * 0.60), 0, 1)
        body.style.opacity = String(p)
        body.style.filter  = p < 0.999 ? `blur(${((1 - p) * 14).toFixed(1)}px)` : ''
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
  }, [])

  return (
    <section
      id="auctions"
      style={{
        position: 'relative',
        zIndex: 2,
        background: BG,
        padding: '120px 32px',
      }}
    >
      <div ref={bodyRef} style={{ maxWidth: 'var(--max-page)', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 72 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 400,
            fontSize: 11,
            letterSpacing: '0.14em',
            color: 'var(--color-gold)',
            display: 'block',
            marginBottom: 20,
          }}>
            AUCTIONS
          </span>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 52,
            lineHeight: 1.1,
            color: 'var(--color-text)',
            margin: 0,
            maxWidth: 560,
          }}>
            Live and upcoming<br />acquisition listings.
          </h2>
        </div>

        {/* Listings grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 24,
        }}>
          {UPCOMING.map((item) => (
            <div
              key={item.label}
              style={{
                border: '1px solid rgba(39, 26, 0, 0.1)',
                borderRadius: 6,
                padding: '32px 28px',
                background: 'rgba(255,255,255,0.6)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '0.1em',
                }}>
                  {item.label}
                </span>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--color-twilight)',
                  letterSpacing: '0.08em',
                  background: 'rgba(var(--color-twilight-rgb, 139, 90, 43), 0.08)',
                  padding: '3px 10px',
                  borderRadius: 40,
                }}>
                  {item.status}
                </span>
              </div>
              <div>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 20,
                  color: 'var(--color-text)',
                  margin: '0 0 10px',
                }}>
                  {item.name}
                </h3>
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 400,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--color-text-secondary)',
                  margin: 0,
                }}>
                  {item.desc}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 8 }}>
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      color: 'var(--color-text-secondary)',
                      border: '1px solid rgba(39, 26, 0, 0.15)',
                      padding: '3px 10px',
                      borderRadius: 40,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 56, textAlign: 'center' }}>
          <a
            href="#register"
            onClick={(e) => {
              e.preventDefault()
              window.__lenis?.scrollTo('#register')
            }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              fontSize: 12,
              letterSpacing: '0.06em',
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
              borderBottom: '1px solid rgba(39, 26, 0, 0.2)',
              paddingBottom: 2,
            }}
          >
            Register for early access to listings →
          </a>
        </div>
      </div>
    </section>
  )
}
