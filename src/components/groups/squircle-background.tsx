'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const PHASE1_DURATION = 450  // ms — top alone goes 45°
const PHASE2_DURATION = 1100 // ms — top 135° + bottom 180° simultaneously
const PAUSE_DURATION = 3000  // ms

function easeIn(t: number)    { return t * t }
function easeOut(t: number)   { return 1 - (1 - t) * (1 - t) }
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t }

function buildSquircle() {
  const geometry = new THREE.SphereGeometry(1, 96, 96)
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
  const uniformsRef = useRef<{
    uTopAngle: { value: number }
    uBotAngle: { value: number }
    uAxis:     { value: number }
  } | null>(null)

  // Main Three.js scene — runs once
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const camera = new THREE.PerspectiveCamera(70, 1, 0.01, 10)
    camera.position.z = 3

    const scene = new THREE.Scene()
    const geometry = buildSquircle()

    const uniforms = {
      uTopAngle:  { value: 0 },
      uBotAngle:  { value: 0 },
      uAxis:      { value: 0 },
    }
    uniformsRef.current = uniforms

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `
        uniform float uTopAngle;
        uniform float uBotAngle;
        uniform float uAxis;
        varying vec3 vNormal;
        varying vec3 vViewDir;

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
        varying vec3 vNormal;
        varying vec3 vViewDir;

        void main() {
          if (!gl_FrontFacing) discard;

          float fresnel = 1.0 - abs(dot(vNormal, vViewDir));
          fresnel = pow(fresnel, 2.5);

          gl_FragColor = vec4(1.0, 1.0, 1.0, fresnel * 0.85);
        }
      `,
    })

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
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

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full pointer-events-none"
      aria-hidden="true"
    />
  )
}
