'use client'
import { useEffect, type ReactNode } from 'react'
import Lenis from '@studio-freight/lenis'

export default function LenisProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.088,
      wheelMultiplier: 0.96,
      touchMultiplier: 1,
      syncTouch: false,
    })
    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
    return () => lenis.destroy()
  }, [])
  return <>{children}</>
}
