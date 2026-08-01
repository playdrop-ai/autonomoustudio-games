export const PREVIEW_GESTURE_TIMING = {
  fadeInMs: 180,
  liftMs: 220,
  dragMs: 900,
  releaseMs: 180,
} as const;

export const PREVIEW_GESTURE_TOTAL_MS = Object.values(PREVIEW_GESTURE_TIMING)
  .reduce((total, duration) => total + duration, 0);

export interface PreviewGestureFrame {
  phase: "fade-in" | "lift" | "drag" | "release" | "complete";
  handOpacity: number;
  handScale: number;
  liftProgress: number;
  dragProgress: number;
  releaseProgress: number;
  complete: boolean;
}

function easeInOutCubic(value: number): number {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export function calculatePreviewGestureFrame(elapsedMs: number): PreviewGestureFrame {
  if (!Number.isFinite(elapsedMs)) throw new Error("preview gesture elapsed time must be finite");
  const elapsed = Math.max(0, elapsedMs);
  const { fadeInMs, liftMs, dragMs, releaseMs } = PREVIEW_GESTURE_TIMING;

  if (elapsed < fadeInMs) {
    const progress = elapsed / fadeInMs;
    return {
      phase: "fade-in",
      handOpacity: progress,
      handScale: 1 - easeInOutCubic(progress) * 0.06,
      liftProgress: 0,
      dragProgress: 0,
      releaseProgress: 0,
      complete: false,
    };
  }

  if (elapsed < fadeInMs + liftMs) {
    const progress = (elapsed - fadeInMs) / liftMs;
    const eased = easeInOutCubic(progress);
    return {
      phase: "lift",
      handOpacity: 1,
      handScale: 0.94 + eased * 0.06,
      liftProgress: eased,
      dragProgress: 0,
      releaseProgress: 0,
      complete: false,
    };
  }

  if (elapsed < fadeInMs + liftMs + dragMs) {
    const progress = (elapsed - fadeInMs - liftMs) / dragMs;
    return {
      phase: "drag",
      handOpacity: 1,
      handScale: 1,
      liftProgress: 1,
      dragProgress: easeInOutCubic(progress),
      releaseProgress: 0,
      complete: false,
    };
  }

  if (elapsed < fadeInMs + liftMs + dragMs + releaseMs) {
    const progress = (elapsed - fadeInMs - liftMs - dragMs) / releaseMs;
    return {
      phase: "release",
      handOpacity: 1 - progress,
      handScale: 1 + progress * 0.03,
      liftProgress: 1,
      dragProgress: 1,
      releaseProgress: progress,
      complete: false,
    };
  }

  return {
    phase: "complete",
    handOpacity: 0,
    handScale: 1.03,
    liftProgress: 1,
    dragProgress: 1,
    releaseProgress: 1,
    complete: true,
  };
}
