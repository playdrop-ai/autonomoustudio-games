import test from "node:test";
import assert from "node:assert/strict";

import {
  activePairs,
  cloneState,
  createInitialState,
  nextLaneForRow,
  ROW_COUNT,
  SPEED_STEP_DELIVERIES,
  spawnIntervalForCorrect,
  targetLaneForKind,
  toggleLatch,
  travelDurationForCorrect,
  updateGame,
  type Blossom,
  type BlossomKind,
} from "../src/game/logic.ts";

test("active pairs alternate between outer pairs and the middle pair", () => {
  assert.deepEqual(activePairs(0), [
    [0, 1],
    [2, 3],
  ]);
  assert.deepEqual(activePairs(1), [[1, 2]]);
  assert.deepEqual(activePairs(2), [
    [0, 1],
    [2, 3],
  ]);
});

test("toggleLatch flips only the targeted latch", () => {
  const state = createInitialState(12);
  const flipped = toggleLatch(state, 0, 1);
  assert.equal(state.latches[0]![0], "cross");
  assert.equal(state.latches[0]![1], "straight");
  assert.equal(flipped.latches[0]![0], "cross");
  assert.equal(flipped.latches[0]![1], "cross");
});

test("crossed latches send blossoms into the neighboring lane", () => {
  const state = createInitialState(13);
  assert.equal(nextLaneForRow(0, 0, state.latches), 1);
  assert.equal(nextLaneForRow(2, 0, state.latches), 2);
  assert.equal(nextLaneForRow(1, 1, state.latches), 2);
});

test("correct deliveries raise score and fill the matching vase meter", () => {
  const state = createInitialState(14);
  const prepared = cloneState(state);
  const kind: BlossomKind = "rose";
  prepared.blossoms = [
    {
      id: 1,
      kind,
      fromLane: targetLaneForKind(kind),
      toLane: targetLaneForKind(kind),
      segment: ROW_COUNT,
      progress: 0.95,
    },
  ];
  prepared.spawnTimer = 0;

  const result = updateGame(prepared, 60).state;
  assert.equal(result.score > 0, true);
  assert.equal(result.streak, 1);
  assert.equal(result.vases[0]!.meter, 1);
  assert.equal(result.blossoms.length, 0);
});

test("third correct delivery bursts the bouquet and clears thorns", () => {
  const state = createInitialState(15);
  const prepared = cloneState(state);
  prepared.vases[0]!.meter = 2;
  prepared.vases[0]!.thorns = 2;
  prepared.blossoms = [
    {
      id: 1,
      kind: "rose",
      fromLane: 0,
      toLane: 0,
      segment: ROW_COUNT,
      progress: 0.98,
    },
  ];

  const result = updateGame(prepared, 40).state;
  assert.equal(result.vases[0]!.meter, 0);
  assert.equal(result.vases[0]!.thorns, 0);
  assert.equal(result.score >= 480, true);
});

test("wrong deliveries add thorns and can end the run", () => {
  const state = createInitialState(16);
  const prepared = cloneState(state);
  prepared.vases[0]!.thorns = 2;
  prepared.blossoms = [
    {
      id: 1,
      kind: "iris",
      fromLane: 0,
      toLane: 0,
      segment: ROW_COUNT,
      progress: 0.98,
    },
  ];

  const result = updateGame(prepared, 40).state;
  assert.equal(result.vases[0]!.thorns, 3);
  assert.equal(result.gameOver, true);
  assert.equal(result.streak, 0);
});

test("speed ramps up after every delivery threshold", () => {
  assert.equal(spawnIntervalForCorrect(0) > spawnIntervalForCorrect(SPEED_STEP_DELIVERIES), true);
  assert.equal(travelDurationForCorrect(0) > travelDurationForCorrect(SPEED_STEP_DELIVERIES * 2), true);
});
