'use client'
import { useEffect, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { clamp } from '@/lib/scrollUtils'

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
    if (width === 0 || height === 0) return

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setClearAlpha(0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 100)
    // Pull camera back and slightly above to see the ribbon face-on
    camera.position.set(0, 0.3, 4.5)
    camera.lookAt(0, 0, 0)

    // ===== LOOSE S-CURVE RIBBON (like Perplexity reference) =====
    // Fewer turns, much larger radius and ribbon width
    const segments = 600
    const turns = 1.5       // fewer turns = looser
    const radius = 0.8      // wider orbit
    const helixHeight = 2.4 // taller
    const ribbonWidth = 0.18 // much wider ribbon face

    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    const helixPoints: THREE.Vector3[] = []
    const tangents: THREE.Vector3[] = []
    const binormals: THREE.Vector3[] = []

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = t * Math.PI * 2 * turns
      const x = radius * Math.cos(angle)
      const y = (t - 0.5) * helixHeight
      const z = radius * Math.sin(angle)
      helixPoints.push(new THREE.Vector3(x, y, z))
    }

    // Tangents
    for (let i = 0; i <= segments; i++) {
      let tang: THREE.Vector3
      if (i === 0) tang = new THREE.Vector3().subVectors(helixPoints[1], helixPoints[0]).normalize()
      else if (i === segments) tang = new THREE.Vector3().subVectors(helixPoints[segments], helixPoints[segments - 1]).normalize()
      else tang = new THREE.Vector3().subVectors(helixPoints[i + 1], helixPoints[i - 1]).normalize()
      tangents.push(tang)
    }

    // Use normal that keeps the ribbon face tilted toward the camera (Z axis)
    // This makes the text readable from the front
    for (let i = 0; i <= segments; i++) {
      // Normal pointing outward from helix center (in XZ plane)
      const t = i / segments
      const angle = t * Math.PI * 2 * turns
      const outward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize()

      // Binormal = cross(tangent, outward) — this gives us the ribbon width direction
      const b = new THREE.Vector3().crossVectors(tangents[i], outward).normalize()
      if (b.length() < 0.001) b.set(0, 0, 1)
      binormals.push(b)
    }

    // Arc lengths
    const arcLengths: number[] = [0]
    for (let i = 1; i <= segments; i++) {
      arcLengths.push(arcLengths[i - 1] + helixPoints[i].distanceTo(helixPoints[i - 1]))
    }
    const totalArcLength = arcLengths[segments]

    // Build ribbon mesh — flat ribbon extruded along binormal
    for (let i = 0; i <= segments; i++) {
      const p = helixPoints[i]
      const b = binormals[i]

      positions.push(p.x - b.x * ribbonWidth, p.y - b.y * ribbonWidth, p.z - b.z * ribbonWidth)
      uvs.push(arcLengths[i], 0)
      positions.push(p.x + b.x * ribbonWidth, p.y + b.y * ribbonWidth, p.z + b.z * ribbonWidth)
      uvs.push(arcLengths[i], 1)
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2, b = a + 1, c = a + 2, dd = a + 3
      indices.push(a, b, c)
      indices.push(b, dd, c)
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
    tctx.font = '500 36px Geist Mono, Courier New, monospace'
    let textStr = ''
    while (tctx.measureText(textStr).width < 4096) textStr += RIBBON_TEXT
    tctx.fillText(textStr, 0, 80)

    const texture = new THREE.CanvasTexture(textCanvas)
    texture.wrapS = THREE.RepeatWrapping

    const vertexShader = `
      varying vec2 v_uv;
      void main() {
        v_uv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

    // Glass strand — semi-transparent white ribbon
    const glassUniforms = {
      u_opacity: { value: 0.88 },
      u_head: { value: 0.0 },
      u_tail: { value: 0.0 },
      u_max_u: { value: totalArcLength },
      u_fade_w: { value: 0.06 },
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
          if (u_head <= u_tail || p < u_tail || p > u_head) discard;
          float edge = smoothstep(0.0, 0.06, v_uv.y) * smoothstep(1.0, 0.94, v_uv.y);
          float tipFade = smoothstep(u_tail, u_tail + u_fade_w, p)
                        * smoothstep(u_head, u_head - u_fade_w, p);
          gl_FragColor = vec4(0.98, 0.97, 0.95, u_opacity * edge * tipFade);
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
      u_fade_w: { value: 0.06 },
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
          if (u_head <= u_tail || p < u_tail || p > u_head) discard;
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

    // Tilt the whole ribbon group slightly toward camera for readability
    const group = new THREE.Group()
    group.add(glassMesh)
    group.add(textMesh)
    group.rotation.x = -0.15 // slight tilt toward viewer
    scene.add(group)
    // Remove from scene root since they're in the group now
    scene.remove(glassMesh)
    scene.remove(textMesh)

    const isMobile = width < 768
    const rotationMultiplier = isMobile ? Math.PI * 0.6 : Math.PI * 1.0

    let animId: number
    function tick() {
      animId = requestAnimationFrame(tick)

      const d = progressRef.current

      // Head: draws in from 0 to 1 during d = 0.55 → 0.75
      const headVal = clamp((d - 0.55) / 0.20, 0, 1)
      // Tail: stays at 0, then erases from 0 to 1 during d = 0.82 → 0.95
      const tailVal = clamp((d - 0.82) / 0.13, 0, 1)

      glassUniforms.u_head.value = headVal
      glassUniforms.u_tail.value = tailVal
      textUniforms.u_head.value = headVal
      textUniforms.u_tail.value = tailVal
      textUniforms.u_offset.value = -d * 2.5

      // Gentle rotation
      const rotationD = clamp((d - 0.50) / 0.45, 0, 1)
      group.rotation.y = rotationD * rotationMultiplier

      renderer.render(scene, camera)
    }
    tick()

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
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [progressRef])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    />
  )
}
