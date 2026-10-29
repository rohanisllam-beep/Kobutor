/**
 * Procedural Web Audio Ambient Liquid Engine for Kobutor
 * Generates continuous subtle liquid/bubble ambience and harmonic fluid resonance
 * completely self-contained with no external file dependency.
 */

class LiquidAudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;
  private isMuted = false;
  private masterGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private bubbleInterval: number | null = null;
  private currentAmbienceVolume = 0.18;

  public init() {
    if (this.isInitialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.55, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.setValueAtTime(this.currentAmbienceVolume, this.ctx.currentTime);
      this.ambienceGain.connect(this.masterGain);

      this.startContinuousLiquidAmbience();
      this.isInitialized = true;
    } catch (err) {
      console.warn('AudioContext initialization deferred:', err);
    }
  }

  private startContinuousLiquidAmbience() {
    if (!this.ctx || !this.ambienceGain) return;

    // Layer 1: Filtered pink noise for deep water rumble
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Lowpass filter for deep underwater feeling
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(240, this.ctx.currentTime);

    // Subtle LFO modulating filter cutoff for gentle ocean water movement
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.1, this.ctx.currentTime); // very slow swell

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(50, this.ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(lowpass.frequency);

    whiteNoise.connect(lowpass);
    lowpass.connect(this.ambienceGain);

    whiteNoise.start();
    lfo.start();

    // Layer 2: Periodic subtle magical water droplets and bubbles
    this.bubbleInterval = window.setInterval(() => {
      if (!this.isMuted && this.ctx && this.ctx.state === 'running') {
        if (Math.random() > 0.3) {
          this.playSubtleBubble();
        }
      }
    }, 1100);
  }

  public playSubtleBubble(pitchOffset = 0) {
    if (!this.ctx || this.ctx.state !== 'running' || !this.ambienceGain) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const baseFreq = 400 + Math.random() * 500 + pitchOffset;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      // Pitch sweeps upward like real water bubble cavitation
      osc.frequency.exponentialRampToValueAtTime(baseFreq * (1.6 + Math.random() * 0.4), now + 0.06);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.02, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ambienceGain);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // ignore
    }
  }

  public playRippleSound() {
    if (!this.ctx || this.ctx.state !== 'running' || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.35);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      // ignore
    }
  }

  public playSynchronyChime() {
    if (!this.ctx || this.ctx.state !== 'running' || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.50]; // C Major high fluid shimmer

      chords.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.05, now + idx * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.2);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 1.3);
      });
    } catch {
      // ignore
    }
  }

  public setJustStayMode(active: boolean) {
    if (!this.ctx || !this.ambienceGain) return;
    const targetGain = active ? 0.07 : 0.18;
    this.ambienceGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 1.5);
  }

  public destroy() {
    if (this.bubbleInterval) {
      clearInterval(this.bubbleInterval);
      this.bubbleInterval = null;
    }
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }
}

export const liquidAudio = new LiquidAudioEngine();
