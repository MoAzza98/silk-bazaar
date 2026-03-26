'use client'
import { useEffect, useState } from 'react'

export default function Nav() {
  const [entered, setEntered] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setEntered(true), 400)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 60)

      const ribbon = document.querySelector('[data-section="petal-ribbon"]')
      if (ribbon) {
        const rect = ribbon.getBoundingClientRect()
        const inRibbon = rect.top < 80 && rect.bottom > 80
        setDark(inRibbon)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        zIndex: 100,
        transform: 'translateY(-100%)',
        transition: dark
          ? 'transform 400ms cubic-bezier(0.72, 0, 0.36, 1), background 1000ms cubic-bezier(0.64, 0, 0.34, 1), color 1000ms cubic-bezier(0.64, 0, 0.34, 1)'
          : 'transform 400ms cubic-bezier(0.72, 0, 0.36, 1), background 1000ms cubic-bezier(0.32, 1, 0.68, 1), color 1000ms cubic-bezier(0.32, 1, 0.68, 1)',
        ...(scrolled && !dark
          ? {
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              background: 'rgba(245, 237, 228, 0.72)',
              borderBottom: '0.5px solid rgba(201, 149, 108, 0.2)',
            }
          : {}),
        ...(dark
          ? {
              background: 'rgba(10, 6, 4, 0.55)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }
          : {}),
      }}
      className={entered ? 'nav-entered' : ''}
    >
      <div
        style={{
          maxWidth: 'var(--max-page)',
          margin: '0 auto',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
            fontSize: 13,
            letterSpacing: '0.12em',
            color: dark ? 'var(--color-text-on-dark)' : 'var(--color-text)',
            transition: 'color 1000ms',
          }}
        >
          SILK BAZAAR
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {['Auctions', 'The Stalls', 'How It Works'].map((item) => (
            <a
              key={item}
              href="#"
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 400,
                fontSize: 12,
                letterSpacing: '0.06em',
                color: dark ? 'var(--color-text-on-dark)' : 'var(--color-text-secondary)',
                textDecoration: 'none',
                transition: 'color 1000ms',
                display: 'none',
              }}
              className="nav-link"
            >
              {item}
            </a>
          ))}
          <a
            href="#register"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              fontSize: 12,
              letterSpacing: '0.06em',
              background: 'var(--color-twilight)',
              color: '#fff',
              padding: '8px 20px',
              borderRadius: 40,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Register Interest →
          </a>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .nav-link { display: inline-block !important; }
        }
      `}</style>
    </nav>
  )
}
