'use client'
import { useEffect, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { clamp } from '@/lib/scrollUtils'

const RIBBON_TEXT =
  'Where operators find their next project  \u2726  Underlevered assets  \u2726  Builder to operator  \u2726  AI deal intelligence  \u2726  On-chain escrow  \u2726  Asset manifest  \u2726  Silk Bazaar Verified  \u2726  '

interface Props {
  progressRef: MutableRefObject<number>
}

const VERT = `
  varying vec2 v_uv;
  void main() {
    v_uv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const GLASS_FRAG = `
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
`

const TEXT_FRAG = `
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
    float x = gl_FrontFacing ? v_uv.x + u_offset : (u_max_u - v_uv.x) - u_offset;
    vec4 texColor = texture2D(u_map, vec2(mod(x, u_max_u) / u_max_u, v_uv.y));
    float tipFade = smoothstep(u_tail, u_tail + u_fade_w, p)
                  * smoothstep(u_head, u_head - u_fade_w, p);
    gl_FragColor = vec4(texColor.rgb, texColor.a * tipFade);
  }
`

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
    camera.position.set(0, 0, 5.0)
    camera.lookAt(0, 0, 0)

    // Helix geometry — sized to fill the viewport at this camera distance
    const segments = 600
    const turns = 2.5
    const radius = 1.0
    const helixHeight = 8.0
    const ribbonWidth = 0.22

    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    const helixPoints: THREE.Vector3[] = []
    const tangents: THREE.Vector3[] = []

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = t * Math.PI * 2 * turns
      helixPoints.push(new THREE.Vector3(
        radius * Math.cos(angle),
        (t - 0.5) * helixHeight,
        radius * Math.sin(angle)
      ))
    }

    for (let i = 0; i <= segments; i++) {
      if (i === 0) tangents.push(new THREE.Vector3().subVectors(helixPoints[1], helixPoints[0]).normalize())
      else if (i === segments) tangents.push(new THREE.Vector3().subVectors(helixPoints[segments], helixPoints[segments - 1]).normalize())
      else tangents.push(new THREE.Vector3().subVectors(helixPoints[i + 1], helixPoints[i - 1]).normalize())
    }

    // Arc lengths for UV mapping
    const arcLengths: number[] = [0]
    for (let i = 1; i <= segments; i++) {
      arcLengths.push(arcLengths[i - 1] + helixPoints[i].distanceTo(helixPoints[i - 1]))
    }
    const totalArcLength = arcLengths[segments]

    // The key fix: UV u-coordinate is normalized so the texture repeats
    // at a consistent physical scale along the ribbon.
    // ribbonWidth in 3D = 0.22. We want the text to appear at ~16px per unit.
    // The texture is 4096px wide. One full texture width = 4096/16 = 256 units.
    // So we scale UV so 1 texture repeat = ribbonWidth * textAspect
    // Perplexity uses: u = arcLength / aspect — we use a fixed scale factor
    const uvScale = totalArcLength / 6.0 // 6 repeats along the ribbon

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = t * Math.PI * 2 * turns
      const outward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize()
      const b = new THREE.Vector3().crossVectors(tangents[i], outward).normalize()
      if (b.length() < 0.001) b.set(0, 0, 1)

      const p = helixPoints[i]
      positions.push(p.x - b.x * ribbonWidth, p.y - b.y * ribbonWidth, p.z - b.z * ribbonWidth)
      positions.push(p.x + b.x * ribbonWidth, p.y + b.y * ribbonWidth, p.z + b.z * ribbonWidth)

      // UV: x = normalized arc length scaled for text repeats, y = 0 or 1
      const u = arcLengths[i] / totalArcLength * uvScale
      uvs.push(u, 0)
      uvs.push(u, 1)
    }

    for (let i = 0; i < segments; i++) {
      const a = i * 2, bb = a + 1, c = a + 2, dd = a + 3
      indices.push(a, bb, c)
      indices.push(bb, dd, c)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    // Text texture — the text fills the full canvas width
    const textCanvas = document.createElement('canvas')
    textCanvas.width = 4096
    textCanvas.height = 128
    const tctx = textCanvas.getContext('2d')!
    tctx.clearRect(0, 0, 4096, 128)
    tctx.fillStyle = '#1a1208'
    tctx.font = '500 48px Geist Mono, monospace'
    let textStr = ''
    while (tctx.measureText(textStr).width < 4096) textStr += RIBBON_TEXT
    tctx.fillText(textStr, 0, 88)
    const texture = new THREE.CanvasTexture(textCanvas)
    texture.wrapS = THREE.RepeatWrapping

    const uniforms = {
      u_head: { value: 0 },
      u_tail: { value: 0 },
      u_max_u: { value: uvScale },
      u_fade_w: { value: 0.06 },
      u_opacity: { value: 0.88 },
      u_offset: { value: 0 },
      u_map: { value: texture },
    }

    const glassMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: GLASS_FRAG,
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
      uniforms: { u_opacity: uniforms.u_opacity, u_head: uniforms.u_head, u_tail: uniforms.u_tail, u_max_u: uniforms.u_max_u, u_fade_w: uniforms.u_fade_w },
    })

    const textMat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: TEXT_FRAG,
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1,
      uniforms: { u_map: uniforms.u_map, u_offset: uniforms.u_offset, u_head: uniforms.u_head, u_tail: uniforms.u_tail, u_max_u: uniforms.u_max_u, u_fade_w: uniforms.u_fade_w },
    })

    const group = new THREE.Group()
    group.add(new THREE.Mesh(geometry, glassMat))
    group.add(new THREE.Mesh(geometry, textMat))
    group.rotation.x = -0.1
    scene.add(group)

    const isMobile = width < 768
    const rotationMultiplier = isMobile ? Math.PI * 0.5 : Math.PI * 0.8

    let animId: number
    function tick() {
      animId = requestAnimationFrame(tick)
      const d = progressRef.current

      // Draw-in over d 0.50→0.78, erase over d 0.80→0.96
      const headVal = clamp((d - 0.50) / 0.28, 0, 1)
      const tailVal = clamp((d - 0.80) / 0.16, 0, 1)

      uniforms.u_head.value = headVal
      uniforms.u_tail.value = tailVal
      uniforms.u_offset.value = -d * 1.5

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
      glassMat.dispose()
      textMat.dispose()
      texture.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [progressRef])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: 'transparent' }} />
  )
}
