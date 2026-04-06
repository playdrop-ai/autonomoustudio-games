import test from "node:test";
import assert from "node:assert/strict";

import { createInitialState, stepGame, chooseAutoplayTarget } from "../src/game/sim";
import { COURIER_Y } from "../src/game/types";

test("matching gate scores and advances the parcel queue", () => {
  const state = createInitialState(7);
  const initialNext = state.nextParcel;

  state.gates = [
    {
      id: 1,
      segmentId: 1,
      y: COURIER_Y,
      lane: 0,
      district: state.activeParcel,
      scale: 1,
      resolved: false,
    },
  ];
  state.obstacles = [];
  state.courierX = 0;
  state.targetX = 0;
  state.storm01 = 0.4;

  const result = stepGame(state, 16, 0);
  assert.equal(result.events[0]?.kind, "correct");
  assert.equal(state.deliveries, 1);
  assert.equal(state.streak, 1);
  assert.equal(state.activeParcel, initialNext);
  assert.ok(state.score > 0);
  assert.ok(state.storm01 < 0.4);
});

test("wrong gate resets streak and raises storm pressure", () => {
  const state = createInitialState(11);
  state.streak = 4;
  state.gates = [
    {
      id: 1,
      segmentId: 1,
      y: COURIER_Y,
      lane: 0,
      district: state.activeParcel === "amber" ? "teal" : "amber",
      scale: 1,
      resolved: false,
    },
  ];
  state.obstacles = [];
  state.courierX = 0;
  state.targetX = 0;
  state.storm01 = 0.3;

  const result = stepGame(state, 16, 0);
  assert.equal(result.events[0]?.kind, "wrong");
  assert.equal(state.streak, 0);
  assert.ok(state.storm01 > 0.3);
});

test("obstacle collision surges the storm and marks the obstacle hit", () => {
  const state = createInitialState(19);
  state.gates = [];
  state.obstacles = [
    {
      id: 1,
      y: COURIER_Y,
      lane: 0,
      kind: "tree",
      scale: 1,
      hit: false,
    },
  ];
  state.courierX = 0;
  state.targetX = 0;
  state.storm01 = 0.22;

  const result = stepGame(state, 16, 0);
  assert.equal(result.events[0]?.kind, "collision");
  assert.equal(state.obstacles.length, 0);
  assert.ok(state.storm01 > 0.22);
});

test("expert autoplay returns an in-bounds steering target", () => {
  const state = createInitialState(23);
  const target = chooseAutoplayTarget(state, "expert");
  assert.ok(target >= -0.94 && target <= 0.94);
});
