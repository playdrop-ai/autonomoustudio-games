import test from "node:test";
import assert from "node:assert/strict";

import { applyMove, createInitialState, createStateFromMatrix, hasAvailableMoves, slideBoard, toMatrix } from "../src/board";

test("slideBoard merges one pair per tile and scores correctly", () => {
  const state = createStateFromMatrix([
    [2, 2, 2, 2],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);

  const result = slideBoard(state, "left");

  assert.equal(result.moved, true);
  assert.equal(result.scoreDelta, 8);
  assert.deepEqual(toMatrix(result.state), [
    [4, 4, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
});

test("applyMove spawns a new tile after a valid move", () => {
  const state = createStateFromMatrix([
    [2, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);

  const result = applyMove(state, "right", () => 0);

  assert.equal(result.moved, true);
  assert.equal(result.spawnedTile?.value, 2);
  assert.deepEqual(toMatrix(result.state), [
    [2, 0, 0, 2],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
});

test("applyMove leaves the board unchanged when no tiles move", () => {
  const state = createStateFromMatrix([
    [2, 4, 8, 16],
    [32, 64, 128, 256],
    [512, 1024, 2, 4],
    [8, 16, 32, 64],
  ]);

  const result = applyMove(state, "left", () => 0);

  assert.equal(result.moved, false);
  assert.equal(result.spawnedTile, null);
  assert.deepEqual(toMatrix(result.state), toMatrix(state));
});

test("hasAvailableMoves detects a dead board", () => {
  const state = createStateFromMatrix([
    [2, 4, 8, 16],
    [32, 64, 128, 256],
    [512, 1024, 2, 4],
    [8, 16, 32, 64],
  ]);

  assert.equal(hasAvailableMoves(state), false);
});

test("createInitialState creates exactly two starting tiles", () => {
  const state = createInitialState(() => 0);

  assert.equal(state.tiles.length, 2);
  const total = state.tiles.reduce((sum, tile) => sum + tile.value, 0);
  assert.equal(total, 4);
});
