# Chromatic Data Prism

A [**#BuildForJoy**](https://buildforjoy.dev) hobby experiment: turn text, JSON logs, live streams and audio into light passing through a 3D glass prism.

Part of [buildforjoy.dev](https://buildforjoy.dev) — non-commercial exploration for curiosity, learning and the joy of building. Not a product. Not a SaaS. Just something made for fun.

[![Try the demo](https://img.shields.io/badge/Try_the_demo-buildforjoy-111?style=for-the-badge)](https://beancounter11.github.io/chromatic-data-prism/)
[![Open Source](https://img.shields.io/badge/Open_Source-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/BeanCounter11/chromatic-data-prism)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](./LICENSE)

![Prism splitting light](public/prism.svg)

## Why I built this

I wanted to see what happens when you treat data as light — hashing characters into optical properties and watching a glass prism respond. The stack (React, Three.js / R3F, Web Audio, Tailwind) was a chance to practice real-time graphics, physical ray tracing and audio reactivity without shipping a product.

**Lessons along the way**
- A short hash can drive surprisingly rich visuals when each field maps to a real optical parameter.
- Snell's law in a 2D prism cross-section is enough to sell "true" dispersion in 3D.
- Browsers only start audio after a user gesture — that constraint shapes the whole Audio Reactive UX.
- Relative asset bases and a repo-aware Vite `base` make GitHub Pages and forks share the same build.

## What it explores

| Idea | How it shows up |
| --- | --- |
| Data → light | Text / JSON / Live Pulse hashed into angle, wavelength, IOR, reflections, dispersion |
| Physical optics | Snell's-law ray tracer + Cauchy dispersion across nine wavelengths |
| Transmission glass | drei `MeshTransmissionMaterial` with live chromatic aberration |
| Sound → space | Bass / mids / treble drive pulse, IOR, caustics, camera shake |
| Modes | Utility diagnostics vs Art / Ambient full-bleed caustics |

## Try it

- **Live demo:** [beancounter11.github.io/chromatic-data-prism](https://beancounter11.github.io/chromatic-data-prism/)
- **Hub:** [buildforjoy.dev](https://buildforjoy.dev)
- **Source:** [github.com/BeanCounter11/chromatic-data-prism](https://github.com/BeanCounter11/chromatic-data-prism)

## Run locally

Requires Node.js 20.19+ (tested on Node 22/24).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build
```

## Features (short)

- **3D glass prism** — orbit / zoom / pan; transmission, dispersion, bloom, caustics.
- **Data-to-Light Encoder** — Text, JSON Log, or Live Pulse → light angle, wavelength, refraction index, internal reflections, dispersion.
- **Utility / Diagnostic** vs **Art / Ambient** (press **M** to toggle).
- **Audio Reactive Mode** — mic or audio file; bass / mids / treble map to pulse, IOR/dispersion, camera & caustics.
- **Presets** — Crypto Key Prism, Live CPU Temperature (estimated), Generative Rainbow Ambient.

## Deploying (GitHub Pages)

This repo includes a workflow that builds and deploys on every push to `main`.

1. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main` (or run **Actions → Deploy to GitHub Pages → Run workflow**).
3. The site will be at `https://<user>.github.io/chromatic-data-prism/` (repo name is used as the Vite `base` automatically).

Fork tip: rename the repo if you like — the workflow reads `GITHUB_REPOSITORY` so the base path follows your fork's name. For a custom path locally, set `VITE_BASE_PATH` (e.g. `/my-fork/`).

## Project structure

```
src/
  audio/          Web Audio bridge (mic / file → FFT bands)
  engine/         hashing, ray trace, spectrum, live sources
  scene/          R3F canvas, prism, beams, caustics, audio reactivity
  ui/             panels, charts, audio toggle, Build for Joy chrome
```

## Tech stack

React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · Web Audio API · three.js · @react-three/fiber · drei · postprocessing · zustand

## License & disclaimer

Released under the [MIT License](./LICENSE).

This app is a non-commercial hobby experiment provided **AS IS** without warranty of any kind, express or implied. Use at your own risk.

Built under the **#BuildForJoy** ethos. Further details: [buildforjoy.dev](https://buildforjoy.dev).

## Privacy note

Everything runs in your browser. Typed input, crypto keys and audio analysis stay local — nothing is uploaded by this app. Still avoid pasting real secrets into any web tool.

## Known limitations

- Diagnostics panel needs ~1024px+ width.
- CPU temperature is estimated from main-thread load, not a hardware sensor.
- Needs WebGL 2 and a capable GPU; mic needs HTTPS or localhost.
