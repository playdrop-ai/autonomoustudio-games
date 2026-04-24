import test from "node:test";
import assert from "node:assert/strict";

import { PlaydropController } from "../src/platform.ts";

function installWindow(playdropInit: () => Promise<unknown>) {
  const previousWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  (globalThis as typeof globalThis & { window: Record<string, unknown> }).window = {
    playdrop: {
      init: playdropInit,
      host: {
        error: () => undefined,
      },
    },
    location: {
      href: "https://example.test/?playdrop_channel=dev",
    },
  };
  return () => {
    if (previousWindow === undefined) {
      delete (globalThis as typeof globalThis & { window?: unknown }).window;
      return;
    }
    (globalThis as typeof globalThis & { window: unknown }).window = previousWindow;
  };
}

test("completeRun submits score for logged-in play sessions without achievements", async () => {
  const submitted: Array<{ key: string; score: number }> = [];
  let audioPolicyListener: ((state: { enabled: boolean; reason: string }) => void) | null = null;
  let readyCalled = false;
  const sdk = {
    host: {
      phase: "play" as const,
      audioEnabled: true,
      isPaused: false,
      ready: () => {
        readyCalled = true;
      },
      onPhaseChange: () => undefined,
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
    me: {
      isLoggedIn: true,
      onAuthChange: () => undefined,
    },
    leaderboards: {
      submitScore: async (key: string, score: number) => {
        submitted.push({ key, score });
      },
      get: async () => ({
        leaderboard: {
          top: [],
        },
      }),
    },
  };

  const restoreWindow = installWindow(async () => sdk);
  try {
    const controller = new PlaydropController("highest_score");
    await controller.init();
    controller.queue({
      score: 2400,
    });
    await controller.completeRun();
    controller.markReady();

    assert.deepEqual(submitted, [{ key: "highest_score", score: 2400 }]);
    assert.equal(controller.getSnapshot().pendingMeta, false);
    assert.equal(typeof audioPolicyListener, "function");
    assert.equal(readyCalled, true);
  } finally {
    restoreWindow();
  }
});

test("audio policy callback updates snapshot from host policy object", async () => {
  let audioPolicyListener: ((state: { enabled: boolean; reason: string }) => void) | null = null;
  const sdk = {
    host: {
      phase: "play" as const,
      audioEnabled: true,
      isPaused: false,
      ready: () => undefined,
      onPhaseChange: () => undefined,
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
    me: {
      isLoggedIn: true,
      onAuthChange: () => undefined,
    },
    leaderboards: {
      submitScore: async () => undefined,
      get: async () => ({
        leaderboard: {
          top: [],
        },
      }),
    },
  };

  const restoreWindow = installWindow(async () => sdk);
  try {
    const controller = new PlaydropController("highest_score");
    await controller.init();
    assert.equal(controller.getSnapshot().audioEnabled, true);
    assert.ok(audioPolicyListener);
    audioPolicyListener({ enabled: false, reason: "user_preference" });
    assert.equal(controller.getSnapshot().audioEnabled, false);
  } finally {
    restoreWindow();
  }
});

test("anonymous sessions skip leaderboard refresh until login", async () => {
  let getCalled = false;
  let authChangeListener: ((state: { isLoggedIn: boolean }) => void) | null = null;
  const sdk = {
    host: {
      phase: "play" as const,
      audioEnabled: true,
      isPaused: false,
      ready: () => undefined,
      onPhaseChange: () => undefined,
      onAudioPolicyChange: () => undefined,
      onPause: () => undefined,
      onResume: () => undefined,
    },
    app: {
      authMode: "OPTIONAL" as const,
    },
    me: {
      isLoggedIn: false,
      onAuthChange: (cb: (state: { isLoggedIn: boolean }) => void) => {
        authChangeListener = cb;
        return () => undefined;
      },
    },
    leaderboards: {
      submitScore: async () => undefined,
      get: async () => {
        getCalled = true;
        return {
          leaderboard: {
            top: [],
          },
        };
      },
    },
  };

  const restoreWindow = installWindow(async () => sdk);
  try {
    const controller = new PlaydropController("highest_score");
    await controller.init();
    assert.equal(getCalled, false);

    sdk.me.isLoggedIn = true;
    authChangeListener?.({ isLoggedIn: true });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(getCalled, true);
  } finally {
    restoreWindow();
  }
});
