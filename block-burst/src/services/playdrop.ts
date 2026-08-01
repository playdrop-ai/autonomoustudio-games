import type { PlaydropNamespace, PlaydropSDK } from "playdrop-sdk-types";

export const LEADERBOARD_KEY = "highest_score";

type RewardedLoadStatus = "ready" | "no_fill" | "rate_limited" | "blocked";
type RewardedShowStatus = "completed" | "dismissed" | "not_ready" | "expired";
type InterstitialLoadStatus = "ready" | "no_fill" | "rate_limited" | "blocked";
type HostPhase = "play" | "preview" | string;
type RuntimeSdk = PlaydropSDK & {
  host: PlaydropSDK["host"] & {
    phase?: HostPhase;
    ready?: () => void;
    error?: (message: string) => void;
    onPause?: (callback: () => void) => void;
    onResume?: (callback: () => void) => void;
    onPhaseChange?: (callback: (phase: HostPhase) => void) => void;
  };
  ads?: {
    rewarded?: {
      load?: () => Promise<{ status: RewardedLoadStatus }>;
      show?: () => Promise<{ status: RewardedShowStatus }>;
    };
    interstitial?: {
      load?: () => Promise<{ status: InterstitialLoadStatus }>;
      show?: () => Promise<unknown>;
    };
  };
  leaderboards?: {
    submitScore?: (key: string, score: number) => Promise<unknown>;
  };
};

export class PlaydropServices {
  private sdk: RuntimeSdk | null = null;
  private readySent = false;
  private phase: HostPhase = "play";

  async init(): Promise<void> {
    const namespace = window.playdrop as PlaydropNamespace | undefined;
    if (!namespace?.init || !hasPlaydropChannel()) return;

    this.sdk = (await namespace.init()) as RuntimeSdk;
    this.phase = this.sdk.host.phase ?? "play";
    this.sdk.host.onPhaseChange?.((phase) => {
      this.phase = phase;
      window.dispatchEvent(new CustomEvent("blockburst:host-phase", { detail: { phase } }));
    });
    this.sdk.host.onPause?.(() => {
      window.dispatchEvent(new CustomEvent("blockburst:pause"));
    });
    this.sdk.host.onResume?.(() => {
      window.dispatchEvent(new CustomEvent("blockburst:resume"));
    });
  }

  isPreviewPhase(): boolean {
    return this.phase === "preview";
  }

  markReady(): void {
    if (this.readySent) return;
    const sdk = this.sdk;
    if (sdk?.host.ready) sdk.host.ready();
    this.readySent = true;
  }

  reportError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.sdk?.host.error?.(message);
    if (!this.sdk) {
      const namespace = window.playdrop as PlaydropNamespace | undefined;
      (namespace?.host as { error?: (message: string) => void } | undefined)?.error?.(message);
    }
  }

  canUseRewardedAds(): boolean {
    return Boolean(this.sdk?.ads?.rewarded?.load && this.sdk.ads.rewarded.show);
  }

  canUseInterstitialAds(): boolean {
    return Boolean(this.sdk?.ads?.interstitial?.load && this.sdk.ads.interstitial.show);
  }

  async showRewarded(): Promise<boolean> {
    const rewarded = this.sdk?.ads?.rewarded;
    if (!rewarded?.load || !rewarded.show) return false;
    const load = await rewarded.load();
    if (load.status !== "ready") return false;
    const shown = await rewarded.show();
    return shown.status === "completed";
  }

  async showInterstitial(): Promise<void> {
    const interstitial = this.sdk?.ads?.interstitial;
    if (!interstitial?.load || !interstitial.show) return;
    const load = await interstitial.load();
    if (load.status === "ready") {
      await interstitial.show();
    }
  }

  async submitScore(score: number): Promise<void> {
    if (!this.sdk?.leaderboards?.submitScore || score <= 0) return;
    await this.sdk.leaderboards.submitScore(LEADERBOARD_KEY, Math.floor(score));
  }
}

function hasPlaydropChannel(): boolean {
  try {
    return new URL(window.location.href).searchParams.has("playdrop_channel");
  } catch {
    return false;
  }
}
