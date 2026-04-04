import { DRIFT_THRESHOLD } from './constants';
import type { VehicleEngineProfile } from './shared';
import { clamp, dbToGain, lerp, remap } from './utils';

export class AudioController {
  private readonly buffers: Record<'truckEngine' | 'motorcycleEngine' | 'skid' | 'impact', ArrayBuffer>;
  private context: AudioContext | null = null;
  private truckEngineGain: GainNode | null = null;
  private motorcycleEngineGain: GainNode | null = null;
  private skidGain: GainNode | null = null;
  private truckEngineSource: AudioBufferSourceNode | null = null;
  private motorcycleEngineSource: AudioBufferSourceNode | null = null;
  private skidSource: AudioBufferSourceNode | null = null;
  private impactBuffer: AudioBuffer | null = null;
  private unlockPromise: Promise<void> | null = null;
  private unlocked = false;
  private hostAudioEnabled = true;
  private hostPaused = false;
  private lastImpactAtMs = 0;
  private lastImpactStrength = 0;

  constructor(buffers: Record<'truckEngine' | 'motorcycleEngine' | 'skid' | 'impact', ArrayBuffer>) {
    this.buffers = buffers;
  }

  get isUnlocked() {
    return this.unlocked;
  }

  get debugState() {
    return {
      unlocked: this.unlocked,
      hostAudioEnabled: this.hostAudioEnabled,
      hostPaused: this.hostPaused,
      contextState: this.context?.state ?? 'missing',
      lastImpactStrength: Number(this.lastImpactStrength.toFixed(3)),
    } as const;
  }

  setHostAudioEnabled(enabled: boolean) {
    this.hostAudioEnabled = enabled;
    if (!enabled) {
      this.silence();
    }
    void this.syncContextState();
  }

  setHostPaused(paused: boolean) {
    this.hostPaused = paused;
    if (paused) {
      this.silence();
    }
    void this.syncContextState();
  }

  async unlock() {
    if (this.unlocked) {
      await this.syncContextState();
      return;
    }
    if (this.unlockPromise) {
      return this.unlockPromise;
    }

    this.unlockPromise = this.doUnlock().finally(() => {
      if (!this.unlocked) {
        this.unlockPromise = null;
      }
    });
    return this.unlockPromise;
  }

  update(
    engineProfile: VehicleEngineProfile,
    linearSpeed: number,
    throttle: number,
    driftIntensity: number,
    dt: number,
  ) {
    if (
      !this.unlocked ||
      !this.hostAudioEnabled ||
      this.hostPaused ||
      !this.truckEngineGain ||
      !this.motorcycleEngineGain ||
      !this.skidGain ||
      !this.truckEngineSource ||
      !this.motorcycleEngineSource ||
      !this.skidSource
    ) {
      return;
    }

    const speedFactor = clamp(Math.abs(linearSpeed), 0, 1);
    const throttleFactor = clamp(Math.abs(throttle), 0, 1);
    const engineDb = remap(speedFactor + throttleFactor * 0.5, 0, 1.5, -15, -5);

    const engineGain = dbToGain(engineDb);
    const truckSelected = engineProfile === 'truck';
    this.truckEngineGain.gain.value = lerp(
      this.truckEngineGain.gain.value,
      truckSelected ? engineGain : 0,
      dt * 5,
    );
    this.motorcycleEngineGain.gain.value = lerp(
      this.motorcycleEngineGain.gain.value,
      truckSelected ? 0 : engineGain,
      dt * 5,
    );

    let targetPitch = remap(speedFactor, 0, 1, 0.5, 3);
    if (throttleFactor > 0.1) {
      targetPitch += 0.2;
    }
    this.truckEngineSource.playbackRate.value = lerp(this.truckEngineSource.playbackRate.value, targetPitch, dt * 2);
    this.motorcycleEngineSource.playbackRate.value = lerp(
      this.motorcycleEngineSource.playbackRate.value,
      targetPitch,
      dt * 2,
    );

    const shouldSkid = driftIntensity > DRIFT_THRESHOLD;
    const skidDb = shouldSkid
      ? remap(clamp(driftIntensity, DRIFT_THRESHOLD, 2), DRIFT_THRESHOLD, 2, -10, 0)
      : -80;
    this.skidGain.gain.value = lerp(this.skidGain.gain.value, dbToGain(skidDb), dt * 10);
    this.skidSource.playbackRate.value = lerp(
      this.skidSource.playbackRate.value,
      clamp(Math.abs(linearSpeed), 1, 3),
      0.1,
    );
  }

  playImpact(contactImpulse: number) {
    if (
      !this.unlocked ||
      !this.hostAudioEnabled ||
      this.hostPaused ||
      !this.context ||
      !this.impactBuffer
    ) {
      return;
    }

    if (!Number.isFinite(contactImpulse) || contactImpulse < 0.4) {
      return;
    }

    const nowMs = performance.now();
    if (nowMs - this.lastImpactAtMs < 120) {
      return;
    }
    this.lastImpactAtMs = nowMs;
    this.lastImpactStrength = contactImpulse;

    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const impactDb = remap(clamp(contactImpulse, 0.4, 8), 0.4, 8, -20, 0);
    gain.gain.value = dbToGain(impactDb);
    source.buffer = this.impactBuffer;
    source.connect(gain);
    gain.connect(this.context.destination);
    source.start();
  }

  playCheckpoint() {
    this.playSynthCue([
      { frequency: 740, durationSeconds: 0.11, startOffsetSeconds: 0, gainDb: -19 },
      { frequency: 932, durationSeconds: 0.13, startOffsetSeconds: 0.09, gainDb: -18 },
    ]);
  }

  playFinish(success: boolean) {
    this.playSynthCue(
      success
        ? [
            { frequency: 740, durationSeconds: 0.12, startOffsetSeconds: 0, gainDb: -18 },
            { frequency: 932, durationSeconds: 0.14, startOffsetSeconds: 0.09, gainDb: -17 },
            { frequency: 1175, durationSeconds: 0.2, startOffsetSeconds: 0.2, gainDb: -16 },
          ]
        : [
            { frequency: 392, durationSeconds: 0.16, startOffsetSeconds: 0, gainDb: -19 },
            { frequency: 330, durationSeconds: 0.2, startOffsetSeconds: 0.11, gainDb: -18 },
          ],
    );
  }

  private silence() {
    if (this.truckEngineGain) {
      this.truckEngineGain.gain.value = 0;
    }
    if (this.motorcycleEngineGain) {
      this.motorcycleEngineGain.gain.value = 0;
    }
    if (this.skidGain) {
      this.skidGain.gain.value = 0;
    }
  }

  private playSynthCue(
    tones: Array<{ frequency: number; durationSeconds: number; startOffsetSeconds: number; gainDb: number }>,
  ) {
    if (!this.unlocked || !this.hostAudioEnabled || this.hostPaused || !this.context) {
      return;
    }

    const now = this.context.currentTime;
    for (const tone of tones) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.value = tone.frequency;
      gain.gain.setValueAtTime(0.0001, now + tone.startOffsetSeconds);
      gain.gain.exponentialRampToValueAtTime(
        dbToGain(tone.gainDb),
        now + tone.startOffsetSeconds + 0.02,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + tone.startOffsetSeconds + tone.durationSeconds,
      );
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start(now + tone.startOffsetSeconds);
      oscillator.stop(now + tone.startOffsetSeconds + tone.durationSeconds + 0.03);
    }
  }

  private async syncContextState() {
    if (!this.unlocked || !this.context) {
      return;
    }
    if (this.hostAudioEnabled && !this.hostPaused) {
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
      return;
    }
    if (this.context.state === 'running') {
      await this.context.suspend();
    }
  }

  private async doUnlock() {
    this.context = new AudioContext({ latencyHint: 'interactive' });
    const [truckEngineBuffer, motorcycleEngineBuffer, skidBuffer, impactBuffer] = await Promise.all([
      this.context.decodeAudioData(this.buffers.truckEngine.slice(0)),
      this.context.decodeAudioData(this.buffers.motorcycleEngine.slice(0)),
      this.context.decodeAudioData(this.buffers.skid.slice(0)),
      this.context.decodeAudioData(this.buffers.impact.slice(0)),
    ]);

    this.truckEngineGain = this.context.createGain();
    this.motorcycleEngineGain = this.context.createGain();
    this.skidGain = this.context.createGain();
    this.truckEngineGain.gain.value = 0;
    this.motorcycleEngineGain.gain.value = 0;
    this.skidGain.gain.value = 0;
    this.truckEngineGain.connect(this.context.destination);
    this.motorcycleEngineGain.connect(this.context.destination);
    this.skidGain.connect(this.context.destination);

    this.truckEngineSource = this.context.createBufferSource();
    this.truckEngineSource.buffer = truckEngineBuffer;
    this.truckEngineSource.loop = true;
    this.truckEngineSource.playbackRate.value = 0.5;
    this.truckEngineSource.connect(this.truckEngineGain);
    this.truckEngineSource.start();

    this.motorcycleEngineSource = this.context.createBufferSource();
    this.motorcycleEngineSource.buffer = motorcycleEngineBuffer;
    this.motorcycleEngineSource.loop = true;
    this.motorcycleEngineSource.playbackRate.value = 0.5;
    this.motorcycleEngineSource.connect(this.motorcycleEngineGain);
    this.motorcycleEngineSource.start();

    this.skidSource = this.context.createBufferSource();
    this.skidSource.buffer = skidBuffer;
    this.skidSource.loop = true;
    this.skidSource.playbackRate.value = 1;
    this.skidSource.connect(this.skidGain);
    this.skidSource.start();
    this.impactBuffer = impactBuffer;

    this.unlocked = true;
    await this.syncContextState();
  }
}
