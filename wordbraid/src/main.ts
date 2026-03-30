/// <reference types="playdrop-sdk-types" />

import { hasPrefix, isWord } from "./game/dictionary.ts";
import {
  MAX_WORD_LENGTH,
  MIN_WORD_LENGTH,
  commitWord,
  createInitialState,
  findCandidateWords,
  previewPulls,
  summarizeThreats,
  type CommitResult,
  type GameState,
  type Ribbon,
  type Screen,
} from "./game/logic.ts";
import { CanvasRenderer } from "./game/render.ts";
import { createUI, updateUI, type UIModel } from "./ui/dom.ts";

declare global {
  interface Window {
    __wordbraidDebug?: {
      screen: Screen;
    score: number;
    combo: number;
    bestScore: number;
    bestCombo: number;
    trayWord: string;
    pulls: number[];
    ribbons: string[];
    topCandidates: Array<{ word: string; pulls: number[] }>;
    threats: Array<{ index: number; dangerScore: number; firstInkIndex: number; inkCount: number }>;
  };
    __wordbraidControls?: {
      start: () => void;
      retry: () => void;
      selectRibbon: (index: number) => void;
      submit: () => void;
      undo: () => void;
      clear: () => void;
      advanceTime: (ms: number) => void;
    };
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

const BEST_SCORE_KEY = "wordbraid-best-score";
const FRAME_DECAY_MS = 16;

void (async () => {
  const host = await createHostBridge();
  host.setLoadingState({ status: "loading", message: "Threading the press", progress: 0.18 });

  const ui = createUI();
  const renderer = new CanvasRenderer(ui.canvas);
  const forcedSeed = readSeedFromLocation();

  let screen: Screen = "start";
  let state = createInitialState(forcedSeed);
  let bestScore = readBestScore();
  let bestCombo = 0;
  let pulls: number[] = [];
  let accent = 0;
  let invalidFlash = 0;
  let statusMessage: string | null = null;
  let frameStamp = performance.now();

  function startRun(): void {
    state = createInitialState(forcedSeed);
    screen = "playing";
    bestCombo = 0;
    pulls = [];
    accent = 0.9;
    invalidFlash = 0;
    statusMessage = null;
    sync();
  }

  function showInvalid(message = "That braid does not fit."): void {
    invalidFlash = 1;
    statusMessage = message;
    sync();
  }

  function tryPull(ribbonIndex: number): void {
    if (screen !== "playing" || state.gameOver || pulls.length >= MAX_WORD_LENGTH) return;
    const nextPulls = [...pulls, ribbonIndex];
    const preview = previewPulls(state.ribbons, nextPulls);
    if (preview.blocked) {
      showInvalid();
      return;
    }
    const nextWord = preview.word.toLowerCase();
    if (!hasPrefix(nextWord)) {
      showInvalid();
      return;
    }
    pulls = nextPulls;
    accent = 1;
    statusMessage = null;
    sync();
  }

  function undoPull(): void {
    if (screen !== "playing" || pulls.length === 0) return;
    pulls = pulls.slice(0, -1);
    statusMessage = null;
    sync();
  }

  function clearPulls(): void {
    if (screen !== "playing" || pulls.length === 0) return;
    pulls = [];
    statusMessage = null;
    sync();
  }

  function submitWord(): void {
    if (screen !== "playing" || pulls.length < MIN_WORD_LENGTH) {
      showInvalid();
      return;
    }
    const result = previewCommitResult(state, pulls);
    if (!result) {
      showInvalid("That braid stalls the loom.");
      return;
    }

    state = result.state;
    pulls = [];
    accent = 1;
    invalidFlash = 0;
    statusMessage = `${result.word.toUpperCase()} +${result.scoreGain}`;
    bestCombo = Math.max(bestCombo, state.combo);

    if (state.score > bestScore) {
      bestScore = state.score;
      writeBestScore(bestScore);
    }

    if (state.gameOver) {
      screen = "gameover";
    }

    sync();
  }

  function sync(): void {
    const previewCommit = previewCommitResult(state, pulls);
    publishDebug();
    updateUI(ui, createUIModel(screen, state, bestScore, bestCombo, pulls, previewCommit, statusMessage));
  }

  function publishDebug(): void {
    const preview = previewPulls(state.ribbons, pulls);
    window.__wordbraidDebug = {
      screen,
      score: state.score,
      combo: state.combo,
      bestScore,
      bestCombo,
      trayWord: preview.word,
      pulls: pulls.slice(),
      ribbons: state.ribbons.map(describeRibbon),
      topCandidates: findSafeCandidates(state, 6).map((candidate) => ({
        word: candidate.word,
        pulls: candidate.pulls.slice(),
      })),
      threats: summarizeThreats(state.ribbons).map((threat) => ({
        index: threat.index,
        dangerScore: threat.dangerScore,
        firstInkIndex: threat.firstInkIndex,
        inkCount: threat.inkCount,
      })),
    };
  }

  function render(now: number): void {
    const deltaMs = Math.min(34, now - frameStamp);
    frameStamp = now;
    tick(deltaMs);
    renderer.render({
      ribbons: state.ribbons,
      screen,
      pulls,
      previewWord: previewPulls(state.ribbons, pulls).word,
      accent,
      invalidFlash,
      lastThreatRibbon: state.lastThreatRibbon,
    });
    requestAnimationFrame(render);
  }

  function tick(deltaMs: number): void {
    accent = Math.max(0, accent - deltaMs / 650);
    invalidFlash = Math.max(0, invalidFlash - deltaMs / 360);
  }

  function advanceTime(ms: number): void {
    const steps = Math.max(1, Math.ceil(ms / FRAME_DECAY_MS));
    const deltaMs = ms / steps;
    for (let step = 0; step < steps; step += 1) {
      tick(deltaMs);
    }
    sync();
  }

  ui.startButton.addEventListener("click", startRun);
  ui.retryButton.addEventListener("click", startRun);
  ui.weaveButton.addEventListener("click", submitWord);
  ui.clearButton.addEventListener("click", clearPulls);

  ui.traySlots.forEach((slot, index) => {
    slot.addEventListener("click", () => {
      if (screen !== "playing" || pulls.length === 0) return;
      if (index === pulls.length - 1) undoPull();
    });
  });

  ui.canvas.addEventListener("pointerdown", (event) => {
    if (screen !== "playing") return;
    const ribbonIndex = renderer.locateRibbon(event.clientX, event.clientY);
    if (ribbonIndex == null) return;
    tryPull(ribbonIndex);
  });

  document.addEventListener("keydown", (event) => {
    if (screen === "start" && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      startRun();
      return;
    }

    if (screen === "gameover" && event.key.toLowerCase() === "r") {
      event.preventDefault();
      startRun();
      return;
    }

    if (screen !== "playing") return;

    if (/^[1-5]$/.test(event.key)) {
      event.preventDefault();
      tryPull(Number.parseInt(event.key, 10) - 1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      submitWord();
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      undoPull();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      clearPulls();
    }
  });

  window.addEventListener("resize", () => {
    renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  });

  window.__wordbraidControls = {
    start: startRun,
    retry: startRun,
    selectRibbon: tryPull,
    submit: submitWord,
    undo: undoPull,
    clear: clearPulls,
    advanceTime,
  };
  window.render_game_to_text = () => renderGameToText(screen, state, bestScore, bestCombo, pulls);
  window.advanceTime = advanceTime;

  sync();
  host.setLoadingState({ status: "ready" });
  requestAnimationFrame(render);
})().catch((error) => {
  const playdrop = window.playdrop;
  if (playdrop) {
    playdrop.host.setLoadingState({
      status: "error",
      message: String(error),
    });
  }
  throw error;
});

function describeRibbon(ribbon: Ribbon): string {
  return ribbon
    .map((tile) => (tile.kind === "ink" ? "#" : tile.letter.toUpperCase()))
    .join("");
}

function createUIModel(
  screen: Screen,
  state: GameState,
  bestScore: number,
  bestCombo: number,
  pulls: number[],
  previewCommit: CommitResult | null,
  statusMessage: string | null,
): UIModel {
  const preview = previewPulls(state.ribbons, pulls);
  const trayWord = preview.word.toUpperCase();
  const threatSummary = summarizeThreats(state.ribbons).sort((left, right) => right.dangerScore - left.dangerScore)[0];
  const threatText =
    !threatSummary || threatSummary.inkCount === 0
      ? "Quiet"
      : threatSummary.firstInkIndex <= 1
        ? "Critical"
        : threatSummary.firstInkIndex <= 2
          ? "Hot"
          : "Rising";
  const inkTotal = state.ribbons.flat().filter((tile) => tile.kind === "ink").length;
  const trayValid = trayWord.length >= MIN_WORD_LENGTH && findPreviewIsValid(preview.word) && previewCommit != null;

  let helperText = "Build a 3-to-5-letter word.";
  if (screen === "start") {
    helperText = "Tap ribbons to pull letters. Longer words scrub ink.";
  } else if (screen === "gameover") {
    helperText = "Ink reached the front of the press.";
  } else if (statusMessage) {
    helperText = statusMessage;
  } else if (trayWord.length >= MIN_WORD_LENGTH && previewCommit == null) {
    helperText = "That braid would stall the loom.";
  } else if (pulls.length > 0 && !trayValid) {
    helperText = "That braid is not a valid word yet.";
  }

  return {
    screen,
    score: state.score,
    bestScore,
    combo: state.combo,
    bestCombo,
    wordsPlayed: state.wordsPlayed,
    threatText,
    threatDetail: inkTotal === 0 ? "No ink in the loom" : `${inkTotal} ink tiles live`,
    trayLetters: trayWord.split(""),
    trayWord,
    trayValid,
    canSubmit: screen === "playing" && trayValid,
    canClear: screen === "playing" && pulls.length > 0,
    helperText,
  };
}

function findPreviewIsValid(word: string): boolean {
  if (word.length < MIN_WORD_LENGTH || word.length > MAX_WORD_LENGTH) return false;
  return isWord(word);
}

function previewCommitResult(state: GameState, pulls: number[]): CommitResult | null {
  if (pulls.length < MIN_WORD_LENGTH || pulls.length > MAX_WORD_LENGTH) return null;
  try {
    return commitWord(state, pulls);
  } catch {
    return null;
  }
}

function findSafeCandidates(state: GameState, limit: number) {
  const candidates = findCandidateWords(state.ribbons, Math.max(limit * 3, 18));
  const safe = [];
  for (const candidate of candidates) {
    if (previewCommitResult(state, candidate.pulls) == null) continue;
    safe.push(candidate);
    if (safe.length >= limit) break;
  }
  return safe;
}

function renderGameToText(
  screen: Screen,
  state: GameState,
  bestScore: number,
  bestCombo: number,
  pulls: number[],
): string {
  const preview = previewPulls(state.ribbons, pulls);
  const threats = summarizeThreats(state.ribbons)
    .map((threat) => `r${threat.index + 1}:${threat.firstInkIndex < 0 ? "-" : threat.firstInkIndex}/${threat.inkCount}`)
    .join(" ");
  return [
    `screen=${screen} score=${state.score} combo=${state.combo} best=${bestScore} runBestCombo=${bestCombo}`,
    `tray=${preview.word.toUpperCase() || "-"} pulls=${pulls.map((value) => value + 1).join(",") || "-"}`,
    `ribbons=${state.ribbons.map(describeRibbon).join(" | ")}`,
    `threats=${threats || "-"}`,
  ].join("\n");
}

function readBestScore(): number {
  const raw = window.localStorage.getItem(BEST_SCORE_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function readSeedFromLocation(): number | undefined {
  const raw = new URL(window.location.href).searchParams.get("seed");
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed >>> 0 : undefined;
}

function writeBestScore(score: number): void {
  window.localStorage.setItem(BEST_SCORE_KEY, String(score));
}

async function createHostBridge(): Promise<{
  setLoadingState: (state: { status: "loading" | "ready" | "error"; message?: string; progress?: number }) => void;
}> {
  const playdrop = window.playdrop;
  if (!playdrop) {
    return {
      setLoadingState: () => undefined,
    };
  }

  try {
    const sdk = await playdrop.init();
    return {
      setLoadingState: (state) => {
        sdk.host.setLoadingState(state);
      },
    };
  } catch {
    return {
      setLoadingState: (state) => {
        playdrop.host?.setLoadingState?.(state);
      },
    };
  }
}
