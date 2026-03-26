import test from "node:test";
import assert from "node:assert/strict";

import {
  activePairs,
  cloneState,
  createInitialState,
  difficultyTierForElapsed,
  nextLaneForRow,
  ROW_COUNT,
  STRIKE_LIMIT,
  spawnIntervalForElapsed,
  spawnChargeForState,
  targetLaneForKind,
  toggleLatch,
  travelDurationForElapsed,
  updateGame,
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
      travelDuration: 5000,
    },
  ];
  prepared.spawnTimer = 0;

  const result = updateGame(prepared, 60).state;
  assert.equal(result.score > 0, true);
  assert.equal(result.streak, 1);
  assert.equal(result.vases[0]!.meter, 1);
  assert.equal(result.blossoms.length, 0);
});

test("third correct delivery bursts the bouquet and clears one strike", () => {
  const state = createInitialState(15);
  const prepared = cloneState(state);
  prepared.vases[0]!.meter = 2;
  prepared.strikes = 2;
  prepared.blossoms = [
    {
      id: 1,
      kind: "rose",
      fromLane: 0,
      toLane: 0,
      segment: ROW_COUNT,
      progress: 0.98,
      travelDuration: 5000,
    },
  ];

  const result = updateGame(prepared, 40).state;
  assert.equal(result.vases[0]!.meter, 0);
  assert.equal(result.strikes, 1);
  assert.equal(result.score >= 480, true);
});

test("wrong deliveries add global strikes and end the run at three", () => {
  const state = createInitialState(16);
  const prepared = cloneState(state);
  prepared.strikes = 2;
  prepared.blossoms = [
    {
      id: 1,
      kind: "iris",
      fromLane: 0,
      toLane: 0,
      segment: ROW_COUNT,
      progress: 0.98,
      travelDuration: 5000,
    },
  ];

  const result = updateGame(prepared, 40).state;
  assert.equal(result.strikes, STRIKE_LIMIT);
  assert.equal(result.gameOver, true);
  assert.equal(result.streak, 0);
});

test("next preview packet always matches the actual next spawn", () => {
  const state = createInitialState(17);
  const preview = { ...state.nextSpawn };

  const result = updateGame(state, spawnIntervalForElapsed(0));
  const spawnEvent = result.events.find((event) => event.kind === "spawn");
  assert.ok(spawnEvent);
  assert.equal(spawnEvent.blossom, preview.kind);
  assert.equal(spawnEvent.lane, preview.lane);
});

test("spawn cadence respects the active blossom cap for the current tier", () => {
  const state = createInitialState(19);
  const prepared = cloneState(state);
  prepared.spawnTimer = spawnIntervalForElapsed(0);
  prepared.blossoms = [
    {
      id: 1,
      kind: "rose",
      fromLane: 0,
      toLane: 0,
      segment: 0,
      progress: 0.1,
      travelDuration: 6500,
    },
    {
      id: 2,
      kind: "iris",
      fromLane: 1,
      toLane: 2,
      segment: 1,
      progress: 0.2,
      travelDuration: 6500,
    },
  ];

  const result = updateGame(prepared, 10);
  assert.equal(result.state.blossoms.length, 2);
  assert.equal(result.events.some((event) => event.kind === "spawn"), false);
});

test("difficulty tiers depend on elapsed time, not score", () => {
  assert.deepEqual(difficultyTierForElapsed(0), {
    spawnInterval: 4200,
    travelDuration: 6500,
    sameLaneRepeatChance: 0.9,
    sameKindRepeatChance: 0.75,
    maxActiveBlossoms: 1,
  });
  assert.deepEqual(difficultyTierForElapsed(20_000), {
    spawnInterval: 3400,
    travelDuration: 5600,
    sameLaneRepeatChance: 0.82,
    sameKindRepeatChance: 0.6,
    maxActiveBlossoms: 1,
  });
  assert.equal(spawnIntervalForElapsed(61_000), 3000);
  assert.equal(travelDurationForElapsed(121_000), 4800);

  const state = createInitialState(18);
  const prepared = cloneState(state);
  prepared.totalCorrect = 200;
  const result = updateGame(prepared, spawnIntervalForElapsed(0)).state;
  assert.equal(result.blossoms[0]!.travelDuration, 6500);
});

test("spawn charge starts empty, fills to one, and clamps while blocked", () => {
  const state = createInitialState(20);
  const prepared = cloneState(state);

  assert.equal(spawnChargeForState(prepared), 0);

  prepared.spawnTimer = 2100;
  assert.equal(spawnChargeForState(prepared), 0.5);

  prepared.spawnTimer = 4200;
  assert.equal(spawnChargeForState(prepared), 1);

  prepared.spawnTimer = 9000;
  assert.equal(spawnChargeForState(prepared), 1);
});
