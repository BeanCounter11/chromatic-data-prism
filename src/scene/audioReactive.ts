import { useFrame } from '@react-three/fiber'
import { audioBridge } from '../audio/audioPrismBridge'
import { IOR_MAX } from '../engine/encoder'
import { animated } from './animatedOptics'

/** Per-frame audio band levels (0..1), read by every audio-reactive scene object. */
export const audio = {
  bass: 0,
  mids: 0,
  treble: 0,
  bassHit: 0,
  /** Seconds of caustic animation time; advances faster with treble. */
  causticTime: 0,
}

/** Data-encoded IOR, pushed denser by the mids. */
export function liveRefractionIndex() {
  return Math.min(animated.refractionIndex + audio.mids * 0.45, IOR_MAX)
}

/** Data-encoded dispersion, split wider by the mids. */
export function liveDispersion() {
  return Math.min(animated.dispersion + audio.mids * 0.55, 1)
}

/** Bass drives the prism's breathing scale. */
export function pulseScale() {
  return 1 + audio.bass * 0.06 + audio.bassHit * 0.05
}

/** Must be mounted before the components that read `audio`. */
export function AudioReactor() {
  useFrame((_, delta) => {
    const levels = audioBridge.sample(delta)
    audio.bass = levels.bass
    audio.mids = levels.mids
    audio.treble = levels.treble
    audio.bassHit = levels.bassHit
    audio.causticTime += delta * (1 + audio.treble * 3)
  })
  return null
}
