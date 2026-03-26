import test from "node:test";
import assert from "node:assert/strict";

import {
  applyMove,
  ashBurstCountForMove,
  ashIntervalForMove,
  ASH_INTERVAL,
  DOUBLE_ASH_START,
  ENDGAME_ASH_INTERVAL,
  ENDGAME_ASH_START,
  MIDGAME_ASH_INTERVAL,
  MIDGAME_ASH_START,
  SUDDEN_DEATH_ASH_BURST,
  SUDDEN_DEATH_ASH_INTERVAL,
  SUDDEN_DEATH_ASH_START,
  boardKinds,
  countAsh,
  createBoardFromKinds,
  createInitialState,
  findGroups,
  type GameState,
} from "../src/game/logic.ts";

function stateFromKinds(kinds: ReturnType<typeof boardKinds>, seed = 1): GameState {
  const created = createBoardFromKinds(kinds);
  return {
    board: created.board,
    nextId: created.nextId,
    score: 0,
    moves: 0,
    ashCount: countAsh(created.board),
    rngState: seed,
    gameOver: false,
  };
}

test("initial state starts without ash and without matches", () => {
  const state = createInitialState(123);
  assert.equal(state.ashCount, 0);
  for (const row of boardKinds(state.board)) {
    assert.equal(row.length, 5);
  }
});

test("row shifts wrap the selected line", () => {
  const state = stateFromKinds([
    ["sun", "moon", "wave", "leaf", "ember"],
    ["sun", "moon", "wave", "leaf", "ember"],
    ["sun", "moon", "wave", "leaf", "ember"],
    ["sun", "moon", "wave", "leaf", "ember"],
    ["sun", "moon", "wave", "leaf", "ember"],
    ["sun", "moon", "wave", "leaf", "ember"],
  ]);
  const result = applyMove(state, { axis: "row", index: 0, direction: 1 });
  assert.deepEqual(boardKinds(result.stages[0]!.after)[0], ["ember", "sun", "moon", "wave", "leaf"]);
});

test("clears adjacent ash and awards score", () => {
  const state = stateFromKinds(
    [
      ["moon", "sun", "leaf", "ember", "wave"],
      ["wave", "ash", "sun", "moon", "leaf"],
      ["leaf", "wave", "sun", "ember", "moon"],
      ["ember", "leaf", "wave", "moon", "sun"],
      ["leaf", "ember", "moon", "wave", "sun"],
      ["wave", "leaf", "ember", "moon", "sun"],
    ],
    17,
  );
  const result = applyMove(state, { axis: "row", index: 0, direction: 1 });
  const clearStage = result.stages.find((stage) => stage.kind === "clear");
  assert.ok(clearStage);
  assert.ok(clearStage.kind === "clear");
  assert.ok(clearStage.cleansed.some((pos) => pos.row === 1 && pos.col === 1));
  assert.ok(result.state.score > 0);
});

test("spawns ash every fourth move", () => {
  let state = stateFromKinds([
    ["sun", "moon", "wave", "leaf", "ember"],
    ["moon", "wave", "leaf", "ember", "sun"],
    ["wave", "leaf", "ember", "sun", "moon"],
    ["leaf", "ember", "sun", "moon", "wave"],
    ["ember", "sun", "moon", "wave", "leaf"],
    ["sun", "moon", "wave", "leaf", "ember"],
  ]);
  for (let move = 0; move < ASH_INTERVAL; move += 1) {
    state = applyMove(state, { axis: "row", index: move % 6, direction: 1 }).state;
  }
  assert.ok(state.ashCount >= 1);
});

test("ash spread ramps up later in the run", () => {
  assert.equal(ashIntervalForMove(4), ASH_INTERVAL);
  assert.equal(ashIntervalForMove(MIDGAME_ASH_START), MIDGAME_ASH_INTERVAL);
  assert.equal(ashIntervalForMove(ENDGAME_ASH_START), ENDGAME_ASH_INTERVAL);
  assert.equal(ashIntervalForMove(SUDDEN_DEATH_ASH_START), SUDDEN_DEATH_ASH_INTERVAL);
  assert.equal(ashBurstCountForMove(4), 1);
  assert.equal(ashBurstCountForMove(MIDGAME_ASH_START), 1);
  assert.equal(ashBurstCountForMove(DOUBLE_ASH_START), 2);
  assert.equal(ashBurstCountForMove(SUDDEN_DEATH_ASH_START), SUDDEN_DEATH_ASH_BURST);
});

test("finds every orthogonally connected group from the screenshot case", () => {
  const board = createBoardFromKinds([
    ["leaf", "wave", "moon", "sun", "ember"],
    ["sun", "moon", "leaf", "leaf", "leaf"],
    ["ember", "ember", "ember", "ember", "leaf"],
    ["wave", "sun", "moon", "wave", "wave"],
    ["sun", "moon", "moon", "moon", "leaf"],
    ["ash", "leaf", "wave", "wave", "wave"],
  ]).board;

  const groupSizes = findGroups(board)
    .map((group) => group.length)
    .sort((left, right) => left - right);

  assert.deepEqual(groupSizes, [3, 4, 4, 4]);
});
