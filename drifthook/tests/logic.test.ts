import assert from "node:assert/strict";
import test from "node:test";

import {
  createInitialState,
  startRun,
  updateGame,
  type GameState,
  type WaterEntity,
} from "../src/game/logic.ts";

function makePlayingState(seed = 7): GameState {
  return startRun(createInitialState(seed), seed);
}

function makeEntity(kind: "fish" | "snag", species: WaterEntity["species"], depth: number, id = 99): WaterEntity {
  return {
    id,
    kind,
    species,
    spawnedAtMs: 0,
    lifetimeMs: 999_999,
    depthAnchor: depth,
    depthAmplitude: 0,
    depthPeriodMs: 1_000,
    depthPhaseMs: 0,
  };
}

test("correct catch advances the order and awards a perfect hit", () => {
  const state = makePlayingState();
  state.orderCard = ["dartfin", "bloomkoi", "glassperch"];
  state.orderProgress = 0;
  state.knots = 4;
  state.score = 0;
  state.lureDepth = 0.75;
  state.entities = [makeEntity("fish", "dartfin", 0.744)];

  const result = updateGame(state, 10, false);

  assert.equal(result.state.score, 140);
  assert.equal(result.state.orderProgress, 1);
  assert.equal(result.state.knots, 4);
  assert.equal(result.state.gameOver, false);
  const catchEvent = result.events.find((event) => event.kind === "catch");
  assert.ok(catchEvent);
  assert.equal(catchEvent?.kind, "catch");
  assert.equal(catchEvent?.result, "correct");
  assert.equal(catchEvent?.perfect, true);
});

test("wrong catches reset order progress and cost a knot", () => {
  const state = makePlayingState();
  state.orderCard = ["dartfin", "bloomkoi", "glassperch"];
  state.orderProgress = 1;
  state.knots = 4;
  state.lureDepth = 0.76;
  state.entities = [makeEntity("fish", "dartfin", 0.754)];

  const result = updateGame(state, 10, false);

  assert.equal(result.state.orderProgress, 0);
  assert.equal(result.state.knots, 3);
  const catchEvent = result.events.find((event) => event.kind === "catch");
  assert.ok(catchEvent);
  assert.equal(catchEvent?.result, "wrong");
});

test("completing an order repairs one knot up to the max", () => {
  const state = makePlayingState();
  state.orderCard = ["dartfin", "dartfin", "dartfin"];
  state.orderProgress = 2;
  state.completedOrders = 2;
  state.knots = 3;
  state.lureDepth = 0.75;
  state.entities = [makeEntity("fish", "dartfin", 0.744)];

  const result = updateGame(state, 10, false);

  assert.equal(result.state.completedOrders, 3);
  assert.equal(result.state.orderProgress, 0);
  assert.equal(result.state.knots, 4);
  assert.ok(result.events.some((event) => event.kind === "order-complete"));
});

test("a final wrong catch triggers game over", () => {
  const state = makePlayingState();
  state.orderCard = ["bloomkoi", "dartfin", "glassperch"];
  state.orderProgress = 0;
  state.knots = 1;
  state.lureDepth = 0.77;
  state.entities = [makeEntity("snag", null, 0.764)];

  const result = updateGame(state, 10, false);

  assert.equal(result.state.knots, 0);
  assert.equal(result.state.gameOver, true);
  assert.equal(result.state.screen, "gameover");
  assert.ok(result.events.some((event) => event.kind === "gameover"));
});

test("a single reel only resolves one touch", () => {
  const state = makePlayingState();
  state.orderCard = ["dartfin", "bloomkoi", "glassperch"];
  state.orderProgress = 0;
  state.knots = 4;
  state.score = 0;
  state.lureDepth = 0.75;
  state.entities = [makeEntity("fish", "dartfin", 0.7, 1), makeEntity("fish", "bloomkoi", 0.66, 2)];

  const first = updateGame(state, 100, false);
  assert.ok(first.state.score > 0);
  assert.equal(first.state.orderProgress, 1);
  assert.equal(first.state.entities.length, 1);
  assert.equal(first.state.entities[0]?.species, "bloomkoi");

  const second = updateGame(first.state, 100, false);
  assert.equal(second.state.score, first.state.score);
  assert.equal(second.state.orderProgress, 1);
  assert.equal(second.state.entities.length, 1);
  assert.equal(second.state.entities[0]?.species, "bloomkoi");
});
