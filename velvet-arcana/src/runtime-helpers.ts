type Screen = "playing" | "gameover";

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
