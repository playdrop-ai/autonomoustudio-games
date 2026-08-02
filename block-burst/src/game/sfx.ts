type AudioContextCtor = typeof AudioContext;

export class Sfx {
  private ctx: AudioContext | null = null;
  private captureDest: MediaStreamAudioDestinationNode | null = null;
  private captureRecorder: MediaRecorder | null = null;
  private captureClock: ConstantSourceNode | null = null;
  private captureChunks: Blob[] = [];
  muted = false;

  init(): void {
    try {
      const ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext);
      if (!ctor) return;
      this.ctx ??= new ctor();
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  startCapture(): void {
    this.init();
    if (!this.ctx) throw new Error("[block-burst] AudioContext unavailable for preview audio capture");
    if (typeof MediaRecorder === "undefined") throw new Error("[block-burst] MediaRecorder unavailable for preview audio capture");
    if (this.captureRecorder?.state === "recording") this.captureRecorder.stop();
    this.captureDest = this.ctx.createMediaStreamDestination();
    this.captureClock = this.ctx.createConstantSource();
    this.captureClock.offset.value = 0;
    this.captureClock.connect(this.captureDest);
    this.captureClock.start();
    this.captureChunks = [];
    const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
    this.captureRecorder = preferred ? new MediaRecorder(this.captureDest.stream, { mimeType: preferred }) : new MediaRecorder(this.captureDest.stream);
    this.captureRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.captureChunks.push(event.data);
    };
    // Emit short, regular chunks so the native listing recorder receives the
    // complete WebAudio timeline instead of one late, truncated final chunk.
    this.captureRecorder.start(100);
  }

  async stopCapture(): Promise<{ mimeType: string; base64: string }> {
    const recorder = this.captureRecorder;
    if (!recorder) throw new Error("[block-burst] Preview audio capture was not started");
    if (recorder.state === "inactive") return this.encodeCapture(recorder.mimeType || "audio/webm");
    recorder.requestData();
    await new Promise<void>((resolve) => window.setTimeout(resolve, 500));
    recorder.requestData();
    await new Promise<void>((resolve) => window.setTimeout(resolve, 100));
    await new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.stop();
    });
    return this.encodeCapture(recorder.mimeType || "audio/webm");
  }

  beep(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.12, slideTo: number | null = null): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const oscillator = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, t);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    oscillator.connect(gain);
    gain.connect(this.ctx.destination);
    if (this.captureDest) {
      const captureGain = this.ctx.createGain();
      const captureVol = Math.min(vol * 4, 0.55);
      captureGain.gain.setValueAtTime(0.0001, t);
      captureGain.gain.exponentialRampToValueAtTime(captureVol, t + 0.006);
      captureGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      oscillator.connect(captureGain);
      captureGain.connect(this.captureDest);
    }
    oscillator.start(t);
    oscillator.stop(t + dur + 0.02);
  }

  private async encodeCapture(mimeType: string): Promise<{ mimeType: string; base64: string }> {
    const blob = new Blob(this.captureChunks, { type: mimeType });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      const chunk = bytes.subarray(i, i + 0x8000);
      binary += String.fromCharCode(...chunk);
    }
    this.captureClock?.stop();
    this.captureClock?.disconnect();
    this.captureClock = null;
    this.captureDest?.stream.getTracks().forEach((track) => track.stop());
    this.captureDest = null;
    this.captureRecorder = null;
    this.captureChunks = [];
    return { mimeType, base64: btoa(binary) };
  }

  pick(): void { this.beep(520, 0.05, "sine", 0.05); }
  place(): void { this.beep(300, 0.09, "square", 0.09, 240); this.beep(150, 0.1, "sine", 0.07); }
  invalid(): void { this.beep(130, 0.16, "sawtooth", 0.09, 80); }
  clear(level: number): void {
    const n = Math.min(2 + Math.floor(level / 2), 5);
    const base = 440 + Math.min(level, 12) * 36;
    for (let i = 0; i < n; i++) {
      window.setTimeout(() => this.beep(base * Math.pow(1.22, i), 0.12, "triangle", 0.12), i * 48);
    }
  }
  fanfare(): void { [523, 659, 784, 1047].forEach((f, i) => window.setTimeout(() => this.beep(f, 0.16, "triangle", 0.12), i * 70)); }
  special(): void { [660, 990, 1320].forEach((f, i) => window.setTimeout(() => this.beep(f, 0.1, "triangle", 0.13), i * 45)); }
  bomb(chainIndex: number): void {
    const lift = Math.min(Math.max(chainIndex, 0), 3);
    this.beep(150 + lift * 12, 0.2, "sawtooth", 0.15, 62 + lift * 4);
    this.beep(78 + lift * 5, 0.24, "sine", 0.18, 46 + lift * 3);
    window.setTimeout(() => this.beep(720 + lift * 90, 0.08, "square", 0.09, 1180 + lift * 120), 22);
  }
  coin(): void { this.beep(880, 0.05, "square", 0.06, 1320); }
  hammer(): void { this.beep(220, 0.07, "square", 0.1, 90); this.beep(90, 0.13, "sine", 0.09); }
  heartbeat(): void { this.beep(72, 0.12, "sine", 0.13); window.setTimeout(() => this.beep(60, 0.12, "sine", 0.1), 135); }
  gameover(): void { [440, 370, 294, 233].forEach((f, i) => window.setTimeout(() => this.beep(f, 0.24, "sine", 0.12), i * 130)); }
}
