import test from "node:test";
import assert from "node:assert/strict";

import {
  DANGER_ROW,
  applyShotAtSlot,
  cloneBoard,
  createEmptyBoard,
  createInitialState,
  isAttachable,
  listAttachableSlots,
  shotsPerSink,
  swapShots,
  type GameState,
} from "../src/game/logic.ts";

test("initial state creates a playable canopy and queue", () => {
  const state = createInitialState(7);
  assert.equal(state.score, 0);
  assert.equal(state.gameOver, false);
  assert.equal(state.currentShot.length > 0, true);
  assert.equal(state.reserveShot.length > 0, true);
  assert.equal(listAttachableSlots(state.board).length > 0, true);
});

test("swapShots exchanges current and reserve", () => {
  const state = createInitialState(8);
  const swapped = swapShots(state);
  assert.equal(swapped.currentShot, state.reserveShot);
  assert.equal(swapped.reserveShot, state.currentShot);
});

test("attachable slots include top cells and neighbors of occupied cells only", () => {
  const board = createEmptyBoard();
  board[0]![3] = "gold";
  const slots = listAttachableSlots(board);
  assert.equal(slots.some((slot) => slot.row === 0 && slot.col === 0), true);
  assert.equal(slots.some((slot) => slot.row === 1 && slot.col === 3), true);
  assert.equal(isAttachable(board, { row: 4, col: 4 }), false);
});

test("matching three pops the cluster and drops unsupported lanterns", () => {
  const board = createEmptyBoard();
  board[0]![2] = "gold";
  board[0]![3] = "gold";
  board[1]![2] = "gold";
  board[1]![3] = "jade";

  const state: GameState = {
    ...createInitialState(9),
    board,
    currentShot: "gold",
    reserveShot: "jade",
    shotsUntilSink: 3,
  };

  const result = applyShotAtSlot(state, { row: 1, col: 1 });
  assert.equal(result.popped.length >= 3, true);
  assert.equal(result.dropped.length, 1);
  assert.equal(result.state.score > 0, true);
  assert.deepEqual(result.dropped[0], { row: 1, col: 3, color: "jade" });
});

test("the sink timer shifts the canopy down and can end the run", () => {
  const state = createInitialState(10);
  const board = cloneBoard(state.board);
  board[DANGER_ROW - 1]![3] = "plum";
  const custom: GameState = {
    ...state,
    board,
    currentShot: "jade",
    reserveShot: "gold",
    shotsUntilSink: 1,
  };

  const target = listAttachableSlots(custom.board).find((slot) => slot.row === 0 && slot.col === 0)!;
  const result = applyShotAtSlot(custom, target);
  assert.equal(result.sankLine, true);
  assert.equal(result.state.gameOver, true);
});

test("shotsPerSink tightens as the run progresses", () => {
  assert.equal(shotsPerSink(0), 5);
  assert.equal(shotsPerSink(20), 4);
  assert.equal(shotsPerSink(60), 3);
});
