type GameOverReason = "no_moves" | null;
type GameOverResult = "normal" | "new_best" | "first_recorded";
type Screen = "playing" | "losing" | "gameover";

interface RestartInterstitialTimers {
  setTimeout(callback: () => void, delayMs: number): ReturnType<typeof setTimeout>;
  clearTimeout(timeoutId: ReturnType<typeof setTimeout>): void;
}

export type RestartInterstitialWaitResult<T> =
  | { status: "resolved"; value: T }
  | { status: "rejected"; error: unknown }
  | { status: "timeout" };

export interface PreviewGestureFrame {
  offsetRatio: number;
  handOpacity: number;
  complete: boolean;
}

export function calculatePreviewGestureFrame(options: {
  elapsedMs: number;
  fadeInMs: number;
  swipeMs: number;
  releaseMs: number;
  travelRatio: number;
}): PreviewGestureFrame {
  const { elapsedMs, fadeInMs, swipeMs, releaseMs, travelRatio } = options;
  if (!Number.isFinite(elapsedMs)) {
    throw new Error("preview gesture elapsed time must be finite");
  }
  if (!Number.isFinite(fadeInMs) || fadeInMs <= 0) {
    throw new Error("preview gesture fade-in duration must be positive");
  }
  if (!Number.isFinite(swipeMs) || swipeMs <= 0) {
    throw new Error("preview gesture swipe duration must be positive");
  }
  if (!Number.isFinite(releaseMs) || releaseMs <= 0) {
    throw new Error("preview gesture release duration must be positive");
  }
  if (!Number.isFinite(travelRatio) || travelRatio <= 0 || travelRatio >= 1) {
    throw new Error("preview gesture travel ratio must be between 0 and 1");
  }

  const clampedElapsedMs = Math.max(0, elapsedMs);
  if (clampedElapsedMs < fadeInMs) {
    return {
      offsetRatio: 0,
      handOpacity: clampedElapsedMs / fadeInMs,
      complete: false,
    };
  }

  const swipeElapsedMs = clampedElapsedMs - fadeInMs;
  if (swipeElapsedMs < swipeMs) {
    const progress = swipeElapsedMs / swipeMs;
    const easedProgress =
      progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    return {
      offsetRatio: travelRatio * easedProgress,
      handOpacity: 1,
      complete: false,
    };
  }

  const releaseElapsedMs = swipeElapsedMs - swipeMs;
  if (releaseElapsedMs < releaseMs) {
    return {
      offsetRatio: travelRatio,
      handOpacity: 1 - releaseElapsedMs / releaseMs,
      complete: false,
    };
  }

  return {
    offsetRatio: travelRatio,
    handOpacity: 0,
    complete: true,
  };
}

export function defaultGameOverSubtitle(reason: GameOverReason | null): string {
  if (reason === "no_moves") {
    return "no move possible";
  }
  return "run complete";
}

export function buildGameOverSubtitle(options: {
  reason: GameOverReason | null;
  result: GameOverResult;
  finalScore: number;
  previousRank: number | null;
  nextRank: number | null;
}): string {
  if (options.result === "new_best") {
    void options;
    return "new high score";
  }
  if (options.result === "first_recorded") {
    return "first recorded score";
  }
  return defaultGameOverSubtitle(options.reason);
}

export function shouldSnapbackDragOnHudPointerUp(options: {
  hasDrag: boolean;
  dragPreviewOffsetPx: number | null;
}): boolean {
  if (!options.hasDrag) {
    return false;
  }
  return options.dragPreviewOffsetPx !== null && Math.abs(options.dragPreviewOffsetPx) >= 1;
}

export function shouldShowRestartInterstitial(options: {
  previewModeActive: boolean;
  screen: Screen;
  runMoves: number;
  runElapsedMs: number;
  shownThisRun: boolean;
  lastInterstitialShownAt: number | null;
  sessionStartedAt: number;
  now: number;
  minRunMoves: number;
  minRunMs: number;
  cooldownMs: number;
}): boolean {
  if (options.previewModeActive || options.screen !== "gameover" || options.shownThisRun) {
    return false;
  }
  if (options.runElapsedMs < options.minRunMs && options.runMoves < options.minRunMoves) {
    return false;
  }
  const lastAnchor = options.lastInterstitialShownAt ?? options.sessionStartedAt;
  return options.now - lastAnchor >= options.cooldownMs;
}

export function shouldAnimatePreviewRestart(options: {
  previewModeActive: boolean;
  screen: Screen;
  restartAt: number | null;
  now: number;
}): boolean {
  return (
    options.previewModeActive &&
    options.screen === "gameover" &&
    options.restartAt !== null &&
    options.now >= options.restartAt
  );
}

export function calculateComboStageDuration(options: {
  baseMs: number;
  comboDepth: number;
  multiplier: number;
  minMs: number;
}): number {
  if (!Number.isFinite(options.baseMs) || options.baseMs <= 0) {
    throw new Error("combo stage base duration must be a positive finite number");
  }
  if (!Number.isSafeInteger(options.comboDepth) || options.comboDepth < 1) {
    throw new Error("combo stage depth must be a positive integer");
  }
  if (!Number.isFinite(options.multiplier) || options.multiplier <= 0 || options.multiplier >= 1) {
    throw new Error("combo stage multiplier must be greater than 0 and less than 1");
  }
  if (!Number.isFinite(options.minMs) || options.minMs <= 0 || options.minMs > options.baseMs) {
    throw new Error("combo stage minimum duration must be positive and no greater than the base duration");
  }

  const scaledMs = options.baseMs * Math.pow(options.multiplier, options.comboDepth - 1);
  return Math.max(options.minMs, Math.round(scaledMs));
}

export function waitForRestartInterstitial<T>(
  interstitial: Promise<T>,
  timeoutMs: number,
  timers: RestartInterstitialTimers = globalThis,
): Promise<RestartInterstitialWaitResult<T>> {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new Error("restart interstitial timeout must be a non-negative finite number");
  }

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = timers.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      timeoutId = null;
      resolve({ status: "timeout" });
    }, timeoutMs);

    const finish = (result: RestartInterstitialWaitResult<T>): void => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeoutId !== null) {
        timers.clearTimeout(timeoutId);
        timeoutId = null;
      }
      resolve(result);
    };

    interstitial.then(
      (value) => finish({ status: "resolved", value }),
      (error: unknown) => finish({ status: "rejected", error }),
    );
  });
}
