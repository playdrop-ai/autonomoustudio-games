import assert from "node:assert/strict";
import test from "node:test";
import { boundedDebrisCountRange, debrisCountRange, MAX_DEBRIS_PER_CLEAR } from "../src/game/debris";

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
