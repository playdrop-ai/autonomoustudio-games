import pianoEtudeUrl from "../../assets/audio/piano-etude.mp3";
import rockDriveUrl from "../../assets/audio/rock-drive.mp3";
import { getRun, type GameEvent, type GameState, type RunDefinition } from "./logic.ts";
import { type ProceduralStep, type SongDefinition } from "./songbook.ts";
import type { SongConfig } from "./songs.ts";

type ActiveProceduralTrack = {
  kind: "procedural";
  key: string;
  gain: GainNode;
  songAnchorTime: number;
  nextStepIndex: number;
  steps: ProceduralStep[];
};

type ActiveFileTrack = {
  kind: "file";
  key: string;
  gain: GainNode;
  songAnchorTime: number;
  source: AudioBufferSourceNode | null;
  buffer: AudioBuffer;
  url: string;
};

type ActiveTrack = ActiveProceduralTrack | ActiveFileTrack;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private noiseBuffer: AudioBuffer | null = null;
  private activeTrack: ActiveTrack | null = null;
  private muted = false;
  private bufferCache = new Map<string, AudioBuffer>();
  private bufferLoads = new Map<string, Promise<AudioBuffer>>();

  async prime(songs: readonly SongDefinition[]): Promise<void> {
    const ctx = this.ensureContext();
    const loads: Promise<AudioBuffer>[] = [];
    for (const song of songs) {
      if (song.audio.kind !== "file") continue;
      loads.push(this.loadBuffer(ctx, resolveAudioUrl(song.audio.assetId)));
    }
    await Promise.all(loads);
  }

  async unlock(): Promise<void> {
    const ctx = this.ensureContext();
    await ctx.resume();
    this.unlocked = true;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.activeTrack) {
      this.activeTrack.gain.gain.value = muted ? 0 : this.activeTrack.kind === "file" ? 0.2 : 0.18;
    }
  }

  update(state: GameState): void {
    const run = getRun(state);
    if (!run || state.screen !== "playing") {
      this.stopTrack();
      return;
    }

    const ctx = this.ensureContext();
    const key = `${run.song.id}:${run.song.audio.kind}`;
    if (!this.activeTrack || this.activeTrack.key !== key) {
      this.startTrack(ctx, run, state.elapsedMs);
    }

    if (!this.activeTrack) return;

    if (this.activeTrack.kind === "file") {
      this.resyncFileTrack(ctx, run, state.elapsedMs);
    } else {
      this.resyncProceduralTrack(ctx, state.elapsedMs);
      this.scheduleProceduralSteps(ctx);
    }
  }

  playEvents(events: GameEvent[]): void {
    if (!this.ctx || !this.unlocked || this.muted) return;
    for (const event of events) {
      if (event.kind === "hit") {
        if (event.judgement === "perfect") playPerfect(this.ctx);
        else playHit(this.ctx);
      } else if (event.kind === "miss") {
        playMiss(this.ctx);
      } else if (event.kind === "clear") {
        playClear(this.ctx);
      } else if (event.kind === "gameover") {
        playFail(this.ctx);
      }
    }
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) {
        throw new Error("AudioContext unavailable");
      }
      this.ctx = new AudioCtor();
      this.noiseBuffer = createNoiseBuffer(this.ctx);
    }
    return this.ctx;
  }

  private startTrack(ctx: AudioContext, run: RunDefinition, elapsedMs: number): void {
    this.stopTrack();
    const gain = ctx.createGain();
    gain.gain.value = this.muted ? 0 : run.song.audio.kind === "file" ? 0.2 : 0.18;
    gain.connect(ctx.destination);

    if (run.song.audio.kind === "file") {
      const url = resolveAudioUrl(run.song.audio.assetId);
      const buffer = this.bufferCache.get(url);
      if (!buffer) {
        void this.loadBuffer(ctx, url);
        return;
      }
      this.activeTrack = {
        kind: "file",
        key: `${run.song.id}:file`,
        gain,
        songAnchorTime: ctx.currentTime - elapsedMs / 1000,
        source: null,
        buffer,
        url,
      };
      this.mountFileSource(ctx, this.activeTrack, elapsedMs);
      return;
    }

    this.activeTrack = {
      kind: "procedural",
      key: `${run.song.id}:procedural`,
      gain,
      songAnchorTime: ctx.currentTime - elapsedMs / 1000,
      nextStepIndex: findNextStepIndex(run.song.audio.steps, elapsedMs),
      steps: run.song.audio.steps,
    };
    this.scheduleProceduralSteps(ctx);
  }

  private resyncFileTrack(ctx: AudioContext, run: RunDefinition, elapsedMs: number): void {
    if (!this.activeTrack || this.activeTrack.kind !== "file") return;
    const desiredAnchor = ctx.currentTime - elapsedMs / 1000;
    const drift = desiredAnchor - this.activeTrack.songAnchorTime;
    if (!this.activeTrack.source) {
      this.mountFileSource(ctx, this.activeTrack, elapsedMs);
      return;
    }
    if (Math.abs(drift) < 0.045) return;
    this.mountFileSource(ctx, this.activeTrack, elapsedMs);
  }

  private mountFileSource(ctx: AudioContext, track: ActiveFileTrack, elapsedMs: number): void {
    if (track.source) {
      try {
        track.source.stop();
      } catch {
        // Ignore stale source stop failures during resync.
      }
      track.source.disconnect();
    }
    const source = ctx.createBufferSource();
    source.buffer = track.buffer;
    source.connect(track.gain);

    const offsetS = Math.max(0, elapsedMs / 1000);
    const startDelayS = Math.max(0, -elapsedMs / 1000);
    track.songAnchorTime = ctx.currentTime - elapsedMs / 1000;
    track.source = source;
    source.start(ctx.currentTime + startDelayS, Math.min(offsetS, Math.max(0, track.buffer.duration - 0.04)));
  }

  private resyncProceduralTrack(ctx: AudioContext, elapsedMs: number): void {
    if (!this.activeTrack || this.activeTrack.kind !== "procedural") return;
    const desiredAnchor = ctx.currentTime - elapsedMs / 1000;
    const drift = desiredAnchor - this.activeTrack.songAnchorTime;
    if (Math.abs(drift) < 0.03) return;
    this.activeTrack.songAnchorTime = desiredAnchor;
    this.activeTrack.nextStepIndex = findNextStepIndex(this.activeTrack.steps, elapsedMs);
  }

  private scheduleProceduralSteps(ctx: AudioContext): void {
    if (!this.activeTrack || this.activeTrack.kind !== "procedural") return;
    const lookAhead = ctx.currentTime + 0.2;
    while (this.activeTrack.nextStepIndex < this.activeTrack.steps.length) {
      const step = this.activeTrack.steps[this.activeTrack.nextStepIndex];
      if (!step) break;
      const stepTime = this.activeTrack.songAnchorTime + step.timeMs / 1000;
      if (stepTime >= lookAhead) break;
      if (stepTime >= ctx.currentTime - 0.01) {
        scheduleProceduralStep(ctx, this.noiseBuffer, step, this.activeTrack.gain, this.muted, stepTime);
      }
      this.activeTrack.nextStepIndex += 1;
    }
  }

  private stopTrack(): void {
    if (!this.ctx || !this.activeTrack) return;
    this.activeTrack.gain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.activeTrack.gain.gain.setValueAtTime(this.activeTrack.gain.gain.value, this.ctx.currentTime);
    this.activeTrack.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.12);
    if (this.activeTrack.kind === "file" && this.activeTrack.source) {
      try {
        this.activeTrack.source.stop(this.ctx.currentTime + 0.02);
      } catch {
        // Ignore stop races during teardown.
      }
      this.activeTrack.source.disconnect();
    }
    this.activeTrack = null;
  }

  private async loadBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer> {
    const cached = this.bufferCache.get(url);
    if (cached) return cached;
    const inFlight = this.bufferLoads.get(url);
    if (inFlight) return inFlight;

    const promise = fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load audio ${url}`);
        }
        return response.arrayBuffer();
      })
      .then(async (arrayBuffer) => ctx.decodeAudioData(arrayBuffer.slice(0)))
      .then((buffer) => {
        this.bufferCache.set(url, buffer);
        this.bufferLoads.delete(url);
        return buffer;
      });

    this.bufferLoads.set(url, promise);
    return promise;
  }
}

function findNextStepIndex(steps: ProceduralStep[], elapsedMs: number): number {
  const clampedElapsed = Math.max(0, elapsedMs);
  for (let index = 0; index < steps.length; index += 1) {
    if ((steps[index]?.timeMs ?? 0) >= clampedElapsed - 24) return index;
  }
  return steps.length;
}

function resolveAudioUrl(assetId: "pianoEtude" | "rockDrive"): string {
  return assetId === "rockDrive" ? rockDriveUrl : pianoEtudeUrl;
}

function scheduleProceduralStep(
  ctx: AudioContext,
  noiseBuffer: AudioBuffer | null,
  step: ProceduralStep,
  output: GainNode,
  muted: boolean,
  time: number,
): void {
  if (muted) return;
  if (step.kick) playKick(ctx, output, time, step.song);
  if (step.hat && noiseBuffer) playHat(ctx, output, noiseBuffer, time);
  if (typeof step.bass === "number") playBass(ctx, output, time, step.song.rootMidi + step.bass);
  if (typeof step.lead === "number") playLead(ctx, output, time, step.song.rootMidi + step.lead);
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playKick(ctx: AudioContext, output: GainNode, time: number, song: SongConfig): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(midiToHz(song.rootMidi - 24), time);
  osc.frequency.exponentialRampToValueAtTime(48, time + 0.12);
  gain.gain.setValueAtTime(0.16, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
  osc.connect(gain).connect(output);
  osc.start(time);
  osc.stop(time + 0.2);
}

function playHat(ctx: AudioContext, output: GainNode, buffer: AudioBuffer, time: number): void {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 6800;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.045, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
  source.connect(filter).connect(gain).connect(output);
  source.start(time);
  source.stop(time + 0.05);
}

function playBass(ctx: AudioContext, output: GainNode, time: number, midi: number): void {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = midiToHz(midi);
  filter.type = "lowpass";
  filter.frequency.value = 420;
  gain.gain.setValueAtTime(0.095, time);
  gain.gain.linearRampToValueAtTime(0.0001, time + 0.32);
  osc.connect(filter).connect(gain).connect(output);
  osc.start(time);
  osc.stop(time + 0.34);
}

function playLead(ctx: AudioContext, output: GainNode, time: number, midi: number): void {
  const osc = ctx.createOscillator();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = midiToHz(midi);
  filter.type = "lowpass";
  filter.frequency.value = 2200;
  filter.Q.value = 6;
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.linearRampToValueAtTime(0.03, time + 0.02);
  gain.gain.linearRampToValueAtTime(0.0001, time + 0.2);
  osc.connect(filter).connect(gain).connect(output);
  osc.start(time);
  osc.stop(time + 0.22);
}

function playHit(ctx: AudioContext): void {
  playTone(ctx, 830, 0.04, 0.05, "triangle");
}

function playPerfect(ctx: AudioContext): void {
  playTone(ctx, 1120, 0.06, 0.06, "triangle");
  playTone(ctx, 1480, 0.1, 0.02, "sine");
}

function playMiss(ctx: AudioContext): void {
  playSweep(ctx, 280, 140, 0.12, 0.08);
}

function playClear(ctx: AudioContext): void {
  playTone(ctx, 700, 0.16, 0.05, "triangle");
  playTone(ctx, 980, 0.24, 0.04, "triangle");
  playTone(ctx, 1320, 0.32, 0.03, "sine");
}

function playFail(ctx: AudioContext): void {
  playSweep(ctx, 420, 120, 0.3, 0.12);
}

function playTone(ctx: AudioContext, hz: number, duration: number, gainValue: number, type: OscillatorType): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = hz;
  gain.gain.setValueAtTime(gainValue, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playSweep(ctx: AudioContext, from: number, to: number, duration: number, gainValue: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(from, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + duration);
  gain.gain.setValueAtTime(gainValue, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}
