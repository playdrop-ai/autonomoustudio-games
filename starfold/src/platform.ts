import type { PlaydropNamespace, PlaydropSDK } from "playdrop-sdk-types";
import type { AudioPolicyState, HostPhase } from "playdrop-sdk-types/types.js";

type AuthMode = PlaydropSDK["app"]["authMode"];
type InterstitialLoadResult = Awaited<ReturnType<PlaydropSDK["ads"]["interstitial"]["load"]>>;
type InterstitialShowResult = Awaited<ReturnType<PlaydropSDK["ads"]["interstitial"]["show"]>>;

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
  progressDeltas?: Record<string, number>;
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
  private pendingProgressDeltas = new Map<string, number>();
  private achievementProgress = new Map<string, number>();
  private achievementProgressLoaded = false;
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
      pendingMeta: this.hasPendingMeta(),
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
      this.achievementProgress.clear();
      this.achievementProgressLoaded = false;
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
    for (const [key, delta] of Object.entries(update.progressDeltas ?? {})) {
      if (!Number.isSafeInteger(delta) || delta <= 0) {
        continue;
      }
      this.pendingProgressDeltas.set(key, (this.pendingProgressDeltas.get(key) ?? 0) + delta);
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

  canUseInterstitialAds(): boolean {
    if (!this.sdk || this.phase !== "play") {
      return false;
    }
    return (
      typeof this.sdk.ads?.interstitial?.load === "function" &&
      typeof this.sdk.ads?.interstitial?.show === "function"
    );
  }

  async preloadInterstitial(): Promise<InterstitialLoadResult> {
    if (!this.sdk || this.phase !== "play") {
      throw new Error("[starfold] Interstitial ads unavailable outside hosted play");
    }
    const interstitial = this.sdk.ads?.interstitial;
    if (typeof interstitial?.load !== "function") {
      throw new Error("[starfold] Interstitial ad load API unavailable");
    }
    return await interstitial.load();
  }

  async showInterstitial(): Promise<InterstitialShowResult["status"]> {
    if (!this.sdk || this.phase !== "play") {
      throw new Error("[starfold] Interstitial ads unavailable outside hosted play");
    }
    const interstitial = this.sdk.ads?.interstitial;
    if (typeof interstitial?.show !== "function") {
      throw new Error("[starfold] Interstitial ad show API unavailable");
    }
    const result = await interstitial.show();
    return result.status;
  }

  clearPendingMeta(): void {
    this.discardPendingMeta();
  }

  private hasPendingMeta(): boolean {
    return this.pendingUnlocks.size > 0 || this.pendingProgressDeltas.size > 0 || this.pendingScore !== null;
  }

  private discardPendingMeta(): void {
    this.pendingUnlocks.clear();
    this.pendingProgressDeltas.clear();
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
    await this.flushPendingProgress();
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
    if (!this.canFlushPendingMeta() || !this.sdk || this.pendingUnlocks.size === 0) {
      return;
    }

    const achievements = this.sdk.achievements;
    const unlock = achievements?.unlock;
    if (typeof unlock !== "function") {
      throw new Error("[starfold] Achievement unlock API unavailable");
    }

    const unlocks = Array.from(this.pendingUnlocks);
    for (const key of unlocks) {
      try {
        await unlock.call(achievements, key);
        this.pendingUnlocks.delete(key);
        if (!this.hasPendingMeta()) {
          this.pendingOwnerUserId = null;
        }
        this.emitChange();
      } catch (error) {
        throw new Error(
          `[starfold] Failed to unlock achievement ${key}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async flushPendingProgress(): Promise<void> {
    if (!this.canFlushPendingMeta() || !this.sdk || this.pendingProgressDeltas.size === 0) {
      return;
    }

    const achievements = this.sdk.achievements;
    const setProgressAtLeast = achievements?.setProgressAtLeast;
    if (typeof setProgressAtLeast !== "function") {
      throw new Error("[starfold] Achievement progress API unavailable");
    }

    await this.ensureAchievementProgressLoaded();
    const entries = Array.from(this.pendingProgressDeltas.entries());
    for (const [key, delta] of entries) {
      const nextProgress = (this.achievementProgress.get(key) ?? 0) + delta;
      try {
        const response = await setProgressAtLeast.call(achievements, key, nextProgress);
        this.achievementProgress.set(key, response.progress);
        this.pendingProgressDeltas.delete(key);
        if (!this.hasPendingMeta()) {
          this.pendingOwnerUserId = null;
        }
        this.emitChange();
      } catch (error) {
        throw new Error(
          `[starfold] Failed to update achievement progress ${key}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async ensureAchievementProgressLoaded(): Promise<void> {
    if (this.achievementProgressLoaded) {
      return;
    }
    const achievements = this.sdk?.achievements;
    const list = achievements?.list;
    if (typeof list !== "function") {
      throw new Error("[starfold] Achievement list API unavailable");
    }
    const response = await list.call(achievements);
    this.achievementProgress.clear();
    for (const entry of response.achievements ?? []) {
      this.achievementProgress.set(entry.definition.key, entry.player?.progress ?? 0);
    }
    this.achievementProgressLoaded = true;
  }

  private async flushPendingScore(): Promise<void> {
    if (!this.canFlushPendingMeta() || !this.sdk || this.pendingScore === null) {
      return;
    }

    const leaderboards = this.sdk.leaderboards;
    const submitScore = leaderboards?.submitScore;
    if (typeof submitScore !== "function") {
      throw new Error("[starfold] Leaderboard submit API unavailable");
    }

    try {
      await submitScore.call(leaderboards, this.leaderboardKey, this.pendingScore);
      this.pendingScore = null;
      if (!this.hasPendingMeta()) {
        this.pendingOwnerUserId = null;
      }
      this.emitChange();
    } catch (error) {
      throw new Error(
        `[starfold] Failed to submit leaderboard score: ${error instanceof Error ? error.message : String(error)}`,
      );
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
