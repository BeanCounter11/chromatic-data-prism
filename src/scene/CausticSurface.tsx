import { useMemo } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { wavelengthToRgb } from '../engine/spectrum'
import { animated } from './animatedOptics'
import { audio, liveDispersion } from './audioReactive'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uDispersion;
  uniform float uScale;
  uniform float uStreak;
  uniform float uSpread;
  uniform float uTreble;
  uniform vec3 uTint;
  varying vec2 vUv;

  #define TAU 6.28318530718

  // Tileable water-style caustic network.
  float caustic(vec2 uv, float time) {
    vec2 p = mod(uv * TAU, TAU) - 250.0;
    vec2 i = p;
    float c = 1.0;
    float inten = 0.005;
    for (int n = 0; n < 5; n++) {
      float t = time * (1.0 - (3.5 / float(n + 1)));
      i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
      c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
    }
    c /= 5.0;
    c = 1.17 - pow(c, 1.4);
    return pow(abs(c), 8.0);
  }

  vec3 spectral(float x) {
    return clamp(vec3(abs(x * 6.0 - 3.0) - 1.0, 2.0 - abs(x * 6.0 - 2.0), 2.0 - abs(x * 6.0 - 4.0)), 0.0, 1.0);
  }

  void main() {
    vec2 c = vUv - 0.5;
    vec2 uv = c * uScale;
    float t = uTime * 0.3;

    // Each colour channel samples a slightly shifted field: chromatic dispersion.
    float shift = 0.01 + 0.05 * uDispersion;
    vec3 col = vec3(
      caustic(uv + vec2(shift, shift * 0.5), t),
      caustic(uv, t),
      caustic(uv - vec2(shift, shift * 0.5), t)
    );
    col *= mix(vec3(1.0), uTint, 0.6);

    // Dispersed rainbow fan cast by the prism, widening with distance.
    float along = c.x;
    float halfWidth = 0.015 + max(along, 0.0) * (0.12 + 0.5 * uSpread);
    float across = c.y / halfWidth;
    float fan = smoothstep(0.0, 0.08, along)
      * (1.0 - smoothstep(0.35, 1.0, abs(across)))
      * (1.0 - smoothstep(0.12, 0.45, along));
    vec3 rainbow = spectral(clamp(across * 0.5 + 0.5, 0.0, 1.0) * 0.8);
    col += rainbow * fan * uStreak * (0.18 + 0.4 * caustic(uv * 0.5, t * 0.7)) * (1.0 + 2.0 * uTreble);

    // Treble: fine glitter in the caustic net plus radial shafts of light.
    if (uTreble > 0.001) {
      float glitter = caustic(uv * 2.6 + 1.3, t * 1.8);
      float angle = atan(c.y, c.x);
      float shafts = pow(0.5 + 0.5 * sin(angle * 28.0 + t * 4.0), 18.0)
        + pow(0.5 + 0.5 * sin(angle * 11.0 - t * 2.5), 24.0);
      float shaftFalloff = smoothstep(0.02, 0.08, length(c)) * (1.0 - smoothstep(0.1, 0.42, length(c)));
      vec3 sparkleTint = mix(vec3(1.0), uTint, 0.35);
      col += sparkleTint * uTreble * (glitter * 0.9 + shafts * shaftFalloff * 0.55);
    }

    float vignette = 1.0 - smoothstep(0.18, 0.5, length(c));
    gl_FragColor = vec4(col * uIntensity * vignette, 1.0);
  }
`

type CausticSurfaceProps = ThreeElements['mesh'] & {
  size: [number, number]
  /** Pattern repetitions across the surface. */
  scale: number
  diagnosticIntensity: number
  artIntensity: number
  streak?: boolean
}

/** Procedural animated light caustics, tinted by the current wavelength and dispersion. */
export function CausticSurface({
  size,
  scale,
  diagnosticIntensity,
  artIntensity,
  streak = false,
  ...meshProps
}: CausticSurfaceProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: diagnosticIntensity },
          uDispersion: { value: 0.5 },
          uScale: { value: scale },
          uStreak: { value: streak ? 1 : 0 },
          uSpread: { value: 0.3 },
          uTreble: { value: 0 },
          uTint: { value: new THREE.Color('#ffffff') },
        },
      }),
    // Uniforms are driven per frame; the material itself never needs rebuilding.
    [],
  )

  useFrame(() => {
    const u = material.uniforms
    const dispersion = liveDispersion()
    u.uTime.value = audio.causticTime
    u.uIntensity.value =
      (diagnosticIntensity + (artIntensity - diagnosticIntensity) * animated.art) *
      (1 + animated.pulse * 0.5 + audio.treble * 0.6 + audio.bassHit * 0.3)
    u.uDispersion.value = dispersion
    u.uSpread.value = dispersion
    u.uTreble.value = audio.treble
    u.uScale.value = scale * (1 + animated.art * 0.6)
    const [r, g, b] = wavelengthToRgb(animated.wavelength)
    ;(u.uTint.value as THREE.Color).setRGB(r, g, b)
  })

  return (
    <mesh {...meshProps} material={material} renderOrder={-1}>
      <planeGeometry args={size} />
    </mesh>
  )
}
