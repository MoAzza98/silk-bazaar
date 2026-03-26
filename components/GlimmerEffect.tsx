'use client'
import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import * as THREE from 'three'

export interface GlimmerHandle {
  morph: () => void
}

const VERTEX_SHADER = `
  varying vec2 v_uv;
  void main() {
    v_uv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAGMENT_SHADER = `
  precision highp float;
  uniform sampler2D u_texture;
  uniform float u_progress;
  uniform float u_waveWidth;
  uniform float u_grid;
  uniform float u_distortion;
  uniform float u_active;
  varying vec2 v_uv;

  void main() {
    // When not active, show clean image
    if (u_active < 0.5) {
      gl_FragColor = texture2D(u_texture, v_uv);
      return;
    }

    // Wave sweeps bottom to top (uv.y=0 at bottom, 1 at top)
    float wavePos = v_uv.y;

    // Distance from wave front
    float distFromWave = abs(wavePos - u_progress);

    // Pixelation peaks at wave front, zero far away
    float pixelateAmount = smoothstep(u_waveWidth, 0.0, distFromWave);

    // Snap UVs to coarse grid for pixelation
    vec2 pixelUV = floor(v_uv * u_grid) / u_grid;
    vec2 distortedUV = mix(v_uv, pixelUV, pixelateAmount);

    // Organic sine/cosine distortion at wave front
    distortedUV += pixelateAmount * u_distortion * vec2(
      sin(v_uv.y * 25.0 + u_progress * 6.28318),
      cos(v_uv.x * 25.0 + u_progress * 6.28318)
    );

    // Clamp UVs to prevent sampling outside texture
    distortedUV = clamp(distortedUV, 0.0, 1.0);

    vec4 color = texture2D(u_texture, distortedUV);
    gl_FragColor = color;
  }
`

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

const GlimmerEffect = forwardRef<GlimmerHandle, { imageSrc: string }>(
  function GlimmerEffect({ imageSrc }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const uniformsRef = useRef<{
      u_progress: { value: number }
      u_active: { value: number }
      u_waveWidth: { value: number }
      u_grid: { value: number }
      u_distortion: { value: number }
      u_texture: { value: THREE.Texture | null }
    } | null>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const sceneRef = useRef<THREE.Scene | null>(null)
    const cameraRef = useRef<THREE.OrthographicCamera | null>(null)
    const animFrameRef = useRef<number | null>(null)
    const morphingRef = useRef(false)

    useImperativeHandle(ref, () => ({
      morph: () => {
        if (!uniformsRef.current) return
        // Allow re-triggering — restart the animation even if one is running
        morphingRef.current = true
        uniformsRef.current.u_active.value = 1.0
        uniformsRef.current.u_progress.value = 0.0

        const duration = 1500
        const start = performance.now()

        function animate(now: number) {
          if (!uniformsRef.current) return
          const t = Math.min((now - start) / duration, 1)
          uniformsRef.current.u_progress.value = easeOutExpo(t)

          if (t < 1) {
            requestAnimationFrame(animate)
          } else {
            // Morph complete — back to clean
            uniformsRef.current.u_active.value = 0.0
            uniformsRef.current.u_progress.value = 0.0
            morphingRef.current = false
          }
        }
        requestAnimationFrame(animate)
      },
    }))

    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      const width = container.clientWidth
      const height = container.clientHeight
      if (width === 0 || height === 0) return

      // Renderer
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(width, height)
      renderer.setClearAlpha(0)
      container.appendChild(renderer.domElement)
      rendererRef.current = renderer

      // Orthographic camera for full-screen quad
      const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.01, 10)
      camera.position.z = 1
      cameraRef.current = camera

      const scene = new THREE.Scene()
      sceneRef.current = scene

      // Load texture
      const loader = new THREE.TextureLoader()
      loader.load(imageSrc, (texture) => {
        texture.minFilter = THREE.LinearFilter
        texture.magFilter = THREE.LinearFilter

        const uniforms = {
          u_texture: { value: texture },
          u_progress: { value: 0.0 },
          u_active: { value: 0.0 },
          u_waveWidth: { value: 0.15 },
          u_grid: { value: 40.0 },
          u_distortion: { value: 0.008 },
        }
        uniformsRef.current = uniforms

        const material = new THREE.ShaderMaterial({
          vertexShader: VERTEX_SHADER,
          fragmentShader: FRAGMENT_SHADER,
          uniforms,
          transparent: false,
        })

        const geometry = new THREE.PlaneGeometry(1, 1)
        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)
      })

      // Render loop
      function tick() {
        animFrameRef.current = requestAnimationFrame(tick)
        if (sceneRef.current && cameraRef.current) {
          renderer.render(sceneRef.current, cameraRef.current)
        }
      }
      tick()

      function onResize() {
        if (!container || !renderer || !cameraRef.current) return
        const w = container.clientWidth
        const h = container.clientHeight
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', onResize)

      return () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        window.removeEventListener('resize', onResize)
        renderer.dispose()
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
      }
    }, [imageSrc])

    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          inset: 0,
        }}
      />
    )
  }
)

export default GlimmerEffect
