import test from "node:test";
import assert from "node:assert/strict";

import { CLEAR_PHASE_MS, COMPLAINT_LIMIT, SETTLE_PHASE_MS } from "../src/game/data";
import {
  chooseAutoplayMove,
  createStateFromIngredientGrid,
  performMove,
  previewCluster,
  stepGame,
} from "../src/game/sim";
import type { GameState, IngredientKey } from "../src/game/types";

function grid(...rows: IngredientKey[][]): IngredientKey[][] {
  return rows;
}

function settle(state: GameState): void {
  let safety = 0;
  while (state.pendingResolve) {
    stepGame(state, CLEAR_PHASE_MS);
    stepGame(state, SETTLE_PHASE_MS);
    safety += 1;
    if (safety > 8) throw new Error("pending resolution did not settle");
  }
}

function findClusterCellForIngredient(state: GameState, ingredient: IngredientKey): { col: number; row: number } {
  for (let row = 0; row < 10; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const cluster = previewCluster(state, col, row);
      if (cluster && cluster.ingredient === ingredient) {
        return { col, row };
      }
    }
  }
  throw new Error(`No cluster found for ${ingredient}`);
}

test("previewCluster returns connected order-matching groups", () => {
  const state = createStateFromIngredientGrid(
    grid(
      ["salmon", "salmon", "egg", "cucumber", "cucumber", "avocado", "avocado"],
      ["salmon", "salmon", "egg", "cucumber", "egg", "avocado", "cucumber"],
      ["egg", "salmon", "salmon", "salmon", "egg", "cucumber", "cucumber"],
      ["egg", "egg", "avocado", "cucumber", "cucumber", "salmon", "egg"],
      ["avocado", "egg", "avocado", "egg", "salmon", "salmon", "egg"],
      ["avocado", "avocado", "egg", "egg", "salmon", "salmon", "cucumber"],
      ["salmon", "cucumber", "cucumber", "avocado", "egg", "egg", "cucumber"],
      ["salmon", "egg", "avocado", "avocado", "egg", "cucumber", "salmon"],
      ["cucumber", "egg", "salmon", "egg", "cucumber", "avocado", "salmon"],
      ["cucumber", "salmon", "egg", "egg", "cucumber", "avocado", "salmon"],
    ),
    ["salmon", "egg"],
  );

  const cluster = previewCluster(state, 0, 0);
  assert.ok(cluster);
  assert.equal(cluster.size, 7);
  assert.equal(cluster.ingredient, "salmon");
  assert.equal(cluster.matchedOrder, true);
});

test("serving both order ingredients completes the order and advances the streak", () => {
  const state = createStateFromIngredientGrid(
    grid(
      ["salmon", "salmon", "egg", "cucumber", "cucumber", "avocado", "avocado"],
      ["salmon", "salmon", "egg", "cucumber", "egg", "avocado", "cucumber"],
      ["egg", "salmon", "salmon", "salmon", "egg", "cucumber", "cucumber"],
      ["egg", "egg", "avocado", "cucumber", "cucumber", "salmon", "egg"],
      ["avocado", "egg", "avocado", "egg", "salmon", "salmon", "egg"],
      ["avocado", "avocado", "egg", "egg", "salmon", "salmon", "cucumber"],
      ["salmon", "cucumber", "cucumber", "avocado", "egg", "egg", "cucumber"],
      ["salmon", "egg", "avocado", "avocado", "egg", "cucumber", "salmon"],
      ["cucumber", "egg", "salmon", "egg", "cucumber", "avocado", "salmon"],
      ["cucumber", "salmon", "egg", "egg", "cucumber", "avocado", "salmon"],
    ),
    ["salmon", "egg"],
  );

  state.order[0].need = 5;
  state.order[1].need = 1;

  assert.equal(performMove(state, 0, 0), true);
  settle(state);
  assert.equal(state.order[0].filled, 5);
  assert.equal(state.ordersServed, 0);

  const eggCell = findClusterCellForIngredient(state, "egg");
  assert.equal(performMove(state, eggCell.col, eggCell.row), true);
  settle(state);

  assert.equal(state.ordersServed, 1);
  assert.equal(state.streak, 1);
  assert.equal(state.longestStreak, 1);
  assert.equal(state.orderIndex, 1);
  assert.equal(state.complaints, 0);
  assert.ok(state.score > 0);
});

test("timed-out orders add complaints and eventually end the run", () => {
  const state = createStateFromIngredientGrid(
    grid(
      ["salmon", "salmon", "egg", "cucumber", "cucumber", "avocado", "avocado"],
      ["salmon", "salmon", "egg", "cucumber", "egg", "avocado", "cucumber"],
      ["egg", "salmon", "salmon", "salmon", "egg", "cucumber", "cucumber"],
      ["egg", "egg", "avocado", "cucumber", "cucumber", "salmon", "egg"],
      ["avocado", "egg", "avocado", "egg", "salmon", "salmon", "egg"],
      ["avocado", "avocado", "egg", "egg", "salmon", "salmon", "cucumber"],
      ["salmon", "cucumber", "cucumber", "avocado", "egg", "egg", "cucumber"],
      ["salmon", "egg", "avocado", "avocado", "egg", "cucumber", "salmon"],
      ["cucumber", "egg", "salmon", "egg", "cucumber", "avocado", "salmon"],
      ["cucumber", "salmon", "egg", "egg", "cucumber", "avocado", "salmon"],
    ),
    ["salmon", "egg"],
  );

  for (let index = 0; index < COMPLAINT_LIMIT; index += 1) {
    stepGame(state, state.maxPatienceMs + 10);
  }

  assert.equal(state.complaints, COMPLAINT_LIMIT);
  assert.equal(state.gameOver, true);
  assert.equal(state.streak, 0);
});

test("expert autoplay prefers a needed cluster over unrelated board control", () => {
  const state = createStateFromIngredientGrid(
    grid(
      ["salmon", "salmon", "cucumber", "cucumber", "cucumber", "avocado", "avocado"],
      ["salmon", "salmon", "egg", "cucumber", "egg", "avocado", "cucumber"],
      ["egg", "salmon", "salmon", "cucumber", "egg", "cucumber", "cucumber"],
      ["egg", "egg", "avocado", "cucumber", "cucumber", "salmon", "egg"],
      ["avocado", "egg", "avocado", "egg", "salmon", "salmon", "egg"],
      ["avocado", "avocado", "egg", "egg", "salmon", "salmon", "cucumber"],
      ["salmon", "cucumber", "cucumber", "avocado", "egg", "egg", "cucumber"],
      ["salmon", "egg", "avocado", "avocado", "egg", "cucumber", "salmon"],
      ["cucumber", "egg", "salmon", "egg", "cucumber", "avocado", "salmon"],
      ["cucumber", "salmon", "egg", "egg", "cucumber", "avocado", "salmon"],
    ),
    ["salmon", "egg"],
  );

  const move = chooseAutoplayMove(state, "expert");
  assert.ok(move);
  const cluster = previewCluster(state, move.col, move.row);
  assert.ok(cluster);
  assert.equal(cluster.matchedOrder, true);
});
