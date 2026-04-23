import assert from "node:assert/strict";
import test from "node:test";

import { createStormByKey } from "../src/game/events";
import {
  createInitialState,
  getForecastClarity,
  getForecastView,
  getHeatPenaltyMultiplier,
  getRechargeMultiplier,
  spendCharge,
  stepState,
} from "../src/game/state";

test("spendCharge restores the selected system and consumes one charge", () => {
  const state = createInitialState(7);
  state.systems.heat = 50;

  const changed = spendCharge(state, "heat");

  assert.equal(changed, true);
  assert.equal(state.charges, 2);
  assert.equal(Math.round(state.systems.heat), 74);
});

test("power thresholds slow recharge as designed", () => {
  assert.equal(getRechargeMultiplier(80), 1);
  assert.equal(getRechargeMultiplier(30), 0.75);
  assert.equal(getRechargeMultiplier(15), 0.5);
});

test("low heat raises the global drift penalty", () => {
  assert.equal(getHeatPenaltyMultiplier(80), 1);
  assert.equal(getHeatPenaltyMultiplier(30), 1.2);
  assert.equal(getHeatPenaltyMultiplier(20), 1.4);
});

test("comms forecast clarity degrades instead of disappearing", () => {
  const state = createInitialState(9);
  state.timeToStormMs = 2400;
  state.nextStorm = createStormByKey("static-wall");

  state.systems.comms = 80;
  assert.equal(getForecastClarity(state.systems.comms), "full");
  assert.match(getForecastView(state).impacts, /Power -6/);

  state.systems.comms = 30;
  assert.equal(getForecastClarity(state.systems.comms), "partial");
  assert.equal(getForecastView(state).impacts, "Power + Comms");

  state.systems.comms = 12;
  assert.equal(getForecastClarity(state.systems.comms), "noisy");
  assert.match(getForecastView(state).impacts, /Likely/);
});

test("storm events can end the run when a system collapses", () => {
  const state = createInitialState(11);
  state.systems.comms = 10;
  state.timeToStormMs = 0;
  state.nextStorm = createStormByKey("signal-burial");

  stepState(state, 16);

  assert.equal(state.runState, "lost");
  assert.equal(state.collapseSystem, "comms");
});

test("recharge still advances while the station is healthy", () => {
  const state = createInitialState(13);
  state.charges = 0;
  state.chargeProgress = 0;
  state.timeToStormMs = 999999;

  stepState(state, 5000);

  assert.equal(state.charges >= 1, true);
  assert.equal(state.runState, "playing");
});
