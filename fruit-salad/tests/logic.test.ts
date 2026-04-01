import test from "node:test";
import assert from "node:assert/strict";

import {
  DANGER_ROW,
  SINK_ROWS,
  applyShotAtSlot,
  cloneBoard,
  collectSupportedCells,
  countOccupied,
  createEmptyBoard,
  createInitialState,
  isAttachable,
  listAttachableSlots,
  previewShotAtSlot,
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
  board[3]![3] = "jade";

  const state: GameState = {
    ...createInitialState(9),
    board,
    currentShot: "gold",
    reserveShot: "jade",
    shotsUntilSink: 3,
  };

  const result = applyShotAtSlot(state, { row: 1, col: 1 });
  assert.equal(result.popped.length >= 3, true);
  assert.equal(result.dropped.length, 2);
  assert.equal(result.state.score > 0, true);
  assert.deepEqual(result.dropped, [
    { row: 1, col: 3, color: "jade" },
    { row: 3, col: 3, color: "jade" },
  ]);
});

test("branch support is frozen at impact time during elimination", () => {
  const board = createEmptyBoard();
  board[1]![2] = "gold";
  board[1]![3] = "gold";
  board[2]![3] = "jade";

  const state: GameState = {
    ...createInitialState(12),
    board,
    currentShot: "gold",
    reserveShot: "jade",
    shotsUntilSink: 4,
  };

  const result = applyShotAtSlot(state, { row: 2, col: 2 });
  assert.equal(result.popped.length, 3);
  assert.deepEqual(result.dropped, [{ row: 2, col: 3, color: "jade" }]);
});

test("previewShotAtSlot exposes structural drops without mutating the board", () => {
  const board = createEmptyBoard();
  board[0]![2] = "gold";
  board[0]![3] = "gold";
  board[1]![2] = "gold";
  board[1]![3] = "jade";
  board[3]![3] = "jade";

  const state: GameState = {
    ...createInitialState(9),
    board,
    currentShot: "gold",
    reserveShot: "jade",
    shotsUntilSink: 3,
  };

  const before = cloneBoard(board);
  const preview = previewShotAtSlot(state, { row: 1, col: 1 });
  assert.equal(preview.popped.length >= 3, true);
  assert.equal(preview.dropped.length, 2);
  assert.equal(preview.willSink, false);
  assert.deepEqual(board, before);
});

test("the sink timer shifts the canopy down and can end the run", () => {
  const state = createInitialState(10);
  const board = cloneBoard(state.board);
  board[DANGER_ROW - 1]![6] = "plum";
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

test("previewShotAtSlot reports an imminent row drop", () => {
  const state = createInitialState(10);
  const custom: GameState = {
    ...state,
    shotsUntilSink: 1,
  };
  const target = listAttachableSlots(custom.board).find((slot) => slot.row === 0 && slot.col === 0)!;
  const preview = previewShotAtSlot(custom, target);
  assert.equal(preview.willSink, true);
  assert.equal(preview.sinkSteps, SINK_ROWS);
});

test("sink top-up leaves no unsupported floating fruit in the final board", () => {
  const board = createEmptyBoard();
  board[0]![3] = "gold";
  board[1]![3] = "gold";
  board[2]![3] = "jade";
  board[2]![4] = "jade";
  board[3]![4] = "jade";

  const state: GameState = {
    ...createInitialState(3),
    board,
    currentShot: "gold",
    reserveShot: "coral",
    shotsUntilSink: 1,
  };

  const result = applyShotAtSlot(state, { row: 1, col: 2 });
  const supported = collectSupportedCells(result.state.board);
  assert.equal(result.sankLine, true);
  assert.equal(result.injectedWave, true);
  assert.equal(supported.size, countOccupied(result.state.board));
});

test("applyShotAtSlot exposes the board before an injected refill wave", () => {
  const board = createEmptyBoard();
  board[0]![0] = "gold";
  board[0]![1] = "gold";
  board[1]![0] = "gold";

  const state: GameState = {
    ...createInitialState(1),
    board,
    currentShot: "gold",
    reserveShot: "coral",
    shotsUntilSink: 4,
  };

  const result = applyShotAtSlot(state, { row: 1, col: 1 });
  assert.equal(result.injectedWave, true);
  assert.equal(result.boardBeforeRefill !== null, true);
  assert.equal(result.dropped.length, 0);
  assert.equal(result.boardBeforeRefill?.flat().filter(Boolean).length, 0);
  assert.equal(result.state.board.flat().filter(Boolean).length > 0, true);
});

test("supported cells can originate from top, side frame, and anchor branches", () => {
  const board = createEmptyBoard();
  board[0]![0] = "gold";
  board[2]![0] = "jade";
  board[2]![1] = "jade";
  board[3]![1] = "jade";
  board[2]![3] = "coral";
  board[2]![5] = "plum";
  board[3]![5] = "plum";
  board[5]![3] = "cyan";

  const supported = collectSupportedCells(board);

  assert.equal(supported.has("0:0"), true);
  assert.equal(supported.has("2:0"), true);
  assert.equal(supported.has("2:1"), true);
  assert.equal(supported.has("3:1"), true);
  assert.equal(supported.has("2:3"), true);
  assert.equal(supported.has("2:5"), true);
  assert.equal(supported.has("3:5"), true);
  assert.equal(supported.has("5:3"), false);
});

test("shotsPerSink tightens as the run progresses", () => {
  assert.equal(shotsPerSink(0), 5);
  assert.equal(shotsPerSink(20), 4);
  assert.equal(shotsPerSink(60), 3);
});
