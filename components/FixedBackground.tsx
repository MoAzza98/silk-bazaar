'use client'
import { useEffect, useRef } from 'react'
import { clamp } from '@/lib/scrollUtils'
import FizzleCanvas from './FizzleCanvas'

/**
 * Fixed background layer — sits at z-index: 0 below all page content.
 * Contains:
 *   1. The ribbon-bg image + dark overlay (the "scene" to reveal)
 *   2. The fizzle canvas on top (paints page bg color, dissolves to reveal scene)
 *
 * The fizzle canvas starts fully opaque (#F9F7F5), making this layer invisible.
 * As the user scrolls into the ribbon section, the fizzle dissolves and the
 * ribbon-bg image becomes visible through sections with transparent backgrounds.
 */
export default function FixedBackground() {
  const fizzleProgressRef = useRef(0)

  useEffect(() => {
    function onScroll() {
      // Drive fizzle from the MANIFESTO scroll position
      // so dissolve starts while manifesto text is still visible
      const manifesto = document.querySelector('section:nth-of-type(2)') // manifesto
      const ribbonSection = document.querySelector('[data-section="ribbon"]')
      if (!manifesto || !ribbonSection) return

      const mRect = manifesto.getBoundingClientRect()
      const vh = window.innerHeight
      const mH = manifesto.clientHeight

      // Start dissolving when manifesto is 40% scrolled past
      // Complete by the time the ribbon section top reaches viewport
      const rRect = ribbonSection.getBoundingClientRect()
      const manifestoProgress = clamp((-mRect.top - mH * 0.4) / (mH * 0.5), 0, 1)
      const ribbonProgress = clamp(-rRect.top / (ribbonSection.clientHeight - vh) / 0.3, 0, 1)

      // Use whichever is further along
      fizzleProgressRef.current = Math.max(manifestoProgress, ribbonProgress)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      {/* The scene to reveal: ribbon background image + dark overlay */}
      <img
        src="/ribbon-bg.jpg"
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(8, 5, 2, 0.4)',
          zIndex: 1,
        }}
      />

      {/* Fizzle canvas on top — paints bg color, dissolves to reveal image */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
        <FizzleCanvas progressRef={fizzleProgressRef} />
      </div>
    </div>
  )
}
