import type { PlaydropNamespace, PlaydropSDK } from "playdrop-sdk-types";
import type { AudioPolicyState, HostPhase, LoadingState } from "playdrop-sdk-types/types.js";

type InterstitialLoadResult = Awaited<ReturnType<PlaydropSDK["ads"]["interstitial"]["load"]>>;
type InterstitialShowResult = Awaited<ReturnType<PlaydropSDK["ads"]["interstitial"]["show"]>>;

export type { HostPhase };

export interface PlatformSnapshot {
  available: boolean;
  phase: HostPhase;
  audioEnabled: boolean;
  paused: boolean;
}

export class PlaydropController {
  private sdk: PlaydropSDK | null = null;
  private phase: HostPhase = "play";
  private audioEnabled = true;
  private paused = false;
  private hostReady = false;
  private readonly changeListeners = new Set<() => void>();

  constructor(private readonly hosted: boolean) {}

  getSnapshot(): PlatformSnapshot {
    return {
      available: Boolean(this.sdk),
      phase: this.phase,
      audioEnabled: this.audioEnabled,
      paused: this.paused,
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
  }

  setLoadingState(state: LoadingState): void {
    this.sdk?.host?.setLoadingState?.(state);
    if (!this.sdk) {
      const namespace = window.playdrop as PlaydropNamespace | undefined;
      namespace?.host?.setLoadingState?.(state);
    }
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
