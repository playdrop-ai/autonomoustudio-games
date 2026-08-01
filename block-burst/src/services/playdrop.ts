import type { PlaydropNamespace, PlaydropSDK } from "playdrop-sdk-types";

export const LEADERBOARD_KEY = "highest_score";
export const INTERSTITIAL_MIN_SESSION_MS = 30_000;
export const INTERSTITIAL_AD_COOLDOWN_MS = 30_000;
const HAMMERS_STORAGE_KEY = "block_burst_hammers";

type RewardedLoadStatus = "ready" | "no_fill" | "rate_limited" | "blocked";
type RewardedShowStatus = "completed" | "dismissed" | "not_ready" | "expired";
type InterstitialLoadStatus = "ready" | "no_fill" | "rate_limited" | "blocked";
type InterstitialShowStatus = "dismissed" | "not_ready" | "expired";
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
      show?: () => Promise<{ status: InterstitialShowStatus }>;
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
  private rewardedReady = false;
  private readonly sessionStartedAt: number;
  private lastAdSeenAt: number | null = null;
  private adRequestPending = false;

  constructor(private readonly now: () => number = () => Date.now()) {
    this.sessionStartedAt = this.now();
  }

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

  async prepareRewarded(): Promise<boolean> {
    if (this.adRequestPending) return false;
    const rewarded = this.sdk?.ads?.rewarded;
    if (!rewarded?.load || !rewarded.show) return false;
    try {
      const load = await rewarded.load();
      this.rewardedReady = load.status === "ready";
    } catch {
      this.rewardedReady = false;
    }
    return this.rewardedReady;
  }

  async showRewarded(): Promise<boolean> {
    if (this.adRequestPending) return false;
    const rewarded = this.sdk?.ads?.rewarded;
    if (!rewarded?.load || !rewarded.show) return false;
    this.adRequestPending = true;
    try {
      if (!this.rewardedReady) {
        const load = await rewarded.load();
        if (load.status !== "ready") return false;
      }
      this.rewardedReady = false;
      const shown = await rewarded.show();
      if (shown.status === "completed" || shown.status === "dismissed") this.lastAdSeenAt = this.now();
      return shown.status === "completed";
    } finally {
      this.adRequestPending = false;
    }
  }

  async showInterstitial(): Promise<void> {
    const now = this.now();
    if (this.adRequestPending) return;
    if (now - this.sessionStartedAt < INTERSTITIAL_MIN_SESSION_MS) return;
    if (this.lastAdSeenAt !== null && now - this.lastAdSeenAt < INTERSTITIAL_AD_COOLDOWN_MS) return;
    const interstitial = this.sdk?.ads?.interstitial;
    if (!interstitial?.load || !interstitial.show) return;
    this.adRequestPending = true;
    try {
      const load = await interstitial.load();
      if (load.status !== "ready") return;
      const shown = await interstitial.show();
      if (shown.status === "dismissed") this.lastAdSeenAt = this.now();
    } finally {
      this.adRequestPending = false;
    }
  }

  async submitScore(score: number): Promise<void> {
    if (!this.sdk?.leaderboards?.submitScore || score <= 0) return;
    await this.sdk.leaderboards.submitScore(LEADERBOARD_KEY, Math.floor(score));
  }

  async loadHammers(defaultValue: number): Promise<number> {
    const remote = normalizeHammers(this.sdk?.me.appData?.data.hammers);
    const local = normalizeHammers(window.localStorage.getItem(HAMMERS_STORAGE_KEY));
    const hammers = remote ?? local ?? defaultValue;
    window.localStorage.setItem(HAMMERS_STORAGE_KEY, String(hammers));
    if (remote === null && this.sdk) {
      await this.sdk.me.updateAppData({ hammers });
    }
    return hammers;
  }

  async saveHammers(hammers: number): Promise<void> {
    const value = Math.max(0, Math.floor(hammers));
    window.localStorage.setItem(HAMMERS_STORAGE_KEY, String(value));
    if (this.sdk) {
      await this.sdk.me.updateAppData({ hammers: value });
    }
  }
}

function normalizeHammers(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function hasPlaydropChannel(): boolean {
  try {
    return new URL(window.location.href).searchParams.has("playdrop_channel");
  } catch {
    return false;
  }
}
