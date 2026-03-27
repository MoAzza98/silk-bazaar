'use client'
import { useEffect, useRef } from 'react'

// ─── PETAL TUNING ────────────────────────────────────────────────────────────
const PETALS = {
  MAX:        8,    // max petals visible at once
  SPAWN_MIN:  2.2,  // min seconds between spawns
  SPAWN_MAX:  5.5,  // max seconds between spawns
  SIZE_NEAR:  38,   // px radius — closest / largest
  SIZE_FAR:   12,   // px radius — furthest / smallest
  BLUR_NEAR:   3,   // px blur for closest petals (depth-of-field)
  BLUR_FAR:    0,   // px blur for furthest petals
  SPEED_NEAR:  5,   // px/frame — close petals move faster
  SPEED_FAR:   1.8, // px/frame — far petals drift slowly
  ROT_SPEED:  0.012, // max rotation per frame (gentle drift, not a spin)
}

// Must stay in sync with WIND in DesertScene.tsx
const WIND = {
  INTENSITY:  1.8,
  SLOW_FREQ:  0.28, SLOW_AMP: 0.55,
  MID_FREQ:   0.85, MID_AMP:  0.30,
  FAST_FREQ:  2.40, FAST_AMP: 0.15,
  GUST_FREQ:  0.10,
}
// ─────────────────────────────────────────────────────────────────────────────

type Petal = {
  x: number; y: number
  vx: number; vy: number
  size: number
  depth: number      // 0 = far/small, 1 = near/large
  rotation: number
  rotSpeed: number
  phase: number      // wind + trajectory phase
  morphPhase: number // UV displacement phase (unique per petal)
}

function windVal(t: number, phase: number): number {
  const slow = Math.sin(t * WIND.SLOW_FREQ + phase)         * WIND.SLOW_AMP
  const mid  = Math.sin(t * WIND.MID_FREQ  + phase * 1.40)  * WIND.MID_AMP
  const fast = Math.sin(t * WIND.FAST_FREQ + phase * 0.80)  * WIND.FAST_AMP
  const gust = (Math.sin(t * WIND.GUST_FREQ + phase * 0.30) + 1) / 2
  return (slow + mid + fast) * gust
}

function spawnPetal(w: number, h: number): Petal {
  const depth = Math.random()
  const size  = PETALS.SIZE_FAR  + depth * (PETALS.SIZE_NEAR  - PETALS.SIZE_FAR)
  const speed = PETALS.SPEED_FAR + depth * (PETALS.SPEED_NEAR - PETALS.SPEED_FAR)
  const y     = h * (0.25 + Math.random() * 0.65)
  const angle = (-0.15 + Math.random() * 0.30) + depth * 0.10
  return {
    x: -size - 4, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed + 0.2 + depth * 0.3,
    size, depth,
    rotation:   Math.random() * Math.PI * 2,
    rotSpeed:   (Math.random() - 0.5) * 2 * PETALS.ROT_SPEED * (0.4 + depth * 0.6),
    phase:      Math.random() * 12,
    morphPhase: Math.random() * Math.PI * 2,
  }
}

/**
 * Organic petal via asymmetric bezier curves.
 * Control points oscillate over time — simulates UV displacement on the shape
 * (same idea as the flower shader's sinusoidal warp, applied here in 2D).
 */
function drawPetal(ctx: CanvasRenderingContext2D, p: Petal, t: number) {
  const blur    = PETALS.BLUR_FAR + p.depth * (PETALS.BLUR_NEAR - PETALS.BLUR_FAR)
  const opacity = 0.90 + p.depth * 0.10
  const s       = p.size

  // Primary warp — slow, large-scale shape change
  const morph  = Math.sin(t * 2.8 + p.morphPhase) * 0.18
  // Secondary warp — faster, smaller flutter
  const morph2 = Math.sin(t * 4.1 + p.morphPhase + 1.2) * 0.10
  // Tip curl — gives the petal a living, wind-blown edge
  const curl   = Math.sin(t * 3.5 + p.morphPhase + 0.6) * 0.08

  ctx.save()
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)
  if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`
  ctx.globalAlpha = opacity

  // Petal silhouette — right edge then left edge, control points shift with morph
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ctx.bezierCurveTo(
     s * (0.42 + morph),  -s * (0.60 + curl),
     s * (0.38 + morph2),  s * 0.10,
     0, s * 0.30,
  )
  ctx.bezierCurveTo(
    -s * (0.38 - morph2),  s * 0.10,
    -s * (0.42 - morph),  -s * (0.60 + curl),
     0, -s,
  )
  ctx.closePath()

  ctx.fillStyle = 'rgba(238, 233, 228, 1)'
  ctx.fill()

  // Midrib vein — shifts slightly with morph, giving it life
  ctx.beginPath()
  ctx.moveTo(0, -s * 0.85)
  ctx.quadraticCurveTo(morph * s * 0.3, 0, 0, s * 0.22)
  ctx.strokeStyle = 'rgba(200, 192, 185, 0.35)'
  ctx.lineWidth = Math.max(0.5, s * 0.04)
  ctx.stroke()

  ctx.restore()
}

export default function PetalLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return

    const petals: Petal[] = []
    let t         = 0
    let nextSpawn = 1.0 + Math.random() * 2
    let raf: number

    function tick() {
      t += 0.016

      // Keep canvas sized to parent every frame (handles late layout)
      const pw = canvas.parentElement?.clientWidth  || window.innerWidth
      const ph = canvas.parentElement?.clientHeight || window.innerHeight
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width  = pw
        canvas.height = ph
      }

      const w = canvas.width
      const h = canvas.height
      ctx.clearRect(0, 0, w, h)

      // Spawn
      if (t >= nextSpawn && petals.length < PETALS.MAX) {
        petals.push(spawnPetal(w, h))
        nextSpawn = t + PETALS.SPAWN_MIN + Math.random() * (PETALS.SPAWN_MAX - PETALS.SPAWN_MIN)
      }

      // Draw far → near so larger petals paint on top
      petals.sort((a, b) => a.depth - b.depth)

      for (let i = petals.length - 1; i >= 0; i--) {
        const p = petals[i]

        // Wind: lateral drift in sync with flower sway
        const wind    = windVal(t * 1.1, p.phase) * WIND.INTENSITY
        // High-freq perpendicular flutter
        const flutter = Math.sin(t * 5.5 + p.phase * 1.3) * 0.6 * (0.4 + p.depth * 0.6)

        p.x        += p.vx + wind * 0.9
        p.y        += p.vy + flutter
        p.rotation += p.rotSpeed + wind * 0.008

        if (p.x > w + p.size + 10 || p.y > h + p.size + 10 || p.y < -p.size * 3) {
          petals.splice(i, 1)
          continue
        }

        drawPetal(ctx, p, t)
      }

      raf = requestAnimationFrame(tick)
    }

    const onResize = () => {
      canvas.width  = canvas.parentElement?.clientWidth  || window.innerWidth
      canvas.height = canvas.parentElement?.clientHeight || window.innerHeight
    }
    window.addEventListener('resize', onResize)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
}
