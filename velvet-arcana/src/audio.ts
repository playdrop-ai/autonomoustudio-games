import type { SpreadLabel } from "./game/state";

type Phase = "playing" | "transition" | "gameover";
type AudioCue = "draw" | "play" | "reveal" | "spread-clear";

const MUSIC_SRC: Record<SpreadLabel, string> = {
  Past: "./assets/audio/music-past.mp3",
  Present: "./assets/audio/music-present.mp3",
  Future: "./assets/audio/music-future.mp3",
};

const MUSIC_VOLUME: Record<SpreadLabel, number> = {
  Past: 0.34,
  Present: 0.38,
  Future: 0.42,
};

const SFX_SRC: Record<AudioCue, string> = {
  draw: "./assets/audio/sfx-draw.mp3",
  play: "./assets/audio/sfx-play.mp3",
  reveal: "./assets/audio/sfx-reveal.mp3",
  "spread-clear": "./assets/audio/sfx-spread-clear.mp3",
};

const SFX_GAIN: Record<AudioCue, number> = {
  draw: 0.42,
  play: 0.5,
  reveal: 0.44,
  "spread-clear": 0.56,
};

const MUSIC_FADE_MS = 900;

export class GameAudio {
  private readonly musicElements: Record<SpreadLabel, HTMLAudioElement>;
  private readonly sfxBufferPromises = new Map<AudioCue, Promise<AudioBuffer>>();
  private readonly unlockEvents = ["pointerdown", "keydown", "touchstart"] as const;

  private context: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private currentMusic: SpreadLabel | null = null;
  private targetMusic: SpreadLabel | null = null;
  private fadeNonce = 0;
  private unlocked = false;
  private audioAllowed: boolean;

  constructor(initialAudioAllowed: boolean) {
    this.audioAllowed = initialAudioAllowed;
    this.musicElements = {
      Past: this.createMusicElement(MUSIC_SRC.Past),
      Present: this.createMusicElement(MUSIC_SRC.Present),
      Future: this.createMusicElement(MUSIC_SRC.Future),
    };

    this.installUnlockListeners();
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  preload() {
    this.createContext();
    for (const element of Object.values(this.musicElements)) {
      element.load();
    }
    for (const cue of Object.keys(SFX_SRC) as AudioCue[]) {
      this.loadSfxBuffer(cue);
    }
  }

  destroy() {
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.removeUnlockListeners();
    this.fadeNonce += 1;
    for (const element of Object.values(this.musicElements)) {
      element.pause();
      element.currentTime = 0;
      element.src = "";
    }
    if (this.context) {
      void this.context.close().catch(() => {});
      this.context = null;
      this.sfxBus = null;
    }
  }

  setAudioAllowed(enabled: boolean) {
    this.audioAllowed = enabled;
    if (!enabled) {
      this.fadeNonce += 1;
      this.pauseAllMusic();
      if (this.context && this.context.state === "running") {
        void this.context.suspend().catch(() => {});
      }
      return;
    }

    if (this.unlocked && this.context && this.context.state !== "running") {
      void this.context.resume().catch(() => {});
    }
    this.syncMusicPlayback();
  }

  syncState(phase: Phase, spreadLabel: SpreadLabel) {
    this.targetMusic = phase === "gameover" ? null : spreadLabel;
    this.syncMusicPlayback();
  }

  playCue(cue: AudioCue) {
    void this.playCueInternal(cue);
  }

  playCueAfter(cue: AudioCue, delayMs: number) {
    window.setTimeout(() => this.playCue(cue), delayMs);
  }

  debugState() {
    return {
      audioAllowed: this.audioAllowed,
      unlocked: this.unlocked,
      currentMusic: this.currentMusic,
      targetMusic: this.targetMusic,
      contextState: this.context?.state ?? "unavailable",
      tracks: {
        Past: this.trackState("Past"),
        Present: this.trackState("Present"),
        Future: this.trackState("Future"),
      },
    };
  }

  private createMusicElement(src: string) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.loop = true;
    audio.setAttribute("playsinline", "");
    audio.volume = 0;
    return audio;
  }

  private installUnlockListeners() {
    for (const eventName of this.unlockEvents) {
      window.addEventListener(eventName, this.handleUnlockGesture, { capture: true, passive: true });
    }
  }

  private removeUnlockListeners() {
    for (const eventName of this.unlockEvents) {
      window.removeEventListener(eventName, this.handleUnlockGesture, { capture: true });
    }
  }

  private handleUnlockGesture = () => {
    void this.unlock();
  };

  private handleVisibilityChange = () => {
    this.syncMusicPlayback();
  };

  private createContext() {
    if (this.context) return;

    const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor({ latencyHint: "interactive" });
    const sfxBus = context.createGain();
    sfxBus.gain.value = 0.66;
    sfxBus.connect(context.destination);

    this.context = context;
    this.sfxBus = sfxBus;
  }

  private async unlock() {
    this.createContext();
    if (this.context && this.context.state !== "running") {
      await this.context.resume().catch(() => {});
    }
    this.unlocked = !this.context || this.context.state === "running";
    if (!this.unlocked) return;
    this.removeUnlockListeners();
    this.syncMusicPlayback();
  }

  private loadSfxBuffer(cue: AudioCue) {
    const existing = this.sfxBufferPromises.get(cue);
    if (existing) return existing;

    this.createContext();
    if (!this.context) {
      throw new Error("[velvet-arcana] Web Audio unavailable");
    }

    const promise = fetch(SFX_SRC[cue])
      .then((response) => {
        if (!response.ok) throw new Error(`[velvet-arcana] failed to load audio ${SFX_SRC[cue]}`);
        return response.arrayBuffer();
      })
      .then((buffer) => this.context!.decodeAudioData(buffer));

    this.sfxBufferPromises.set(cue, promise);
    return promise;
  }

  private async playCueInternal(cue: AudioCue) {
    if (!this.audioAllowed) return;
    if (document.hidden) return;

    await this.unlock();
    if (!this.audioAllowed || !this.context || !this.sfxBus || this.context.state !== "running") return;

    const buffer = await this.loadSfxBuffer(cue).catch(() => null);
    if (!buffer) return;

    const source = this.context.createBufferSource();
    source.buffer = buffer;

    const gain = this.context.createGain();
    gain.gain.value = SFX_GAIN[cue];

    source.connect(gain);
    gain.connect(this.sfxBus);
    source.start();
  }

  private pauseAllMusic() {
    for (const element of Object.values(this.musicElements)) {
      element.pause();
      element.volume = 0;
    }
  }

  private syncMusicPlayback() {
    if (!this.audioAllowed || !this.unlocked || document.hidden) {
      this.fadeNonce += 1;
      this.pauseAllMusic();
      return;
    }

    const nextKey = this.targetMusic;
    const currentKey = this.currentMusic;
    if (nextKey === currentKey) {
      if (!nextKey) return;
      const current = this.musicElements[nextKey];
      current.volume = clampVolume(MUSIC_VOLUME[nextKey]);
      if (current.paused) {
        void current.play().catch(() => {});
      }
      return;
    }

    const from = currentKey ? this.musicElements[currentKey] : null;
    const to = nextKey ? this.musicElements[nextKey] : null;
    const nextFadeNonce = ++this.fadeNonce;

    if (to) {
      this.currentMusic = nextKey;
      to.currentTime = 0;
      to.volume = 0;
      void to.play().catch(() => {});
    }

    const start = performance.now();
    const tick = (now: number) => {
      if (nextFadeNonce !== this.fadeNonce) return;
      const progress = Math.min(1, (now - start) / MUSIC_FADE_MS);
      const eased = 1 - (1 - progress) * (1 - progress);

      if (from && currentKey) {
        from.volume = clampVolume(MUSIC_VOLUME[currentKey] * (1 - eased));
      }
      if (to && nextKey) {
        to.volume = clampVolume(MUSIC_VOLUME[nextKey] * eased);
      }

      if (progress < 1) {
        window.requestAnimationFrame(tick);
        return;
      }

      if (from) {
        from.pause();
        from.volume = 0;
      }
      if (to && nextKey) {
        to.volume = clampVolume(MUSIC_VOLUME[nextKey]);
        this.currentMusic = nextKey;
      } else {
        this.currentMusic = null;
      }
    };

    window.requestAnimationFrame(tick);
  }

  private trackState(label: SpreadLabel) {
    const track = this.musicElements[label];
    return {
      paused: track.paused,
      currentTime: Number(track.currentTime.toFixed(3)),
      volume: Number(track.volume.toFixed(3)),
    };
  }
}

function clampVolume(value: number) {
  return Math.max(0, Math.min(1, value));
}
