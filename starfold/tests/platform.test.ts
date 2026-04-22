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
  initialUserId?: number | null;
  initialRank: number | null;
  initialBestScore: number | null;
  syncedRank?: number | null;
  syncedBestScore?: number | null;
}) {
  const unlocked: string[] = [];
  const submitted: Array<{ key: string; score: number }> = [];
  let audioPolicyListener: ((state: { enabled: boolean; reason: string }) => void) | null = null;
  let authChangeListener: ((state: { isLoggedIn: boolean; userId: number | null }) => void) | null = null;
  let phaseChangeListener: ((phase: "play" | "preview") => void) | null = null;
  let leaderboardState = {
    rank: options.initialRank,
    score: options.initialBestScore,
  };

  const me = {
    isLoggedIn: options.isLoggedIn,
    userId: options.initialUserId ?? (options.isLoggedIn ? 101 : null),
    onAuthChange: (cb: (state: { isLoggedIn: boolean; userId: number | null }) => void) => {
      authChangeListener = cb;
      return () => undefined;
    },
    promptLogin: async () => {
      me.isLoggedIn = true;
      me.userId = me.userId ?? 101;
      authChangeListener?.({ isLoggedIn: true, userId: me.userId });
    },
  };

  const sdk = {
    host: {
      phase: "play" as const,
      audioEnabled: true,
      isPaused: false,
      ready: () => undefined,
      error: () => undefined,
      onPhaseChange: (cb: (phase: "play" | "preview") => void) => {
        phaseChangeListener = cb;
        return () => undefined;
      },
      onAudioPolicyChange: (cb: (state: { enabled: boolean; reason: string }) => void) => {
        audioPolicyListener = cb;
        return () => undefined;
      },
      onPause: () => undefined,
      onResume: () => undefined,
    },
    app: {
      authMode: "OPTIONAL" as const,
    },
    me,
    achievements: {
      unlock: async (key: string) => {
        unlocked.push(key);
      },
    },
    leaderboards: {
      submitScore: async (key: string, score: number) => {
        submitted.push({ key, score });
        leaderboardState = {
          rank: options.syncedRank ?? leaderboardState.rank,
          score: options.syncedBestScore ?? score,
        };
      },
      get: async () => ({
        leaderboard: {
          top: [],
          playerEntry:
            me.isLoggedIn && leaderboardState.rank !== null && leaderboardState.score !== null
              ? {
                  rank: leaderboardState.rank,
                  score: leaderboardState.score,
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
    unlocked,
    submitted,
    getAudioPolicyListener: () => audioPolicyListener,
    setAuthState: (state: { isLoggedIn: boolean; userId: number | null }) => {
      me.isLoggedIn = state.isLoggedIn;
      me.userId = state.userId;
      authChangeListener?.(state);
    },
    setPhase: (phase: "play" | "preview") => {
      sdk.host.phase = phase;
      phaseChangeListener?.(phase);
    },
  };
}

test("init stores player rank and leaderboard best score in the snapshot", async () => {
  const harness = createSdkHarness({
    isLoggedIn: true,
    initialRank: 34,
    initialBestScore: 402420,
  });
  const restoreWindow = installWindow(async () => harness.sdk);
  try {
    const controller = new PlaydropController("highest_score");
    await controller.init();

    const snapshot = controller.getSnapshot();
    assert.equal(snapshot.playerRank, 34);
    assert.equal(snapshot.playerBestScore, 402420);
  } finally {
    restoreWindow();
  }
});

test("init skips SDK bootstrap when the page is not running inside a Playdrop host channel", async () => {
  let initCalled = false;
  const restoreWindow = installWindow(
    async () => {
      initCalled = true;
      return createSdkHarness({
        isLoggedIn: true,
        initialRank: 34,
        initialBestScore: 402420,
      }).sdk;
    },
    "https://example.test/",
  );
  try {
    const controller = new PlaydropController("highest_score");
    await controller.init();

    assert.equal(initCalled, false);
    assert.equal(controller.getSnapshot().available, false);
  } finally {
    restoreWindow();
  }
});

test("queue does not submit leaderboard score before completeRun", async () => {
  const harness = createSdkHarness({
    isLoggedIn: true,
    initialRank: 34,
    initialBestScore: 402420,
  });
  const restoreWindow = installWindow(async () => harness.sdk);
  try {
    const controller = new PlaydropController("highest_score");
    await controller.init();
    controller.queue({
      score: 2400,
    });

    assert.deepEqual(harness.submitted, []);
    assert.equal(controller.getSnapshot().pendingMeta, true);
  } finally {
    restoreWindow();
  }
});

test("completeRun unlocks achievements and submits score for logged-in play sessions", async () => {
  const harness = createSdkHarness({
    isLoggedIn: true,
    initialRank: 34,
    initialBestScore: 32000,
    syncedRank: 33,
    syncedBestScore: 37800,
  });
  const restoreWindow = installWindow(async () => harness.sdk);
  try {
    const controller = new PlaydropController("highest_score");
    await controller.init();
    controller.queue({
      unlocks: ["first_constellation", "triple_chain"],
      score: 37800,
    });
    await controller.completeRun();

    assert.deepEqual(harness.unlocked, ["first_constellation", "triple_chain"]);
    assert.deepEqual(harness.submitted, [{ key: "highest_score", score: 37800 }]);
    assert.equal(controller.getSnapshot().pendingMeta, false);
    assert.equal(controller.getSnapshot().playerRank, 33);
    assert.equal(controller.getSnapshot().playerBestScore, 37800);
    assert.equal(typeof harness.getAudioPolicyListener(), "function");
  } finally {
    restoreWindow();
  }
});

test("completeRun does not submit while logged out and keeps pending run metadata available", async () => {
  const harness = createSdkHarness({
    isLoggedIn: false,
    initialRank: null,
    initialBestScore: null,
  });
  const restoreWindow = installWindow(async () => harness.sdk);
  try {
    const controller = new PlaydropController("highest_score");
    await controller.init();
    controller.queue({
      score: 1200,
    });
    await controller.completeRun();

    assert.deepEqual(harness.submitted, []);
    assert.equal(controller.getSnapshot().pendingMeta, true);
    assert.equal(controller.getSnapshot().playerRank, null);
    assert.equal(controller.getSnapshot().playerBestScore, null);
  } finally {
    restoreWindow();
  }
});

test("mid-run login does not submit before game over and allows the finished run to submit at game over", async () => {
  const harness = createSdkHarness({
    isLoggedIn: false,
    initialRank: null,
    initialBestScore: null,
    syncedRank: 44,
    syncedBestScore: 1900,
  });
  const restoreWindow = installWindow(async () => harness.sdk);
  try {
    const controller = new PlaydropController("highest_score");
    await controller.init();
    controller.queue({
      score: 1900,
    });
    const didLogin = await controller.promptLogin();
    assert.equal(didLogin, true);
    assert.deepEqual(harness.submitted, []);

    await controller.completeRun();

    assert.deepEqual(harness.submitted, [{ key: "highest_score", score: 1900 }]);
    assert.equal(controller.getSnapshot().playerBestScore, 1900);
  } finally {
    restoreWindow();
  }
});

test("phase changes do not submit a queued run before completeRun", async () => {
  const harness = createSdkHarness({
    isLoggedIn: true,
    initialUserId: 111,
    initialRank: 20,
    initialBestScore: 1800,
    syncedRank: 19,
    syncedBestScore: 2400,
  });
  const restoreWindow = installWindow(async () => harness.sdk);
  try {
    const controller = new PlaydropController("highest_score");
    await controller.init();
    controller.queue({
      score: 2400,
      unlocks: ["first_constellation"],
    });

    harness.setPhase("preview");
    harness.setPhase("play");
    assert.deepEqual(harness.submitted, []);
    assert.deepEqual(harness.unlocked, []);

    await controller.completeRun();

    assert.deepEqual(harness.submitted, [{ key: "highest_score", score: 2400 }]);
    assert.deepEqual(harness.unlocked, ["first_constellation"]);
    assert.equal(controller.getSnapshot().pendingMeta, false);
  } finally {
    restoreWindow();
  }
});

test("pending anonymous score can submit after a later login", async () => {
  const harness = createSdkHarness({
    isLoggedIn: false,
    initialUserId: null,
    initialRank: null,
    initialBestScore: null,
    syncedRank: 41,
    syncedBestScore: 2400,
  });
  const restoreWindow = installWindow(async () => harness.sdk);
  try {
    const controller = new PlaydropController("highest_score");
    await controller.init();
    controller.queue({
      score: 2400,
    });

    harness.setAuthState({ isLoggedIn: true, userId: 222 });
    await controller.completeRun();

    assert.deepEqual(harness.submitted, [{ key: "highest_score", score: 2400 }]);
    assert.equal(controller.getSnapshot().pendingMeta, false);
  } finally {
    restoreWindow();
  }
});

test("pending logged-in score is discarded when a different user logs in before retry", async () => {
  const harness = createSdkHarness({
    isLoggedIn: true,
    initialUserId: 111,
    initialRank: 20,
    initialBestScore: 1800,
  });
  const restoreWindow = installWindow(async () => harness.sdk);
  try {
    const controller = new PlaydropController("highest_score");
    await controller.init();
    controller.queue({
      score: 2400,
      unlocks: ["first_constellation"],
    });

    harness.setAuthState({ isLoggedIn: true, userId: 999 });
    await controller.completeRun();

    assert.deepEqual(harness.submitted, []);
    assert.deepEqual(harness.unlocked, []);
    assert.equal(controller.getSnapshot().pendingMeta, false);
  } finally {
    restoreWindow();
  }
});

test("post-run login can submit the finished logged-out run from the result screen", async () => {
  const harness = createSdkHarness({
    isLoggedIn: false,
    initialRank: null,
    initialBestScore: null,
    syncedRank: 41,
    syncedBestScore: 2400,
  });
  const restoreWindow = installWindow(async () => harness.sdk);
  try {
    const controller = new PlaydropController("highest_score");
    await controller.init();
    controller.queue({
      score: 2400,
    });
    await controller.completeRun();
    assert.deepEqual(harness.submitted, []);

    const didLogin = await controller.promptLogin();
    assert.equal(didLogin, true);
    await controller.completeRun();

    assert.deepEqual(harness.submitted, [{ key: "highest_score", score: 2400 }]);
    assert.equal(controller.getSnapshot().pendingMeta, false);
    assert.equal(controller.getSnapshot().playerRank, 41);
    assert.equal(controller.getSnapshot().playerBestScore, 2400);
  } finally {
    restoreWindow();
  }
});

test("audio policy callback updates snapshot from host policy object", async () => {
  const harness = createSdkHarness({
    isLoggedIn: true,
    initialRank: 34,
    initialBestScore: 402420,
  });
  const restoreWindow = installWindow(async () => harness.sdk);
  try {
    const controller = new PlaydropController("highest_score");
    await controller.init();
    assert.equal(controller.getSnapshot().audioEnabled, true);
    const audioPolicyListener = harness.getAudioPolicyListener();
    assert.ok(audioPolicyListener);
    audioPolicyListener({ enabled: false, reason: "user_preference" });
    assert.equal(controller.getSnapshot().audioEnabled, false);
  } finally {
    restoreWindow();
  }
});
