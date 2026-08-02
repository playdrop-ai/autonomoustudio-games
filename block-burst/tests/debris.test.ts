import assert from "node:assert/strict";
import test from "node:test";
import {
  bombDebrisMultiplier,
  bombClearSpawnDelay,
  bombImpulseStrengthCells,
  BOMB_WAVE_DELAY_MS,
  boundedDebrisCountRange,
  debrisCountRange,
  MAX_DEBRIS_PER_CLEAR,
} from "../src/game/debris";

test("clear debris scales through the approved combo bands", () => {
  assert.deepEqual(debrisCountRange(0), { min: 2, max: 4 });
  assert.deepEqual(debrisCountRange(1), { min: 2, max: 4 });
  assert.deepEqual(debrisCountRange(2), { min: 2, max: 5 });
  assert.deepEqual(debrisCountRange(3), { min: 2, max: 6 });
  assert.deepEqual(debrisCountRange(4), { min: 3, max: 6 });
  assert.deepEqual(debrisCountRange(5), { min: 4, max: 6 });
  assert.deepEqual(debrisCountRange(12), { min: 4, max: 6 });
});

test("very large clears keep their debris budget bounded", () => {
  const cells = 64;
  const range = boundedDebrisCountRange(8, cells);
  assert.ok(range.min >= 2);
  assert.ok(range.max >= range.min);
  assert.ok(range.max * cells <= MAX_DEBRIS_PER_CLEAR);
});

test("bomb clears multiply ordinary and bomb-cell cube debris", () => {
  assert.equal(bombDebrisMultiplier(false, false), 1);
  assert.equal(bombDebrisMultiplier(true, false), 2);
  assert.equal(bombDebrisMultiplier(true, true), 4);
});

test("every bomb-clear fragment spawns before the first shockwave", () => {
  assert.equal(bombClearSpawnDelay(0, 0), 0);
  assert.ok(bombClearSpawnDelay(7, 7) < BOMB_WAVE_DELAY_MS);
});

test("bomb impulse has strong, medium, and subtle distance bands", () => {
  const near = bombImpulseStrengthCells(1.5, 0);
  const mid = bombImpulseStrengthCells(3.5, 0);
  const far = bombImpulseStrengthCells(6, 0);
  assert.ok(near >= 10);
  assert.ok(mid >= 6);
  assert.ok(far >= 2.4);
  assert.ok(near > mid && mid > far);
  assert.ok(bombImpulseStrengthCells(1.5, 2) > near);
});
