# Chromatic Data Prism

A single-page React app that turns data into light. Whatever you type, paste or stream is hashed in real time and converted into optical physics properties. Those properties drive a 3D glass prism that refracts, disperses and bounces a beam of white light.

![Prism splitting light](public/prism.svg)

## Features

### 3D glass prism sculpture
- A bevelled triangular glass prism rendered with `@react-three/fiber` and drei's `MeshTransmissionMaterial`, with real transmission, chromatic aberration and per-wavelength refraction.
- **Physically traced light.** A white beam is traced through the prism's cross-section with Snell's law and a Cauchy dispersion model. Nine wavelengths are traced separately, so you see true splitting, total internal reflection and colour fans.
- Animated procedural caustics on the floor and back wall, plus bloom, screen-space chromatic aberration and vignette post-processing.
- Drag to orbit, scroll to zoom, right-drag to pan.

### Data-to-Light Encoder engine
Choose an input source:
- **Text:** free typing. Every keystroke re-hashes the light.
- **JSON Log:** paste a log line or object. Valid JSON is hashed in canonical (minified) form, so whitespace doesn't change the result.
- **Live Pulse:** a synthetic stream of service logs. The rolling window is re-hashed on every event.

The input is hashed (a 64-bit cyrb53-style hash plus a character histogram) into:

| Property | Range | Drives |
| --- | --- | --- |
| Light angle | 12° – 72° | Angle of incidence of the white beam |
| Wavelength | 380 – 750 nm | Dominant colour, beam emphasis, glass tint, caustic tint |
| Refraction index | 1.33 (water) – 2.42 (diamond) | Glass IOR and ray bending |
| Internal reflections | 0 – 12 | Forced bounces inside the prism before light may escape |
| Dispersion | 0 – 1 | Red/violet separation, chromatic aberration strength |

Whitespace is hashed but adds no colour to the spectrum.

### Modes
- **Utility / Diagnostic:** shows the input panel and a metrics panel with the light-angle dial, wavelength swatch, refraction-index scale against real materials, internal reflection counter, a character spectrum chart, a per-wavelength ray-trace table (refractive index, deviation, bounces, trapped rays), signal history and a SHA-256 fingerprint.
- **Art / Ambient:** hides the controls, expands caustics across the whole scene, boosts bloom and slowly auto-orbits the camera. Switching back glides the camera home.
- Press **M** to toggle modes (when not typing).

### Audio Reactive Mode
Click **Enable Audio Reactive Mode** in the header, then choose **Microphone** or **Audio file** (MP3, WAV, OGG, M4A, AAC, FLAC or Opus, up to 300 MB). The click also starts the browser's AudioContext, because browsers only allow audio to start after a user gesture.

`src/audio/audioPrismBridge.js` feeds the source into an `AnalyserNode` (2048-point FFT) and groups the frequencies into three bands. Each band is auto-gained to 0–1 with a fast-attack, slow-release envelope.

| Band | Range | Drives |
| --- | --- | --- |
| Bass | 20–250 Hz | Prism pulse scale, core light beam intensity, bloom, kick-triggered glass distortion |
| Mids | 250–4000 Hz | Refraction index (IOR) and chromatic dispersion split, in both the glass material and the ray tracer |
| Treble | 4000 Hz+ | Camera shake, orbit rotation speed, and caustic glitter and light shafts |

Audio modulates the data-encoded values on top. The metrics panel keeps showing the values encoded from your data. Microphone audio is only analysed and never played back, so there's no feedback. Uploaded files play through your speakers. Nothing is recorded or uploaded.

### Presets
- **Crypto Key Prism:** refracts a fresh 256-bit key from `crypto.getRandomValues`, with optional rotation every 4 seconds.
- **Live CPU Temperature:** browsers can't read hardware sensors, so this *estimates* a temperature from main-thread load (frame pacing and timer drift). Cool readings render blue, hot ones red.
- **Generative Rainbow Ambient:** a self-playing composition that drifts through the spectrum. It switches to Art mode automatically.

## Getting started

Requires Node.js 20.19+ (tested on Node 24).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

## Repository

Hosted as a private GitHub repository: [BeanCounter11/chromatic-data-prism](https://github.com/BeanCounter11/chromatic-data-prism). Commits use the GitHub no-reply address (set in this repo's local git config), so no personal email appears in the history. Line endings are normalised to LF by `.gitattributes`.

## Project structure

```
src/
  audio/
    audioPrismBridge.js Web Audio bridge: mic/file input, FFT band analysis (JSDoc-typed, checked by tsc)
  engine/
    encoder.ts          hashing + optical profile derivation
    raytrace.ts         2D Snell's-law ray tracer with Cauchy dispersion
    spectrum.ts         wavelength ↔ colour helpers
    liveSources.ts      pulse log generator, CPU estimator, crypto keys, SHA-256
    useOpticsEngine.ts  runs live sources and keeps the optical profile in sync
  scene/
    PrismScene.tsx      canvas, environment, controls, post-processing, camera return
    Prism.tsx           extruded glass prism with transmission material
    LightBeams.tsx      beam rendering from the ray tracer (fixed GPU buffers)
    CausticSurface.tsx  procedural caustic shader planes
    animatedOptics.ts   per-frame eased optical values shared by the scene
    audioReactive.ts    per-frame audio band levels + audio-modulated optics
  ui/                   overlay panels, charts, mode toggle, preset bar, audio toggle
  store.ts              zustand app state
```

## Tech stack
React 19, TypeScript, Vite 8, Tailwind CSS v4, Web Audio API, three.js, @react-three/fiber 9, @react-three/drei 10, @react-three/postprocessing 3, zustand 5.

## Privacy and security
- Everything runs locally in your browser. Nothing you type or paste is sent anywhere, and nothing is stored between visits.
- Crypto keys come from the browser's cryptographically secure random generator and exist only in memory.
- Microphone and audio-file sound is analysed in real time and never recorded, stored or uploaded. Turning audio off stops the microphone and releases the file from memory.
- Still, avoid pasting real production secrets or personal data into any web tool.
- When deploying, serve over HTTPS (needed for the SHA-256 fingerprint) and consider a Content-Security-Policy header such as `default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; worker-src 'self' blob:`.

## Known limitations
- The diagnostics panel is shown on screens 1024px and wider. On smaller screens only the input panel and the 3D view are shown.
- The CPU temperature is an estimate, not a real sensor reading.
- The 3D view needs WebGL 2 and a reasonably capable GPU.
- Microphone input needs HTTPS or localhost, and your permission.
- With strong treble, the camera auto-orbits even in Utility / Diagnostic mode. Drag to take back control, or switch modes to glide back to the front view.
