import test from "node:test";
import assert from "node:assert/strict";

import {
  applyMove,
  ASH_ALWAYS_SPAWN_AFTER,
  ASH_SPAWN_TURNS,
  boardKinds,
  boardStateKinds,
  comboMultiplierForDepth,
  countAsh,
  createBoardFromKinds,
  createBoardFromSpecs,
  createInitialState,
  findGroups,
  getPlayableMoves,
  hasPlayableMove,
  shouldSpawnAshOnMove,
  type GameState,
  type SparseBoard,
  type TileSpec,
  type TurnResult,
} from "../src/game/logic.ts";

function stateFromSpecs(specs: TileSpec[][], seed = 1): GameState {
  const created = createBoardFromSpecs(specs);
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

function stateFromKinds(kinds: ReturnType<typeof boardKinds>, seed = 1): GameState {
  return stateFromSpecs(kinds, seed);
}

function getClearStage(result: TurnResult) {
  const stage = result.stages.find((entry) => entry.kind === "clear");
  assert.ok(stage);
  assert.equal(stage.kind, "clear");
  return stage;
}

function getAshStages(result: TurnResult) {
  return result.stages.filter((stage): stage is Extract<TurnResult["stages"][number], { kind: "ash" }> => stage.kind === "ash");
}

function sparseNullPositions(board: SparseBoard): string[] {
  const positions: string[] = [];
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row]!.length; col += 1) {
      if (board[row]![col] === null) {
        positions.push(`${row}:${col}`);
      }
    }
  }
  return positions.sort();
}

test("initial state starts playable without corruption or matches", () => {
  const state = createInitialState(123);
  assert.equal(state.ashCount, 0);
  assert.equal(hasPlayableMove(state.board), true);
  assert.equal(findGroups(state.board).length, 0);
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
  const state = stateFromSpecs([
    ["moon", "sun", "leaf", "ember", "wave"],
    ["wave", "ash5", "sun", "moon", "leaf"],
    ["leaf", "wave", "sun", "ember", "moon"],
    ["ember", "leaf", "wave", "moon", "sun"],
    ["leaf", "ember", "moon", "wave", "sun"],
  ]);

  const result = applyMove(state, { axis: "row", index: 0, direction: 1 }, { startOffsetPx: 38 });
  assert.equal(result.stages[0]?.kind, "shift");
  assert.equal(result.stages[0]?.startOffsetPx, 38);
});

test("three matches damage adjacent ash by one stage and award score", () => {
  const state = stateFromSpecs(
    [
      ["moon", "sun", "leaf", "ember", "wave"],
      ["wave", "ash5", "sun", "moon", "leaf"],
      ["leaf", "wave", "sun", "ember", "moon"],
      ["ember", "leaf", "wave", "moon", "sun"],
      ["leaf", "ember", "moon", "wave", "sun"],
    ],
    17,
  );

  const result = applyMove(state, { axis: "row", index: 0, direction: 1 });
  const clearStage = getClearStage(result);
  assert.equal(result.state.board[1]![1]!.kind, "ash4");
  assert.ok(clearStage.damaged.some((pos) => pos.row === 1 && pos.col === 1));
  assert.equal(clearStage.cleansed.some((pos) => pos.row === 1 && pos.col === 1), false);
  assert.ok(result.state.score > 0);
});

test("ash takes five neighboring hits to purge fully", () => {
  const baseBoard: TileSpec[][] = [
    ["moon", "sun", "leaf", "ember", "wave"],
    ["wave", "ash5", "sun", "moon", "leaf"],
    ["leaf", "wave", "sun", "ember", "moon"],
    ["ember", "leaf", "wave", "moon", "sun"],
    ["leaf", "ember", "moon", "wave", "sun"],
  ];

  const nextKinds = ["ash4", "ash3", "ash2", "ash1"] as const;
  for (const [index, expected] of nextKinds.entries()) {
    const state = stateFromSpecs([
      ...baseBoard.slice(0, 1),
      [{ kind: "wave" }, { kind: `ash${5 - index}` as const }, { kind: "sun" }, { kind: "moon" }, { kind: "leaf" }],
      ...baseBoard.slice(2),
    ]);
    const result = applyMove(state, { axis: "row", index: 0, direction: 1 });
    assert.equal(result.state.board[1]![1]!.kind, expected);
  }

  const finalState = stateFromSpecs([
    ["moon", "sun", "leaf", "ember", "wave"],
    ["wave", "ash1", "sun", "moon", "leaf"],
    ["leaf", "wave", "sun", "ember", "moon"],
    ["ember", "leaf", "wave", "moon", "sun"],
    ["leaf", "ember", "moon", "wave", "sun"],
  ]);
  const finalResult = applyMove(finalState, { axis: "row", index: 0, direction: 1 });
  const clearStage = getClearStage(finalResult);
  assert.ok(clearStage.cleansed.some((pos) => pos.row === 1 && pos.col === 1));
  assert.notEqual(finalResult.state.board[1]![1]!.kind, "ash1");
});

test("contaminated tiles are unmatchable and block group detection", () => {
  const board = createBoardFromSpecs([
    ["sun", { kind: "sun", contaminated: true }, "sun", "moon", "wave"],
    ["moon", "leaf", "moon", "leaf", "ember"],
    ["leaf", "moon", "ember", "wave", "sun"],
    ["ember", "leaf", "wave", "moon", "leaf"],
    ["wave", "ember", "leaf", "sun", "moon"],
  ]).board;

  const groups = findGroups(board).map((group) => group.map((pos) => `${pos.row}:${pos.col}`));
  assert.equal(groups.some((group) => group.includes("0:0") || group.includes("0:2")), false);
});

test("contaminated tiles restore from adjacent clears", () => {
  const state = stateFromSpecs(
    [
      ["moon", "sun", "leaf", "ember", "wave"],
      ["wave", { kind: "sun", contaminated: true }, "sun", "moon", "leaf"],
      ["leaf", "wave", "sun", "ember", "moon"],
      ["ember", "leaf", "wave", "moon", "sun"],
      ["leaf", "ember", "moon", "wave", "sun"],
    ],
    17,
  );

  const result = applyMove(state, { axis: "row", index: 0, direction: 1 });
  const clearStage = getClearStage(result);
  assert.deepEqual(boardStateKinds(result.state.board)[1]![1], "sun");
  assert.ok(clearStage.restored.some((pos) => pos.row === 1 && pos.col === 1));
});

test("four matches hit touched ash twice and restore touched contamination", () => {
  const state = stateFromSpecs(
    [
      ["leaf", "ash5", "wave", "ember", "wave"],
      ["ember", { kind: "wave", contaminated: true }, "sun", "leaf", "moon"],
      ["moon", "leaf", "sun", "ash4", "ember"],
      ["wave", "ember", "sun", "moon", "leaf"],
      ["leaf", "moon", "sun", "ember", "ash2"],
    ],
    17,
  );

  const result = applyMove(state, { axis: "col", index: 2, direction: -1 });
  const clearStage = getClearStage(result);

  assert.equal(clearStage.majorMatchSize, 4);
  assert.equal(result.state.board[0]![1]!.kind, "ash3");
  assert.equal(result.state.board[2]![3]!.kind, "ash2");
  assert.equal(result.state.board[1]![1]!.contaminated, false);
  assert.ok(clearStage.restored.some((pos) => pos.row === 1 && pos.col === 1));
});

test("five matches hit touched ash twice, chip the rest once, and restore all contamination", () => {
  const state = stateFromSpecs(
    [
      ["ash1", "leaf", "wave", "leaf", "moon"],
      ["leaf", "wave", "ember", "moon", "sun"],
      ["moon", "ash5", "moon", "ash4", "wave"],
      ["sun", "sun", "wave", "sun", "sun"],
      ["leaf", { kind: "moon", contaminated: true }, "sun", { kind: "leaf", contaminated: true }, "wave"],
    ],
    101,
  );

  const result = applyMove(state, { axis: "col", index: 2, direction: -1 });
  const clearStage = getClearStage(result);

  assert.equal(clearStage.majorMatchSize, 5);
  assert.equal(clearStage.pulseKind, "shockwave");
  assert.equal(result.state.board[3]![1]!.kind, "ash3");
  assert.equal(result.state.board[3]![3]!.kind, "ash2");
  assert.equal(result.state.ashCount, 2);
  assert.equal(result.state.board[4]![1]!.contaminated, false);
  assert.equal(result.state.board[4]![3]!.contaminated, false);
  assert.ok(clearStage.restored.some((pos) => pos.row === 4 && pos.col === 1));
  assert.ok(clearStage.restored.some((pos) => pos.row === 4 && pos.col === 3));
});

test("six plus matches wipe all ash and restore all contamination", () => {
  const state = stateFromSpecs(
    [
      ["ash5", "wave", { kind: "leaf", contaminated: true }, "wave", "ash4"],
      ["wave", "ember", "wave", "sun", "ash1"],
      ["ember", "moon", "moon", "ember", "wave"],
      ["moon", "leaf", "ember", "moon", "moon"],
      ["wave", "moon", "moon", "sun", { kind: "wave", contaminated: true }],
    ],
    41,
  );

  const result = applyMove(state, { axis: "row", index: 3, direction: 1 });
  const clearStage = getClearStage(result);

  assert.equal(clearStage.majorMatchSize, 6);
  assert.equal(clearStage.pulseKind, "wipe");
  assert.equal(result.state.ashCount, 0);
  assert.equal(result.state.board[0]![2]!.contaminated, false);
  assert.equal(result.state.board[4]![4]!.contaminated, false);
});

test("spawn schedule follows the fixed cadence and then stays on every move", () => {
  assert.deepEqual(ASH_SPAWN_TURNS, [7, 13, 18, 22, 26, 29, 32, 35, 37, 39, 41, 43, 44]);
  assert.equal(shouldSpawnAshOnMove(6), false);
  assert.equal(shouldSpawnAshOnMove(7), true);
  assert.equal(shouldSpawnAshOnMove(8), false);
  assert.equal(shouldSpawnAshOnMove(43), true);
  assert.equal(shouldSpawnAshOnMove(ASH_ALWAYS_SPAWN_AFTER), true);
  assert.equal(shouldSpawnAshOnMove(ASH_ALWAYS_SPAWN_AFTER + 1), true);
});

test("contamination hardens into ash1 on the next turn if untouched", () => {
  const state = stateFromSpecs(
    [
      ["moon", "sun", "leaf", "ember", "wave"],
      ["wave", "leaf", "sun", "moon", "leaf"],
      ["leaf", "wave", "sun", "ember", "moon"],
      ["ember", "leaf", "wave", "moon", "sun"],
      ["leaf", "ember", "moon", "wave", { kind: "sun", contaminated: true }],
    ],
    17,
  );

  const result = applyMove(state, { axis: "row", index: 0, direction: 1 });
  const hardenStage = getAshStages(result).find((stage) => stage.action === "harden");

  assert.ok(hardenStage);
  assert.deepEqual(hardenStage.positions, [{ row: 4, col: 4 }]);
  assert.equal(result.state.board[4]![4]!.kind, "ash1");
  assert.equal(result.state.board[4]![4]!.contaminated, false);
});

test("untouched ash recovers by one stage per turn", () => {
  const state = stateFromSpecs(
    [
      ["moon", "sun", "leaf", "ember", "wave"],
      ["wave", "leaf", "sun", "moon", "leaf"],
      ["leaf", "wave", "sun", "ember", "moon"],
      ["ember", "leaf", "wave", "moon", "sun"],
      ["ash2", "ember", "moon", "wave", "sun"],
    ],
    17,
  );

  const result = applyMove(state, { axis: "row", index: 0, direction: 1 });
  const recoverStage = getAshStages(result).find((stage) => stage.action === "recover");

  assert.ok(recoverStage);
  assert.ok(recoverStage.positions.some((pos) => pos.row === 4 && pos.col === 0));
  assert.equal(result.state.board[4]![0]!.kind, "ash3");
});

test("only pre existing ash5 tiles contaminate and only one contamination event runs", () => {
  const state = stateFromSpecs(
    [
      ["moon", "sun", "leaf", "ember", "wave"],
      ["wave", "leaf", "sun", "moon", "leaf"],
      ["leaf", "wave", "sun", "ember", "moon"],
      ["sun", "leaf", "wave", "moon", "leaf"],
      ["ash5", "ember", "moon", "wave", "ash4"],
    ],
    17,
  );

  const result = applyMove(state, { axis: "row", index: 0, direction: 1 });
  const contaminationStages = getAshStages(result).filter((stage) => stage.action === "contaminate");

  assert.equal(contaminationStages.length, 1);
  assert.equal(result.state.board[4]![4]!.kind, "ash5");

  const contaminated = boardStateKinds(result.state.board)
    .flatMap((row, rowIndex) =>
      row.flatMap((kind, colIndex) => (typeof kind === "string" && kind.endsWith("*") ? [`${rowIndex}:${colIndex}`] : [])),
    )
    .sort();

  assert.equal(contaminated.length, 1);
  assert.ok(["3:0", "4:1"].includes(contaminated[0]!));
});

test("scheduled spawn uses a final refill slot instead of a settled board tile", () => {
  const state = {
    ...stateFromSpecs(
      [
        ["moon", "sun", "leaf", "ember", "wave"],
        ["wave", "leaf", "sun", "moon", "leaf"],
        ["leaf", "wave", "sun", "ember", "moon"],
        ["ember", "leaf", "wave", "moon", "sun"],
        ["leaf", "ember", "moon", "wave", "sun"],
      ],
      17,
    ),
    moves: 6,
  };

  const result = applyMove(state, { axis: "row", index: 0, direction: 1 });
  const spawnStage = getAshStages(result).find((stage) => stage.action === "spawn");
  const lastCollapse = [...result.stages].reverse().find((stage) => stage.kind === "collapse");

  assert.ok(spawnStage);
  assert.ok(lastCollapse);
  assert.equal(lastCollapse.kind, "collapse");
  const refillPositions = sparseNullPositions(lastCollapse.before);
  assert.ok(refillPositions.includes(`${spawnStage.position.row}:${spawnStage.position.col}`));
  assert.equal(result.state.board[spawnStage.position.row]![spawnStage.position.col]!.kind, "ash5");
});

test("pressure can create an immediate no move game over", () => {
  const state = createInitialState(323);
  const move = { axis: "row" as const, index: 2, direction: 1 as const };
  const withoutPressure = applyMove({ ...state, moves: 5 }, move);
  const withPressure = applyMove({ ...state, moves: 6 }, move);

  assert.equal(withoutPressure.state.gameOverReason, null);
  assert.equal(withPressure.state.gameOverReason, "no_moves");
  assert.ok(getAshStages(withPressure).some((stage) => stage.action === "spawn"));
});

test("ashCount reflects both ash tiles and contaminated sigils", () => {
  const board = createBoardFromSpecs([
    ["ash5", "sun", { kind: "leaf", contaminated: true }, "moon", "wave"],
    ["moon", "leaf", "moon", "leaf", "ember"],
    ["leaf", "moon", "ember", "wave", "sun"],
    ["ember", "leaf", "wave", "moon", "leaf"],
    ["wave", "ember", "leaf", "sun", "moon"],
  ]).board;

  assert.equal(countAsh(board), 2);
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

test("combo multiplier curve still scales with chain depth", () => {
  assert.equal(comboMultiplierForDepth(1), 1);
  assert.equal(comboMultiplierForDepth(2), 1.25);
  assert.equal(comboMultiplierForDepth(3), 1.6);
  assert.equal(comboMultiplierForDepth(4), 2);
  assert.equal(comboMultiplierForDepth(5), 2.5);
  assert.equal(comboMultiplierForDepth(8), 2.5);
});

test("x2 combos award the same 25 percent move bonus", () => {
  const state = createInitialState(1);
  const result = applyMove(state, { axis: "col", index: 4, direction: -1 });
  const clearStages = result.stages.filter((stage) => stage.kind === "clear");
  const clearScore = clearStages.reduce((total, stage) => total + stage.scoreGain, 0);

  assert.equal(result.maxCombo, 2);
  assert.equal(result.comboMultiplier, 1.25);
  assert.equal(result.comboBonus, Math.round(clearScore * 0.25));
  assert.equal(result.scoreGained, clearScore + result.comboBonus);
});
