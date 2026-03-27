'use client'
import { useEffect, useRef } from 'react'

/*
 * ASCII Dunes — multi-layered sand terrain with wind particles,
 * trade route, stars (night mode), and sand-coloured shading.
 *
 * Ported from standalone vanilla JS renderer.
 * All animation state is module-level. rAF loop writes innerHTML.
 */

/* ─── Config ─── */
const DUNE1_BASE = 0.25
const DUNE2_BASE = 0.18
const DUNE2_SHADOW = 0.35
const DUNE3_BASE = 0.55
const TRADE_ROUTE_Y = 0.62
const WIND_CEILING = 0.4
const JUMP_SIZE = 8
const AMBIENT_SPEED = 0.003

const CHARS = ' .\u00b7\u00b7:;:+*=\u2261%#\u2591\u2592\u2593\u2588\u2588'
const STAR_CHARS = ['.', '\u00b7', '*', '+', '\u00b0']

const DAY_BG = [249, 247, 245]
const NIGHT_BG = [12, 15, 35]
const DAY_INK = [163, 149, 184]
const NIGHT_INK = [220, 225, 235]

const SAND_DAY = [
  [184, 169, 201],  // --color-mauve #B8A9C9
  [163, 149, 184],  // mid-lavender
  [143, 129, 168],  // deeper lavender
  [123, 110, 158],  // --color-twilight #7B6E9E
]

/* ─── Module-level mutable state ─── */
let targetOffset = 0
let currentOffset = 0
const DEFAULT_ACCENT = '#B8A9C9'
let targetAccentRgb = hexToRgb(DEFAULT_ACCENT)
let currentAccentRgb = targetAccentRgb.slice() as [number, number, number]
let targetNight = 0
let currentNight = 0
let cols = 160
let rows = 42
let frame = 0

/* ─── Public API ─── */
export function terrainJump(magnitude: number) {
  targetOffset += JUMP_SIZE * Math.min(magnitude || 1, 4)
}
export function setTerrainAccent(hex: string) {
  targetAccentRgb = hexToRgb(hex)
}
export function setTerrainNight(n: number) {
  targetNight = Math.max(0, Math.min(1, n))
}

/* ─── Helpers ─── */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}
function rgbToHex(r: number, g: number, b: number) {
  return '#' +
    Math.round(r).toString(16).padStart(2, '0') +
    Math.round(g).toString(16).padStart(2, '0') +
    Math.round(b).toString(16).padStart(2, '0')
}
function escapeChar(ch: string) {
  if (ch === '&') return '&amp;'
  if (ch === '<') return '&lt;'
  if (ch === '>') return '&gt;'
  return ch
}
function starHash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

export default function AsciiDunes() {
  const containerRef = useRef<HTMLDivElement>(null)
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const pre = preRef.current
    if (!container || !pre) return

    let running = true

    function measure() {
      if (!container) return
      const w = container.offsetWidth || 800
      const h = container.offsetHeight || 400
      const fontSize = Math.min(9, Math.max(5.5, w * 0.0072))
      const charW = fontSize * 0.58
      cols = Math.floor(w / charW) + 2
      cols = Math.max(80, Math.min(400, cols))
      const lineH = fontSize * 1.08
      rows = Math.max(20, Math.floor(h / lineH) + 1)
    }

    function render() {
      if (!running || !pre || !container) return
      frame++

      // Lerp night
      const gap = Math.abs(targetNight - currentNight)
      const NIGHT_LERP = gap < 0.15 ? 0.09 : 0.05
      currentNight += (targetNight - currentNight) * NIGHT_LERP
      if (gap < 0.005) currentNight = targetNight
      const night = currentNight

      // Lerp accent
      currentAccentRgb[0] += (targetAccentRgb[0] - currentAccentRgb[0]) * 0.04
      currentAccentRgb[1] += (targetAccentRgb[1] - currentAccentRgb[1]) * 0.04
      currentAccentRgb[2] += (targetAccentRgb[2] - currentAccentRgb[2]) * 0.04
      const accentHex = rgbToHex(currentAccentRgb[0], currentAccentRgb[1], currentAccentRgb[2])

      // Sand colours
      const sandHex: string[] = new Array(SAND_DAY.length)
      for (let si = 0; si < SAND_DAY.length; si++) {
        const sd = SAND_DAY[si]
        sandHex[si] = rgbToHex(
          sd[0] + (NIGHT_INK[0] - sd[0]) * night,
          sd[1] + (NIGHT_INK[1] - sd[1]) * night,
          sd[2] + (NIGHT_INK[2] - sd[2]) * night
        )
      }

      // Background / ink
      const bgR = DAY_BG[0] + (NIGHT_BG[0] - DAY_BG[0]) * night
      const bgG = DAY_BG[1] + (NIGHT_BG[1] - DAY_BG[1]) * night
      const bgB = DAY_BG[2] + (NIGHT_BG[2] - DAY_BG[2]) * night
      const inkR = DAY_INK[0] + (NIGHT_INK[0] - DAY_INK[0]) * night
      const inkG = DAY_INK[1] + (NIGHT_INK[1] - DAY_INK[1]) * night
      const inkB = DAY_INK[2] + (NIGHT_INK[2] - DAY_INK[2]) * night

      container.style.backgroundColor = 'transparent'
      pre.style.color = rgbToHex(inkR, inkG, inkB)

      // Ease offset
      currentOffset += (targetOffset - currentOffset) * 0.045
      const time = frame * AMBIENT_SPEED + currentOffset

      // Per-column pre-compute
      const dune1H = new Float32Array(cols)
      const dune2H = new Float32Array(cols)
      const dune2S = new Float32Array(cols)
      const dune3H = new Float32Array(cols)
      const pathYs = new Float32Array(cols)
      const windShade = new Float32Array(cols)

      for (let ix = 0; ix < cols; ix++) {
        const u = ix / cols
        dune1H[ix] = DUNE1_BASE
          + Math.sin(u * 3.5 + time * 0.3) * 0.08
          + Math.sin(u * 7 + 1.2 + time * 0.15) * 0.04
          + Math.sin(u * 1.8 - time * 0.1 + 0.5) * 0.1
        dune2H[ix] = DUNE2_BASE
          + Math.sin(u * 2.2 + 0.8 + time * 0.2) * 0.12
          + Math.sin(u * 5.5 + 2 + time * 0.25) * 0.06
          + Math.sin(u * 11 + time * 0.4) * 0.025
        dune2S[ix] = DUNE2_SHADOW
          + Math.sin(u * 2.2 + 0.8 + time * 0.2) * 0.1
          + Math.sin(u * 4 + time * 0.15) * 0.08
        dune3H[ix] = DUNE3_BASE
          + Math.sin(u * 1.5 + time * 0.15) * 0.15
          + Math.sin(u * 4 + 3 + time * 0.3) * 0.06
          + Math.sin(u * 9 - time * 0.2) * 0.03
        pathYs[ix] = TRADE_ROUTE_Y
          + Math.sin(u * 2 + time * 0.12) * 0.04
          + Math.sin(u * 6 + time * 0.2) * 0.015
        windShade[ix] = Math.sin(u * 4 + time * 0.18 + 1) * 0.12
      }

      // Build output
      const parts: string[] = []
      const charsLen = CHARS.length - 1
      const nightAbove005 = night > 0.05
      const nightBelow095 = night < 0.95

      for (let iy = 0; iy < rows; iy++) {
        const lineParts: string[] = []
        let plainRun = ''
        let accentRun = ''
        let starRun = ''
        let duneRun = ''
        let duneRunColor = ''
        const v = iy / rows

        const starColor = rgbToHex(
          220 + Math.sin(frame * 0.02 + iy) * 30,
          220 + Math.sin(frame * 0.03 + iy * 1.3) * 25,
          240
        )

        for (let ix = 0; ix < cols; ix++) {
          const u = ix / cols
          let density = 0
          let isWindParticle = false
          let isStar = false
          let isDune = false
          let starIdx = 0

          // LAYER 1: Far background dunes
          const d1h = dune1H[ix]
          if (v > d1h && v < d1h + 0.45) {
            const depth = (v - d1h) / 0.45
            const shade = 0.15 + depth * 0.25
            const ripple = Math.sin(u * 60 + v * 20 + time * 2) * 0.06 * Math.max(0, 1 - depth * 3)
            density = shade + ripple
            isDune = true
          }

          // LAYER 2: Mid-ground dune ridge
          const d2h = dune2H[ix]
          if (v > d2h) {
            const depth = Math.min(1, (v - d2h) / 0.5)
            const crestSharpness = Math.max(0, 1 - (v - d2h) * 12)
            const val = depth * 0.35 + 0.1 + crestSharpness * 0.6 + windShade[ix]
            if (val > density) { density = val; isDune = true }
          }

          const d2s = dune2S[ix]
          if (v > d2s && v < d2s + 0.2) {
            const shadowDepth = (v - d2s) / 0.2
            const shadowIntensity = 0.5 * (1 - shadowDepth) * Math.max(0, Math.sin(u * 2.5 + time * 0.2 + 0.3))
            if (shadowIntensity > density) { density = shadowIntensity; isDune = true }
          }

          // LAYER 3: Foreground massive dune
          const d3h = dune3H[ix]
          if (v > d3h) {
            const depth = Math.min(1, (v - d3h) / 0.35)
            const crest = Math.max(0, 1 - (v - d3h) * 8)
            const fgShade = 0.3 + depth * 0.55
            const sandTex = Math.sin(u * 80 + v * 40 + time * 3) * Math.sin(u * 45 - v * 30 + time * 1.5) * 0.08
            const val = fgShade + crest * 0.5 + sandTex
            if (val > density) { density = val; isDune = true }
          }

          // LAYER 4: Wind particles
          if (v < WIND_CEILING) {
            const windX = u * 200 + time * 15 + v * 50
            const windY = v * 100 + Math.sin(u * 10 + time) * 5
            const noise = Math.sin(windX) * Math.sin(windY * 1.3) * Math.sin(windX * 0.7 + windY)
            if (noise > 0.85) {
              const particleDensity = 0.15 + (noise - 0.85) * 3
              if (particleDensity > density) { density = particleDensity; isWindParticle = true }
            }
          }

          // LAYER 5: Sky / Stars
          const lowestDune = Math.min(d1h, d2h, d3h)
          if (v < lowestDune - 0.02) {
            if (nightAbove005) {
              const h = starHash(ix, iy)
              if (h > 0.985) {
                const twinklePhase = Math.sin(frame * 0.04 + h * 100) * 0.5 + 0.5
                if (twinklePhase > 0.15 && density < 0.1) {
                  starIdx = Math.floor((frame * 0.02 + h * 50) % STAR_CHARS.length)
                  isStar = true
                  density = 0.4
                }
              }
            }
            if (nightBelow095) {
              const skyGrad = v / 0.4
              const ditherThreshold = skyGrad * 0.12 * (1 - night)
              const ditherNoise = Math.sin(ix * 7.3 + iy * 11.7) * 0.5 + 0.5
              if (ditherNoise < ditherThreshold && density < 0.06) { density = 0.06 }
            }
          }

          // LAYER 6: Trade route
          const pathDist = Math.abs(v - pathYs[ix])
          if (pathDist < 0.012 && u > 0.05 && u < 0.95) {
            const pathDot = Math.sin(u * 120 + time * 8)
            if (pathDot > 0.3) {
              const val = 0.7 * (1 - pathDist / 0.012)
              if (val > density) { density = val; isDune = true }
            }
          }

          // Map density to character
          if (density < 0) density = 0
          else if (density > 1) density = 1
          const ci = (density * charsLen) | 0

          let ch: string
          if (isStar && nightAbove005) {
            ch = escapeChar(STAR_CHARS[starIdx])
          } else {
            ch = escapeChar(CHARS[ci])
          }

          // Batch into coloured runs
          if (isStar && nightAbove005) {
            if (plainRun) { lineParts.push(plainRun); plainRun = '' }
            if (accentRun) { lineParts.push('<span style="color:' + accentHex + '">' + accentRun + '</span>'); accentRun = '' }
            if (duneRun) { lineParts.push('<span style="color:' + duneRunColor + '">' + duneRun + '</span>'); duneRun = '' }
            starRun += ch
          } else if (isWindParticle && ci > 0) {
            if (plainRun) { lineParts.push(plainRun); plainRun = '' }
            if (starRun) { lineParts.push('<span style="color:' + starColor + '">' + starRun + '</span>'); starRun = '' }
            if (duneRun) { lineParts.push('<span style="color:' + duneRunColor + '">' + duneRun + '</span>'); duneRun = '' }
            accentRun += ch
          } else if (isDune && ci > 0 && nightBelow095) {
            const si = density < 0.20 ? 0 : density < 0.35 ? 1 : density < 0.55 ? 2 : 3
            const sc = sandHex[si]
            if (sc !== duneRunColor) {
              if (duneRun) { lineParts.push('<span style="color:' + duneRunColor + '">' + duneRun + '</span>'); duneRun = '' }
              duneRunColor = sc
            }
            if (plainRun) { lineParts.push(plainRun); plainRun = '' }
            if (accentRun) { lineParts.push('<span style="color:' + accentHex + '">' + accentRun + '</span>'); accentRun = '' }
            if (starRun) { lineParts.push('<span style="color:' + starColor + '">' + starRun + '</span>'); starRun = '' }
            duneRun += ch
          } else {
            if (accentRun) { lineParts.push('<span style="color:' + accentHex + '">' + accentRun + '</span>'); accentRun = '' }
            if (starRun) { lineParts.push('<span style="color:' + starColor + '">' + starRun + '</span>'); starRun = '' }
            if (duneRun) { lineParts.push('<span style="color:' + duneRunColor + '">' + duneRun + '</span>'); duneRun = '' }
            plainRun += ch
          }
        }

        // Flush remaining runs
        if (accentRun) lineParts.push('<span style="color:' + accentHex + '">' + accentRun + '</span>')
        if (starRun) lineParts.push('<span style="color:' + starColor + '">' + starRun + '</span>')
        if (duneRun) lineParts.push('<span style="color:' + duneRunColor + '">' + duneRun + '</span>')
        if (plainRun) lineParts.push(plainRun)
        parts.push(lineParts.join(''))
      }

      pre.innerHTML = parts.join('\n')
      if (running) requestAnimationFrame(render)
    }

    measure()
    render()
    window.addEventListener('resize', measure)

    return () => {
      running = false
      window.removeEventListener('resize', measure)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        backgroundColor: 'transparent',
        contain: 'strict',
      }}
    >
      <pre
        ref={preRef}
        style={{
          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, Consolas, monospace",
          fontSize: 'clamp(5.5px, 0.72vw, 9px)',
          lineHeight: 1.08,
          color: '#1a1815',
          userSelect: 'none',
          whiteSpace: 'pre',
          overflow: 'hidden',
          textAlign: 'left',
          letterSpacing: '-0.02em',
          width: '100%',
          margin: 0,
          padding: 0,
        }}
      />
    </div>
  )
}
