import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Float, Lightformer, OrbitControls } from '@react-three/drei'
import { Bloom, ChromaticAberration, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode, type BloomEffect, type ChromaticAberrationEffect } from 'postprocessing'
import * as THREE from 'three'
import { usePrism } from '../store'
import { rgbToHex, wavelengthToRgb } from '../engine/spectrum'
import { OpticsAnimator, animated } from './animatedOptics'
import { AudioReactor, audio, liveDispersion, pulseScale } from './audioReactive'
import { Prism } from './Prism'
import { LightBeams } from './LightBeams'
import { CausticSurface } from './CausticSurface'

const BACKGROUND = '#03040a'

function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <group rotation={[-Math.PI / 4, 0, 0]}>
        <Lightformer form="circle" intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
        <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
        <Lightformer form="ring" color="#5a7bff" intensity={6} rotation-y={Math.PI / 2} position={[-6, 2, 0]} scale={4} />
        <Lightformer form="rect" color="#ff4d8a" intensity={4} rotation-y={-Math.PI / 2} position={[6, 1, 0]} scale={[8, 1.5, 1]} />
        <Lightformer form="rect" color="#7dffd4" intensity={1.5} position={[0, -3, 8]} scale={[10, 2, 1]} />
      </group>
      <Lightformer form="rect" color="#c9d6ff" intensity={0.5} position={[0, 2, 10]} scale={[14, 6, 1]} />
    </Environment>
  )
}

/** Faint arc of spectral filaments behind the prism, giving the glass something to bend. */
function SpectralBackdrop() {
  const bars = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => {
        const t = i / 39
        const angle = (t - 0.5) * (Math.PI * 0.75)
        return {
          position: [Math.sin(angle) * 10, 0.6, -Math.cos(angle) * 10] as [number, number, number],
          rotationY: -angle,
          color: rgbToHex(wavelengthToRgb(400 + t * 300)),
        }
      }),
    [],
  )
  const verticalFade = useMemo(() => {
    const height = 64
    const data = new Uint8Array(height * 4)
    for (let y = 0; y < height; y++) {
      const v = Math.round(Math.pow(Math.sin((y / (height - 1)) * Math.PI), 2) * 255)
      data.set([v, v, v, 255], y * 4)
    }
    const texture = new THREE.DataTexture(data, 1, height)
    texture.needsUpdate = true
    return texture
  }, [])
  const group = useRef<THREE.Group>(null)

  useFrame(() => {
    group.current?.children.forEach((child) => {
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      material.opacity = 0.1 + animated.art * 0.3 + animated.pulse * 0.15
    })
  })

  return (
    <group ref={group}>
      {bars.map((b, i) => (
        <mesh key={i} position={b.position} rotation-y={b.rotationY}>
          <planeGeometry args={[0.03, 9]} />
          <meshBasicMaterial
            color={b.color}
            alphaMap={verticalFade}
            transparent
            opacity={0.1}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

const HOME_POSITION = new THREE.Vector3(0.6, 0.8, 9)
const HOME_TARGET = new THREE.Vector3(0, 0, 0)

interface OrbitLike extends THREE.EventDispatcher<{ start: object }> {
  target: THREE.Vector3
  autoRotate: boolean
  autoRotateSpeed: number
  update(): void
}

/** Bass breathes the prism and its beams together so the light paths stay aligned with the glass. */
function PulseGroup({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null)
  useFrame(() => group.current?.scale.setScalar(pulseScale()))
  return <group ref={group}>{children}</group>
}

/**
 * Treble drives camera shake and orbit speed. The shake offset is removed at
 * priority -2, before OrbitControls (priority -1) reads the camera, so it never accumulates.
 */
function CameraRig() {
  const controls = useThree((s) => s.controls) as OrbitLike | null
  const shake = useMemo(() => new THREE.Vector3(), [])
  const clock = useRef(0)

  useFrame(({ camera }) => {
    camera.position.sub(shake)
    shake.set(0, 0, 0)
  }, -2)

  useFrame(({ camera }, delta) => {
    clock.current += delta
    if (controls) {
      const art = usePrism.getState().mode === 'art'
      const spin = audio.treble * 3.5
      controls.autoRotate = art || spin > 0.05
      controls.autoRotateSpeed = (art ? 0.35 : 0) + spin
    }

    const amplitude = Math.pow(audio.treble, 1.5) * 0.09 + audio.bassHit * 0.025
    if (amplitude < 1e-4) return
    const s = clock.current
    shake
      .set(
        Math.sin(s * 37.1) + 0.5 * Math.sin(s * 23.7 + 0.3),
        Math.sin(s * 41.3 + 1.7) + 0.5 * Math.sin(s * 19.1 + 2.2),
        0.5 * Math.sin(s * 29.9 + 0.4),
      )
      .multiplyScalar(amplitude)
    camera.position.add(shake)
  })

  return null
}

/** Glides the camera back to the front view when leaving Art mode, unless the user grabs it. */
function CameraHome() {
  const mode = usePrism((s) => s.mode)
  const controls = useThree((s) => s.controls) as OrbitLike | null
  const returning = useRef(false)

  useEffect(() => {
    if (mode === 'diagnostic') returning.current = true
  }, [mode])

  useEffect(() => {
    if (!controls) return
    const cancel = () => (returning.current = false)
    controls.addEventListener('start', cancel)
    return () => controls.removeEventListener('start', cancel)
  }, [controls])

  useFrame(({ camera }, delta) => {
    if (!returning.current || !controls) return
    const k = 1 - Math.exp(-delta * 3)
    camera.position.lerp(HOME_POSITION, k)
    controls.target.lerp(HOME_TARGET, k)
    controls.update()
    if (camera.position.distanceTo(HOME_POSITION) < 0.01) returning.current = false
  })

  return null
}

function Effects() {
  const bloom = useRef<BloomEffect>(null)
  const aberration = useRef<ChromaticAberrationEffect>(null)
  const offset = useMemo(() => new THREE.Vector2(0.0006, 0.0006), [])

  useFrame(() => {
    if (bloom.current) {
      bloom.current.intensity =
        0.55 + animated.art * 0.8 + animated.pulse * 0.4 + audio.bass * 0.7 + audio.bassHit * 0.5
    }
    if (aberration.current) {
      const o =
        0.0004 + liveDispersion() * 0.0016 + animated.art * 0.0012 + animated.pulse * 0.002 + audio.mids * 0.0018
      aberration.current.offset.set(o, o * 0.6)
    }
  })

  return (
    <EffectComposer multisampling={4}>
      <Bloom ref={bloom} mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={1} />
      <ChromaticAberration ref={aberration} offset={offset} radialModulation modulationOffset={0.2} />
      <Vignette darkness={0.65} offset={0.25} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

export function PrismScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: HOME_POSITION.toArray(), fov: 38, near: 0.1, far: 100 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, 16, 42]} />
      <OpticsAnimator />
      <AudioReactor />
      <StudioEnvironment />

      <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.35} floatingRange={[-0.1, 0.1]}>
        <PulseGroup>
          <Prism />
          <LightBeams />
        </PulseGroup>
      </Float>

      <CausticSurface
        position={[0, -2.2, 0]}
        rotation-x={-Math.PI / 2}
        size={[40, 40]}
        scale={7}
        diagnosticIntensity={0.28}
        artIntensity={1.1}
        streak
      />
      <CausticSurface position={[0, 1.5, -9]} size={[48, 26]} scale={5} diagnosticIntensity={0.04} artIntensity={0.38} />
      <SpectralBackdrop />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={18}
        maxPolarAngle={Math.PI * 0.62}
      />
      <CameraHome />
      <CameraRig />
      <Effects />
    </Canvas>
  )
}
