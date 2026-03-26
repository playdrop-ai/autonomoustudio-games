import test from "node:test";
import assert from "node:assert/strict";

import {
  applyMove,
  ASH_INTERVAL,
  boardKinds,
  countAsh,
  createBoardFromKinds,
  createInitialState,
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
