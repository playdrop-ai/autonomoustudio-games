import test from "node:test";
import assert from "node:assert/strict";

import { createInitialState, createStateFromLayout, progressPercent, revealCell, stepGame, toggleFlag } from "../src/game/sim";

test("generated boards keep a safe route from source to relay", () => {
  const state = createInitialState("live", 12345);
  const relayCell = state.cells[state.relayIndex];
  assert.ok(relayCell);
  assert.equal(relayCell.isHazard, false);
  assert.equal(state.cells[state.sourceIndex]?.isHazard, false);
});

test("revealing a zero floods its safe neighborhood", () => {
  const state = createStateFromLayout(
    [
      "....",
      "....",
      "..#.",
      "....",
    ],
    { difficultyKey: "warm" },
  );

  assert.equal(revealCell(state, 0, 1), true);
  assert.ok(state.revealedSafeCount > 1);
});

test("flagged cells stay covered until unflagged", () => {
  const state = createStateFromLayout(
    [
      ".#.",
      "...",
      "...",
    ],
    { difficultyKey: "warm" },
  );

  assert.equal(toggleFlag(state, 1, 0), true);
  assert.equal(revealCell(state, 1, 0), false);
  assert.equal(toggleFlag(state, 1, 0), true);
  assert.equal(revealCell(state, 1, 0), true);
  assert.equal(state.cells[1]?.burnt, true);
});

test("third overload surge loses the run", () => {
  const state = createStateFromLayout(
    [
      ".##",
      "...",
      ".##",
    ],
    { difficultyKey: "warm" },
  );

  assert.equal(revealCell(state, 1, 0), true);
  assert.equal(revealCell(state, 2, 0), true);
  assert.equal(revealCell(state, 1, 2), true);
  assert.equal(state.runState, "lost");
});

test("revealing a connected safe route wins the board", () => {
  const state = createStateFromLayout(
    [
      "...",
      ".#.",
      "...",
    ],
    { difficultyKey: "warm" },
  );

  assert.equal(revealCell(state, 1, 0), true);
  assert.equal(revealCell(state, 2, 0), true);
  assert.equal(revealCell(state, 2, 1), true);
  assert.equal(state.runState, "won");
  assert.ok(progressPercent(state) > 0);
});

test("elapsed time advances only while the run is active", () => {
  const state = createInitialState("warm", 1);
  stepGame(state, 1000);
  assert.equal(state.elapsedMs, 1000);
  state.runState = "won";
  stepGame(state, 1000);
  assert.equal(state.elapsedMs, 1000);
});
