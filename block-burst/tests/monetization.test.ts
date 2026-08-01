import assert from "node:assert/strict";
import test from "node:test";
import {
  INTERSTITIAL_AD_COOLDOWN_MS,
  INTERSTITIAL_MIN_SESSION_MS,
  PlaydropServices,
} from "../src/services/playdrop";

type AdStatus = "completed" | "dismissed" | "not_ready" | "expired";

function installPlaydropWindow(
  sdk: object,
  localStorage: { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void },
): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { href: "https://playdrop.test/?playdrop_channel=test" },
      playdrop: { init: async () => sdk },
      dispatchEvent: () => true,
      localStorage,
    },
  });
  return () => {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else delete (globalThis as { window?: unknown }).window;
  };
}

function createHarness(rewardedStatus: AdStatus = "completed", phase = "play") {
  let now = 0;
  const stored = new Map<string, string>();
  const calls = {
    rewardedLoad: 0,
    rewardedShow: 0,
    interstitialLoad: 0,
    interstitialShow: 0,
    appDataUpdates: 0,
    localWrites: 0,
  };
  const localStorage = {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => {
      calls.localWrites++;
      stored.set(key, value);
    },
  };
  const sdk = {
    host: { phase },
    me: {
      appData: { data: {} },
      updateAppData: async () => {
        calls.appDataUpdates++;
      },
    },
    ads: {
      rewarded: {
        load: async () => {
          calls.rewardedLoad++;
          return { status: "ready" as const };
        },
        show: async () => {
          calls.rewardedShow++;
          return { status: rewardedStatus };
        },
      },
      interstitial: {
        load: async () => {
          calls.interstitialLoad++;
          return { status: "ready" as const };
        },
        show: async () => {
          calls.interstitialShow++;
          return { status: "dismissed" as const };
        },
      },
    },
  };
  const restore = installPlaydropWindow(sdk, localStorage);
  const services = new PlaydropServices(() => now);
  return {
    calls,
    restore,
    services,
    setNow: (value: number) => {
      now = value;
    },
  };
}

test("interstitials require 30 seconds of play and 30 seconds since the previous interstitial", async () => {
  const harness = createHarness();
  try {
    await harness.services.init();
    harness.setNow(INTERSTITIAL_MIN_SESSION_MS - 1);
    await harness.services.showInterstitial();
    assert.equal(harness.calls.interstitialShow, 0);

    harness.setNow(INTERSTITIAL_MIN_SESSION_MS);
    await harness.services.showInterstitial();
    assert.equal(harness.calls.interstitialShow, 1);

    harness.setNow(INTERSTITIAL_MIN_SESSION_MS + INTERSTITIAL_AD_COOLDOWN_MS - 1);
    await harness.services.showInterstitial();
    assert.equal(harness.calls.interstitialShow, 1);

    harness.setNow(INTERSTITIAL_MIN_SESSION_MS + INTERSTITIAL_AD_COOLDOWN_MS);
    await harness.services.showInterstitial();
    assert.equal(harness.calls.interstitialShow, 2);
  } finally {
    harness.restore();
  }
});

test("a rewarded ad suppresses interstitials for 30 seconds", async () => {
  const harness = createHarness();
  try {
    await harness.services.init();
    harness.setNow(INTERSTITIAL_MIN_SESSION_MS);
    assert.equal(await harness.services.showRewarded(), true);
    assert.equal(harness.calls.rewardedShow, 1);

    harness.setNow(INTERSTITIAL_MIN_SESSION_MS + INTERSTITIAL_AD_COOLDOWN_MS - 1);
    await harness.services.showInterstitial();
    assert.equal(harness.calls.interstitialShow, 0);

    harness.setNow(INTERSTITIAL_MIN_SESSION_MS + INTERSTITIAL_AD_COOLDOWN_MS);
    await harness.services.showInterstitial();
    assert.equal(harness.calls.interstitialShow, 1);
  } finally {
    harness.restore();
  }
});

test("dismissed rewarded ads count as exposure but do not grant a reward", async () => {
  const harness = createHarness("dismissed");
  try {
    await harness.services.init();
    harness.setNow(INTERSTITIAL_MIN_SESSION_MS);
    assert.equal(await harness.services.showRewarded(), false);

    harness.setNow(INTERSTITIAL_MIN_SESSION_MS + INTERSTITIAL_AD_COOLDOWN_MS - 1);
    await harness.services.showInterstitial();
    assert.equal(harness.calls.interstitialShow, 0);
  } finally {
    harness.restore();
  }
});

test("rapid rewarded taps cannot start overlapping ad requests", async () => {
  const harness = createHarness();
  try {
    await harness.services.init();
    const first = harness.services.showRewarded();
    const second = harness.services.showRewarded();
    assert.equal(await second, false);
    assert.equal(await first, true);
    assert.equal(harness.calls.rewardedLoad, 1);
    assert.equal(harness.calls.rewardedShow, 1);
  } finally {
    harness.restore();
  }
});

test("preview phase reads hammer state without writing persistence", async () => {
  const harness = createHarness("completed", "preview");
  try {
    await harness.services.init();
    assert.equal(await harness.services.loadHammers(2), 2);
    await harness.services.saveHammers(5);
    assert.equal(harness.calls.localWrites, 0);
    assert.equal(harness.calls.appDataUpdates, 0);
  } finally {
    harness.restore();
  }
});
