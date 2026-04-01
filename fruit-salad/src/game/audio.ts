import type { LanternColor } from "./logic";

import applePopUrl from "../assets/audio/apple-pop.mp3";
import bgmUrl from "../assets/audio/bgm.mp3";
import blueberryPopUrl from "../assets/audio/blueberry-pop.mp3";
import dropUrl from "../assets/audio/drop.mp3";
import grapePopUrl from "../assets/audio/grape-pop.mp3";
import limePopUrl from "../assets/audio/lime-pop.mp3";
import orangePopUrl from "../assets/audio/orange-pop.mp3";
import swapUrl from "../assets/audio/swap.mp3";

type EffectId = "swap" | "drop" | LanternColor;

const POP_SOURCES: Record<LanternColor, string> = {
  coral: applePopUrl,
  gold: orangePopUrl,
  jade: limePopUrl,
  cyan: blueberryPopUrl,
  plum: grapePopUrl,
};

const REMOVE_RATES: Record<LanternColor, number> = {
  coral: 0.94,
  gold: 1.02,
  jade: 0.9,
  cyan: 1.08,
  plum: 0.86,
};

const ARRIVAL_PITCHES: Record<LanternColor, number> = {
  coral: 440,
  gold: 554.37,
  jade: 659.25,
  cyan: 783.99,
  plum: 349.23,
};

const REMOVE_PITCHES: Record<LanternColor, number> = {
  coral: 310,
  gold: 392,
  jade: 262,
  cyan: 466.16,
  plum: 233.08,
};

export class AudioDirector {
  private readonly context: AudioContext;
  private readonly masterGain: GainNode;
  private readonly music: HTMLAudioElement;
  private readonly buffers = new Map<EffectId, AudioBuffer>();
  private unlocked = false;
  private musicEnabled = true;
  private sfxEnabled = true;
  private paused = false;
  private musicWanted = false;

  constructor() {
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.context.destination);

    this.music = new Audio(bgmUrl);
    this.music.loop = true;
    this.music.preload = "auto";
    this.music.volume = 0.34;
  }

  async preload(): Promise<void> {
    const decodes: Array<Promise<void>> = [
      this.decodeInto("swap", swapUrl),
      this.decodeInto("drop", dropUrl),
      ...Object.entries(POP_SOURCES).map(([color, url]) => this.decodeInto(color as LanternColor, url)),
    ];

    await Promise.all(decodes);
  }

  async unlock(): Promise<void> {
    if (this.context.state !== "running") {
      await this.context.resume();
    }
    this.unlocked = true;
    this.syncGameplayBus();
    await this.syncMusic();
  }

  async startMusic(): Promise<void> {
    this.musicWanted = true;
    await this.syncMusic();
  }

  playSwap(): void {
    this.play("swap", 0.8);
  }

  playDrop(): void {
    this.play("drop", 0.98);
  }

  playSink(): void {
    this.play("drop", 0.82, { rate: 0.92 });
  }

  playPop(color: LanternColor): void {
    this.play(color, 0.88);
  }

  playFruitBurst(colors: LanternColor[]): void {
    const limited = colors.slice(0, 12);
    limited.forEach((color, index) => {
      this.play(color, Math.max(0.38, 0.82 - index * 0.03), {
        rate: REMOVE_RATES[color] + index * 0.012,
        when: index * 0.034,
      });
      this.playTone(REMOVE_PITCHES[color], 0.09, 0.14, index * 0.034, "triangle", 0.22, {
        endFrequency: REMOVE_PITCHES[color] * 0.72,
      });
    });
  }

  playFruitAppear(color: LanternColor): void {
    this.playTone(ARRIVAL_PITCHES[color], 0.018, 0.12, 0, "sine", 0.16, {
      endFrequency: ARRIVAL_PITCHES[color] * 1.08,
      overtoneFrequency: ARRIVAL_PITCHES[color] * 2,
      overtoneGain: 0.05,
    });
  }

  setAudioPolicy(policy: { musicEnabled: boolean; sfxEnabled: boolean }): void {
    this.musicEnabled = policy.musicEnabled;
    this.sfxEnabled = policy.sfxEnabled;
    this.syncGameplayBus();
    void this.syncMusic().catch((error) => console.error(error));
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    this.syncGameplayBus();
    void this.syncMusic().catch((error) => console.error(error));
  }

  private async decodeInto(id: EffectId, url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`[fruit-salad] failed to fetch audio for ${id}`);
    const data = await response.arrayBuffer();
    const buffer = await this.context.decodeAudioData(data);
    this.buffers.set(id, buffer);
  }

  private async syncMusic(): Promise<void> {
    if (!this.unlocked) return;
    if (!this.musicWanted || !this.musicEnabled || this.paused) {
      this.music.pause();
      return;
    }
    if (!this.music.paused) return;
    await this.music.play();
  }

  private syncGameplayBus(): void {
    const enabled = this.unlocked && this.sfxEnabled && !this.paused;
    this.masterGain.gain.setValueAtTime(enabled ? 0.78 : 0, this.context.currentTime);
  }

  private play(id: EffectId, gainValue: number, options?: { rate?: number; when?: number }): void {
    if (!this.unlocked || !this.sfxEnabled || this.paused) return;
    const buffer = this.buffers.get(id);
    if (!buffer) throw new Error(`[fruit-salad] missing audio buffer for ${id}`);

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = options?.rate ?? 1;

    const gain = this.context.createGain();
    gain.gain.value = gainValue;

    source.connect(gain);
    gain.connect(this.masterGain);
    source.start(this.context.currentTime + (options?.when ?? 0));
  }

  private playTone(
    frequency: number,
    attackSeconds: number,
    releaseSeconds: number,
    whenSeconds: number,
    type: OscillatorType,
    peakGain: number,
    options?: {
      endFrequency?: number;
      overtoneFrequency?: number;
      overtoneGain?: number;
    },
  ): void {
    if (!this.unlocked || !this.sfxEnabled || this.paused) return;
    const startAt = this.context.currentTime + whenSeconds;
    const stopAt = startAt + attackSeconds + releaseSeconds;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(peakGain, startAt + attackSeconds);
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
    gain.connect(this.masterGain);

    const osc = this.context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startAt);
    if (options?.endFrequency) {
      osc.frequency.exponentialRampToValueAtTime(options.endFrequency, stopAt);
    }
    osc.connect(gain);
    osc.start(startAt);
    osc.stop(stopAt);

    if (options?.overtoneFrequency && options.overtoneGain) {
      const overtoneGain = this.context.createGain();
      overtoneGain.gain.setValueAtTime(0, startAt);
      overtoneGain.gain.linearRampToValueAtTime(options.overtoneGain, startAt + attackSeconds * 0.8);
      overtoneGain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
      overtoneGain.connect(this.masterGain);

      const overtone = this.context.createOscillator();
      overtone.type = "triangle";
      overtone.frequency.setValueAtTime(options.overtoneFrequency, startAt);
      overtone.frequency.exponentialRampToValueAtTime(options.overtoneFrequency * 0.82, stopAt);
      overtone.connect(overtoneGain);
      overtone.start(startAt);
      overtone.stop(stopAt);
    }
  }
}
