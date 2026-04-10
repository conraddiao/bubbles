'use client'

import { useEffect, useRef } from 'react'
import {
  CanvasTexture,
  DoubleSide,
  Matrix4,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three'
import QRCode from 'qrcode'

const PHASE1_DURATION = 450  // ms — top alone goes 45°
const PHASE2_DURATION = 1100 // ms — top 135° + bottom 180° simultaneously
const PAUSE_DURATION = 3000  // ms

function easeIn(t: number)    { return t * t }
function easeOut(t: number)   { return 1 - (1 - t) * (1 - t) }
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t }

function buildSquircle() {
  const geometry = new SphereGeometry(1, 96, 96)
  const p = geometry.attributes.position
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i), e
    do {
      e = x ** 4 + y ** 4 + z ** 4 - 1
      const f = e > 0 ? 0.9999 : 1.0001
      x *= f; y *= f; z *= f
    } while (Math.abs(e) > 0.001)
    p.setXYZ(i, x, y, z)
  }
  p.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

/** Snap a quaternion to the nearest of the cube's 24 rotational symmetries
 *  by snapping rotation-matrix columns to the nearest signed world basis
 *  vector and re-orthonormalizing via a cross product. */
function snapQuaternionToCubeRotation(
  q: Quaternion,
  m: Matrix4,
  colX: Vector3,
  colY: Vector3,
  colZ: Vector3,
): Quaternion {
  m.makeRotationFromQuaternion(q)
  const e = m.elements
  colX.set(e[0], e[1], e[2])
  colY.set(e[4], e[5], e[6])
  snapVectorToSignedBasis(colX)
  snapVectorToSignedBasis(colY)
  // If X and Y snapped to the same or opposite axis, rebuild Y from the
  // original column with the dominant axis of X zeroed out so they land on
  // different basis vectors.
  if (Math.abs(colX.dot(colY)) > 0.5) {
    colY.set(e[4], e[5], e[6])
    const ax = dominantAxisIndex(colX)
    if (ax === 0) colY.x = 0
    else if (ax === 1) colY.y = 0
    else colY.z = 0
    snapVectorToSignedBasis(colY)
  }
  colZ.crossVectors(colX, colY) // guarantees right-handed orthonormal frame
  e[0] = colX.x; e[1] = colX.y; e[2] = colX.z; e[3] = 0
  e[4] = colY.x; e[5] = colY.y; e[6] = colY.z; e[7] = 0
  e[8] = colZ.x; e[9] = colZ.y; e[10] = colZ.z; e[11] = 0
  e[12] = 0; e[13] = 0; e[14] = 0; e[15] = 1
  return new Quaternion().setFromRotationMatrix(m)
}

function snapVectorToSignedBasis(v: Vector3): void {
  const ax = Math.abs(v.x), ay = Math.abs(v.y), az = Math.abs(v.z)
  if (ax >= ay && ax >= az)      v.set(Math.sign(v.x) || 1, 0, 0)
  else if (ay >= az)             v.set(0, Math.sign(v.y) || 1, 0)
  else                           v.set(0, 0, Math.sign(v.z) || 1)
}

function dominantAxisIndex(v: Vector3): 0 | 1 | 2 {
  const ax = Math.abs(v.x), ay = Math.abs(v.y), az = Math.abs(v.z)
  if (ax >= ay && ax >= az) return 0
  if (ay >= az)             return 1
  return 2
}

export function SquircleBackground({ shareUrl }: { shareUrl?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Stable ref so the texture effect can update uniforms after Three.js is set up
  const uniformsRef = useRef<{
    uTopAngle: { value: number }
    uBotAngle: { value: number }
    uAxis:     { value: number }
    uQRTexture: { value: CanvasTexture | null }
    uHasQR:    { value: number }
  } | null>(null)

  // Main Three.js scene — runs once
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const camera = new PerspectiveCamera(70, 1, 0.01, 10)
    camera.position.z = 3

    const scene = new Scene()
    const geometry = buildSquircle()

    const uniforms = {
      uTopAngle:  { value: 0 },
      uBotAngle:  { value: 0 },
      uAxis:      { value: 0 },
      uQRTexture: { value: null as CanvasTexture | null },
      uHasQR:     { value: 0 },
    }
    uniformsRef.current = uniforms

    const material = new ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      vertexShader: `
        uniform float uTopAngle;
        uniform float uBotAngle;
        uniform float uAxis;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec2 vQRuv;
        varying float vFaceMask;

        vec3 rotateY(vec3 p, float a) {
          float c = cos(a), s = sin(a);
          return vec3(p.x*c - p.z*s, p.y, p.x*s + p.z*c);
        }
        vec3 rotateX(vec3 p, float a) {
          float c = cos(a), s = sin(a);
          return vec3(p.x, p.y*c - p.z*s, p.y*s + p.z*c);
        }
        vec3 rotateZ(vec3 p, float a) {
          float c = cos(a), s = sin(a);
          return vec3(p.x*c - p.y*s, p.x*s + p.y*c, p.z);
        }

        void main() {
          // --- Cubic UV from pre-twist position ---
          vec3 absPos = abs(position);
          float maxAxis = max(absPos.x, max(absPos.y, absPos.z));
          float secondAxis;
          if (absPos.y >= absPos.x && absPos.y >= absPos.z) {
            vQRuv = (position.xz + 1.0) * 0.5;
            secondAxis = max(absPos.x, absPos.z);
          } else if (absPos.x >= absPos.y && absPos.x >= absPos.z) {
            vQRuv = (position.zy + 1.0) * 0.5;
            secondAxis = max(absPos.y, absPos.z);
          } else {
            vQRuv = (position.xy + 1.0) * 0.5;
            secondAxis = max(absPos.x, absPos.y);
          }
          // Ratio of dominant axis vs second — near edges/corners this approaches 1, on flat faces it's low
          // Tight cutoff: only show QR on clearly flat faces, not rounded edges
          float ratio = secondAxis / maxAxis;
          vFaceMask = 1.0 - smoothstep(0.6, 0.75, ratio);

          // --- Twist deformation ---
          float t, angle;
          vec3 pos, norm;

          if (uAxis < 0.5) {
            t = (position.y + 1.0) * 0.5;
            angle = mix(uBotAngle, uTopAngle, t);
            pos  = rotateY(position, angle);
            norm = rotateY(normal, angle);
          } else if (uAxis < 1.5) {
            t = (position.x + 1.0) * 0.5;
            angle = mix(uBotAngle, uTopAngle, t);
            pos  = rotateX(position, angle);
            norm = rotateX(normal, angle);
          } else {
            t = (position.z + 1.0) * 0.5;
            angle = mix(uBotAngle, uTopAngle, t);
            pos  = rotateZ(position, angle);
            norm = rotateZ(normal, angle);
          }

          vec4 viewPos = modelViewMatrix * vec4(pos, 1.0);
          vViewDir = normalize(-viewPos.xyz);
          vNormal  = normalize(normalMatrix * norm);
          gl_Position = projectionMatrix * viewPos;
        }
      `,
      fragmentShader: `
        uniform sampler2D uQRTexture;
        uniform float uHasQR;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        varying vec2 vQRuv;
        varying float vFaceMask;

        void main() {
          if (!gl_FrontFacing) discard;

          float fresnel = 1.0 - abs(dot(vNormal, vViewDir));
          fresnel = pow(fresnel, 2.5);

          float qrAlpha = 0.0;
          if (uHasQR > 0.5) {
            vec2 scaledUV = (vQRuv - 0.5) / 0.65 + 0.5;
            float inBounds = step(0.0, scaledUV.x) * step(scaledUV.x, 1.0)
                           * step(0.0, scaledUV.y) * step(scaledUV.y, 1.0);
            float luma = texture2D(uQRTexture, scaledUV).r;
            float isDark = (1.0 - step(0.5, luma)) * inBounds;
            qrAlpha = isDark * vFaceMask;
          }

          gl_FragColor = vec4(1.0, 1.0, 1.0, max(fresnel * 0.85, qrAlpha));
        }
      `,
    })

    const mesh = new Mesh(geometry, material)
    scene.add(mesh)

    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const updateSize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      if (width === 0 || height === 0) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(canvas)

    let pointerCleanup: (() => void) | undefined

    if (prefersReducedMotion) {
      uniforms.uTopAngle.value = Math.PI / 4
      uniforms.uBotAngle.value = 0
      renderer.render(scene, camera)
    } else {
      type Phase = 'phase1' | 'phase2' | 'pause'
      type Mode = 'auto' | 'drag' | 'momentum' | 'snap'

      let phase: Phase = 'phase1'
      let phaseStart = -1
      let currentAxis = 0
      let mode: Mode = 'auto'
      let prevTime = -1

      // Drag / momentum state
      let isDragging = false
      let lastX = 0, lastY = 0, lastMoveTime = 0
      let vx = 0, vy = 0
      const recentMoves: Array<{ dx: number; dy: number; dt: number }> = []

      // Rotation scratch — reused every frame to avoid GC churn.
      const WORLD_X = new Vector3(1, 0, 0)
      const WORLD_Y = new Vector3(0, 1, 0)
      // 0→Y, 1→X, 2→Z mirrors the shader's uAxis branches so that committing
      // a π twist rotates around the same local axis the shader was twisting.
      const LOCAL_AXES: readonly Vector3[] = [
        new Vector3(0, 1, 0),
        new Vector3(1, 0, 0),
        new Vector3(0, 0, 1),
      ]
      const deltaQ = new Quaternion()
      const snapMat = new Matrix4()
      const snapColX = new Vector3()
      const snapColY = new Vector3()
      const snapColZ = new Vector3()
      let snapTarget: Quaternion | null = null

      function advanceAxis() {
        // Local-axis post-multiply matches the shader's local-space twist.
        deltaQ.setFromAxisAngle(LOCAL_AXES[currentAxis], Math.PI)
        mesh.quaternion.multiply(deltaQ)
        mesh.quaternion.normalize()
        currentAxis = (currentAxis + 1) % 3
        uniforms.uAxis.value = currentAxis
        uniforms.uTopAngle.value = 0
        uniforms.uBotAngle.value = 0
      }

      function getSensitivity() {
        return Math.PI / (Math.max(canvas!.clientHeight, 1) * 0.5)
      }

      const onPointerDown = (e: PointerEvent) => {
        isDragging = true
        mode = 'drag'
        vx = 0; vy = 0
        recentMoves.length = 0
        snapTarget = null
        lastX = e.clientX
        lastY = e.clientY
        lastMoveTime = performance.now()
        uniforms.uTopAngle.value = 0
        uniforms.uBotAngle.value = 0
        canvas.setPointerCapture(e.pointerId)
        canvas.style.cursor = 'grabbing'
      }

      const onPointerMove = (e: PointerEvent) => {
        if (!isDragging) return
        const now = performance.now()
        const dt = Math.max(now - lastMoveTime, 1)
        const sensitivity = getSensitivity()
        const dx = (e.clientX - lastX) * sensitivity
        const dy = (e.clientY - lastY) * sensitivity
        // World-axis pre-multiply: horizontal swipe spins around world Y,
        // vertical swipe tilts around world X, regardless of current pose.
        deltaQ.setFromAxisAngle(WORLD_X, dy)
        mesh.quaternion.premultiply(deltaQ)
        deltaQ.setFromAxisAngle(WORLD_Y, dx)
        mesh.quaternion.premultiply(deltaQ)
        mesh.quaternion.normalize()
        recentMoves.push({ dx, dy, dt })
        // Keep only moves within the last 80ms window
        let totalWindow = 0
        for (const m of recentMoves) totalWindow += m.dt
        while (recentMoves.length > 1 && totalWindow - recentMoves[0].dt >= 80) {
          totalWindow -= recentMoves[0].dt
          recentMoves.shift()
        }
        lastX = e.clientX
        lastY = e.clientY
        lastMoveTime = now
      }

      const onPointerUp = () => {
        if (!isDragging) return
        isDragging = false
        canvas.style.cursor = 'grab'
        // Compute velocity from recent moves
        let totalDt = 0, totalDx = 0, totalDy = 0
        for (const m of recentMoves) { totalDt += m.dt; totalDx += m.dx; totalDy += m.dy }
        totalDt = Math.max(totalDt, 1)
        vx = totalDx / totalDt
        vy = totalDy / totalDt
        const speed = Math.sqrt(vx * vx + vy * vy)
        snapTarget = null
        mode = speed > 0.0003 ? 'momentum' : 'snap'
      }

      canvas.addEventListener('pointerdown', onPointerDown)
      canvas.addEventListener('pointermove', onPointerMove)
      canvas.addEventListener('pointerup', onPointerUp)
      canvas.addEventListener('pointercancel', onPointerUp)
      pointerCleanup = () => {
        canvas.removeEventListener('pointerdown', onPointerDown)
        canvas.removeEventListener('pointermove', onPointerMove)
        canvas.removeEventListener('pointerup', onPointerUp)
        canvas.removeEventListener('pointercancel', onPointerUp)
      }

      canvas.style.cursor = 'grab'

      renderer.setAnimationLoop((time) => {
        const dt = prevTime < 0 ? 16 : Math.min(time - prevTime, 64)
        prevTime = time

        if (mode === 'auto') {
          if (phaseStart < 0) phaseStart = time
          const elapsed = time - phaseStart

          if (phase === 'phase1') {
            const t = Math.min(elapsed / PHASE1_DURATION, 1)
            uniforms.uTopAngle.value = easeIn(t) * (Math.PI / 4)
            uniforms.uBotAngle.value = 0
            if (t >= 1) { phase = 'phase2'; phaseStart = time }
          } else if (phase === 'phase2') {
            const t = Math.min(elapsed / PHASE2_DURATION, 1)
            uniforms.uTopAngle.value = Math.PI / 4 + easeOut(t) * (3 * Math.PI / 4)
            uniforms.uBotAngle.value = easeInOut(t) * Math.PI
            if (t >= 1) { advanceAxis(); phase = 'pause'; phaseStart = time }
          } else {
            if (elapsed >= PAUSE_DURATION) { phase = 'phase1'; phaseStart = time }
          }
        } else if (mode === 'momentum') {
          const DAMPING = Math.pow(0.88, dt / 16.667) // frame-rate independent
          deltaQ.setFromAxisAngle(WORLD_X, vy * dt)
          mesh.quaternion.premultiply(deltaQ)
          deltaQ.setFromAxisAngle(WORLD_Y, vx * dt)
          mesh.quaternion.premultiply(deltaQ)
          mesh.quaternion.normalize()
          vx *= DAMPING
          vy *= DAMPING
          if (Math.sqrt(vx * vx + vy * vy) < 0.0003) {
            vx = 0; vy = 0
            snapTarget = null
            mode = 'snap'
          }
        } else if (mode === 'snap') {
          if (!snapTarget) {
            snapTarget = snapQuaternionToCubeRotation(
              mesh.quaternion, snapMat, snapColX, snapColY, snapColZ,
            )
            // Take the short-way slerp (quaternion double cover).
            if (mesh.quaternion.dot(snapTarget) < 0) {
              snapTarget.set(-snapTarget.x, -snapTarget.y, -snapTarget.z, -snapTarget.w)
            }
          }
          // Frame-rate independent slerp (matches the old 0.12 lerp at 60fps).
          const SLERP_T = 1 - Math.pow(1 - 0.12, dt / 16.667)
          mesh.quaternion.slerp(snapTarget, SLERP_T)
          if (mesh.quaternion.angleTo(snapTarget) < 0.001) {
            mesh.quaternion.copy(snapTarget)
            snapTarget = null
            phase = 'phase1'; phaseStart = -1; currentAxis = 0
            uniforms.uAxis.value = 0
            uniforms.uTopAngle.value = 0
            uniforms.uBotAngle.value = 0
            mode = 'auto'
          }
        }
        // mode === 'drag': pointer events drive mesh.quaternion directly, just render

        renderer.render(scene, camera)
      })
    }

    return () => {
      pointerCleanup?.()
      resizeObserver.disconnect()
      renderer.setAnimationLoop(null)
      renderer.dispose()
      geometry.dispose()
      material.dispose()
    }
  }, [])

  // QR texture — runs when shareUrl changes, updates uniforms without restarting scene
  useEffect(() => {
    if (!shareUrl || !uniformsRef.current) return

    const offscreen = document.createElement('canvas')
    QRCode.toCanvas(offscreen, shareUrl, {
      margin: 2,
      width: 256,
      color: { dark: '#000000ff', light: '#ffffffff' },
    }).then(() => {
      if (!uniformsRef.current) return
      const prev = uniformsRef.current.uQRTexture.value
      prev?.dispose()
      const texture = new CanvasTexture(offscreen)
      uniformsRef.current.uQRTexture.value = texture
      uniformsRef.current.uHasQR.value = 1
    })

    return () => {
      uniformsRef.current?.uQRTexture.value?.dispose()
    }
  }, [shareUrl])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full touch-none"
      aria-hidden="true"
    />
  )
}
