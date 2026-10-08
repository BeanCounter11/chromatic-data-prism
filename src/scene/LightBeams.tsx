import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { MAX_RAY_POINTS, tracePrism, type Vec2 } from '../engine/raytrace'
import { RAY_WAVELENGTHS, wavelengthToRgb } from '../engine/spectrum'
import { animated } from './animatedOptics'
import { audio, liveDispersion, liveRefractionIndex } from './audioReactive'

const HDR_BOOST = 1.7

interface BeamLayer {
  line: Line2
  positions: THREE.InterleavedBuffer
  colors: THREE.InterleavedBuffer
  gain: number
}

/**
 * Buffers are allocated once at maximum size and rewritten in place; calling
 * setPositions every frame would orphan a GPU buffer each time.
 */
function makeLayer(width: number, gain: number): BeamLayer {
  const geometry = new LineGeometry()
  geometry.setPositions(new Float32Array(MAX_RAY_POINTS * 3))
  geometry.setColors(new Float32Array(MAX_RAY_POINTS * 3))
  const material = new LineMaterial({
    vertexColors: true,
    worldUnits: true,
    linewidth: width,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
  const line = new Line2(geometry, material)
  line.renderOrder = 10
  line.frustumCulled = false
  const positions = (geometry.getAttribute('instanceStart') as THREE.InterleavedBufferAttribute).data
  const colors = (geometry.getAttribute('instanceColorStart') as THREE.InterleavedBufferAttribute).data
  return { line, positions, colors, gain }
}

/** `colors` holds one rgb triple per point. */
function writeLine(layer: BeamLayer, points: Vec2[], colors: number[]) {
  const pos = layer.positions.array as Float32Array
  const col = layer.colors.array as Float32Array
  const segments = Math.min(points.length, MAX_RAY_POINTS) - 1
  for (let i = 0; i < segments; i++) {
    const o = i * 6
    pos[o] = points[i][0]
    pos[o + 1] = points[i][1]
    pos[o + 2] = 0
    pos[o + 3] = points[i + 1][0]
    pos[o + 4] = points[i + 1][1]
    pos[o + 5] = 0
    for (let c = 0; c < 3; c++) {
      col[o + c] = colors[i * 3 + c] * layer.gain
      col[o + 3 + c] = colors[(i + 1) * 3 + c] * layer.gain
    }
  }
  layer.positions.needsUpdate = true
  layer.colors.needsUpdate = true
  layer.line.geometry.instanceCount = Math.max(segments, 0)
}

/** A wide soft glow plus a thin bright core per traced ray. */
export function LightBeams() {
  const size = useThree((s) => s.size)

  // Built in one memo: Object3D.add() reparents, so sharing lines across memos breaks under StrictMode.
  const { incoming, rays, layers, group } = useMemo(() => {
    const incoming = [makeLayer(0.07, 0.12), makeLayer(0.016, 1)]
    const rays = RAY_WAVELENGTHS.map(() => [makeLayer(0.06, 0.1), makeLayer(0.012, 0.8)])
    const layers = [...incoming, ...rays.flat()]
    const group = new THREE.Group()
    for (const layer of layers) group.add(layer.line)
    return { incoming, rays, layers, group }
  }, [])

  useEffect(() => {
    for (const layer of layers) layer.line.material.resolution.set(size.width, size.height)
  }, [size, layers])

  useEffect(
    () => () => {
      for (const layer of layers) {
        layer.line.geometry.dispose()
        layer.line.material.dispose()
      }
    },
    [layers],
  )

  const last = useMemo(() => ({ key: '' }), [])

  useFrame(() => {
    const reflections = Math.round(animated.internalReflections)
    const refractionIndex = liveRefractionIndex()
    const dispersion = liveDispersion()
    const coreGain = 1 + animated.pulse * 0.8 + audio.bass * 1.6 + audio.bassHit * 0.9
    const key = [
      animated.lightAngle.toFixed(3),
      refractionIndex.toFixed(4),
      dispersion.toFixed(3),
      animated.wavelength.toFixed(1),
      reflections,
      coreGain.toFixed(2),
    ].join('|')
    if (key === last.key) return
    last.key = key

    const trace = tracePrism({
      lightAngle: animated.lightAngle,
      refractionIndex,
      dispersion,
      internalReflections: reflections,
    })

    const w = HDR_BOOST * coreGain
    for (const layer of incoming) {
      writeLine(layer, [trace.incomingStart, trace.entry], [0.15, 0.15, 0.17, w, w, w])
    }

    trace.rays.forEach((ray, i) => {
      const [r, g, b] = wavelengthToRgb(ray.wavelength)
      const focus = 0.3 + 0.7 * Math.exp(-(((ray.wavelength - animated.wavelength) / 70) ** 2))
      const gain = HDR_BOOST * focus * (1 + (coreGain - 1) * 0.6)
      const colors = ray.intensities.flatMap((e) => [r * e * gain, g * e * gain, b * e * gain])
      for (const layer of rays[i]) writeLine(layer, ray.points, colors)
    })
  })

  return <primitive object={group} />
}
