'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

function formatReach(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export default function StatsBar() {
  const [stats, setStats] = useState({ totalUsers: 0, totalReach: 0 })
  const [displayUsers, setDisplayUsers] = useState(0)
  const [displayReach, setDisplayReach] = useState(0)
  const [animated, setAnimated] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      // Silently fail
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  // Animate counters on first intersection
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated) {
          setAnimated(true)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [animated])

  // Counter animation
  useEffect(() => {
    if (!animated) return
    const duration = 1200
    const start = performance.now()
    const targetUsers = stats.totalUsers
    const targetReach = stats.totalReach

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      setDisplayUsers(Math.round(t * targetUsers))
      setDisplayReach(Math.round(t * targetReach))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [animated, stats])

  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        gap: 48,
      }}
      className="stats-bar"
    >
      <div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 48,
            color: 'var(--color-twilight)',
            lineHeight: 1.1,
          }}
        >
          {displayUsers.toLocaleString()}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 400,
            fontSize: 12,
            letterSpacing: '0.08em',
            color: 'var(--color-text-secondary)',
            marginTop: 4,
          }}
        >
          early registrations
        </div>
      </div>

      <div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 48,
            color: 'var(--color-twilight)',
            lineHeight: 1.1,
          }}
        >
          {formatReach(displayReach)}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 400,
            fontSize: 12,
            letterSpacing: '0.08em',
            color: 'var(--color-text-secondary)',
            marginTop: 4,
          }}
        >
          in combined audience reach
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .stats-bar { flex-direction: column !important; gap: 24px !important; }
        }
      `}</style>
    </div>
  )
}
