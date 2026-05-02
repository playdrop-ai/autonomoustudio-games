import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGameOverSubtitle,
  shouldShowRestartInterstitial,
  shouldSnapbackDragOnHudPointerUp,
  waitForRestartInterstitial,
} from "../src/runtime-helpers.ts";

test("buildGameOverSubtitle surfaces first_recorded copy", () => {
  const subtitle = buildGameOverSubtitle({
    reason: "no_moves",
    result: "first_recorded",
    finalScore: 2400,
    previousRank: null,
    nextRank: 41,
  });

  assert.equal(subtitle, "first recorded score");
});

test("shouldSnapbackDragOnHudPointerUp preserves drag cleanup for HUD releases", () => {
  assert.equal(
    shouldSnapbackDragOnHudPointerUp({
      hasDrag: true,
      dragPreviewOffsetPx: 28,
    }),
    true,
  );
  assert.equal(
    shouldSnapbackDragOnHudPointerUp({
      hasDrag: true,
      dragPreviewOffsetPx: 0,
    }),
    false,
  );
  assert.equal(
    shouldSnapbackDragOnHudPointerUp({
      hasDrag: false,
      dragPreviewOffsetPx: 28,
    }),
    false,
  );
});

test("shouldShowRestartInterstitial requires a meaningful run and cooldown", () => {
  assert.equal(
    shouldShowRestartInterstitial({
      previewModeActive: false,
      screen: "gameover",
      runMoves: 12,
      runElapsedMs: 20_000,
      shownThisRun: false,
      lastInterstitialShownAt: null,
      sessionStartedAt: 0,
      now: 200_000,
      minRunMoves: 12,
      minRunMs: 45_000,
      cooldownMs: 180_000,
    }),
    true,
  );
  assert.equal(
    shouldShowRestartInterstitial({
      previewModeActive: false,
      screen: "gameover",
      runMoves: 4,
      runElapsedMs: 20_000,
      shownThisRun: false,
      lastInterstitialShownAt: null,
      sessionStartedAt: 0,
      now: 200_000,
      minRunMoves: 12,
      minRunMs: 45_000,
      cooldownMs: 180_000,
    }),
    false,
  );
  assert.equal(
    shouldShowRestartInterstitial({
      previewModeActive: false,
      screen: "gameover",
      runMoves: 20,
      runElapsedMs: 60_000,
      shownThisRun: false,
      lastInterstitialShownAt: 100_000,
      sessionStartedAt: 0,
      now: 200_000,
      minRunMoves: 12,
      minRunMs: 45_000,
      cooldownMs: 180_000,
    }),
    false,
  );
});

test("waitForRestartInterstitial times out and ignores a late host rejection", async () => {
  let rejectInterstitial: ((error: Error) => void) | null = null;
  const interstitial = new Promise<"dismissed">((_resolve, reject) => {
    rejectInterstitial = reject;
  });
  let timeoutCallback: (() => void) | null = null;
  let clearedTimeouts = 0;
  const resultPromise = waitForRestartInterstitial(interstitial, 1000, {
    setTimeout: (callback, delayMs) => {
      assert.equal(delayMs, 1000);
      timeoutCallback = callback;
      return 1 as ReturnType<typeof setTimeout>;
    },
    clearTimeout: () => {
      clearedTimeouts += 1;
    },
  });

  timeoutCallback?.();

  assert.deepEqual(await resultPromise, { status: "timeout" });
  assert.equal(clearedTimeouts, 0);
  rejectInterstitial?.(new Error("late ad callback failed"));
  await Promise.resolve();
});
