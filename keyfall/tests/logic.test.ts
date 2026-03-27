import test from "node:test";
import assert from "node:assert/strict";

import { applyLanePress, createInitialState, getUpcomingClusters, startRun, updateGame } from "../src/game/logic.ts";

test("starting a run generates preview clusters", () => {
  let state = createInitialState(4, { bestScore: 0, bestCombo: 0 });
  state = startRun(state);
  const preview = getUpcomingClusters(state, 3);
  assert.equal(state.screen, "playing");
  assert.equal(preview.length, 3);
});

test("successful hit increases score and combo", () => {
  let state = startRun(createInitialState(2, { bestScore: 0, bestCombo: 0 }));
  const note = state.notes[0];
  const result = applyLanePress(state, note.lanes[0], note.timeMs);
  state = result.state;
  assert.ok(state.score > 0);
  assert.equal(state.combo, 1);
});

test("missed note removes one life", () => {
  let state = startRun(createInitialState(6, { bestScore: 0, bestCombo: 0 }));
  const note = state.notes[0];
  const result = updateGame(state, note.timeMs + 160, new Set());
  state = result.state;
  assert.equal(state.lives, 3);
});
