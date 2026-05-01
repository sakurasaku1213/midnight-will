export type SoundCue =
  | 'start'
  | 'opening'
  | 'type'
  | 'command'
  | 'move'
  | 'inspect'
  | 'evidence'
  | 'talk'
  | 'present'
  | 'reveal'
  | 'clear'
  | 'success'
  | 'failure'
  | 'reset';

type Waveform = OscillatorType;

type ToneOptions = {
  duration: number;
  volume: number;
  startOffset?: number;
  endFrequency?: number;
  type?: Waveform;
  destination?: 'sfx' | 'bgm';
};

type BrowserWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

class SoundEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmNodes: OscillatorNode[] = [];
  private phraseTimer: number | null = null;
  private enabled = false;
  private phraseIndex = 0;

  get isSupported() {
    if (typeof window === 'undefined') return false;
    const browserWindow = window as BrowserWindow;
    return Boolean(globalThis.AudioContext ?? browserWindow.webkitAudioContext);
  }

  async enable() {
    if (!this.isSupported) return;
    this.enabled = true;
    const context = this.ensureContext();
    await context.resume();
    const now = context.currentTime;
    this.masterGain?.gain.setTargetAtTime(0.78, now, 0.05);
    this.bgmGain?.gain.setTargetAtTime(0.16, now, 0.25);
    this.sfxGain?.gain.setTargetAtTime(0.42, now, 0.03);
    this.startBgm();
  }

  disable() {
    this.enabled = false;
    if (!this.context) return;
    const now = this.context.currentTime;
    this.masterGain?.gain.setTargetAtTime(0, now, 0.08);
    this.stopBgm(0.18);
  }

  play(cue: SoundCue) {
    if (!this.enabled || !this.isSupported) return;
    const context = this.ensureContext();
    void context.resume();

    switch (cue) {
      case 'start':
        this.tone(196, { duration: 0.18, volume: 0.2, type: 'triangle' });
        this.tone(247, { duration: 0.18, volume: 0.19, startOffset: 0.08, type: 'triangle' });
        this.tone(330, { duration: 0.26, volume: 0.16, startOffset: 0.16, type: 'sine' });
        break;
      case 'opening':
        this.tone(880, { duration: 0.08, volume: 0.11, type: 'square' });
        this.tone(880, { duration: 0.08, volume: 0.1, startOffset: 0.16, type: 'square' });
        this.tone(196, { duration: 0.42, volume: 0.1, startOffset: 0.34, type: 'triangle' });
        break;
      case 'type':
        this.tone(1120 + Math.random() * 120, { duration: 0.018, volume: 0.035, type: 'square' });
        break;
      case 'command':
        this.tone(740, { duration: 0.055, volume: 0.14, endFrequency: 520, type: 'square' });
        break;
      case 'move':
        this.tone(165, { duration: 0.18, volume: 0.18, endFrequency: 126, type: 'sawtooth' });
        this.noise(0.12, 0.05, 520, 0.02);
        break;
      case 'inspect':
        this.tone(587, { duration: 0.09, volume: 0.15, type: 'triangle' });
        this.tone(880, { duration: 0.11, volume: 0.1, startOffset: 0.07, type: 'sine' });
        break;
      case 'evidence':
        this.tone(440, { duration: 0.12, volume: 0.16, type: 'triangle' });
        this.tone(660, { duration: 0.16, volume: 0.13, startOffset: 0.1, type: 'triangle' });
        this.tone(990, { duration: 0.26, volume: 0.1, startOffset: 0.22, type: 'sine' });
        break;
      case 'talk':
        this.tone(392, { duration: 0.07, volume: 0.13, type: 'triangle' });
        this.tone(494, { duration: 0.08, volume: 0.1, startOffset: 0.09, type: 'triangle' });
        break;
      case 'present':
        this.tone(294, { duration: 0.18, volume: 0.16, endFrequency: 392, type: 'sawtooth' });
        this.tone(784, { duration: 0.08, volume: 0.08, startOffset: 0.18, type: 'square' });
        break;
      case 'reveal':
        [196, 392, 587, 784].forEach((frequency, index) => {
          this.tone(frequency, { duration: 0.18, volume: 0.15, startOffset: index * 0.08, type: 'square' });
        });
        this.noise(0.16, 0.035, 2400, 0.02);
        break;
      case 'clear':
        [523, 659, 784, 988, 1175].forEach((frequency, index) => {
          this.tone(frequency, { duration: 0.24, volume: 0.12, startOffset: index * 0.1, type: 'triangle' });
        });
        break;
      case 'success':
        [523, 659, 784, 1047].forEach((frequency, index) => {
          this.tone(frequency, { duration: 0.26, volume: 0.13, startOffset: index * 0.1, type: 'triangle' });
        });
        break;
      case 'failure':
        [220, 185, 147].forEach((frequency, index) => {
          this.tone(frequency, { duration: 0.24, volume: 0.16, startOffset: index * 0.14, type: 'sawtooth' });
        });
        break;
      case 'reset':
        this.tone(330, { duration: 0.08, volume: 0.12, type: 'square' });
        this.tone(196, { duration: 0.16, volume: 0.12, startOffset: 0.08, type: 'triangle' });
        break;
    }
  }

  private ensureContext() {
    if (this.context) return this.context;

    const browserWindow = window as BrowserWindow;
    const AudioContextClass = globalThis.AudioContext ?? browserWindow.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error('Web Audio API is not supported in this browser.');
    }

    const context = new AudioContextClass();
    const masterGain = context.createGain();
    const bgmGain = context.createGain();
    const sfxGain = context.createGain();
    const compressor = context.createDynamicsCompressor();

    masterGain.gain.value = 0;
    bgmGain.gain.value = 0.16;
    sfxGain.gain.value = 0.42;
    compressor.threshold.value = -20;
    compressor.knee.value = 16;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;

    bgmGain.connect(masterGain);
    sfxGain.connect(masterGain);
    masterGain.connect(compressor);
    compressor.connect(context.destination);

    this.context = context;
    this.masterGain = masterGain;
    this.bgmGain = bgmGain;
    this.sfxGain = sfxGain;
    return context;
  }

  private startBgm() {
    if (!this.context || !this.bgmGain || this.bgmNodes.length) return;

    const context = this.context;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.Q.value = 0.7;
    filter.connect(this.bgmGain);

    const droneA = context.createOscillator();
    droneA.type = 'sine';
    droneA.frequency.value = 55;
    droneA.connect(filter);

    const droneB = context.createOscillator();
    droneB.type = 'triangle';
    droneB.frequency.value = 82.41;
    droneB.detune.value = -6;
    droneB.connect(filter);

    droneA.start();
    droneB.start();
    this.bgmNodes = [droneA, droneB];
    this.phraseTimer = window.setInterval(() => this.playBgmPhrase(), 3600);
    this.playBgmPhrase();
  }

  private stopBgm(delay = 0) {
    if (this.phraseTimer !== null) {
      window.clearInterval(this.phraseTimer);
      this.phraseTimer = null;
    }
    if (!this.context) return;
    const stopAt = this.context.currentTime + delay;
    for (const node of this.bgmNodes) {
      try {
        node.stop(stopAt);
      } catch {
        // Oscillators can only be stopped once.
      }
    }
    this.bgmNodes = [];
  }

  private playBgmPhrase() {
    if (!this.enabled) return;
    const phrases = [
      [110, 146.83, 164.81],
      [98, 130.81, 196],
      [123.47, 164.81, 220],
      [82.41, 110, 146.83],
    ];
    const phrase = phrases[this.phraseIndex % phrases.length];
    this.phraseIndex += 1;
    phrase.forEach((frequency, index) => {
      this.tone(frequency, {
        duration: 1.35,
        volume: 0.055,
        startOffset: index * 0.42,
        type: 'sine',
        destination: 'bgm',
      });
    });
  }

  private tone(frequency: number, options: ToneOptions) {
    if (!this.context) return;
    const context = this.context;
    const destination = options.destination === 'bgm' ? this.bgmGain : this.sfxGain;
    if (!destination) return;

    const startAt = context.currentTime + (options.startOffset ?? 0);
    const endAt = startAt + options.duration;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), endAt);
    }

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(options.volume, startAt + Math.min(0.035, options.duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(startAt);
    oscillator.stop(endAt + 0.04);
  }

  private noise(duration: number, volume: number, cutoff: number, startOffset = 0) {
    if (!this.context || !this.sfxGain) return;
    const context = this.context;
    const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const startAt = context.currentTime + startOffset;

    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start(startAt);
  }
}

export const soundEngine = new SoundEngine();
