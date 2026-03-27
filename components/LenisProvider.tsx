'use client'
import { useEffect, type ReactNode } from 'react'
import Lenis from '@studio-freight/lenis'

// Expose lenis globally so Nav can call lenis.scrollTo()
declare global {
  interface Window { __lenis?: Lenis }
}

export default function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Always start at top on reload — prevents browser scroll-position restore
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)

    const lenis = new Lenis({
      lerp: 0.088,
      wheelMultiplier: 0.96,
      touchMultiplier: 1,
      syncTouch: false,
    })

    window.__lenis = lenis

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
      delete window.__lenis
    }
  }, [])
  return <>{children}</>
}
