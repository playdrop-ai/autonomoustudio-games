type GameOverReason = "no_moves" | null;
type GameOverResult = "normal" | "new_best" | "first_recorded";
type Screen = "playing" | "losing" | "gameover";

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
