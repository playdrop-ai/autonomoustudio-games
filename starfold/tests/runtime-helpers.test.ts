import test from "node:test";
import assert from "node:assert/strict";

import {
  buildGameOverSubtitle,
  shouldShowRestartInterstitial,
  shouldSnapbackDragOnHudPointerUp,
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
