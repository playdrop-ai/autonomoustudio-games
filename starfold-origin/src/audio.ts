import type { HostPhase } from "./platform";
import type { SigilKind } from "./game/logic";

type MatchSoundKey = `match:${SigilKind}`;
type SoundKey = "bgm" | MatchSoundKey | "ash-hit" | "ash-break" | "game-over";

interface RuntimeAudioState {
  audioEnabled: boolean;
  paused: boolean;
  phase: HostPhase;
}

interface DebugAudioState extends RuntimeAudioState {
  loaded: boolean;
  userActivated: boolean;
  musicWanted: boolean;
  musicStarted: boolean;
  contextState: AudioContextState;
}

const AUDIO_URLS: Record<SoundKey, string> = {
  bgm: "./assets/runtime/audio/starfold-bgm-loop-r1.mp3",
  "match:sun": "./assets/runtime/audio/starfold-match-sun-r1.mp3",
  "match:moon": "./assets/runtime/audio/starfold-match-moon-r1.mp3",
  "match:wave": "./assets/runtime/audio/starfold-match-wave-r1.mp3",
  "match:leaf": "./assets/runtime/audio/starfold-match-leaf-r1.mp3",
  "match:ember": "./assets/runtime/audio/starfold-match-ember-r1.mp3",
  "ash-hit": "./assets/runtime/audio/starfold-ash-hit-r1.mp3",
  "ash-break": "./assets/runtime/audio/starfold-ash-break-r1.mp3",
  "game-over": "./assets/runtime/audio/starfold-game-over-r1.mp3",
};

const MASTER_GAIN = 0.82;
const MUSIC_GAIN = 0.2;
const SFX_GAINS: Record<Exclude<SoundKey, "bgm">, number> = {
  "match:sun": 0.52,
  "match:moon": 0.48,
  "match:wave": 0.52,
  "match:leaf": 0.48,
  "match:ember": 0.54,
  "ash-hit": 0.5,
  "ash-break": 0.58,
  "game-over": 0.62,
};

export class GameAudio {
  private readonly context: AudioContext;
  private readonly masterGain: GainNode;
  private readonly musicGain: GainNode;
  private readonly sfxGain: GainNode;
  private readonly buffers = new Map<SoundKey, AudioBuffer>();
  private readonly runtimeState: RuntimeAudioState = {
    audioEnabled: true,
    paused: false,
    phase: "play",
  };
  private loaded = false;
  private userActivated = false;
  private musicWanted = false;
  private musicSource: AudioBufferSourceNode | null = null;
  private stateSyncPromise: Promise<void> = Promise.resolve();

  constructor() {
    const AudioContextCtor = getAudioContextCtor();
    this.context = new AudioContextCtor({ latencyHint: "interactive" });
    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();

    this.masterGain.gain.value = MASTER_GAIN;
    this.musicGain.gain.value = MUSIC_GAIN;
    this.sfxGain.gain.value = 1;

    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
  }

  async load(onProgress?: (progress: number, message: string) => void): Promise<void> {
    const tasks = Object.entries(AUDIO_URLS) as Array<[SoundKey, string]>;
    for (let index = 0; index < tasks.length; index += 1) {
      const [key, url] = tasks[index]!;
      onProgress?.((index + 0.15) / tasks.length, labelForSound(key));
      const buffer = await loadAudioBuffer(this.context, url);
      this.buffers.set(key, buffer);
      onProgress?.((index + 1) / tasks.length, labelForSound(key));
    }
    this.loaded = true;
  }

  notifyUserGesture(): void {
    this.userActivated = true;
    this.queueStateSync();
  }

  syncRuntimeState(state: RuntimeAudioState): void {
    if (
      this.runtimeState.audioEnabled === state.audioEnabled &&
      this.runtimeState.paused === state.paused &&
      this.runtimeState.phase === state.phase
    ) {
      return;
    }
    this.runtimeState.audioEnabled = state.audioEnabled;
    this.runtimeState.paused = state.paused;
    this.runtimeState.phase = state.phase;
    this.queueStateSync();
  }

  startMusicLoop(): void {
    this.musicWanted = true;
    this.queueStateSync();
  }

  playMatch(kind: SigilKind): void {
    this.playOneShot(`match:${kind}`);
  }

  playAshHit(): void {
    this.playOneShot("ash-hit");
  }

  playAshBreak(): void {
    this.playOneShot("ash-break");
  }

  playGameOver(): void {
    this.playOneShot("game-over");
  }

  getDebugState(): DebugAudioState {
    return {
      loaded: this.loaded,
      userActivated: this.userActivated,
      musicWanted: this.musicWanted,
      musicStarted: Boolean(this.musicSource),
      contextState: this.context.state,
      ...this.runtimeState,
    };
  }

  private playOneShot(key: Exclude<SoundKey, "bgm">): void {
    if (!this.canEmitSound()) {
      return;
    }

    const buffer = this.buffers.get(key);
    if (!buffer) {
      throw new Error(`Missing audio buffer for ${key}`);
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    const gain = this.context.createGain();
    gain.gain.value = SFX_GAINS[key];
    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  private canEmitSound(): boolean {
    return (
      this.loaded &&
      this.userActivated &&
      this.runtimeState.audioEnabled &&
      !this.runtimeState.paused &&
      this.runtimeState.phase === "play" &&
      this.context.state === "running"
    );
  }

  private shouldRunContext(): boolean {
    return this.loaded && this.userActivated && this.runtimeState.audioEnabled && !this.runtimeState.paused && this.runtimeState.phase === "play";
  }

  private queueStateSync(): void {
    this.stateSyncPromise = this.stateSyncPromise
      .then(async () => {
        if (this.shouldRunContext()) {
          if (this.context.state !== "running") {
            await this.context.resume();
          }
          if (this.musicWanted && !this.musicSource) {
            this.beginMusicLoop();
          }
          return;
        }
        if (this.context.state === "running") {
          await this.context.suspend();
        }
      })
      .catch((error) => {
        console.warn("[starfold-origin] Audio sync failed", error);
      });
  }

  private beginMusicLoop(): void {
    const buffer = this.buffers.get("bgm");
    if (!buffer) {
      throw new Error("Missing background music buffer");
    }
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.musicGain);
    source.start();
    source.onended = () => {
      if (this.musicSource === source) {
        this.musicSource = null;
      }
    };
    this.musicSource = source;
  }
}

function getAudioContextCtor(): typeof AudioContext {
  const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const ctor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!ctor) {
    throw new Error("Web Audio API unavailable");
  }
  return ctor;
}

async function loadAudioBuffer(context: AudioContext, url: string): Promise<AudioBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load audio asset: ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return context.decodeAudioData(arrayBuffer);
}

function labelForSound(key: SoundKey): string {
  switch (key) {
    case "bgm":
      return "Loading shrine music";
    case "ash-hit":
      return "Loading ash impact sound";
    case "ash-break":
      return "Loading ash break sound";
    case "game-over":
      return "Loading game over sound";
    default: {
      const [, kind] = key.split(":");
      if (!kind) {
        return "Loading gameplay sound";
      }
      return `Loading ${kind} sigil sound`;
    }
  }
}
