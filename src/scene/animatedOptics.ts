import { useFrame } from '@react-three/fiber'
import { usePrism } from '../store'
import { DEFAULT_PROFILE } from '../engine/encoder'

/**
 * Per-frame eased copy of the store's optical profile, shared by every scene
 * object so the prism, beams and caustics glide between states together.
 */
export const animated = {
  lightAngle: DEFAULT_PROFILE.lightAngle,
  wavelength: DEFAULT_PROFILE.wavelength,
  refractionIndex: DEFAULT_PROFILE.refractionIndex,
  dispersion: DEFAULT_PROFILE.dispersion,
  internalReflections: DEFAULT_PROFILE.internalReflections,
  /** 0 = diagnostic, 1 = art; eased. */
  art: 0,
  /** Briefly spikes to 1 whenever the input hash changes. */
  pulse: 0,
}

let lastHash = ''

/** Must be mounted before any other scene component that reads `animated`. */
export function OpticsAnimator() {
  useFrame((_, delta) => {
    const { profile, mode } = usePrism.getState()
    const k = 1 - Math.exp(-delta * 5)
    animated.lightAngle += (profile.lightAngle - animated.lightAngle) * k
    animated.wavelength += (profile.wavelength - animated.wavelength) * k
    animated.refractionIndex += (profile.refractionIndex - animated.refractionIndex) * k
    animated.dispersion += (profile.dispersion - animated.dispersion) * k
    animated.internalReflections += (profile.internalReflections - animated.internalReflections) * k * 1.5
    animated.art += ((mode === 'art' ? 1 : 0) - animated.art) * (1 - Math.exp(-delta * 2.5))

    if (profile.hash !== lastHash) {
      lastHash = profile.hash
      animated.pulse = 1
    }
    animated.pulse *= Math.exp(-delta * 3)
  })
  return null
}
