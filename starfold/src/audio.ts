import type { RenderQualityTier } from "./game/render";
import type { HostPhase } from "./platform";
import type { SigilKind } from "./game/logic";

type MatchSoundKey = `match:${SigilKind}`;
type MajorMatchSoundKey = "major-match-4" | "major-match-5" | "major-match-6";
type SoundKey = "bgm" | MatchSoundKey | "ash-hit" | "ash-break" | MajorMatchSoundKey | "game-over";
type OneShotSoundKey = Exclude<SoundKey, "bgm">;
type SfxLoadState = "idle" | "loading-bytes" | "bytes-ready" | "decoding-hot" | "ready" | "error";
type AudioRecoveryState = "idle" | "unlocking" | "running" | "recreating" | "failed";

interface RuntimeAudioState {
  audioEnabled: boolean;
  paused: boolean;
  phase: HostPhase;
}

interface AudioGateState extends RuntimeAudioState {
  open: boolean;
  pageVisible: boolean;
  userActivated: boolean;
}

interface DebugAudioState extends RuntimeAudioState {
  loaded: boolean;
  userActivated: boolean;
  musicWanted: boolean;
  musicStarted: boolean;
  contextState: AudioContextState;
  activeOneShots: number;
  pendingOneShots: number;
  sfxReadyCount: number;
  recoveryState: AudioRecoveryState;
  globalVoices: number;
}

interface ActiveOneShotMeta {
  gain: GainNode;
  key: OneShotSoundKey;
  priority: number;
  startedAt: number;
}

interface PendingOneShot {
  key: OneShotSoundKey;
  gainMultiplier: number;
  priority: number;
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
  "major-match-4": "./assets/runtime/audio/starfold-match-4-purge-r1.mp3",
  "major-match-5": "./assets/runtime/audio/starfold-match-5-shockwave-r1.mp3",
  "major-match-6": "./assets/runtime/audio/starfold-match-6-wipe-r1.mp3",
  "game-over": "./assets/runtime/audio/starfold-game-over-r1.mp3",
};

const HOT_SFX_KEYS: OneShotSoundKey[] = [
  "match:sun",
  "match:moon",
  "match:wave",
  "match:leaf",
  "match:ember",
  "ash-hit",
  "ash-break",
];
const COLD_SFX_KEYS: OneShotSoundKey[] = ["game-over", "major-match-6", "major-match-5", "major-match-4"];

const MASTER_GAIN = 0.82;
const MUSIC_GAIN = 0.2;
const MAX_SFX_POLYPHONY_PER_KEY = 4;
const MAX_PENDING_ONE_SHOTS = 24;
const SFX_GAINS: Record<Exclude<SoundKey, "bgm">, number> = {
  "match:sun": 3.1,
  "match:moon": 3.2,
  "match:wave": 2.6,
  "match:leaf": 7.4,
  "match:ember": 1.3,
  "ash-hit": 0.5,
  "ash-break": 0.58,
  "major-match-4": 0.54,
  "major-match-5": 0.62,
  "major-match-6": 0.74,
  "game-over": 0.62,
};
const SFX_PRIORITIES: Record<OneShotSoundKey, number> = {
  "match:sun": 1,
  "match:moon": 1,
  "match:wave": 1,
  "match:leaf": 1,
  "match:ember": 1,
  "ash-hit": 2,
  "ash-break": 2,
  "major-match-4": 3,
  "major-match-5": 3,
  "major-match-6": 3,
  "game-over": 4,
};

export class GameAudio {
  private readonly runtimeState: RuntimeAudioState = {
    audioEnabled: true,
    paused: false,
    phase: "play",
  };
  private readonly resolvedUrls = new Map<SoundKey, string>();
  private readonly sfxBytes = new Map<OneShotSoundKey, ArrayBuffer>();
  private readonly sfxBuffers = new Map<OneShotSoundKey, AudioBuffer>();
  private readonly activeOneShotMeta = new Map<AudioBufferSourceNode, ActiveOneShotMeta>();
  private readonly activeOneShotsByKey = new Map<OneShotSoundKey, AudioBufferSourceNode[]>();
  private pendingOneShots: PendingOneShot[] = [];
  private loaded = false;
  private loadState: SfxLoadState = "idle";
  private recoveryState: AudioRecoveryState = "idle";
  private userActivated = false;
  private qualityTier: RenderQualityTier = "full";
  private pageVisible = document.visibilityState !== "hidden";
  private musicWanted = false;
  private musicElement: HTMLAudioElement | null = null;
  private musicPlayPromise: Promise<void> | null = null;
  private unlockListenersInstalled = false;
  private visibilityListenersInstalled = false;
  private sfxContext: AudioContext | null = null;
  private sfxMasterGain: GainNode | null = null;
  private sfxWarmupPlayed = false;
  private sfxStateSyncPromise: Promise<void> = Promise.resolve();
  private sfxGestureResumePromise: Promise<void> | null = null;
  private sfxBytesPromise: Promise<void> | null = null;
  private decodeSequencePromise: Promise<void> | null = null;
  private recreatePromise: Promise<void> | null = null;
  private requestedDecodeKeys = new Set<OneShotSoundKey>();
  private loadError: unknown = null;

  constructor() {
    ensureAudioSupport();
    this.installUnlockListeners();
    this.installVisibilityListeners();
  }

  async load(): Promise<void> {
    for (const [key, url] of Object.entries(AUDIO_URLS) as Array<[SoundKey, string]>) {
      this.resolvedUrls.set(key, new URL(url, window.location.href).toString());
    }

    this.musicElement = this.createLoopAudio(this.requireUrl("bgm"));
    this.loaded = true;
    this.loadState = "loading-bytes";
    this.sfxBytesPromise = this.prefetchSfxBytes();
    this.syncMusicPlayback();
    try {
      await this.sfxBytesPromise;
    } catch (error) {
      this.loadError = error;
      this.loadState = "error";
      console.warn("[starfold] Failed to preload sound effect bytes", error);
      throw error;
    }
  }

  notifyUserGesture(): void {
    this.startMusicLoop();
    this.unlockAudio();
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
    if (!this.getGateState().open) {
      this.stopAllOneShots();
    }
    this.syncSfxContext();
    this.syncMusicPlayback();
  }

  syncQualityTier(tier: RenderQualityTier): void {
    if (this.qualityTier === tier) {
      return;
    }
    this.qualityTier = tier;
    this.trimGlobalVoices(Number.POSITIVE_INFINITY);
  }

  startMusicLoop(): void {
    this.musicWanted = true;
    this.syncMusicPlayback();
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

  playMajorMatch(size: number): void {
    if (size < 4) {
      return;
    }
    if (size >= 6) {
      this.playOneShot("major-match-6");
      return;
    }
    if (size === 5) {
      this.playOneShot("major-match-5");
      return;
    }
    this.playOneShot("major-match-4");
  }

  playGameOver(): void {
    this.playOneShot("game-over");
  }

  getDebugState(): DebugAudioState {
    const musicStarted = Boolean(this.musicElement && !this.musicElement.paused);
    return {
      loaded: this.loaded,
      userActivated: this.userActivated,
      musicWanted: this.musicWanted,
      musicStarted,
      contextState: this.sfxContext?.state ?? "suspended",
      activeOneShots: this.activeOneShotMeta.size,
      pendingOneShots: this.pendingOneShots.length,
      sfxReadyCount: this.sfxBuffers.size,
      recoveryState: this.recoveryState,
      globalVoices: this.activeOneShotMeta.size,
      ...this.runtimeState,
    };
  }

  private getGateState(): AudioGateState {
    const open =
      this.loaded &&
      this.userActivated &&
      this.pageVisible &&
      this.runtimeState.audioEnabled &&
      !this.runtimeState.paused &&
      this.runtimeState.phase === "play";
    return {
      open,
      pageVisible: this.pageVisible,
      userActivated: this.userActivated,
      ...this.runtimeState,
    };
  }

  private unlockAudio(): void {
    const wasActivated = this.userActivated;
    this.userActivated = true;
    if (!this.loadError) {
      this.recoveryState = "unlocking";
      this.resumeSfxContextFromGesture();
    }
    if (!wasActivated) {
      this.requestPriorityDecodes(HOT_SFX_KEYS);
      this.requestPriorityDecodes(COLD_SFX_KEYS);
    }
    this.syncSfxContext(true);
    this.syncMusicPlayback();
  }

  private resumeSfxContextFromGesture(): void {
    const context = this.ensureSfxContext();
    const trackedResume = context
      .resume()
      .catch((error) => {
        console.warn("[starfold] Sound effect context resume failed during gesture", error);
      })
      .then(() => undefined);
    const inFlightResume = trackedResume.finally(() => {
      if (this.sfxGestureResumePromise === inFlightResume) {
        this.sfxGestureResumePromise = null;
      }
    });
    this.sfxGestureResumePromise = inFlightResume;
  }

  private installUnlockListeners(): void {
    if (this.unlockListenersInstalled) {
      return;
    }
    const handleUnlock = () => {
      this.unlockAudio();
    };
    document.addEventListener("pointerdown", handleUnlock, {
      capture: true,
      passive: true,
    });
    document.addEventListener("keydown", handleUnlock, {
      capture: true,
    });
    this.unlockListenersInstalled = true;
  }

  private installVisibilityListeners(): void {
    if (this.visibilityListenersInstalled) {
      return;
    }

    const syncVisibilityState = () => {
      this.pageVisible = document.visibilityState !== "hidden";
      if (!this.pageVisible) {
        this.stopAllOneShots();
      }
      this.syncSfxContext();
      this.syncMusicPlayback();
    };

    document.addEventListener("visibilitychange", syncVisibilityState, {
      capture: true,
    });
    window.addEventListener("pagehide", () => {
      this.pageVisible = false;
      this.stopAllOneShots();
      this.syncSfxContext();
      this.syncMusicPlayback();
    });
    window.addEventListener("pageshow", () => {
      this.pageVisible = document.visibilityState !== "hidden";
      this.syncSfxContext();
      this.syncMusicPlayback();
    });

    this.visibilityListenersInstalled = true;
  }

  private syncMusicPlayback(): void {
    if (!this.loaded || !(this.musicElement instanceof HTMLAudioElement)) {
      return;
    }

    this.musicElement.volume = clamp(MASTER_GAIN * MUSIC_GAIN, 0, 1);

    if (!this.canPlayMusic()) {
      if (!this.musicElement.paused) {
        this.musicElement.pause();
      }
      return;
    }

    if (this.musicElement.paused) {
      this.requestMusicPlay();
    }
  }

  private requestMusicPlay(): void {
    if (!(this.musicElement instanceof HTMLAudioElement) || this.musicPlayPromise) {
      return;
    }
    const playResult = this.musicElement.play();
    if (!(playResult instanceof Promise)) {
      return;
    }
    this.musicPlayPromise = playResult
      .catch((error) => {
        console.warn("[starfold] Music playback failed", error);
      })
      .finally(() => {
        this.musicPlayPromise = null;
      });
  }

  private playOneShot(key: OneShotSoundKey, gainMultiplier = 1): void {
    if (!this.loaded || !this.userActivated) {
      return;
    }
    if (this.loadError) {
      return;
    }

    const gate = this.getGateState();
    if (!gate.open) {
      return;
    }

    const priority = SFX_PRIORITIES[key];
    const buffer = this.sfxBuffers.get(key);
    if (!buffer) {
      this.queuePendingOneShot(key, gainMultiplier, priority);
      this.requestPriorityDecodes([key]);
      this.syncSfxContext();
      return;
    }

    if (this.sfxContext?.state !== "running") {
      this.queuePendingOneShot(key, gainMultiplier, priority);
      this.syncSfxContext();
      return;
    }

    this.startOneShotNow(key, buffer, gainMultiplier, priority);
  }

  private startOneShotNow(key: OneShotSoundKey, buffer: AudioBuffer, gainMultiplier: number, priority: number): void {
    const context = this.sfxContext;
    const masterGain = this.sfxMasterGain;
    if (!context || !masterGain || context.state !== "running") {
      this.queuePendingOneShot(key, gainMultiplier, priority);
      return;
    }

    this.trimOneShotPolyphony(key);
    if (!this.ensureVoiceBudget(priority)) {
      return;
    }

    const source = context.createBufferSource();
    source.buffer = buffer;

    const gain = context.createGain();
    gain.gain.value = Math.max(0, SFX_GAINS[key] * gainMultiplier);

    source.connect(gain);
    gain.connect(masterGain);

    this.trackOneShot(key, source, gain, priority);
    source.start(0);
  }

  private queuePendingOneShot(key: OneShotSoundKey, gainMultiplier: number, priority: number): void {
    this.pendingOneShots.push({ key, gainMultiplier, priority });
    while (this.pendingOneShots.length > MAX_PENDING_ONE_SHOTS) {
      this.pendingOneShots.shift();
    }
  }

  private flushPendingOneShots(): void {
    if (!this.getGateState().open || this.sfxContext?.state !== "running" || this.pendingOneShots.length === 0) {
      return;
    }

    const queued = this.pendingOneShots;
    this.pendingOneShots = [];
    for (const pending of queued) {
      const buffer = this.sfxBuffers.get(pending.key);
      if (!buffer) {
        this.queuePendingOneShot(pending.key, pending.gainMultiplier, pending.priority);
        this.requestPriorityDecodes([pending.key]);
        continue;
      }
      this.startOneShotNow(pending.key, buffer, pending.gainMultiplier, pending.priority);
    }
  }

  private trimOneShotPolyphony(key: OneShotSoundKey): void {
    const active = this.activeOneShotsByKey.get(key);
    if (!active) {
      return;
    }
    while (active.length >= MAX_SFX_POLYPHONY_PER_KEY) {
      const oldest = active[0];
      if (!oldest) {
        return;
      }
      this.stopTrackedOneShot(oldest);
    }
  }

  private getGlobalVoiceCap(): number {
    return this.qualityTier === "full" ? 6 : 4;
  }

  private ensureVoiceBudget(incomingPriority: number): boolean {
    const maxVoices = this.getGlobalVoiceCap();
    if (this.activeOneShotMeta.size < maxVoices) {
      return true;
    }
    this.trimGlobalVoices(incomingPriority);
    return this.activeOneShotMeta.size < maxVoices;
  }

  private trimGlobalVoices(incomingPriority: number): void {
    const maxVoices = this.getGlobalVoiceCap();
    const candidates = Array.from(this.activeOneShotMeta.entries()).sort((left, right) => {
      const [, leftMeta] = left;
      const [, rightMeta] = right;
      if (leftMeta.priority !== rightMeta.priority) {
        return leftMeta.priority - rightMeta.priority;
      }
      return leftMeta.startedAt - rightMeta.startedAt;
    });
    for (const [source, meta] of candidates) {
      if (this.activeOneShotMeta.size < maxVoices) {
        return;
      }
      if (meta.priority > incomingPriority) {
        return;
      }
      this.stopTrackedOneShot(source);
    }
  }

  private trackOneShot(key: OneShotSoundKey, source: AudioBufferSourceNode, gain: GainNode, priority: number): void {
    this.activeOneShotMeta.set(source, {
      gain,
      key,
      priority,
      startedAt: performance.now(),
    });
    const active = this.activeOneShotsByKey.get(key) ?? [];
    active.push(source);
    this.activeOneShotsByKey.set(key, active);
    source.onended = () => {
      this.cleanupTrackedOneShot(source);
    };
  }

  private stopAllOneShots(): void {
    for (const source of Array.from(this.activeOneShotMeta.keys())) {
      this.stopTrackedOneShot(source);
    }
  }

  private stopTrackedOneShot(source: AudioBufferSourceNode): void {
    source.onended = null;
    try {
      source.stop();
    } catch {
      // Ignore stop races on already-ended sources.
    }
    this.cleanupTrackedOneShot(source);
  }

  private cleanupTrackedOneShot(source: AudioBufferSourceNode): void {
    const meta = this.activeOneShotMeta.get(source);
    if (!meta) {
      return;
    }

    this.activeOneShotMeta.delete(source);

    const active = this.activeOneShotsByKey.get(meta.key);
    if (active) {
      const next = active.filter((candidate) => candidate !== source);
      if (next.length === 0) {
        this.activeOneShotsByKey.delete(meta.key);
      } else {
        this.activeOneShotsByKey.set(meta.key, next);
      }
    }

    try {
      source.disconnect();
    } catch {
      // Ignore disconnect races while tearing down one-shots.
    }
    try {
      meta.gain.disconnect();
    } catch {
      // Ignore disconnect races while tearing down one-shots.
    }
  }

  private canPlayMusic(): boolean {
    const gate = this.getGateState();
    return gate.open && this.musicWanted;
  }

  private syncSfxContext(fromGesture = false): void {
    this.sfxStateSyncPromise = this.sfxStateSyncPromise
      .then(async () => {
        if (this.loadError) {
          this.pendingOneShots = [];
          this.stopAllOneShots();
          this.recoveryState = "failed";
          return;
        }
        const gate = this.getGateState();
        if (!gate.open) {
          this.pendingOneShots = [];
          this.stopAllOneShots();
          if (this.sfxContext?.state === "running") {
            await this.sfxContext.suspend();
          }
          if (this.recoveryState !== "failed") {
            this.recoveryState = "idle";
          }
          return;
        }

        const context = this.ensureSfxContext();
        if (this.sfxGestureResumePromise) {
          await this.sfxGestureResumePromise;
        }
        if (context.state !== "running") {
          try {
            await context.resume();
          } catch (error) {
            console.warn("[starfold] Sound effect context resume failed", error);
          }
        }

        if (context.state !== "running" && (fromGesture || context.state === "interrupted")) {
          await this.recreateSfxContext();
        }

        if (this.sfxContext?.state === "running") {
          this.recoveryState = "running";
          this.playSfxWarmupIfNeeded();
          this.flushPendingOneShots();
        }
      })
      .catch((error) => {
        this.recoveryState = "failed";
        console.warn("[starfold] Sound effect context sync failed", error);
      });
  }

  private ensureSfxContext(): AudioContext {
    if (this.sfxContext) {
      return this.sfxContext;
    }
    const AudioContextCtor = getAudioContextCtor();
    this.sfxContext = new AudioContextCtor({ latencyHint: "interactive" });
    this.sfxMasterGain = this.sfxContext.createGain();
    this.sfxMasterGain.gain.value = MASTER_GAIN;
    this.sfxMasterGain.connect(this.sfxContext.destination);
    this.sfxContext.onstatechange = () => {
      this.handleSfxContextStateChange();
    };
    return this.sfxContext;
  }

  private handleSfxContextStateChange(): void {
    const context = this.sfxContext;
    if (!context) {
      return;
    }
    if (context.state === "running") {
      this.recoveryState = "running";
      this.playSfxWarmupIfNeeded();
      this.flushPendingOneShots();
      return;
    }
    if (context.state === "interrupted" && this.getGateState().open) {
      void this.recreateSfxContext();
    }
  }

  private async recreateSfxContext(): Promise<void> {
    if (this.recreatePromise) {
      return this.recreatePromise;
    }
    this.recreatePromise = this.performSfxContextRecreation().finally(() => {
      this.recreatePromise = null;
    });
    return this.recreatePromise;
  }

  private async performSfxContextRecreation(): Promise<void> {
    const previousContext = this.sfxContext;
    const previousBuffers = Array.from(this.sfxBuffers.keys());
    this.recoveryState = "recreating";
    this.stopAllOneShots();
    this.sfxBuffers.clear();
    this.sfxWarmupPlayed = false;

    this.sfxContext = null;
    this.sfxMasterGain = null;
    if (previousContext) {
      previousContext.onstatechange = null;
      try {
        await previousContext.close();
      } catch {
        // Ignore close races while replacing the context.
      }
    }

    const context = this.ensureSfxContext();
    try {
      await context.resume();
    } catch (error) {
      this.recoveryState = "failed";
      console.warn("[starfold] Recreated sound effect context failed to resume", error);
      return;
    }
    this.recoveryState = context.state === "running" ? "running" : "failed";
    this.requestPriorityDecodes(previousBuffers);
    this.flushPendingOneShots();
  }

  private requestPriorityDecodes(keys: Iterable<OneShotSoundKey>): void {
    if (this.loadError) {
      return;
    }
    for (const key of keys) {
      this.requestedDecodeKeys.add(key);
    }
    if (this.decodeSequencePromise) {
      return;
    }
    this.decodeSequencePromise = this.runRequestedDecodeSequence()
      .catch((error) => {
        this.loadError = error;
        this.loadState = "error";
        this.recoveryState = "failed";
        console.warn("[starfold] Sound effect decode failed", error);
      })
      .finally(() => {
        this.decodeSequencePromise = null;
        if (this.requestedDecodeKeys.size > 0 && !this.loadError) {
          this.requestPriorityDecodes([]);
        }
      });
  }

  private async runRequestedDecodeSequence(): Promise<void> {
    await this.awaitSfxBytes();

    this.loadState = "decoding-hot";
    for (const key of [...HOT_SFX_KEYS, ...COLD_SFX_KEYS]) {
      if (!this.requestedDecodeKeys.has(key)) {
        continue;
      }
      await this.decodeKey(key);
    }
    this.loadState = "ready";
  }

  private async decodeKey(key: OneShotSoundKey): Promise<void> {
    if (this.sfxBuffers.has(key)) {
      this.requestedDecodeKeys.delete(key);
      return;
    }
    const bytes = this.sfxBytes.get(key);
    if (!bytes) {
      throw new Error(`Missing sound effect bytes for ${key}`);
    }
    const context = this.ensureSfxContext();
    const buffer = await context.decodeAudioData(bytes.slice(0));
    this.sfxBuffers.set(key, buffer);
    this.requestedDecodeKeys.delete(key);
    this.flushPendingOneShots();
  }

  private async prefetchSfxBytes(): Promise<void> {
    const tasks = getOneShotKeys().map(async (key) => {
      this.sfxBytes.set(key, await loadAudioBytes(this.requireUrl(key)));
    });
    await Promise.all(tasks);
    if (this.loadState !== "error") {
      this.loadState = "bytes-ready";
    }
  }

  private async awaitSfxBytes(): Promise<void> {
    if (this.sfxBytesPromise) {
      await this.sfxBytesPromise;
    }
  }

  private playSfxWarmupIfNeeded(): void {
    const context = this.sfxContext;
    const masterGain = this.sfxMasterGain;
    if (this.sfxWarmupPlayed || !context || !masterGain || context.state !== "running") {
      return;
    }
    this.sfxWarmupPlayed = true;
    const buffer = context.createBuffer(1, 1, context.sampleRate);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(masterGain);
    source.start(0);
    source.stop(1 / context.sampleRate);
    source.onended = () => {
      try {
        source.disconnect();
      } catch {
        // Ignore teardown races during the one-sample warmup.
      }
      try {
        gain.disconnect();
      } catch {
        // Ignore teardown races during the one-sample warmup.
      }
    };
  }

  private createLoopAudio(url: string): HTMLAudioElement {
    const audio = new Audio(url);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = clamp(MASTER_GAIN * MUSIC_GAIN, 0, 1);
    audio.load();
    return audio;
  }

  private requireUrl(key: SoundKey): string {
    const url = this.resolvedUrls.get(key);
    if (!url) {
      throw new Error(`Missing audio URL for ${key}`);
    }
    return url;
  }
}

function ensureAudioSupport(): void {
  if (typeof Audio !== "function") {
    throw new Error("HTML audio unavailable");
  }
  getAudioContextCtor();
}

function getAudioContextCtor(): typeof AudioContext {
  const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const ctor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (!ctor) {
    throw new Error("Web Audio API unavailable");
  }
  return ctor;
}

async function loadAudioBytes(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load audio asset: ${url}`);
  }
  return response.arrayBuffer();
}

function getOneShotKeys(): OneShotSoundKey[] {
  return Object.keys(AUDIO_URLS).filter((key): key is OneShotSoundKey => key !== "bgm");
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
