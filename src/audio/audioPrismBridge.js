/**
 * Web Audio → Chromatic Data Prism bridge.
 *
 * Owns one AudioContext + AnalyserNode, accepts either the microphone or an
 * uploaded audio file, and reduces the FFT into three normalised bands that
 * the render loop samples once per frame.
 */

/**
 * @typedef {object} AudioLevels
 * @property {number} bass     20–250 Hz energy, 0..1 (auto-gained)
 * @property {number} mids     250–4000 Hz energy, 0..1
 * @property {number} treble   4000 Hz+ energy, 0..1
 * @property {number} level    Mean of the three bands, 0..1
 * @property {number} bassHit  Jumps to 1 on a detected kick, then decays
 */

/** @typedef {'mic' | 'file'} AudioInputKind */

/** @type {Record<'bass' | 'mids' | 'treble', [number, number]>} */
export const BAND_RANGES = {
  bass: [20, 250],
  mids: [250, 4000],
  treble: [4000, 20000],
}

export const MAX_AUDIO_FILE_BYTES = 300 * 1024 * 1024
const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba|webm)$/i

/**
 * Mean analyser magnitude (0..1) of the bins covering [lowHz, highHz].
 * @param {Uint8Array} data  Output of getByteFrequencyData
 * @param {number} sampleRate
 * @param {number} lowHz
 * @param {number} highHz
 */
export function bandEnergy(data, sampleRate, lowHz, highHz) {
  const binHz = sampleRate / 2 / data.length
  const start = Math.max(1, Math.floor(lowHz / binHz))
  const end = Math.min(data.length - 1, Math.ceil(highHz / binHz))
  if (end < start) return 0
  let sum = 0
  for (let i = start; i <= end; i++) sum += data[i]
  return sum / ((end - start + 1) * 255)
}

/**
 * Auto-gaining envelope follower: fast attack, slow release, and a peak that
 * slowly forgets so quiet tracks and loud rooms both use the full 0..1 range.
 */
class BandFollower {
  /** @param {number} noiseFloor */
  constructor(noiseFloor) {
    this.noiseFloor = noiseFloor
    this.peak = noiseFloor * 4
    this.value = 0
    this.average = 0
  }

  /**
   * @param {number} raw
   * @param {number} dt seconds
   */
  update(raw, dt) {
    this.peak = Math.max(raw, this.peak * Math.exp(-dt * 0.2), this.noiseFloor * 4)
    const target = Math.min(Math.max((raw - this.noiseFloor) / (this.peak - this.noiseFloor), 0), 1)
    const rate = target > this.value ? 20 : 5
    this.value += (target - this.value) * (1 - Math.exp(-dt * rate))
    this.average += (raw - this.average) * (1 - Math.exp(-dt * 1.5))
    return this.value
  }

  /** @param {number} dt */
  release(dt) {
    this.value *= Math.exp(-dt * 4)
    return this.value
  }

  reset() {
    this.peak = this.noiseFloor * 4
    this.value = 0
    this.average = 0
  }
}

/**
 * @param {unknown} err
 * @returns {string}
 */
export function describeAudioError(err) {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return "Microphone access was blocked. Allow it in your browser's site settings and try again."
      case 'NotFoundError':
      case 'OverconstrainedError':
        return 'No microphone was found on this device.'
      case 'NotReadableError':
        return 'The microphone is busy in another app.'
      case 'NotSupportedError':
        return "This browser can't play that audio format."
    }
  }
  return err instanceof Error ? err.message : 'Audio could not be started.'
}

export class AudioPrismBridge {
  /** @type {AudioContext | null} */
  ctx = null
  /** @type {AnalyserNode | null} */
  analyser = null
  /** @type {Uint8Array<ArrayBuffer> | null} */
  data = null
  /** @type {AudioNode | null} */
  source = null
  /** @type {MediaStream | null} */
  stream = null
  /** @type {HTMLAudioElement | null} */
  element = null
  /** @type {string | null} */
  objectUrl = null
  /** @type {AudioInputKind | null} */
  input = null

  bass = new BandFollower(0.12)
  mids = new BandFollower(0.06)
  treble = new BandFollower(0.02)
  lastHitAt = 0

  /** Live metrics, mutated in place by sample(). @type {AudioLevels} */
  levels = { bass: 0, mids: 0, treble: 0, level: 0, bassHit: 0 }

  /**
   * Creates (once) and resumes the AudioContext. Call this synchronously at the
   * top of a click handler: browsers only allow audio to start from a user gesture.
   * @returns {Promise<AudioContext>}
   */
  async activate() {
    if (!this.ctx) {
      if (typeof AudioContext === 'undefined') throw new Error("This browser doesn't support the Web Audio API.")
      const ctx = new AudioContext({ latencyHint: 'interactive' })
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.55
      analyser.minDecibels = -90
      analyser.maxDecibels = -15
      this.ctx = ctx
      this.analyser = analyser
      this.data = new Uint8Array(analyser.frequencyBinCount)
    }
    if (this.ctx.state !== 'running') await this.ctx.resume()
    return this.ctx
  }

  async startMicrophone() {
    const ctx = await this.activate()
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone access needs a secure connection (HTTPS or localhost).')
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false,
    })
    this.disconnectSource()
    const source = ctx.createMediaStreamSource(stream)
    // Analyse only: routing the mic to the speakers would cause feedback.
    source.connect(/** @type {AnalyserNode} */ (this.analyser))
    this.stream = stream
    this.source = source
    this.input = 'mic'
  }

  /** @param {File} file */
  async startFile(file) {
    const looksLikeAudio = file.type.startsWith('audio/') || AUDIO_EXTENSIONS.test(file.name)
    if (!looksLikeAudio) throw new Error('Please choose an audio file such as MP3, WAV, OGG or M4A.')
    if (file.size > MAX_AUDIO_FILE_BYTES) throw new Error('That file is larger than 300 MB.')

    const ctx = await this.activate()
    this.disconnectSource()

    const url = URL.createObjectURL(file)
    const element = new Audio()
    element.src = url
    element.loop = true
    element.preload = 'auto'

    const source = ctx.createMediaElementSource(element)
    source.connect(/** @type {AnalyserNode} */ (this.analyser))
    source.connect(ctx.destination)

    this.objectUrl = url
    this.element = element
    this.source = source
    this.input = 'file'

    try {
      await element.play()
    } catch (err) {
      this.disconnectSource()
      throw err
    }
  }

  /** @returns {Promise<boolean>} whether the file is now playing */
  async togglePlayback() {
    if (!this.element) return false
    if (this.element.paused) {
      await this.activate()
      await this.element.play()
      return true
    }
    this.element.pause()
    return false
  }

  get isPlaying() {
    return !!this.element && !this.element.paused
  }

  disconnectSource() {
    this.source?.disconnect()
    this.source = null
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    if (this.element) {
      this.element.pause()
      this.element.removeAttribute('src')
      this.element.load()
      this.element = null
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl)
      this.objectUrl = null
    }
    this.input = null
    this.bass.reset()
    this.mids.reset()
    this.treble.reset()
  }

  /** Releases the input and suspends the context (kept for reuse; browsers cap how many can exist). */
  async stop() {
    this.disconnectSource()
    if (this.ctx?.state === 'running') await this.ctx.suspend()
  }

  /**
   * Reads the analyser and updates `levels`. Call once per rendered frame.
   * @param {number} dt seconds since the previous call
   * @returns {AudioLevels}
   */
  sample(dt) {
    const step = Math.min(Math.max(dt, 0), 0.1)
    const l = this.levels
    const live =
      this.ctx?.state === 'running' && this.analyser && this.data && this.input && !(this.element?.paused ?? false)

    if (!live || !this.analyser || !this.data || !this.ctx) {
      l.bass = this.bass.release(step)
      l.mids = this.mids.release(step)
      l.treble = this.treble.release(step)
    } else {
      this.analyser.getByteFrequencyData(this.data)
      const rate = this.ctx.sampleRate
      const rawBass = bandEnergy(this.data, rate, ...BAND_RANGES.bass)
      const rawMids = bandEnergy(this.data, rate, ...BAND_RANGES.mids)
      const rawTreble = bandEnergy(this.data, rate, ...BAND_RANGES.treble)

      const now = performance.now()
      if (rawBass > this.bass.average * 1.3 + 0.03 && rawBass > 0.2 && now - this.lastHitAt > 150) {
        this.lastHitAt = now
        l.bassHit = 1
      }

      l.bass = this.bass.update(rawBass, step)
      l.mids = this.mids.update(rawMids, step)
      l.treble = this.treble.update(rawTreble, step)
    }

    l.bassHit *= Math.exp(-step * 7)
    l.level = (l.bass + l.mids + l.treble) / 3
    return l
  }
}

/** Shared app-wide instance: one AudioContext for the whole page. */
export const audioBridge = new AudioPrismBridge()
