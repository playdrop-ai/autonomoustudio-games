import type { PlaydropNamespace, PlaydropSDK } from "playdrop-sdk-types";
import type { AudioPolicyState, HostPhase } from "playdrop-sdk-types/types.js";

type AuthMode = PlaydropSDK["app"]["authMode"];

export type { HostPhase };

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  score: number;
  scoreDisplay: string;
  isCurrentPlayer: boolean;
}

export interface PlatformSnapshot {
  available: boolean;
  phase: HostPhase;
  authMode: AuthMode;
  isLoggedIn: boolean;
  audioEnabled: boolean;
  paused: boolean;
  pendingMeta: boolean;
  busy: boolean;
  playerRank: number | null;
  playerBestScore: number | null;
  leaderboard: LeaderboardEntry[];
}

export interface MetaUpdate {
  unlocks?: string[];
  score?: number;
}

type PendingOwnerUserId = number | "anonymous" | null;

export class PlaydropController {
  private sdk: PlaydropSDK | null = null;
  private hostReady = false;
  private phase: HostPhase = "play";
  private authMode: AuthMode = "NONE";
  private isLoggedIn = false;
  private currentUserId: number | null = null;
  private audioEnabled = true;
  private paused = false;
  private busy = false;
  private playerRank: number | null = null;
  private playerBestScore: number | null = null;
  private leaderboard: LeaderboardEntry[] = [];
  private pendingUnlocks = new Set<string>();
  private pendingScore: number | null = null;
  private pendingOwnerUserId: PendingOwnerUserId = null;
  private unlockFlushPromise: Promise<void> | null = null;
  private pendingMetaFlushPromise: Promise<void> | null = null;
  private readonly changeListeners = new Set<() => void>();
  private readonly leaderboardKey: string;

  constructor(leaderboardKey: string) {
    this.leaderboardKey = leaderboardKey;
  }

  getSnapshot(): PlatformSnapshot {
    return {
      available: Boolean(this.sdk),
      phase: this.phase,
      authMode: this.authMode,
      isLoggedIn: this.isLoggedIn,
      audioEnabled: this.audioEnabled,
      paused: this.paused,
      pendingMeta: this.pendingUnlocks.size > 0 || this.pendingScore !== null,
      busy: this.busy,
      playerRank: this.playerRank,
      playerBestScore: this.playerBestScore,
      leaderboard: this.leaderboard.slice(),
    };
  }

  onChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  reportError(error: unknown): void {
    const message = String(error);
    const namespace = window.playdrop as PlaydropNamespace | undefined;
    this.sdk?.host?.error?.(message);
    if (!this.sdk) {
      namespace?.host?.error?.(message);
    }
  }

  async init(): Promise<void> {
    const namespace = window.playdrop as PlaydropNamespace | undefined;
    if (!namespace?.init || !hasPlaydropChannel()) {
      return;
    }
    const sdk = await namespace.init();
    this.sdk = sdk;
    this.phase = sdk.host.phase;
    this.authMode = sdk.app.authMode;
    this.isLoggedIn = Boolean(sdk.me.isLoggedIn);
    this.currentUserId = sdk.me.userId ?? null;
    this.audioEnabled = sdk.host.audioEnabled;
    this.paused = sdk.host.isPaused;
    this.emitChange();

    sdk.host.onPhaseChange((phase) => {
      this.phase = phase;
      void this.refreshLeaderboard();
      this.emitChange();
    });
    sdk.host.onAudioPolicyChange((policy: AudioPolicyState) => {
      this.audioEnabled = policy.enabled;
      this.emitChange();
    });
    sdk.host.onPause(() => {
      this.paused = true;
      this.emitChange();
    });
    sdk.host.onResume(() => {
      this.paused = false;
      this.emitChange();
    });

    sdk.me.onAuthChange((state) => {
      this.isLoggedIn = Boolean(state.isLoggedIn);
      const nextUserId = state.userId ?? null;
      if (this.pendingOwnerUserId !== null && typeof this.pendingOwnerUserId === "number") {
        const switchedUsers =
          nextUserId !== null && this.pendingOwnerUserId !== nextUserId;
        if (switchedUsers) {
          this.discardPendingMeta();
        }
      }
      this.currentUserId = nextUserId;
      if (!this.isLoggedIn) {
        this.playerRank = null;
        this.playerBestScore = null;
      }
      void this.refreshLeaderboard();
      this.emitChange();
    });

    await this.refreshLeaderboard();
  }

  markReady(): void {
    if (this.hostReady) {
      return;
    }
    if (this.sdk) {
      this.sdk.host.ready();
    }
    this.hostReady = true;
    this.emitChange();
  }

  queue(update: MetaUpdate): void {
    if (this.pendingOwnerUserId === null) {
      this.pendingOwnerUserId = this.isLoggedIn && this.currentUserId !== null ? this.currentUserId : "anonymous";
    }
    let addedUnlock = false;
    for (const key of update.unlocks ?? []) {
      if (this.pendingUnlocks.has(key)) continue;
      this.pendingUnlocks.add(key);
      addedUnlock = true;
    }
    if (typeof update.score === "number" && update.score > 0) {
      this.pendingScore = Math.max(this.pendingScore ?? 0, update.score);
    }
    void addedUnlock;
    this.emitChange();
  }

  async completeRun(): Promise<PlatformSnapshot> {
    this.busy = true;
    this.emitChange();
    try {
      if (this.canFlushPendingMeta()) {
        await this.requestPendingMetaFlush();
      }
      await this.refreshLeaderboard();
      return this.getSnapshot();
    } finally {
      this.busy = false;
      this.emitChange();
    }
  }

  async promptLogin(): Promise<boolean> {
    if (!this.sdk || this.phase !== "play") {
      return false;
    }

    this.busy = true;
    this.emitChange();
    try {
      if (this.isLoggedIn) {
        return true;
      }
      if (this.authMode !== "OPTIONAL") {
        return false;
      }
      await this.sdk.me.promptLogin();
      this.isLoggedIn = Boolean(this.sdk.me?.isLoggedIn);
      if (!this.isLoggedIn) {
        return false;
      }
      await this.refreshLeaderboard();
      return true;
    } finally {
      this.busy = false;
      this.emitChange();
    }
  }

  canPromptLogin(): boolean {
    if (!this.sdk || this.phase !== "play" || this.isLoggedIn || this.authMode !== "OPTIONAL") {
      return false;
    }
    return true;
  }

  clearPendingMeta(): void {
    this.discardPendingMeta();
  }

  private hasPendingMeta(): boolean {
    return this.pendingUnlocks.size > 0 || this.pendingScore !== null;
  }

  private discardPendingMeta(): void {
    this.pendingUnlocks.clear();
    this.pendingScore = null;
    this.pendingOwnerUserId = null;
    this.emitChange();
  }

  private canFlushPendingMeta(): boolean {
    if (!this.hasPendingMeta()) {
      return false;
    }
    if (!this.sdk || !this.isLoggedIn || this.phase !== "play") {
      return false;
    }
    if (this.pendingOwnerUserId === null || this.pendingOwnerUserId === "anonymous") {
      return true;
    }
    return this.currentUserId === this.pendingOwnerUserId;
  }

  private requestPendingMetaFlush(): Promise<void> {
    if (this.pendingMetaFlushPromise) {
      return this.pendingMetaFlushPromise;
    }
    this.pendingMetaFlushPromise = this.flushPendingMeta().finally(() => {
      this.pendingMetaFlushPromise = null;
    });
    return this.pendingMetaFlushPromise;
  }

  private async flushPendingMeta(): Promise<void> {
    await this.requestUnlockFlush();
    await this.flushPendingScore();
  }

  private requestUnlockFlush(): Promise<void> {
    if (this.unlockFlushPromise) {
      return this.unlockFlushPromise;
    }
    this.unlockFlushPromise = this.flushPendingUnlocks().finally(() => {
      this.unlockFlushPromise = null;
    });
    return this.unlockFlushPromise;
  }

  private async flushPendingUnlocks(): Promise<void> {
    if (!this.canFlushPendingMeta() || !this.sdk) {
      return;
    }

    const unlock = this.sdk.achievements?.unlock;
    if (!unlock) {
      console.warn("[starfold] Achievement unlock API unavailable");
      return;
    }

    const unlocks = Array.from(this.pendingUnlocks);
    for (const key of unlocks) {
      try {
        await unlock.call(this.sdk.achievements, key);
        this.pendingUnlocks.delete(key);
        if (!this.hasPendingMeta()) {
          this.pendingOwnerUserId = null;
        }
        this.emitChange();
      } catch (error) {
        console.warn("[starfold] Failed to unlock achievement", key, error);
      }
    }
  }

  private async flushPendingScore(): Promise<void> {
    if (!this.canFlushPendingMeta() || !this.sdk || this.pendingScore === null) {
      return;
    }

    try {
      await this.sdk.leaderboards?.submitScore?.(this.leaderboardKey, this.pendingScore);
      this.pendingScore = null;
      if (!this.hasPendingMeta()) {
        this.pendingOwnerUserId = null;
      }
      this.emitChange();
    } catch (error) {
      console.warn("[starfold] Failed to submit leaderboard score", error);
    }
  }

  private async refreshLeaderboard(): Promise<void> {
    if (!this.sdk?.leaderboards?.get) {
      this.leaderboard = [];
      this.playerRank = null;
      this.playerBestScore = null;
      return;
    }

    try {
      const response = await this.sdk.leaderboards.get(this.leaderboardKey, {
        top: 5,
        aroundMe: 1,
      });
      const top = response.leaderboard.top ?? [];
      this.leaderboard = top.map((entry, index) => ({
        rank: entry.rank ?? index + 1,
        displayName: entry.user.displayName ?? entry.user.username ?? "Unknown",
        score: entry.score,
        scoreDisplay: formatScore(entry.score),
        isCurrentPlayer: Boolean(entry.isCurrentPlayer),
      }));
      const playerEntry =
        response.leaderboard.playerEntry ??
        response.leaderboard.aroundPlayer?.find((entry) => entry.isCurrentPlayer) ??
        top.find((entry) => entry.isCurrentPlayer) ??
        null;
      this.playerRank = playerEntry?.rank ?? null;
      this.playerBestScore = playerEntry?.score ?? null;
    } catch (error) {
      this.leaderboard = [];
      this.playerRank = null;
      this.playerBestScore = null;
      console.warn("[starfold] Failed to refresh leaderboard", error);
    }
    this.emitChange();
  }

  private emitChange(): void {
    for (const listener of this.changeListeners) {
      listener();
    }
  }
}

function formatScore(score: number): string {
  return new Intl.NumberFormat("en-US").format(score);
}

function hasPlaydropChannel(): boolean {
  const href = typeof window.location?.href === "string" ? window.location.href : "";
  if (!href) {
    return false;
  }
  return new URL(href).searchParams.has("playdrop_channel");
}
