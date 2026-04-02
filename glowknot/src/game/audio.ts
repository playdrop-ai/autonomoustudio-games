import type { LanternColor } from "./logic";

import applePopUrl from "../assets/audio/apple-pop.mp3";
import bgmUrl from "../assets/audio/bgm.mp3";
import blueberryPopUrl from "../assets/audio/blueberry-pop.mp3";
import dropUrl from "../assets/audio/drop.mp3";
import fireUrl from "../assets/audio/fire.mp3";
import grapePopUrl from "../assets/audio/grape-pop.mp3";
import limePopUrl from "../assets/audio/lime-pop.mp3";
import orangePopUrl from "../assets/audio/orange-pop.mp3";
import swapUrl from "../assets/audio/swap.mp3";

type EffectId = "fire" | "swap" | "drop" | LanternColor;

const POP_SOURCES: Record<LanternColor, string> = {
  coral: applePopUrl,
  gold: orangePopUrl,
  jade: limePopUrl,
  cyan: blueberryPopUrl,
  plum: grapePopUrl,
};

export class AudioDirector {
  private readonly context: AudioContext;
  private readonly masterGain: GainNode;
  private readonly music: HTMLAudioElement;
  private readonly buffers = new Map<EffectId, AudioBuffer>();
  private unlocked = false;

  constructor() {
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.78;
    this.masterGain.connect(this.context.destination);

    this.music = new Audio(bgmUrl);
    this.music.loop = true;
    this.music.preload = "auto";
    this.music.volume = 0.34;
  }

  async preload(): Promise<void> {
    const decodes: Array<Promise<void>> = [
      this.decodeInto("fire", fireUrl),
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
  }

  async startMusic(): Promise<void> {
    if (!this.unlocked) return;
    if (!this.music.paused) return;
    await this.music.play();
  }

  playFire(): void {
    this.play("fire", 0.92);
  }

  playSwap(): void {
    this.play("swap", 0.8);
  }

  playDrop(): void {
    this.play("drop", 0.98);
  }

  playPop(color: LanternColor): void {
    this.play(color, 0.88);
  }

  private async decodeInto(id: EffectId, url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`[fruit-salad] failed to fetch audio for ${id}`);
    const data = await response.arrayBuffer();
    const buffer = await this.context.decodeAudioData(data);
    this.buffers.set(id, buffer);
  }

  private play(id: EffectId, gainValue: number): void {
    if (!this.unlocked) return;
    const buffer = this.buffers.get(id);
    if (!buffer) throw new Error(`[fruit-salad] missing audio buffer for ${id}`);

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const gain = this.context.createGain();
    gain.gain.value = gainValue;

    source.connect(gain);
    gain.connect(this.masterGain);
    source.start();
  }
}
