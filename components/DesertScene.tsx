'use client'
import { useEffect, useRef } from 'react'

/**
 * Desert scene rendered onto a single canvas — one GPU layer instead of 15.
 * Base background + 14 transparent flower layers, each rotated around its
 * stem/root via Canvas 2D transforms. No compositor layer explosion.
 */

const BASE_SRC = '/desertassets/ribbonbg_0014_DesertBG.png'

const LAYERS = [
  // Back to front (0013 → 0000). ox/oy are stem-root as fraction of image.
  { src: '/desertassets/ribbonbg_0013_Layer-20.png', ox: 0.05, oy: 0.68, maxDeg: 0.8,  speed: 0.70, phase: 0.00 },
  { src: '/desertassets/ribbonbg_0012_Layer-19.png', ox: 0.08, oy: 0.75, maxDeg: 1.0,  speed: 0.80, phase: 0.90 },
  { src: '/desertassets/ribbonbg_0011_Layer-18.png', ox: 0.12, oy: 0.90, maxDeg: 1.2,  speed: 0.90, phase: 1.70 },
  { src: '/desertassets/ribbonbg_0010_Layer-17.png', ox: 0.38, oy: 0.92, maxDeg: 1.0,  speed: 0.85, phase: 2.40 },
  { src: '/desertassets/ribbonbg_0009_Layer-16.png', ox: 0.27, oy: 1.00, maxDeg: 1.5,  speed: 0.95, phase: 3.10 },
  { src: '/desertassets/ribbonbg_0008_Layer-15.png', ox: 0.17, oy: 0.70, maxDeg: 1.3,  speed: 1.00, phase: 3.80 },
  { src: '/desertassets/ribbonbg_0007_Layer-14.png', ox: 0.23, oy: 0.70, maxDeg: 1.4,  speed: 1.00, phase: 4.50 },
  { src: '/desertassets/ribbonbg_0006_Layer-13.png', ox: 0.32, oy: 0.65, maxDeg: 1.6,  speed: 1.05, phase: 5.20 },
  { src: '/desertassets/ribbonbg_0005_Layer-12.png', ox: 0.43, oy: 0.68, maxDeg: 1.5,  speed: 1.10, phase: 5.90 },
  { src: '/desertassets/ribbonbg_0004_Layer-11.png', ox: 0.43, oy: 0.78, maxDeg: 1.7,  speed: 1.10, phase: 0.40 },
  { src: '/desertassets/ribbonbg_0003_Layer-10.png', ox: 0.57, oy: 0.88, maxDeg: 1.6,  speed: 1.15, phase: 1.10 },
  { src: '/desertassets/ribbonbg_0002_Layer-9.png',  ox: 0.57, oy: 0.84, maxDeg: 1.8,  speed: 1.20, phase: 1.80 },
  { src: '/desertassets/ribbonbg_0001_Layer-8.png',  ox: 0.65, oy: 0.65, maxDeg: 2.0,  speed: 1.25, phase: 2.50 },
  { src: '/desertassets/ribbonbg_0000_Layer-7.png',  ox: 0.80, oy: 0.88, maxDeg: 2.2,  speed: 1.30, phase: 3.20 },
]

const DEG = Math.PI / 180

function windSway(t: number, phase: number): number {
  const slow = Math.sin(t * 0.30 + phase)          * 0.60
  const mid  = Math.sin(t * 0.90 + phase * 1.40)   * 0.25
  const fast = Math.sin(t * 2.30 + phase * 0.80)   * 0.10
  const gust = (Math.sin(t * 0.12 + phase * 0.30) + 1) / 2
  return (slow + mid + fast) * gust
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Draw an image cover-fitted into (w, h) */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const sw = img.naturalWidth  * scale
  const sh = img.naturalHeight * scale
  ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh)
}

export default function DesertScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf: number
    let t = 0
    let bgImg: HTMLImageElement | null = null
    const layerImgs: (HTMLImageElement | null)[] = LAYERS.map(() => null)
    let allLoaded = false

    function resize() {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width  = parent.clientWidth
      canvas.height = parent.clientHeight
    }

    function draw() {
      const w = canvas.width
      const h = canvas.height
      if (w === 0 || h === 0) return

      ctx.clearRect(0, 0, w, h)

      // Base background
      if (bgImg) drawCover(ctx, bgImg, w, h)

      // Flower layers back-to-front with wind rotation
      for (let i = 0; i < LAYERS.length; i++) {
        const img = layerImgs[i]
        if (!img) continue
        const { ox, oy, maxDeg, speed, phase } = LAYERS[i]
        const angle = windSway(t * speed, phase) * maxDeg * DEG
        const px = ox * w
        const py = oy * h

        ctx.save()
        ctx.translate(px, py)
        ctx.rotate(angle)
        ctx.translate(-px, -py)
        drawCover(ctx, img, w, h)
        ctx.restore()
      }
    }

    function tick() {
      t += 0.016
      if (allLoaded) draw()
      raf = requestAnimationFrame(tick)
    }

    resize()
    window.addEventListener('resize', resize)
    raf = requestAnimationFrame(tick)

    // Load images asynchronously — draw whatever is ready each frame
    loadImage(BASE_SRC).then(img => { bgImg = img })
    LAYERS.forEach((layer, i) => {
      loadImage(layer.src).then(img => {
        layerImgs[i] = img
        if (bgImg && layerImgs.every(Boolean)) allLoaded = true
      })
    })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    />
  )
}
