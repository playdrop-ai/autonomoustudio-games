import assert from "node:assert/strict";
import test from "node:test";
import {
  PREVIEW_GESTURE_TIMING,
  calculatePreviewGestureFrame,
} from "../src/game/preview";

const { fadeInMs, liftMs, dragMs, releaseMs } = PREVIEW_GESTURE_TIMING;

test("preview gesture exposes a readable press, lift, drag, and release", () => {
  assert.deepEqual(calculatePreviewGestureFrame(0), {
    phase: "fade-in",
    handOpacity: 0,
    handScale: 1,
    liftProgress: 0,
    dragProgress: 0,
    releaseProgress: 0,
    complete: false,
  });

  const pressed = calculatePreviewGestureFrame(fadeInMs);
  assert.equal(pressed.phase, "lift");
  assert.equal(pressed.handOpacity, 1);
  assert.equal(pressed.liftProgress, 0);

  const dragging = calculatePreviewGestureFrame(fadeInMs + liftMs + dragMs / 2);
  assert.equal(dragging.phase, "drag");
  assert.equal(dragging.liftProgress, 1);
  assert.equal(dragging.dragProgress, 0.5);

  const releasing = calculatePreviewGestureFrame(fadeInMs + liftMs + dragMs + releaseMs / 2);
  assert.equal(releasing.phase, "release");
  assert.equal(releasing.dragProgress, 1);
  assert.equal(releasing.handOpacity, 0.5);

  const complete = calculatePreviewGestureFrame(fadeInMs + liftMs + dragMs + releaseMs);
  assert.equal(complete.phase, "complete");
  assert.equal(complete.handOpacity, 0);
  assert.equal(complete.complete, true);
});

test("preview gesture rejects non-finite time", () => {
  assert.throws(() => calculatePreviewGestureFrame(Number.NaN), /must be finite/);
});
