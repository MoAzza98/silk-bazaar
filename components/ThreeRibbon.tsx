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
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.01, 100)
    camera.position.set(0, 0, 3.2)
    camera.lookAt(0, 0, 0)

    // ===== FLOWING RIBBON — wide coverage, multiple visible swirls =====
    const segments = 800
    const turns = 3.0         // more turns = more swirls visible on screen
    const radius = 1.2        // wide enough to span screen but not overwhelming
    const helixHeight = 5.0   // tall — many loops visible at once
    const ribbonWidth = 0.35  // wide face, readable text

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

    // Binormals — ribbon face tilted toward camera
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = t * Math.PI * 2 * turns
      const outward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize()
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

    // Build ribbon mesh
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

    // Text texture — larger for readability at close range
    const textCanvas = document.createElement('canvas')
    textCanvas.width = 4096
    textCanvas.height = 256
    const tctx = textCanvas.getContext('2d')!
    tctx.clearRect(0, 0, 4096, 256)
    tctx.fillStyle = '#1a1208'
    tctx.font = '500 64px Geist Mono, Courier New, monospace'
    let textStr = ''
    while (tctx.measureText(textStr).width < 8192) textStr += RIBBON_TEXT
    tctx.fillText(textStr, 0, 160)

    const texture = new THREE.CanvasTexture(textCanvas)
    texture.wrapS = THREE.RepeatWrapping

    const vertexShader = `
      varying vec2 v_uv;
      void main() {
        v_uv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `

    // Glass strand
    const glassUniforms = {
      u_opacity: { value: 0.92 },
      u_head: { value: 0.0 },
      u_tail: { value: 0.0 },
      u_max_u: { value: totalArcLength },
      u_fade_w: { value: 0.04 },
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
          float edge = smoothstep(0.0, 0.04, v_uv.y) * smoothstep(1.0, 0.96, v_uv.y);
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

    // Text strand
    const textUniforms = {
      u_map: { value: texture },
      u_offset: { value: 0.0 },
      u_head: { value: 0.0 },
      u_tail: { value: 0.0 },
      u_max_u: { value: totalArcLength },
      u_fade_w: { value: 0.04 },
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

    const group = new THREE.Group()
    group.add(glassMesh)
    group.add(textMesh)
    group.rotation.x = -0.1
    scene.add(group)

    const isMobile = width < 768
    const rotationMultiplier = isMobile ? Math.PI * 0.5 : Math.PI * 0.8

    let animId: number
    function tick() {
      animId = requestAnimationFrame(tick)

      const d = progressRef.current

      // Gradually unfurl: draw-in over d 0.50→0.78, erase over d 0.80→0.96
      const headVal = clamp((d - 0.50) / 0.28, 0, 1)
      const tailVal = clamp((d - 0.80) / 0.16, 0, 1)

      glassUniforms.u_head.value = headVal
      glassUniforms.u_tail.value = tailVal
      textUniforms.u_head.value = headVal
      textUniforms.u_tail.value = tailVal
      textUniforms.u_offset.value = -d * 1.5

      // Gentle rotation over the full ribbon lifetime
      const rotationD = clamp((d - 0.48) / 0.48, 0, 1)
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
