'use client'
import { useEffect, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { clamp } from '@/lib/scrollUtils'

const RIBBON_TEXT =
  'Where operators find their next project  \u2726  Underlevered assets  \u2726  Builder to operator  \u2726  AI deal intelligence  \u2726  On-chain escrow  \u2726  Asset manifest  \u2726  Silk Bazaar Verified  \u2726  '

interface Props {
  progressRef: MutableRefObject<number>
  backRef: React.RefObject<HTMLDivElement | null>
  frontRef: React.RefObject<HTMLDivElement | null>
}

// Vertex shader — passes worldZ for front/back splitting
const VERT = `
  varying float v_worldZ;
  varying vec2 v_uv;
  void main() {
    v_uv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    v_worldZ = worldPos.z;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

// Glass ribbon fragment — white surface with edge feathering
function glassFragment(isFront: boolean) {
  const discard = isFront ? 'if (v_worldZ <= 0.0) discard;' : 'if (v_worldZ > 0.0) discard;'
  return `
    precision mediump float;
    uniform float u_opacity;
    uniform float u_head;
    uniform float u_tail;
    uniform float u_max_u;
    uniform float u_fade_w;
    varying float v_worldZ;
    varying vec2 v_uv;
    void main() {
      ${discard}
      float p = v_uv.x / u_max_u;
      if (u_head <= u_tail || p < u_tail || p > u_head) discard;
      float edge = smoothstep(0.0, 0.24, v_uv.y) * smoothstep(1.0, 0.76, v_uv.y);
      float tipFade = smoothstep(u_tail, u_tail + u_fade_w, p)
                    * smoothstep(u_head, u_head - u_fade_w, p);
      gl_FragColor = vec4(1.0, 1.0, 1.0, u_opacity * edge * tipFade);
    }
  `
}

// Text ribbon fragment — samples texture, mirrors UV on back face
function textFragment(isFront: boolean) {
  const discard = isFront ? 'if (v_worldZ <= 0.0) discard;' : 'if (v_worldZ > 0.0) discard;'
  return `
    precision mediump float;
    uniform sampler2D u_map;
    uniform float u_offset;
    uniform float u_head;
    uniform float u_tail;
    uniform float u_max_u;
    uniform float u_fade_w;
    varying float v_worldZ;
    varying vec2 v_uv;
    void main() {
      ${discard}
      float p = v_uv.x / u_max_u;
      if (u_head <= u_tail || p < u_tail || p > u_head) discard;
      // gl_FrontFacing = geometric front of the triangle.
      // Swap: when front-facing, mirror the UV so text reads L→R from viewer perspective.
      float rawX = gl_FrontFacing ? (u_max_u - v_uv.x) - u_offset : v_uv.x + u_offset;
      float x = mod(rawX, u_max_u) / u_max_u;
      vec4 texColor = texture2D(u_map, vec2(x, v_uv.y));
      float tipFade = smoothstep(u_tail, u_tail + u_fade_w, p)
                    * smoothstep(u_head, u_head - u_fade_w, p);
      gl_FragColor = vec4(texColor.rgb, texColor.a * tipFade);
    }
  `
}

export default function ThreeRibbon({ progressRef, backRef, frontRef }: Props) {
  useEffect(() => {
    const backContainer = backRef.current
    const frontContainer = frontRef.current
    if (!backContainer || !frontContainer) return

    const width = backContainer.clientWidth
    const height = backContainer.clientHeight
    if (width === 0 || height === 0) return

    // Two renderers — back and front
    function createRenderer(container: HTMLDivElement) {
      const r = new THREE.WebGLRenderer({ alpha: true, antialias: true })
      r.setClearAlpha(0)
      r.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      r.setSize(width, height)
      r.domElement.style.position = 'absolute'
      r.domElement.style.top = '0'
      r.domElement.style.left = '0'
      r.domElement.style.width = '100%'
      r.domElement.style.height = '100%'
      container.appendChild(r.domElement)
      return r
    }

    const backRenderer = createRenderer(backContainer)
    const frontRenderer = createRenderer(frontContainer)

    // Shared camera
    const aspect = width / height
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.01, 200)
    camera.position.set(0, 0, 14)
    camera.lookAt(0, 0, 0)

    // Build helix geometry
    const segments = 400
    const numTurns = 4
    const radius = 8
    const helixHeight = 36
    const strandWidth = 2

    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    const helixPoints: THREE.Vector3[] = []
    const tangents: THREE.Vector3[] = []

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = t * Math.PI * 2 * numTurns
      const x = radius * Math.cos(angle)
      const y = helixHeight * t - helixHeight / 2
      const z = radius * Math.sin(angle)
      helixPoints.push(new THREE.Vector3(x, y, z))
    }

    for (let i = 0; i <= segments; i++) {
      let tang: THREE.Vector3
      if (i === 0) tang = new THREE.Vector3().subVectors(helixPoints[1], helixPoints[0]).normalize()
      else if (i === segments) tang = new THREE.Vector3().subVectors(helixPoints[segments], helixPoints[segments - 1]).normalize()
      else tang = new THREE.Vector3().subVectors(helixPoints[i + 1], helixPoints[i - 1]).normalize()
      tangents.push(tang)
    }

    // Width direction: cross(radial, tangent)
    const arcLengths: number[] = [0]
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = t * Math.PI * 2 * numTurns
      const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize()
      const widthDir = new THREE.Vector3().crossVectors(radial, tangents[i]).normalize()

      const p = helixPoints[i]
      const hw = strandWidth / 2

      positions.push(p.x + widthDir.x * hw, p.y + widthDir.y * hw, p.z + widthDir.z * hw)
      positions.push(p.x - widthDir.x * hw, p.y - widthDir.y * hw, p.z - widthDir.z * hw)

      if (i > 0) arcLengths.push(arcLengths[i - 1] + helixPoints[i].distanceTo(helixPoints[i - 1]))
      // UV x placeholder — will be recomputed after texture is measured
      uvs.push(0, 0)
      uvs.push(0, 1)
    }

    // Compute UV x after we know the texture dimensions
    // This will be filled in after the texture canvas is created
    const totalArcLength = arcLengths[segments]

    for (let i = 0; i < segments; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3
      indices.push(a, b, c)
      indices.push(b, d, c)
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    // Text texture — match Perplexity: 16px on 128px canvas
    const textCanvas = document.createElement('canvas')
    const texH = 128
    textCanvas.height = texH
    const tctx = textCanvas.getContext('2d')!
    tctx.font = '500 16px Geist Mono, monospace'
    // Build string long enough to tile, then measure actual pixel width
    let textStr = ''
    while (tctx.measureText(textStr).width < 8192) textStr += RIBBON_TEXT
    const measuredWidth = tctx.measureText(textStr).width
    textCanvas.width = Math.ceil(measuredWidth)
    // Re-set font after canvas resize (canvas resize clears context state)
    tctx.clearRect(0, 0, textCanvas.width, texH)
    tctx.fillStyle = '#1a1208'
    tctx.font = '500 16px Geist Mono, monospace'
    tctx.fillText(textStr, 0, texH * 0.6)
    const texture = new THREE.CanvasTexture(textCanvas)
    texture.wrapS = THREE.RepeatWrapping

    // Now recompute UVs with the actual texture aspect ratio
    const imgAspect = measuredWidth / texH
    const uvAttr = geometry.getAttribute('uv') as THREE.BufferAttribute
    for (let i = 0; i <= segments; i++) {
      const u = arcLengths[i] / strandWidth / imgAspect
      uvAttr.setX(i * 2, u)
      uvAttr.setY(i * 2, 0)
      uvAttr.setX(i * 2 + 1, u)
      uvAttr.setY(i * 2 + 1, 1)
    }
    uvAttr.needsUpdate = true
    const maxU = totalArcLength / strandWidth / imgAspect

    // Shared uniforms
    const sharedUniforms = {
      u_head: { value: 0 },
      u_tail: { value: 0 },
      u_max_u: { value: maxU },
      u_fade_w: { value: 0.12 },
      u_opacity: { value: 0.88 },
      u_offset: { value: 0 },
      u_map: { value: texture },
    }

    function createScene(isFront: boolean) {
      const scene = new THREE.Scene()
      const group = new THREE.Group()

      // Glass mesh
      const glassMat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: glassFragment(isFront),
        transparent: true, side: THREE.DoubleSide, depthWrite: false,
        uniforms: {
          u_opacity: sharedUniforms.u_opacity,
          u_head: sharedUniforms.u_head,
          u_tail: sharedUniforms.u_tail,
          u_max_u: sharedUniforms.u_max_u,
          u_fade_w: sharedUniforms.u_fade_w,
        },
      })
      group.add(new THREE.Mesh(geometry, glassMat))

      // Text mesh
      const textMat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: textFragment(isFront),
        transparent: true, side: THREE.DoubleSide, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -1,
        uniforms: {
          u_map: sharedUniforms.u_map,
          u_offset: sharedUniforms.u_offset,
          u_head: sharedUniforms.u_head,
          u_tail: sharedUniforms.u_tail,
          u_max_u: sharedUniforms.u_max_u,
          u_fade_w: sharedUniforms.u_fade_w,
        },
      })
      group.add(new THREE.Mesh(geometry, textMat))

      scene.add(group)
      return { scene, group }
    }

    const back = createScene(false)
    const front = createScene(true)

    // Animation constants
    const sweepDistance = 40
    const rotationSpeed = Math.PI * 1.5
    const textureScrollSpeed = 3

    let animId: number
    let lastD = -1

    function tick() {
      animId = requestAnimationFrame(tick)
      const d = progressRef.current
      if (Math.abs(d - lastD) < 0.0001) return
      lastD = d

      // Vertical sweep
      const sweepY = -sweepDistance / 2 + d * sweepDistance
      back.group.position.y = sweepY
      front.group.position.y = sweepY

      // Rotation
      back.group.rotation.y = d * rotationSpeed
      front.group.rotation.y = d * rotationSpeed

      // Draw-in: head 0→1 in first 32%
      let head = 0
      if (d > 0 && d <= 0.32) head = d / 0.32
      else if (d > 0.32) head = 1

      // Erase: tail 0→1 in last 36% (64%→100%)
      let tail = 0
      if (d > 0.64) tail = (d - 0.64) / 0.36

      sharedUniforms.u_head.value = head
      sharedUniforms.u_tail.value = tail
      sharedUniforms.u_offset.value = -d * textureScrollSpeed

      backRenderer.render(back.scene, camera)
      frontRenderer.render(front.scene, camera)
    }
    tick()

    function onResize() {
      if (!backContainer) return
      const w = backContainer.clientWidth
      const h = backContainer.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      backRenderer.setSize(w, h)
      frontRenderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
      backRenderer.dispose()
      frontRenderer.dispose()
      geometry.dispose()
      texture.dispose()
      if (backContainer.contains(backRenderer.domElement)) backContainer.removeChild(backRenderer.domElement)
      if (frontContainer.contains(frontRenderer.domElement)) frontContainer.removeChild(frontRenderer.domElement)
    }
  }, [progressRef, backRef, frontRef])

  return null // renders into the ref'd containers
}
