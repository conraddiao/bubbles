'use client'

import { useEffect, useRef } from 'react'
import {
  CanvasTexture,
  DoubleSide,
  Mesh,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
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

    if (prefersReducedMotion) {
      uniforms.uTopAngle.value = Math.PI / 4
      uniforms.uBotAngle.value = 0
      renderer.render(scene, camera)
    } else {
      type Phase = 'phase1' | 'phase2' | 'pause'
      let phase: Phase = 'phase1'
      let phaseStart = -1
      let currentAxis = 0

      function advanceAxis() {
        if (currentAxis === 0) mesh.rotation.y += Math.PI
        else if (currentAxis === 1) mesh.rotation.x += Math.PI
        else mesh.rotation.z += Math.PI
        currentAxis = (currentAxis + 1) % 3
        uniforms.uAxis.value = currentAxis
        uniforms.uTopAngle.value = 0
        uniforms.uBotAngle.value = 0
      }

      renderer.setAnimationLoop((time) => {
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

        renderer.render(scene, camera)
      })
    }

    return () => {
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
      className="absolute inset-0 h-full w-full pointer-events-none"
      aria-hidden="true"
    />
  )
}
