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
      const ribbonSection = document.querySelector('[data-section="ribbon"]')
      if (!ribbonSection) return

      const rRect = ribbonSection.getBoundingClientRect()
      const rH = ribbonSection.clientHeight
      const vh = window.innerHeight
      const rScrollable = rH - vh
      const ribbonScroll = clamp(-rRect.top / rScrollable, 0, 1)

      // ENTRY: Start dissolving when ribbon is 0.3vh below viewport top.
      // Complete at ribbon 15% scrolled (helix ~47% drawn at that point).
      const dissolve = clamp(
        (0.3 * vh - rRect.top) / (0.3 * vh + rScrollable * 0.15),
        0, 1
      )

      // EXIT: Re-cover exactly aligned with helix erase (ribbon 64% → 100%).
      // No dark gap — fizzle and helix erase together.
      const exitProgress = clamp((ribbonScroll - 0.64) / 0.36, 0, 1)

      fizzleProgressRef.current = dissolve * (1 - exitProgress)
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
