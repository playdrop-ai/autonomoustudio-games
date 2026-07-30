export const INTERSTITIAL_COOLDOWN_MS = 30_000;

export class RetryInterstitial {
  constructor(ads, now = () => performance.now()) {
    this.ads = ads;
    this.now = now;
    this.sessionStartedAt = now();
    this.lastShownAt = null;
    this.pending = false;
    this.lastResult = 'not-requested';
  }

  get remainingMs() {
    const anchor = this.lastShownAt ?? this.sessionStartedAt;
    return Math.max(0, INTERSTITIAL_COOLDOWN_MS - (this.now() - anchor));
  }

  async showIfEligible() {
    if (this.pending) {
      return { status: 'in_progress', shown: false };
    }

    const remainingMs = this.remainingMs;
    if (remainingMs > 0) {
      this.lastResult = 'cooldown';
      return { status: 'cooldown', shown: false, remainingMs };
    }

    this.pending = true;
    try {
      const load = await this.ads.interstitial.load();
      if (load.status !== 'ready') {
        this.lastResult = `load:${load.status}`;
        return { status: load.status, shown: false };
      }

      const shownAt = this.now();
      const show = await this.ads.interstitial.show();
      const shown = show.status === 'dismissed';
      if (shown) this.lastShownAt = shownAt;
      this.lastResult = `show:${show.status}`;
      return { status: show.status, shown };
    } finally {
      this.pending = false;
    }
  }
}
