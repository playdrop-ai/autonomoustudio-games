import test from "node:test";
import assert from "node:assert/strict";

import { createPolicyInput, createSimulation, getSnapshot, runPolicySample, stepSimulation } from "../src/game/sim";

test("battery drains over time during a live run", () => {
  const simulation = createSimulation({ seed: 123, bestScore: 0 });
  const startingBattery = getSnapshot(simulation).battery;

  for (let index = 0; index < 300; index += 1) {
    stepSimulation(simulation, { moveX: 0, moveY: 0, dashPressed: false }, 1 / 60);
  }

  assert.ok(getSnapshot(simulation).battery < startingBattery);
});

test("dash enters cooldown immediately", () => {
  const simulation = createSimulation({ seed: 234, bestScore: 0 });
  stepSimulation(simulation, { moveX: 1, moveY: 0, dashPressed: true }, 1 / 60);
  const snapshot = getSnapshot(simulation);
  assert.ok(snapshot.player.dashTimer > 0);
  assert.ok(snapshot.dashCooldown > 0);
});

test("spawn pacing produces pressure within the first 35 seconds", () => {
  const simulation = createSimulation({ seed: 345, bestScore: 0 });

  for (let index = 0; index < 2100; index += 1) {
    stepSimulation(simulation, createPolicyInput(simulation, "casual"), 1 / 60);
    if (simulation.destroyed + simulation.enemies.length >= 2) {
      break;
    }
  }

  assert.ok(simulation.destroyed + simulation.enemies.length >= 2);
});

test("expert policy survives much longer than idle", () => {
  const idle = runPolicySample({ seed: 456, policy: "idle", seconds: 240 });
  const expert = runPolicySample({ seed: 456, policy: "expert", seconds: 240 });
  assert.ok(expert.time > idle.time);
  assert.ok(expert.score > idle.score);
});
