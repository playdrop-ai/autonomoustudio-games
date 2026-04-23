import test from "node:test";
import assert from "node:assert/strict";

import { PlaydropController } from "../src/platform.ts";

function installWindow(playdropInit: () => Promise<unknown>, href = "https://example.test/?playdrop_channel=dev") {
  const previousWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  (globalThis as typeof globalThis & { window: Record<string, unknown> }).window = {
    playdrop: {
      init: playdropInit,
      host: {
        error: () => undefined,
      },
    },
    location: {
      href,
    },
    setTimeout: globalThis.setTimeout.bind(globalThis),
  };
  return () => {
    if (previousWindow === undefined) {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
      return;
    }
    (globalThis as typeof globalThis & { window: unknown }).window = previousWindow;
  };
}

function createSdkHarness(options: {
  isLoggedIn: boolean;
  initialRank?: number | null;
  initialBestScore?: number | null;
}) {
  const submitted: Array<{ key: string; score: number }> = [];
  let authChangeListener: ((state: { isLoggedIn: boolean; userId: number | null }) => void) | null = null;
  let playerRank = options.initialRank ?? null;
  let playerBestScore = options.initialBestScore ?? null;
  const me = {
    isLoggedIn: options.isLoggedIn,
    userId: options.isLoggedIn ? 101 : null,
    username: options.isLoggedIn ? "olivier" : null,
    selectedAvatarId: null,
    selectedProfileAssetRef: null,
    getSelectedProfileAssetRef: () => null,
    appData: null,
    updateAppData: async () => null,
    login: async () => undefined,
    promptLogin: async () => undefined,
    joinRoom: async () => {
      throw new Error("unused");
    },
    onAuthChange: (cb: (state: { isLoggedIn: boolean; userId: number | null }) => void) => {
      authChangeListener = cb;
      return () => undefined;
    },
  };
  const sdk = {
    host: {
      phase: "play" as const,
      audioEnabled: true,
      isPaused: false,
      ready: () => undefined,
      error: () => undefined,
      setLoadingState: () => undefined,
      onPhaseChange: () => undefined,
      onAudioPolicyChange: () => undefined,
      onPause: () => undefined,
      onResume: () => undefined,
    },
    app: {
      authMode: "OPTIONAL" as const,
    },
    me,
    ads: {
      interstitial: {
        load: async () => ({ status: "ready" as const }),
        show: async () => ({ status: "dismissed" as const }),
      },
      rewarded: {
        load: async () => ({ status: "no_fill" as const }),
        show: async () => ({ status: "not_ready" as const }),
      },
    },
    leaderboards: {
      submitScore: async (key: string, score: number) => {
        submitted.push({ key, score });
        playerRank = 12;
        playerBestScore = Math.max(playerBestScore ?? 0, score);
      },
      get: async () => ({
        leaderboard: {
          top: [],
          playerEntry:
            me.isLoggedIn && playerBestScore !== null
              ? {
                  rank: playerRank,
                  score: playerBestScore,
                  isCurrentPlayer: true,
                  user: {
                    displayName: "Olivier",
                    username: "olivier",
                  },
                }
              : null,
          aroundPlayer: [],
        },
      }),
    },
  };

  return {
    sdk,
    submitted,
    setAuthState: (isLoggedIn: boolean) => {
      me.isLoggedIn = isLoggedIn;
      me.userId = isLoggedIn ? 101 : null;
      authChangeListener?.({ isLoggedIn, userId: me.userId });
    },
  };
}

test("submitScore sends logged-in runs to the configured leaderboard", async () => {
  const harness = createSdkHarness({
    isLoggedIn: true,
    initialRank: 34,
    initialBestScore: 1200,
  });
  const restoreWindow = installWindow(async () => harness.sdk);
  try {
    const controller = new PlaydropController(true, "highest_score");
    await controller.init(100);

    const snapshot = await controller.submitScore(4200);

    assert.deepEqual(harness.submitted, [{ key: "highest_score", score: 4200 }]);
    assert.equal(snapshot.playerRank, 12);
    assert.equal(snapshot.playerBestScore, 4200);
  } finally {
    restoreWindow();
  }
});

test("submitScore does not submit anonymous or local scores", async () => {
  const hostedHarness = createSdkHarness({ isLoggedIn: false });
  const restoreWindow = installWindow(async () => hostedHarness.sdk);
  try {
    const hosted = new PlaydropController(true, "highest_score");
    await hosted.init(100);
    await hosted.submitScore(4200);
    assert.deepEqual(hostedHarness.submitted, []);
  } finally {
    restoreWindow();
  }

  const local = new PlaydropController(false, "highest_score");
  await local.init(100);
  await local.submitScore(4200);
  assert.equal(local.getSnapshot().available, false);
});
