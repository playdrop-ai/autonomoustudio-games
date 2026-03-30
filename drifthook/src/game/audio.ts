export class AudioEngine {
  private context: AudioContext | null = null;
  private muted = false;

  async unlock(): Promise<void> {
    const context = this.ensureContext();
    if (context.state === "suspended") {
      await context.resume();
    }
  }

  setMuted(next: boolean): void {
    this.muted = next;
  }

  playCatch(perfect: boolean): void {
    this.tone({
      frequency: perfect ? 880 : 760,
      type: "triangle",
      durationMs: perfect ? 120 : 90,
      gain: perfect ? 0.07 : 0.05,
      detune: perfect ? 8 : 0,
    });
  }

  playWrong(): void {
    this.tone({
      frequency: 180,
      type: "sawtooth",
      durationMs: 180,
      gain: 0.045,
      detune: -25,
    });
  }

  playOrderComplete(): void {
    this.tone({
      frequency: 520,
      type: "triangle",
      durationMs: 220,
      gain: 0.07,
      detune: 0,
      glideTo: 760,
    });
  }

  playGameOver(): void {
    this.tone({
      frequency: 210,
      type: "square",
      durationMs: 320,
      gain: 0.05,
      detune: -40,
      glideTo: 120,
    });
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        throw new Error("[drifthook] Web Audio unavailable");
      }
      this.context = new Ctor();
    }
    return this.context;
  }

  private tone(config: {
    frequency: number;
    type: OscillatorType;
    durationMs: number;
    gain: number;
    detune: number;
    glideTo?: number;
  }): void {
    if (this.muted) return;

    let context: AudioContext;
    try {
      context = this.ensureContext();
    } catch {
      return;
    }

    const start = context.currentTime;
    const end = start + config.durationMs / 1000;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    const filter = context.createBiquadFilter();

    oscillator.type = config.type;
    oscillator.frequency.setValueAtTime(config.frequency, start);
    oscillator.detune.setValueAtTime(config.detune, start);
    if (config.glideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(config.glideTo, end);
    }

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2200, start);
    gainNode.gain.setValueAtTime(0.0001, start);
    gainNode.gain.exponentialRampToValueAtTime(config.gain, start + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end + 0.02);
  }
}
