import type { PlaydropNamespace, PlaydropSDK } from "playdrop-sdk-types";
import type { AudioPolicyState, HostPhase } from "playdrop-sdk-types/types.js";

type InterstitialLoadResult = Awaited<ReturnType<PlaydropSDK["ads"]["interstitial"]["load"]>>;
type InterstitialShowResult = Awaited<ReturnType<PlaydropSDK["ads"]["interstitial"]["show"]>>;

export type { HostPhase };

export interface PlatformSnapshot {
  available: boolean;
  phase: HostPhase;
  audioEnabled: boolean;
  paused: boolean;
  isLoggedIn: boolean;
  playerRank: number | null;
  playerBestScore: number | null;
}

export class PlaydropController {
  private sdk: PlaydropSDK | null = null;
  private phase: HostPhase = "play";
  private isLoggedIn = false;
  private playerRank: number | null = null;
  private playerBestScore: number | null = null;
  private audioEnabled = true;
  private paused = false;
  private hostReady = false;
  private readonly changeListeners = new Set<() => void>();
  private readonly hosted: boolean;
  private readonly leaderboardKey: string;

  constructor(hosted: boolean, leaderboardKey: string) {
    this.hosted = hosted;
    this.leaderboardKey = leaderboardKey;
  }

  getSnapshot(): PlatformSnapshot {
    return {
      available: Boolean(this.sdk),
      phase: this.phase,
      audioEnabled: this.audioEnabled,
      paused: this.paused,
      isLoggedIn: this.isLoggedIn,
      playerRank: this.playerRank,
      playerBestScore: this.playerBestScore,
    };
  }

  onChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  async init(timeoutMs: number): Promise<void> {
    if (!this.hosted) {
      return;
    }

    const namespace = await waitForHostedPlaydrop(timeoutMs);
    const sdk = await namespace.init();
    this.sdk = sdk;
    this.phase = sdk.host.phase;
    this.isLoggedIn = Boolean(sdk.me.isLoggedIn);
    this.audioEnabled = sdk.host.audioEnabled;
    this.paused = sdk.host.isPaused;
    this.emitChange();

    sdk.host.onPhaseChange((phase) => {
      this.phase = phase;
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

  reportError(error: unknown): void {
    const message = String(error);
    this.sdk?.host?.error?.(message);
    if (!this.sdk) {
      const namespace = window.playdrop as PlaydropNamespace | undefined;
      namespace?.host?.error?.(message);
    }
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
      throw new Error("[velvet-arcana] Interstitial ads unavailable outside hosted play");
    }
    const interstitial = this.sdk.ads?.interstitial;
    if (typeof interstitial?.load !== "function") {
      throw new Error("[velvet-arcana] Interstitial ad load API unavailable");
    }
    return await interstitial.load();
  }

  async showInterstitial(): Promise<InterstitialShowResult["status"]> {
    if (!this.sdk || this.phase !== "play") {
      throw new Error("[velvet-arcana] Interstitial ads unavailable outside hosted play");
    }
    const interstitial = this.sdk.ads?.interstitial;
    if (typeof interstitial?.show !== "function") {
      throw new Error("[velvet-arcana] Interstitial ad show API unavailable");
    }
    const result = await interstitial.show();
    return result.status;
  }

  async submitScore(score: number): Promise<PlatformSnapshot> {
    if (score <= 0 || !this.sdk || !this.isLoggedIn || this.phase !== "play") {
      return this.getSnapshot();
    }

    const leaderboards = this.sdk.leaderboards;
    const submitScore = leaderboards?.submitScore;
    if (typeof submitScore !== "function") {
      throw new Error("[velvet-arcana] Leaderboard submit API unavailable");
    }

    await submitScore.call(leaderboards, this.leaderboardKey, score);
    await this.refreshLeaderboard();
    return this.getSnapshot();
  }

  private async refreshLeaderboard(): Promise<void> {
    if (!this.sdk?.leaderboards?.get || !this.isLoggedIn) {
      this.playerRank = null;
      this.playerBestScore = null;
      return;
    }

    try {
      const response = await this.sdk.leaderboards.get(this.leaderboardKey, {
        top: 3,
        aroundMe: 1,
      });
      const playerEntry =
        response.leaderboard.playerEntry ??
        response.leaderboard.aroundPlayer?.find((entry) => entry.isCurrentPlayer) ??
        response.leaderboard.top?.find((entry) => entry.isCurrentPlayer) ??
        null;
      this.playerRank = playerEntry?.rank ?? null;
      this.playerBestScore = playerEntry?.score ?? null;
    } catch (error) {
      console.warn("[velvet-arcana] Failed to refresh leaderboard", error);
      this.playerRank = null;
      this.playerBestScore = null;
    }
    this.emitChange();
  }

  private emitChange(): void {
    for (const listener of this.changeListeners) {
      listener();
    }
  }
}

async function waitForHostedPlaydrop(timeoutMs: number): Promise<PlaydropNamespace> {
  const deadline = performance.now() + timeoutMs;
  while (performance.now() < deadline) {
    const namespace = window.playdrop as PlaydropNamespace | undefined;
    if (namespace?.init) {
      return namespace;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 50));
  }

  throw new Error("[velvet-arcana] PlayDrop SDK loader did not expose playdrop.init() before hosted startup timeout");
}
