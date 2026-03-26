'use client'
import { useEffect, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { clamp, remap } from '@/lib/scrollUtils'

const RIBBON_TEXT =
  'Where operators find their next project  \u2726  Underlevered assets  \u2726  Builder to operator  \u2726  AI deal intelligence  \u2726  On-chain escrow  \u2726  Asset manifest  \u2726  Silk Bazaar Verified  \u2726  '

interface Props {
  progressRef: MutableRefObject<number>
}

export default function ThreeRibbon({ progressRef }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const width = container.clientWidth
    const height = container.clientHeight

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setClearAlpha(0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)

    // Scene & camera
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100)
    camera.position.set(0, 0, 3)

    // Build helix geometry
    const segments = 600
    const turns = 2.5
    const radius = 0.4
    const helixHeight = 1.8
    const ribbonWidth = 0.04

    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    // Compute helix points and Frenet frames
    const helixPoints: THREE.Vector3[] = []
    const tangents: THREE.Vector3[] = []
    const normals: THREE.Vector3[] = []
    const binormals: THREE.Vector3[] = []

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = t * Math.PI * 2 * turns
      const x = radius * Math.cos(angle)
      const y = (t - 0.5) * helixHeight
      const z = radius * Math.sin(angle)
      helixPoints.push(new THREE.Vector3(x, y, z))
    }

    // Compute tangents
    for (let i = 0; i <= segments; i++) {
      let tang: THREE.Vector3
      if (i === 0) {
        tang = new THREE.Vector3().subVectors(helixPoints[1], helixPoints[0]).normalize()
      } else if (i === segments) {
        tang = new THREE.Vector3().subVectors(helixPoints[segments], helixPoints[segments - 1]).normalize()
      } else {
        tang = new THREE.Vector3().subVectors(helixPoints[i + 1], helixPoints[i - 1]).normalize()
      }
      tangents.push(tang)
    }

    // Compute normals and binormals using initial normal
    const initialNormal = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i <= segments; i++) {
      const b = new THREE.Vector3().crossVectors(tangents[i], initialNormal).normalize()
      if (b.length() < 0.001) {
        b.set(1, 0, 0)
      }
      binormals.push(b)
      normals.push(new THREE.Vector3().crossVectors(b, tangents[i]).normalize())
    }

    // Compute arc lengths
    const arcLengths: number[] = [0]
    for (let i = 1; i <= segments; i++) {
      arcLengths.push(arcLengths[i - 1] + helixPoints[i].distanceTo(helixPoints[i - 1]))
    }
    const totalArcLength = arcLengths[segments]

    // Build ribbon vertices
    for (let i = 0; i <= segments; i++) {
      const p = helixPoints[i]
      const b = binormals[i]
      const u = arcLengths[i]

      // Left edge
      positions.push(p.x - b.x * ribbonWidth, p.y - b.y * ribbonWidth, p.z - b.z * ribbonWidth)
      uvs.push(u, 0)

      // Right edge
      positions.push(p.x + b.x * ribbonWidth, p.y + b.y * ribbonWidth, p.z + b.z * ribbonWidth)
      uvs.push(u, 1)
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3
      indices.push(a, b, c)
      indices.push(b, d, c)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    // Text texture
    const textCanvas = document.createElement('canvas')
    textCanvas.width = 4096
    textCanvas.height = 128
    const tctx = textCanvas.getContext('2d')!
    tctx.clearRect(0, 0, 4096, 128)
    tctx.fillStyle = '#1a1208'
    tctx.font = '500 40px DM Mono, Courier New, monospace'
    // Repeat text to fill width
    let textStr = ''
    while (tctx.measureText(textStr).width < 4096) {
      textStr += RIBBON_TEXT
    }
    tctx.fillText(textStr, 0, 88)

    const texture = new THREE.CanvasTexture(textCanvas)
    texture.wrapS = THREE.RepeatWrapping

    // Shared vertex shader
    const vertexShader = `
      varying vec2 v_uv;
      void main() {
        v_uv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

    // Glass strand
    const glassUniforms = {
      u_opacity: { value: 0.82 },
      u_head: { value: 0.0 },
      u_tail: { value: 0.0 },
      u_max_u: { value: totalArcLength },
      u_fade_w: { value: 0.12 },
    }

    const glassMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: `
        precision mediump float;
        uniform float u_opacity;
        uniform float u_head;
        uniform float u_tail;
        uniform float u_max_u;
        uniform float u_fade_w;
        varying vec2 v_uv;
        void main() {
          float p = v_uv.x / u_max_u;
          if (p < u_tail || p > u_head) discard;
          float edge = smoothstep(0.0, 0.08, v_uv.y) * smoothstep(1.0, 0.92, v_uv.y);
          float tipFade = smoothstep(u_tail, u_tail + u_fade_w, p)
                        * smoothstep(u_head, u_head - u_fade_w, p);
          gl_FragColor = vec4(0.98, 0.96, 0.94, u_opacity * edge * tipFade);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: glassUniforms,
    })

    const glassMesh = new THREE.Mesh(geometry, glassMaterial)
    scene.add(glassMesh)

    // Text strand
    const textUniforms = {
      u_map: { value: texture },
      u_offset: { value: 0.0 },
      u_head: { value: 0.0 },
      u_tail: { value: 0.0 },
      u_max_u: { value: totalArcLength },
      u_fade_w: { value: 0.12 },
    }

    const textMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: `
        precision mediump float;
        uniform sampler2D u_map;
        uniform float u_offset;
        uniform float u_head;
        uniform float u_tail;
        uniform float u_max_u;
        uniform float u_fade_w;
        varying vec2 v_uv;
        void main() {
          float p = v_uv.x / u_max_u;
          if (p < u_tail || p > u_head) discard;
          float x = gl_FrontFacing ? v_uv.x + u_offset : v_uv.x - u_offset;
          vec4 texColor = texture2D(u_map, vec2(mod(x, u_max_u) / u_max_u, v_uv.y));
          float tipFade = smoothstep(u_tail, u_tail + u_fade_w, p)
                        * smoothstep(u_head, u_head - u_fade_w, p);
          gl_FragColor = vec4(texColor.rgb, texColor.a * tipFade);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      uniforms: textUniforms,
    })

    const textMesh = new THREE.Mesh(geometry, textMaterial)
    scene.add(textMesh)

    // Scroll mapping constants
    const helixStart = -0.24
    const helixExitStart = 0.66
    const helixEnd = 1.0
    const drawInEnd = 0.32
    const eraseStart = 0.64

    const isMobile = width < 768
    const rotationMultiplier = isMobile ? Math.PI * 0.8 : Math.PI * 1.5

    // Animation loop
    let animId: number
    function tick() {
      animId = requestAnimationFrame(tick)

      const d = progressRef.current

      const headVal = remap(d, helixStart, helixExitStart, 0, drawInEnd)
      const tailVal = remap(d, helixExitStart, helixEnd, eraseStart, 1)

      glassUniforms.u_head.value = headVal
      glassUniforms.u_tail.value = tailVal
      textUniforms.u_head.value = headVal
      textUniforms.u_tail.value = tailVal
      textUniforms.u_offset.value = -d * 3

      glassMesh.rotation.y = d * rotationMultiplier
      textMesh.rotation.y = d * rotationMultiplier

      renderer.render(scene, camera)
    }
    tick()

    // Resize handler
    function onResize() {
      if (!container) return
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      geometry.dispose()
      glassMaterial.dispose()
      textMaterial.dispose()
      texture.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [progressRef])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent',
      }}
    />
  )
}
