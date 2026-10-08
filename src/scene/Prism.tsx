import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { PRISM_VERTICES } from '../engine/raytrace'
import { wavelengthToRgb } from '../engine/spectrum'
import { animated } from './animatedOptics'
import { audio, liveDispersion, liveRefractionIndex } from './audioReactive'

export const PRISM_DEPTH = 1.8
const BEVEL = 0.05
/** three.js clamps physical-material IOR to this. */
const THREE_MAX_IOR = 2.333

type TransmissionMaterial = THREE.MeshPhysicalMaterial & {
  chromaticAberration: number
  distortion: number
  anisotropicBlur: number
}

function usePrismGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(...PRISM_VERTICES[0])
    shape.lineTo(...PRISM_VERTICES[1])
    shape.lineTo(...PRISM_VERTICES[2])
    shape.closePath()
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: PRISM_DEPTH,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: BEVEL,
      bevelOffset: -BEVEL,
      bevelSegments: 4,
      curveSegments: 1,
    })
    geometry.translate(0, 0, -PRISM_DEPTH / 2)
    return geometry
  }, [])
}

export function Prism() {
  const geometry = usePrismGeometry()
  const material = useRef<TransmissionMaterial | null>(null)
  const tint = useMemo(() => new THREE.Color(), [])
  const white = useMemo(() => new THREE.Color('#ffffff'), [])

  useFrame(() => {
    const m = material.current
    if (!m) return
    const ior = liveRefractionIndex()
    const dispersion = liveDispersion()
    m.ior = Math.min(ior, THREE_MAX_IOR)
    m.chromaticAberration = 0.08 + dispersion * 0.9 + animated.art * 0.2
    m.distortion = 0.02 + animated.pulse * 0.3 + audio.bassHit * 0.25
    m.anisotropicBlur = 0.01 + dispersion * 0.05
    m.thickness = 0.6 + (ior - 1.33) * 1.2
    m.envMapIntensity = 1 + audio.bass * 1.2 + audio.treble * 0.5
    const [r, g, b] = wavelengthToRgb(animated.wavelength)
    tint.setRGB(r, g, b).lerp(white, 0.72)
    m.attenuationColor.copy(tint)
  })

  return (
    <mesh geometry={geometry} castShadow={false}>
      <MeshTransmissionMaterial
        ref={(m) => {
          material.current = m as unknown as TransmissionMaterial
        }}
        backside
        backsideThickness={0.4}
        samples={10}
        resolution={1024}
        transmission={1}
        roughness={0.02}
        thickness={1}
        ior={1.52}
        chromaticAberration={0.5}
        anisotropicBlur={0.1}
        distortion={0.1}
        distortionScale={0.4}
        temporalDistortion={0.08}
        clearcoat={1}
        clearcoatRoughness={0.05}
        attenuationDistance={2.2}
        attenuationColor="#ffffff"
        color="#f4f8ff"
      />
    </mesh>
  )
}
