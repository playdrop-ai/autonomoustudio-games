import test from "node:test";
import assert from "node:assert/strict";

import { shouldShowRestartInterstitial } from "../src/runtime-helpers.ts";

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
      previewModeActive: true,
      screen: "gameover",
      runMoves: 20,
      runElapsedMs: 60_000,
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
