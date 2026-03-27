import { getSong, type GameEvent, type GameState } from "./logic.ts";
import type { SongConfig } from "./songs.ts";

type MusicTrack = {
  song: SongConfig;
  gain: GainNode;
  nextStepTime: number;
  stepIndex: number;
};

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  private noiseBuffer: AudioBuffer | null = null;
  private activeTrack: MusicTrack | null = null;
  private previousSongId: string | null = null;
  private muted = false;

  async unlock(): Promise<void> {
    if (!this.ctx) {
      const AudioCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      this.ctx = new AudioCtor();
      this.noiseBuffer = createNoiseBuffer(this.ctx);
    }
    await this.ctx.resume();
    this.unlocked = true;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.activeTrack) {
      this.activeTrack.gain.gain.value = muted ? 0 : 0.18;
    }
  }

  update(state: GameState): void {
    if (!this.ctx || !this.unlocked || state.screen !== "playing") {
      this.stopTrack();
      return;
    }

    const song = getSong(state);
    if (song.id !== this.previousSongId) {
      this.startTrack(song);
      this.previousSongId = song.id;
    }

    if (!this.activeTrack) return;

    const lookAhead = this.ctx.currentTime + 0.2;
    const stepDuration = 60 / this.activeTrack.song.bpm / 2;
    while (this.activeTrack.nextStepTime < lookAhead) {
      scheduleSongStep(this.ctx, this.noiseBuffer, this.activeTrack.song, this.activeTrack.gain, this.activeTrack.stepIndex, this.activeTrack.nextStepTime, this.muted);
      this.activeTrack.stepIndex += 1;
      this.activeTrack.nextStepTime += stepDuration;
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
      } else if (event.kind === "phrase") {
        playPhrase(this.ctx);
      } else if (event.kind === "gameover") {
        playFail(this.ctx);
      }
    }
  }

  private startTrack(song: SongConfig): void {
    if (!this.ctx) return;
    const gain = this.ctx.createGain();
    gain.gain.value = this.muted ? 0 : 0.18;
    gain.connect(this.ctx.destination);

    if (this.activeTrack) {
      const oldGain = this.activeTrack.gain;
      oldGain.gain.cancelScheduledValues(this.ctx.currentTime);
      oldGain.gain.setValueAtTime(oldGain.gain.value, this.ctx.currentTime);
      oldGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.24);
      setTimeout(() => oldGain.disconnect(), 320);
    }

    this.activeTrack = {
      song,
      gain,
      nextStepTime: this.ctx.currentTime + 0.05,
      stepIndex: 0,
    };
  }

  private stopTrack(): void {
    if (!this.ctx || !this.activeTrack) return;
    this.activeTrack.gain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.activeTrack.gain.gain.setValueAtTime(this.activeTrack.gain.gain.value, this.ctx.currentTime);
    this.activeTrack.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.12);
    this.activeTrack = null;
    this.previousSongId = null;
  }
}

function scheduleSongStep(
  ctx: AudioContext,
  noiseBuffer: AudioBuffer | null,
  song: SongConfig,
  output: GainNode,
  stepIndex: number,
  time: number,
  muted: boolean,
): void {
  if (muted) return;
  const index = stepIndex % 16;
  if (song.kick[index]) playKick(ctx, output, time, song);
  if (song.hat[index] && noiseBuffer) playHat(ctx, output, noiseBuffer, time);
  const bass = song.bass[index];
  if (typeof bass === "number") playBass(ctx, output, time, song.rootMidi + bass);
  const lead = song.lead[index];
  if (typeof lead === "number") playLead(ctx, output, time, song.rootMidi + lead);
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
  gain.gain.setValueAtTime(0.18, time);
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
  gain.gain.setValueAtTime(0.05, time);
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
  gain.gain.setValueAtTime(0.1, time);
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
  gain.gain.linearRampToValueAtTime(0.032, time + 0.02);
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

function playPhrase(ctx: AudioContext): void {
  playTone(ctx, 600, 0.14, 0.05, "sawtooth");
  playTone(ctx, 900, 0.22, 0.03, "triangle");
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
