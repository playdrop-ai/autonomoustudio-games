import test from "node:test";
import assert from "node:assert/strict";

import {
  applyMove,
  ashBurstCountForMove,
  ashIntervalForMove,
  ASH_EVERY_MOVE_END,
  ASH_EVERY_TWO_END,
  ASH_GRACE_MOVES,
  DOUBLE_ASH_END,
  TRIPLE_ASH_START,
  boardKinds,
  countAsh,
  createBoardFromKinds,
  createInitialState,
  findGroups,
  getPlayableMoves,
  hasPlayableMove,
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
    gameOverReason: null,
  };
}

test("initial state starts without ash and without matches", () => {
  const state = createInitialState(123);
  assert.equal(state.ashCount, 0);
  assert.equal(hasPlayableMove(state.board), true);
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
  ]);
  const result = applyMove(state, { axis: "row", index: 0, direction: 1 });
  assert.deepEqual(boardKinds(result.stages[0]!.after)[0], ["ember", "sun", "moon", "wave", "leaf"]);
});

test("shift stage keeps the drag release offset for commit animation", () => {
  const state = stateFromKinds([
    ["moon", "sun", "leaf", "ember", "wave"],
    ["wave", "ash3", "sun", "moon", "leaf"],
    ["leaf", "wave", "sun", "ember", "moon"],
    ["ember", "leaf", "wave", "moon", "sun"],
    ["leaf", "ember", "moon", "wave", "sun"],
  ]);

  const result = applyMove(state, { axis: "row", index: 0, direction: 1 }, { startOffsetPx: 38 });
  assert.equal(result.stages[0]?.kind, "shift");
  assert.equal(result.stages[0]?.startOffsetPx, 38);
});

test("damages adjacent ash by one stage and awards score", () => {
  const state = stateFromKinds(
    [
      ["moon", "sun", "leaf", "ember", "wave"],
      ["wave", "ash3", "sun", "moon", "leaf"],
      ["leaf", "wave", "sun", "ember", "moon"],
      ["ember", "leaf", "wave", "moon", "sun"],
      ["leaf", "ember", "moon", "wave", "sun"],
    ],
    17,
  );
  const result = applyMove(state, { axis: "row", index: 0, direction: 1 });
  const clearStage = result.stages.find((stage) => stage.kind === "clear");
  assert.ok(clearStage);
  assert.ok(clearStage.kind === "clear");
  assert.equal(result.state.board[1]![1]!.kind, "ash2");
  assert.ok(clearStage.damaged.some((pos) => pos.row === 1 && pos.col === 1));
  assert.equal(clearStage.cleansed.some((pos) => pos.row === 1 && pos.col === 1), false);
  assert.ok(result.state.score > 0);
});

test("ash takes three neighboring clears to purge fully", () => {
  const ash3Result = applyMove(
    stateFromKinds(
      [
        ["moon", "sun", "leaf", "ember", "wave"],
        ["wave", "ash3", "sun", "moon", "leaf"],
        ["leaf", "wave", "sun", "ember", "moon"],
        ["ember", "leaf", "wave", "moon", "sun"],
        ["leaf", "ember", "moon", "wave", "sun"],
      ],
      17,
    ),
    { axis: "row", index: 0, direction: 1 },
  );
  assert.equal(ash3Result.state.board[1]![1]!.kind, "ash2");

  const ash2Result = applyMove(
    stateFromKinds(
      [
        ["moon", "sun", "leaf", "ember", "wave"],
        ["wave", "ash2", "sun", "moon", "leaf"],
        ["leaf", "wave", "sun", "ember", "moon"],
        ["ember", "leaf", "wave", "moon", "sun"],
        ["leaf", "ember", "moon", "wave", "sun"],
      ],
      17,
    ),
    { axis: "row", index: 0, direction: 1 },
  );
  assert.equal(ash2Result.state.board[1]![1]!.kind, "ash1");

  const ash1Result = applyMove(
    stateFromKinds(
      [
        ["moon", "sun", "leaf", "ember", "wave"],
        ["wave", "ash1", "sun", "moon", "leaf"],
        ["leaf", "wave", "sun", "ember", "moon"],
        ["ember", "leaf", "wave", "moon", "sun"],
        ["leaf", "ember", "moon", "wave", "sun"],
      ],
      17,
    ),
    { axis: "row", index: 0, direction: 1 },
  );
  const clearStage = ash1Result.stages.find((stage) => stage.kind === "clear");
  assert.ok(clearStage);
  assert.ok(clearStage.kind === "clear");
  assert.ok(clearStage.damaged.some((pos) => pos.row === 1 && pos.col === 1));
  assert.ok(clearStage.cleansed.some((pos) => pos.row === 1 && pos.col === 1));
  assert.notEqual(ash1Result.state.board[1]![1]!.kind, "ash1");
});

test("does not spawn ash during the opening grace period", () => {
  const state = {
    ...stateFromKinds([
      ["moon", "sun", "leaf", "ember", "wave"],
      ["wave", "ash3", "sun", "moon", "leaf"],
      ["leaf", "wave", "sun", "ember", "moon"],
      ["ember", "leaf", "wave", "moon", "sun"],
      ["leaf", "ember", "moon", "wave", "sun"],
    ]),
    moves: ASH_GRACE_MOVES - 1,
  };
  const result = applyMove(state, { axis: "row", index: 0, direction: 1 });

  const ashStages = result.stages.filter((stage) => stage.kind === "ash");
  assert.equal(ashStages.length, 0);
});

test("ash spread ramps up later in the run", () => {
  assert.equal(ashIntervalForMove(ASH_GRACE_MOVES), 0);
  assert.equal(ashIntervalForMove(ASH_GRACE_MOVES + 1), 2);
  assert.equal(ashIntervalForMove(ASH_EVERY_TWO_END + 1), 1);
  assert.equal(ashBurstCountForMove(ASH_GRACE_MOVES), 0);
  assert.equal(ashBurstCountForMove(ASH_GRACE_MOVES + 1), 1);
  assert.equal(ashBurstCountForMove(7), 0);
  assert.equal(ashBurstCountForMove(ASH_EVERY_TWO_END), 1);
  assert.equal(ashBurstCountForMove(ASH_EVERY_TWO_END + 1), 1);
  assert.equal(ashBurstCountForMove(ASH_EVERY_MOVE_END + 1), 2);
  assert.equal(ashBurstCountForMove(DOUBLE_ASH_END), 2);
  assert.equal(ashBurstCountForMove(TRIPLE_ASH_START), 3);
});

test("staged ash still blocks match detection", () => {
  const board = createBoardFromKinds([
    ["sun", "sun", "sun", "moon", "wave"],
    ["moon", "ash2", "moon", "leaf", "ember"],
    ["leaf", "moon", "ember", "wave", "sun"],
    ["ember", "leaf", "wave", "moon", "leaf"],
    ["wave", "ember", "leaf", "sun", "moon"],
  ]).board;

  const groups = findGroups(board).map((group) => group.map((pos) => `${pos.row}:${pos.col}`));
  assert.equal(groups.some((group) => group.includes("1:0") || group.includes("1:2")), false);
});

test("finds every orthogonally connected group from the screenshot case", () => {
  const board = createBoardFromKinds([
    ["leaf", "wave", "moon", "sun", "ember"],
    ["sun", "moon", "leaf", "leaf", "leaf"],
    ["ember", "ember", "ember", "ember", "leaf"],
    ["wave", "sun", "moon", "wave", "wave"],
    ["sun", "moon", "moon", "moon", "leaf"],
  ]).board;

  const groupSizes = findGroups(board)
    .map((group) => group.length)
    .sort((left, right) => left - right);

  assert.deepEqual(groupSizes, [4, 4, 4]);
});

test("detects a dead board with no scoring moves left", () => {
  const board = createBoardFromKinds([
    ["moon", "sun", "moon", "sun", "wave"],
    ["leaf", "leaf", "moon", "ember", "ember"],
    ["sun", "ember", "sun", "wave", "moon"],
    ["wave", "moon", "leaf", "moon", "ember"],
    ["wave", "sun", "leaf", "ember", "leaf"],
  ]).board;

  assert.equal(findGroups(board).length, 0);
  assert.equal(hasPlayableMove(board), false);
});

test("invalid moves return no stages and do not change state", () => {
  const state = stateFromKinds([
    ["moon", "sun", "moon", "sun", "wave"],
    ["leaf", "leaf", "moon", "ember", "ember"],
    ["sun", "ember", "sun", "wave", "moon"],
    ["wave", "moon", "leaf", "moon", "ember"],
    ["wave", "sun", "leaf", "ember", "leaf"],
  ]);

  const result = applyMove(state, { axis: "row", index: 0, direction: 1 });

  assert.equal(getPlayableMoves(state.board).length, 0);
  assert.equal(result.stages.length, 0);
  assert.equal(result.state, state);
});

test("ends the run when a move leaves no scoring moves", () => {
  const state = stateFromKinds([
    ["leaf", "sun", "ember", "leaf", "moon"],
    ["leaf", "moon", "wave", "sun", "sun"],
    ["moon", "wave", "leaf", "wave", "wave"],
    ["moon", "sun", "wave", "sun", "moon"],
    ["leaf", "moon", "wave", "ember", "sun"],
  ]);

  const result = applyMove(state, { axis: "row", index: 3, direction: 1 });

  assert.equal(result.state.gameOver, true);
  assert.equal(result.state.gameOverReason, "no_moves");
});

test("ten ash tiles no longer cause game over on their own", () => {
  const state = stateFromKinds([
    ["ash3", "ash2", "ash1", "ash3", "ash2"],
    ["ash2", "ash1", "ash3", "ash2", "ash1"],
    ["moon", "wave", "leaf", "wave", "wave"],
    ["moon", "sun", "wave", "sun", "moon"],
    ["leaf", "moon", "wave", "ember", "sun"],
  ]);

  const result = applyMove(state, { axis: "row", index: 2, direction: 1 });

  assert.equal(countAsh(state.board), 10);
  assert.equal(result.state.gameOverReason, null);
});
