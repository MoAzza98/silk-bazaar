'use client'
import { useEffect, useRef } from 'react'

/**
 * Desert scene on a single WebGL canvas.
 * Each flower layer is rendered by a fragment shader that combines:
 *   1. Rigid sway  — rotation around the stem-root pivot
 *   2. UV flutter  — sinusoidal UV displacement growing toward the tips
 */

const BASE_SRC = '/desertassets/ribbonbg_0014_DesertBG.png'

// ─── WIND TUNING ─────────────────────────────────────────────────────────────
// INTENSITY is the master dial — change only this for more/less drama.
// Set FLUTTER_AMP to 0 to disable UV warping and use rigid sway only.
// After editing, the HMR re-mount will recompile the shader automatically.
const WIND = {
  INTENSITY:   1.8,   // master scale — 1 = gentle breeze, 3 = stormy
  SLOW_FREQ:   0.28,  // big rolling swell
  MID_FREQ:    0.85,  // secondary ripple
  FAST_FREQ:   2.40,  // high-freq flutter
  GUST_FREQ:   0.10,  // envelope: how often gusts pulse
  SLOW_AMP:    0.55,
  MID_AMP:     0.30,
  FAST_AMP:    0.15,
  FLUTTER_AMP: 0.006, // UV warp amplitude; 0 = pure rigid sway
}
// ─────────────────────────────────────────────────────────────────────────────

// maxDeg is scaled by oy (pivot depth): layers with a high pivot (low oy) sweep a
// large arc even at small angles, so they get proportionally less swing.
// Rule of thumb: effective_maxDeg ≈ maxDeg × oy, keeping foreground flowers dominant.
const LAYERS = [
  // Back → front. ox/oy = stem-root pivot as image fraction. maxDeg = peak swing.
  //{ src: '/desertassets/ribbonbg_0002_Layer-9.png',  ox: 0.57, oy: 0.84, maxDeg: 4.5, speed: 1.20, phase: 1.80 },
  //{ src: '/desertassets/ribbonbg_0001_Layer-8.png',  ox: 0.65, oy: 0.65, maxDeg: 3.0, speed: 1.25, phase: 2.50 },
  { src: '/desertassets/ribbonbg_0000_Layer-7.png',  ox: 0.80, oy: 0.88, maxDeg: 5.5, speed: 1.30, phase: 3.20 },
  { src: '/desertassets/ribbonbg_0003_Layer-10.png', ox: 0.57, oy: 0.88, maxDeg: 4.5, speed: 1.15, phase: 1.10 },
  { src: '/desertassets/ribbonbg_0004_Layer-11.png', ox: 0.43, oy: 0.78, maxDeg: 3.5, speed: 1.10, phase: 0.40 },
  { src: '/desertassets/ribbonbg_0005_Layer-12.png', ox: 0.43, oy: 0.68, maxDeg: 2.5, speed: 1.10, phase: 5.90 },
  { src: '/desertassets/ribbonbg_0006_Layer-13.png', ox: 0.32, oy: 0.65, maxDeg: 2.0, speed: 1.05, phase: 5.20 },
  { src: '/desertassets/ribbonbg_0007_Layer-14.png', ox: 0.23, oy: 0.70, maxDeg: 2.2, speed: 1.00, phase: 4.50 },
  { src: '/desertassets/ribbonbg_0008_Layer-15.png', ox: 0.17, oy: 0.70, maxDeg: 2.0, speed: 1.00, phase: 3.80 },
  { src: '/desertassets/ribbonbg_0009_Layer-16.png', ox: 0.27, oy: 1.00, maxDeg: 3.5, speed: 0.95, phase: 3.10 },
  { src: '/desertassets/ribbonbg_0010_Layer-17.png', ox: 0.38, oy: 0.92, maxDeg: 3.0, speed: 0.85, phase: 2.40 },
  { src: '/desertassets/ribbonbg_0011_Layer-18.png', ox: 0.12, oy: 0.90, maxDeg: 3.0, speed: 0.90, phase: 1.70 },
  { src: '/desertassets/ribbonbg_0012_Layer-19.png', ox: 0.08, oy: 0.75, maxDeg: 2.2, speed: 0.80, phase: 0.90 },
  { src: '/desertassets/ribbonbg_0013_Layer-20.png', ox: 0.05, oy: 0.68, maxDeg: 1.8, speed: 0.70, phase: 0.00 },
]

const DEG = Math.PI / 180

// ─── GLSL ────────────────────────────────────────────────────────────────────
// canvas UV: (0,0) = top-left, (1,1) = bottom-right
const VERT = `
  attribute vec2 a_pos;
  varying   vec2 v_uv;
  void main() {
    v_uv        = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`

// Sway constants are baked in at shader-compile time for a branchless inner loop.
const FRAG = `
  precision mediump float;

  uniform sampler2D u_tex;
  uniform vec2  u_cover;    // cover-fit scale (ru, rv)
  uniform float u_time;
  uniform float u_phase;
  uniform float u_maxRad;   // maxDeg * DEG * INTENSITY (pre-multiplied JS-side)
  uniform float u_speed;
  uniform vec2  u_pivot;    // stem-root in image UV, top-left origin
  uniform float u_flutter;  // UV displacement amplitude

  varying vec2 v_uv;

  float sway(float t, float p) {
    float slow = sin(t * ${WIND.SLOW_FREQ.toFixed(4)} + p)          * ${WIND.SLOW_AMP.toFixed(4)};
    float mid  = sin(t * ${WIND.MID_FREQ.toFixed(4)}  + p * 1.40)   * ${WIND.MID_AMP.toFixed(4)};
    float fast = sin(t * ${WIND.FAST_FREQ.toFixed(4)} + p * 0.80)   * ${WIND.FAST_AMP.toFixed(4)};
    float gust = (sin(t * ${WIND.GUST_FREQ.toFixed(4)} + p * 0.30) + 1.0) * 0.5;
    return (slow + mid + fast) * gust;
  }

  void main() {
    // 1. Cover-fit: map canvas UV → image UV (centred crop, same as object-fit:cover)
    vec2 uv = v_uv * u_cover - (u_cover - 1.0) * 0.5;

    // 2. Rigid sway — rotate entire layer around the stem-root pivot
    float angle  = sway(u_time * u_speed, u_phase) * u_maxRad;
    vec2  d      = uv - u_pivot;
    float c      = cos(angle);
    float s      = sin(angle);
    vec2  swayed = u_pivot + vec2(d.x*c - d.y*s,  d.x*s + d.y*c);

    // 3. UV flutter — sinusoidal warp growing toward the tips.
    //    tip=0 at root (u_pivot.y), tip→1 near the top of the image (uv.y→0).
    //    Foreground layers (larger u_maxRad) receive proportionally more flutter.
    float tip = clamp((u_pivot.y - uv.y) / max(u_pivot.y, 0.001), 0.0, 1.0);
    float amp = u_flutter * tip * (1.0 + u_maxRad * 4.0);
    float fx  = sin(uv.y * 14.0 + u_time * 3.10 + u_phase * 1.30) * amp;
    float fy  = sin(uv.x * 10.0 + u_time * 2.35 + u_phase * 0.85) * amp * 0.30;

    gl_FragColor = texture2D(u_tex, clamp(swayed + vec2(fx, fy), 0.0, 1.0));
  }
`

// ─── GL HELPERS ──────────────────────────────────────────────────────────────
function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(sh) ?? 'shader compile error')
  return sh
}

function buildProgram(gl: WebGLRenderingContext): WebGLProgram {
  const p = gl.createProgram()!
  gl.attachShader(p, compileShader(gl, gl.VERTEX_SHADER,   VERT))
  gl.attachShader(p, compileShader(gl, gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p) ?? 'link error')
  return p
}

function uploadTex(gl: WebGLRenderingContext, img: HTMLImageElement): WebGLTexture {
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  // Flip Y so texture UV (0,0) = top-left, matching the pivot coordinates.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  return tex
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image()
    img.onload  = () => res(img)
    img.onerror = rej
    img.src     = src
  })
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
// (Petal animation lives in PetalLayer.tsx, rendered above this in FixedBackground)

export default function DesertScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      alpha:              false,
      antialias:          false,
      premultipliedAlpha: false,
    }) as WebGLRenderingContext | null
    if (!gl) return  // WebGL unavailable — scene won't render but won't crash

    const prog = buildProgram(gl)
    gl.useProgram(prog)

    // Fullscreen triangle-strip quad covering NDC [-1,1]²
    const buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    // Uniform locations
    const uTex     = gl.getUniformLocation(prog, 'u_tex')
    const uCover   = gl.getUniformLocation(prog, 'u_cover')
    const uTime    = gl.getUniformLocation(prog, 'u_time')
    const uPhase   = gl.getUniformLocation(prog, 'u_phase')
    const uMaxRad  = gl.getUniformLocation(prog, 'u_maxRad')
    const uSpeed   = gl.getUniformLocation(prog, 'u_speed')
    const uPivot   = gl.getUniformLocation(prog, 'u_pivot')
    const uFlutter = gl.getUniformLocation(prog, 'u_flutter')

    // Standard alpha blending for transparent flower PNGs
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 1)
    gl.uniform1i(uTex, 0)
    gl.activeTexture(gl.TEXTURE0)

    let bgTex: WebGLTexture | null = null
    const layerTex: (WebGLTexture | null)[] = LAYERS.map(() => null)
    let imgAspect = 16 / 9
    let cover: [number, number] = [1, 1]

    function updateCover() {
      const ca = canvas.width / canvas.height
      const ia = imgAspect
      // The tighter axis fills the canvas; the wider axis is centre-cropped.
      cover = ca >= ia ? [1, ia / ca] : [ca / ia, 1]
    }

    function resize() {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width  = parent.clientWidth
      canvas.height = parent.clientHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
      updateCover()
    }

    function drawLayer(
      tex: WebGLTexture,
      time: number, phase: number,
      maxRad: number, speed: number,
      ox: number, oy: number,
      flutter: number,
    ) {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.uniform2f(uCover,   cover[0], cover[1])
      gl.uniform1f(uTime,    time)
      gl.uniform1f(uPhase,   phase)
      gl.uniform1f(uMaxRad,  maxRad)
      gl.uniform1f(uSpeed,   speed)
      gl.uniform2f(uPivot,   ox, oy)
      gl.uniform1f(uFlutter, flutter)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    let raf: number
    let t = 0

    function tick() {
      t += 0.016
      if (canvas.width > 0 && canvas.height > 0) {
        gl.clear(gl.COLOR_BUFFER_BIT)

        // Background — flat, no animation
        if (bgTex) drawLayer(bgTex, t, 0, 0, 0, 0.5, 0.5, 0)

        // Flower layers back → front with sway + UV flutter
        for (let i = 0; i < LAYERS.length; i++) {
          const tex = layerTex[i]
          if (!tex) continue
          const { ox, oy, maxDeg, speed, phase } = LAYERS[i]
          drawLayer(tex, t, phase, maxDeg * DEG * WIND.INTENSITY, speed, ox, oy, WIND.FLUTTER_AMP)
        }
      }
      raf = requestAnimationFrame(tick)
    }

    resize()
    window.addEventListener('resize', resize)
    raf = requestAnimationFrame(tick)

    // Images load asynchronously; each frame renders whatever is ready
    loadImg(BASE_SRC).then(img => {
      imgAspect = img.naturalWidth / img.naturalHeight
      updateCover()
      bgTex = uploadTex(gl, img)
    })
    LAYERS.forEach((layer, i) => {
      loadImg(layer.src).then(img => { layerTex[i] = uploadTex(gl, img) })
    })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
}
