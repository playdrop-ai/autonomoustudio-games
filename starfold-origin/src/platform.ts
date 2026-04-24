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
  leaderboard: LeaderboardEntry[];
}

export interface MetaUpdate {
  score?: number;
}

export class PlaydropController {
  private sdk: PlaydropSDK | null = null;
  private hostReady = false;
  private phase: HostPhase = "play";
  private authMode: AuthMode = "NONE";
  private isLoggedIn = false;
  private audioEnabled = true;
  private paused = false;
  private busy = false;
  private leaderboard: LeaderboardEntry[] = [];
  private pendingScore: number | null = null;
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
      pendingMeta: this.pendingScore !== null,
      busy: this.busy,
      leaderboard: this.leaderboard.slice(),
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
    this.audioEnabled = sdk.host.audioEnabled;
    this.paused = sdk.host.isPaused;

    sdk.host.onPhaseChange((phase) => {
      this.phase = phase;
      void this.refreshLeaderboard();
    });
    sdk.host.onAudioPolicyChange((policy: AudioPolicyState) => {
      this.audioEnabled = policy.enabled;
    });
    sdk.host.onPause(() => {
      this.paused = true;
    });
    sdk.host.onResume(() => {
      this.paused = false;
    });

    sdk.me.onAuthChange((state) => {
      this.isLoggedIn = Boolean(state.isLoggedIn);
      void this.refreshLeaderboard();
    });

    await this.refreshLeaderboard();
  }

  markReady(): void {
    if (this.hostReady) {
      return;
    }
    if (this.sdk && typeof this.sdk.host?.ready !== "function") {
      throw new Error("[starfold-origin] Playdrop host ready API unavailable");
    }
    if (this.sdk) {
      this.sdk.host.ready();
    }
    this.hostReady = true;
  }

  queue(update: MetaUpdate): void {
    if (typeof update.score === "number" && update.score > 0) {
      this.pendingScore = Math.max(this.pendingScore ?? 0, update.score);
    }
  }

  async completeRun(): Promise<void> {
    if (this.phase === "play" && this.isLoggedIn && this.hasPendingMeta()) {
      await this.flushPendingMeta();
    } else {
      this.discardPendingMeta();
    }
    await this.refreshLeaderboard();
  }

  async handleMetaAction(): Promise<void> {
    if (!this.sdk || this.phase !== "play") {
      return;
    }

    this.busy = true;
    try {
      if (!this.isLoggedIn && this.authMode === "OPTIONAL") {
        const prompt = this.sdk.me?.promptLogin ?? this.sdk.me?.login;
        if (prompt) {
          await prompt.call(this.sdk.me);
          this.isLoggedIn = Boolean(this.sdk.me?.isLoggedIn);
        }
      }

      if (!this.isLoggedIn) {
        return;
      }

      await this.flushPendingMeta();
      await this.refreshLeaderboard();
    } finally {
      this.busy = false;
    }
  }

  private hasPendingMeta(): boolean {
    return this.pendingScore !== null;
  }

  private discardPendingMeta(): void {
    this.pendingScore = null;
  }

  private async flushPendingMeta(): Promise<void> {
    await this.flushPendingScore();
  }

  private async flushPendingScore(): Promise<void> {
    if (!this.sdk || !this.isLoggedIn || this.phase !== "play" || this.pendingScore === null) {
      return;
    }

    const leaderboards = this.sdk.leaderboards;
    const submitScore = leaderboards?.submitScore;
    if (typeof submitScore !== "function") {
      throw new Error("[starfold-origin] Leaderboard submit API unavailable");
    }

    try {
      await submitScore.call(leaderboards, this.leaderboardKey, this.pendingScore);
      this.pendingScore = null;
    } catch (error) {
      throw new Error(
        `[starfold-origin] Failed to submit leaderboard score: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async refreshLeaderboard(): Promise<void> {
    if (!this.sdk) {
      return;
    }
    if (!this.isLoggedIn || this.phase !== "play") {
      this.leaderboard = [];
      return;
    }

    const getLeaderboard = this.sdk.leaderboards?.get;
    if (typeof getLeaderboard !== "function") {
      throw new Error("[starfold-origin] Leaderboard get API unavailable");
    }

    try {
      const response = await getLeaderboard.call(this.sdk.leaderboards, this.leaderboardKey, {
        top: 5,
      });
      const top = response.leaderboard.top ?? [];
      this.leaderboard = top.map((entry, index) => ({
        rank: entry.rank ?? index + 1,
        displayName: entry.user.displayName ?? entry.user.username ?? "Unknown",
        score: entry.score,
        scoreDisplay: formatScore(entry.score),
        isCurrentPlayer: Boolean(entry.isCurrentPlayer),
      }));
    } catch (error) {
      throw new Error(
        `[starfold-origin] Failed to refresh leaderboard: ${error instanceof Error ? error.message : String(error)}`,
      );
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
