import test from "node:test";
import assert from "node:assert/strict";

import { buildGameOverSubtitle, shouldSnapbackDragOnHudPointerUp } from "../src/runtime-helpers.ts";

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
