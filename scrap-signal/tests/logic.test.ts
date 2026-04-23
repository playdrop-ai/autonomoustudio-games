import assert from "node:assert/strict";
import test from "node:test";

import { BEACON_CENTER } from "../src/game/constants";
import { createInputState, createTestState, scheduleSpawnWarningAt, spawnBatteryAt, spawnEnemyAt, stepGame } from "../src/game/sim";

test("carrier death creates a battery pickup", () => {
  const state = createTestState(1);
  const carrier = spawnEnemyAt(state, "carrier", { x: 940, y: 360 });
  carrier.hp = 1;
  state.enemies.push(carrier);
  state.player.position = { x: 860, y: 360 };
  state.player.aim = { x: 1000, y: 360 };

  const input = createInputState();
  input.aimX = 1000;
  input.aimY = 360;
  input.firing = true;

  for (let index = 0; index < 20; index += 1) {
    stepGame(state, input, 16);
  }

  assert.equal(state.enemies.length, 0);
  assert.equal(state.batteries.length, 1);
});

test("player can only carry one battery at a time", () => {
  const state = createTestState(2);
  state.player.position = { x: 900, y: 360 };
  state.batteries.push(
    spawnBatteryAt(state, { x: 900, y: 360 }),
    spawnBatteryAt(state, { x: 900, y: 360 }),
  );

  stepGame(state, createInputState(), 16);

  assert.equal(state.player.carryBattery, true);
  assert.equal(state.batteries.length, 1);
});

test("depositing a carried battery repairs the beacon and scores", () => {
  const state = createTestState(3);
  state.player.carryBattery = true;
  state.player.position = { ...BEACON_CENTER };
  state.beaconIntegrity = 7;

  stepGame(state, createInputState(), 16);

  assert.equal(state.player.carryBattery, false);
  assert.equal(state.beaconIntegrity, 9);
  assert.equal(state.deposits, 1);
  assert.equal(state.score > 0, true);
});

test("beacon blackout loses the run", () => {
  const state = createTestState(4);
  state.beaconIntegrity = 1;
  state.enemies.push(spawnEnemyAt(state, "scrapper", { x: BEACON_CENTER.x + 8, y: BEACON_CENTER.y }));

  stepGame(state, createInputState(), 16);

  assert.equal(state.runState, "lost");
  assert.equal(state.defeatReason, "blackout");
});

test("rescue timer completion wins the run", () => {
  const state = createTestState(5);
  state.elapsedMs = state.rescueMs - 8;

  stepGame(state, createInputState(), 16);

  assert.equal(state.runState, "won");
});

test("spawn warnings resolve into live enemies after their telegraph finishes", () => {
  const state = createTestState(6);
  scheduleSpawnWarningAt(state, "carrier", { x: 980, y: 220 }, 48);

  stepGame(state, createInputState(), 32);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.spawnWarnings.length, 1);

  stepGame(state, createInputState(), 32);
  assert.equal(state.spawnWarnings.length, 0);
  assert.equal(state.enemies.length, 1);
  assert.equal(state.enemies[0]?.type, "carrier");
});
