/// <reference types="playdrop-sdk-types" />

import { DEFAULT_DIFFICULTY, DIFFICULTIES } from "./game/data";
import { CanvasRenderer } from "./game/render";
import {
  createDebugSnapshot,
  createInitialState,
  difficultyLabel,
  progressPercent,
  revealCell,
  setFlagMode,
  stepGame,
  toggleFlag,
  toggleFlagMode,
} from "./game/sim";
import type { DifficultyKey, GameState, LayoutMetrics, RunState } from "./game/types";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
    __relaylineDebug?: {
      getState: () => ReturnType<typeof createDebugSnapshot>;
      startRun: (difficulty: DifficultyKey) => void;
      revealCell: (col: number, row: number) => boolean;
      flagCell: (col: number, row: number) => boolean;
      setFlagMode: (next: boolean) => void;
    };
  }
}

type HostLoadingState = {
  status: "loading" | "ready" | "error";
  message?: string;
  progress?: number;
};

type HostBridge = {
  setLoadingState: (state: HostLoadingState) => void;
  ready: () => void;
};

type RuntimeHost = {
  setLoadingState?: (state: HostLoadingState) => void;
  ready?: () => void;
};

type UI = {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  hud: HTMLElement;
  timerValue: HTMLElement;
  surgePips: HTMLElement[];
  flagChip: HTMLButtonElement;
  flagState: HTMLElement;
  startOverlay: HTMLElement;
  gameoverOverlay: HTMLElement;
  playButtons: HTMLButtonElement[];
  retryButton: HTMLButtonElement;
  retryDifficultyButton: HTMLButtonElement;
  overlayTitle: HTMLElement;
  overlayCopy: HTMLElement;
  resultMeta: HTMLElement;
};

type BestTimes = Record<DifficultyKey, number>;

const BEST_TIMES_KEY = "relayline-best-times";

void (async () => {
  const host = await createHostBridge();

  document.title = "Relayline";
  injectStyles();
  const ui = createUI();

  let difficulty: DifficultyKey = DEFAULT_DIFFICULTY;
  let seed = readSeedFromLocation();
  let state = createInitialState(difficulty, seed);
  const renderer = new CanvasRenderer(ui.canvas);
  let bestTimes = readBestTimes();
  let screen: "start" | "playing" | "gameover" = "start";
  let lastFrame = performance.now();

  function startRun(nextDifficulty: DifficultyKey): void {
    difficulty = nextDifficulty;
    seed = readSeedFromLocation();
    state = createInitialState(nextDifficulty, seed);
    screen = "playing";
    setFlagMode(state, false);
    syncLayout();
    renderFrame();
  }

  function finishRun(): void {
    screen = "gameover";
    if (state.runState === "won") {
      const currentBest = bestTimes[difficulty];
      if (currentBest === 0 || state.elapsedMs < currentBest) {
        bestTimes = {
          ...bestTimes,
          [difficulty]: state.elapsedMs,
        };
        localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(bestTimes));
      }
    }
  }

  function syncLayout(): void {
    renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1, state);
    const layout = renderer.getLayout();
    applyLayoutVariables(ui.root, layout);
  }

  function renderFrame(): void {
    renderer.render(state);
    updateHUD(ui, state, screen, bestTimes);
    updateDebug(state, difficulty, bestTimes, startRun);
  }

  function advanceFrame(dtMs: number): void {
    stepGame(state, dtMs);
    if (screen === "playing" && state.runState !== "playing") {
      finishRun();
    }
  }

  function frame(now: number): void {
    const dt = Math.min(32, now - lastFrame);
    lastFrame = now;
    advanceFrame(dt);
    renderFrame();
    requestAnimationFrame(frame);
  }

  function handleBoardAction(event: PointerEvent, flagAction: boolean): void {
    if (screen !== "playing") return;
    const target = renderer.pickCell(event.clientX, event.clientY, state);
    if (!target) return;

    const changed = flagAction ? toggleFlag(state, target.col, target.row) : revealCell(state, target.col, target.row);
    if (changed && state.runState !== "playing") {
      finishRun();
    }
    renderFrame();
  }

  ui.canvas.addEventListener("pointerdown", (event) => {
    if (screen !== "playing") return;
    if (event.pointerType === "mouse" && event.button === 2) {
      handleBoardAction(event, true);
      return;
    }
    handleBoardAction(event, state.flagMode);
  });

  ui.canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  ui.flagChip.addEventListener("click", () => {
    if (screen !== "playing") return;
    toggleFlagMode(state);
    renderFrame();
  });

  for (const button of ui.playButtons) {
    button.addEventListener("click", () => {
      const nextDifficulty = button.dataset.difficulty as DifficultyKey | undefined;
      if (!nextDifficulty) throw new Error("missing_difficulty_button_dataset");
      startRun(nextDifficulty);
    });
  }

  ui.retryButton.addEventListener("click", () => {
    startRun(difficulty);
  });

  ui.retryDifficultyButton.addEventListener("click", () => {
    screen = "start";
    renderFrame();
  });

  window.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && screen !== "playing") {
      event.preventDefault();
      startRun(difficulty);
      return;
    }
    if (screen !== "playing") return;
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      toggleFlagMode(state);
      renderFrame();
    } else if (event.key === "Escape") {
      setFlagMode(state, false);
      renderFrame();
    } else if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      startRun(difficulty);
    }
  });

  window.addEventListener("resize", () => {
    syncLayout();
    renderFrame();
  });

  window.advanceTime = async (ms: number) => {
    if (screen !== "playing") {
      startRun(difficulty);
    }
    let remaining = ms;
    while (remaining > 0 && state.runState === "playing") {
      const step = Math.min(16, remaining);
      advanceFrame(step);
      remaining -= step;
    }
    renderFrame();
  };

  syncLayout();
  renderFrame();
  host.ready();
  requestAnimationFrame(frame);
})().catch((error) => {
  const playdrop = window.playdrop;
  playdrop?.host?.setLoadingState?.({
    status: "error",
    message: String(error),
  });
  throw error;
});

function createUI(): UI {
  const root = requireElement<HTMLElement>("app");
  root.innerHTML = `
    <div class="relayline-shell">
      <canvas id="relayline-canvas"></canvas>
      <div class="relayline-ui">
        <div class="relayline-hud" aria-hidden="true">
          <div class="relayline-chip">
            <div class="relayline-chip__label">Time</div>
            <div class="relayline-chip__value" data-role="timer">--:--</div>
          </div>
          <div class="relayline-chip relayline-chip--surges">
            <div class="relayline-chip__label">Surges</div>
            <div class="relayline-surges">
              <span class="relayline-surge" data-surge="0"></span>
              <span class="relayline-surge" data-surge="1"></span>
              <span class="relayline-surge" data-surge="2"></span>
            </div>
          </div>
        </div>

        <button class="relayline-flag-chip" type="button">
          <span class="relayline-flag-chip__icon">⚑</span>
          <span class="relayline-flag-chip__copy">
            <span class="relayline-flag-chip__eyebrow">Flag mode</span>
            <span class="relayline-flag-chip__state" data-role="flag-state">Standby</span>
          </span>
        </button>

        <section class="relayline-overlay relayline-overlay--start is-active" data-role="start-overlay">
          <div class="relayline-overlay__eyebrow">Start run</div>
          <h1 class="relayline-overlay__title">Light the route</h1>
          <p class="relayline-overlay__copy">
            Reveal safe cells, flag shorts, and connect the source to the relay before the third surge burns the board.
          </p>
          <div class="relayline-button-row">
            <button type="button" class="relayline-pill relayline-pill--primary" data-difficulty="warm">Warm</button>
            <button type="button" class="relayline-pill" data-difficulty="live">Live</button>
            <button type="button" class="relayline-pill" data-difficulty="deep">Deep</button>
          </div>
        </section>

        <section class="relayline-overlay relayline-overlay--gameover" data-role="gameover-overlay">
          <div class="relayline-overlay__eyebrow" data-role="result-eyebrow">Run complete</div>
          <h2 class="relayline-overlay__title" data-role="result-title">Circuit restored</h2>
          <p class="relayline-overlay__copy" data-role="result-copy"></p>
          <div class="relayline-result-meta" data-role="result-meta"></div>
          <div class="relayline-button-row">
            <button type="button" class="relayline-pill relayline-pill--primary" data-role="retry-run">Retry</button>
            <button type="button" class="relayline-pill" data-role="retry-difficulty">Choose difficulty</button>
          </div>
        </section>
      </div>
    </div>
  `;

  const canvas = requireElement<HTMLCanvasElement>("relayline-canvas");
  const timerValue = requireRole("timer");
  const flagState = requireRole("flag-state");
  const startOverlay = requireRole("start-overlay");
  const gameoverOverlay = requireRole("gameover-overlay");
  const resultTitle = requireRole("result-title");
  const resultCopy = requireRole("result-copy");
  const resultMeta = requireRole("result-meta");
  const retryButton = requireRole<HTMLButtonElement>("retry-run");
  const retryDifficultyButton = requireRole<HTMLButtonElement>("retry-difficulty");
  const flagChip = root.querySelector<HTMLButtonElement>(".relayline-flag-chip");
  if (!flagChip) {
    throw new Error("flag_chip_missing");
  }

  const surgePips = [...root.querySelectorAll<HTMLElement>(".relayline-surge")];
  if (surgePips.length !== 3) {
    throw new Error("surge_pips_missing");
  }

  const playButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-difficulty]")];
  if (playButtons.length !== 3) {
    throw new Error("difficulty_buttons_missing");
  }

  return {
    root,
    canvas,
    hud: requireElement("app"),
    timerValue,
    surgePips,
    flagChip,
    flagState,
    startOverlay,
    gameoverOverlay,
    playButtons,
    retryButton,
    retryDifficultyButton,
    overlayTitle: resultTitle,
    overlayCopy: resultCopy,
    resultMeta,
  };

  function requireRole<T extends HTMLElement = HTMLElement>(role: string): T {
    const element = root.querySelector<T>(`[data-role="${role}"]`);
    if (!element) {
      throw new Error(`ui_role_missing:${role}`);
    }
    return element;
  }
}

function updateHUD(ui: UI, state: GameState, screen: "start" | "playing" | "gameover", bestTimes: BestTimes): void {
  ui.timerValue.textContent = screen === "start" ? "--:--" : formatTime(state.elapsedMs);
  ui.flagState.textContent = state.flagMode ? "Armed" : "Standby";
  ui.flagChip.classList.toggle("is-on", state.flagMode && screen === "playing");
  ui.flagChip.disabled = screen !== "playing";

  for (let index = 0; index < ui.surgePips.length; index += 1) {
    const pip = ui.surgePips[index];
    if (!pip) continue;
    pip.classList.toggle("is-on", index >= state.surgesUsed);
    pip.classList.toggle("is-spent", index < state.surgesUsed);
  }

  ui.startOverlay.classList.toggle("is-active", screen === "start");
  ui.gameoverOverlay.classList.toggle("is-active", screen === "gameover");

  if (screen === "gameover") {
    const bestTime = bestTimes[state.difficultyKey];
    const won = state.runState === "won";
    ui.overlayTitle.textContent = won ? "Circuit restored" : "Circuit lost";
    ui.overlayCopy.textContent = won
      ? `You cleared the ${difficultyLabel(state.difficultyKey)} board in ${formatTime(state.elapsedMs)}.`
      : `The third overload burned the route. Current reached ${progressPercent(state)}% of the safe grid.`;
    ui.resultMeta.textContent = won
      ? bestTime > 0
        ? `Best ${difficultyLabel(state.difficultyKey)} time: ${formatTime(bestTime)}`
        : `First ${difficultyLabel(state.difficultyKey)} clear`
      : `Best ${difficultyLabel(state.difficultyKey)} time: ${bestTime > 0 ? formatTime(bestTime) : "none yet"}`;
  }
}

function updateDebug(
  state: GameState,
  difficulty: DifficultyKey,
  bestTimes: BestTimes,
  startRun: (difficulty: DifficultyKey) => void,
): void {
  window.__relaylineDebug = {
    getState: () => createDebugSnapshot(state),
    startRun,
    revealCell: (col, row) => revealCell(state, col, row),
    flagCell: (col, row) => toggleFlag(state, col, row),
    setFlagMode: (next) => setFlagMode(state, next),
  };

  window.render_game_to_text = () =>
    JSON.stringify(
      {
        ...createDebugSnapshot(state),
        bestTimes,
        currentDifficulty: difficulty,
      },
      null,
      2,
    );
}

function readBestTimes(): BestTimes {
  try {
    const raw = localStorage.getItem(BEST_TIMES_KEY);
    if (!raw) {
      return { warm: 0, live: 0, deep: 0 };
    }
    const parsed = JSON.parse(raw) as Partial<BestTimes>;
    return {
      warm: toFinite(parsed.warm),
      live: toFinite(parsed.live),
      deep: toFinite(parsed.deep),
    };
  } catch {
    return { warm: 0, live: 0, deep: 0 };
  }
}

function readSeedFromLocation(): number {
  const raw = new URLSearchParams(window.location.search).get("seed");
  return raw ? Number(raw) : Date.now();
}

function applyLayoutVariables(root: HTMLElement, layout: LayoutMetrics): void {
  root.style.setProperty("--stage-x", `${layout.stageX}px`);
  root.style.setProperty("--stage-y", `${layout.stageY}px`);
  root.style.setProperty("--stage-width", `${layout.stageWidth}px`);
  root.style.setProperty("--stage-height", `${layout.stageHeight}px`);
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function injectStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --ink: #e7f2ff;
      --ink-soft: #8ba6c3;
      --ink-dim: #62809f;
      --panel-line: rgba(133, 179, 255, 0.14);
      --shadow-strong: 0 26px 64px rgba(0, 0, 0, 0.46);
      --shadow-soft: 0 12px 28px rgba(0, 0, 0, 0.28);
      --font-display: "Eurostile", "Avenir Next Condensed", "Trebuchet MS", sans-serif;
      --font-body: "Avenir Next", "Segoe UI", sans-serif;
    }

    * { box-sizing: border-box; }

    html,
    body,
    #app,
    .relayline-shell {
      margin: 0;
      width: 100%;
      height: 100%;
    }

    body {
      overflow: hidden;
      color: var(--ink);
      font-family: var(--font-body);
      background: #04070c;
    }

    .relayline-shell {
      position: relative;
    }

    #relayline-canvas {
      display: block;
      width: 100%;
      height: 100%;
      touch-action: none;
    }

    .relayline-ui {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .relayline-hud {
      position: absolute;
      top: calc(var(--stage-y) + 14px);
      left: calc(var(--stage-x) + 14px);
      width: calc(var(--stage-width) - 28px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      pointer-events: none;
    }

    .relayline-chip {
      display: inline-flex;
      flex-direction: column;
      gap: 4px;
      min-width: 84px;
      padding: 12px 14px;
      border-radius: 20px;
      border: 1px solid var(--panel-line);
      background: rgba(10, 16, 25, 0.84);
      box-shadow: var(--shadow-soft);
      backdrop-filter: blur(8px);
    }

    .relayline-chip--surges {
      align-items: flex-end;
    }

    .relayline-chip__label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--ink-dim);
    }

    .relayline-chip__value {
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.04em;
    }

    .relayline-surges {
      display: flex;
      gap: 6px;
    }

    .relayline-surge {
      width: 16px;
      height: 16px;
      border-radius: 999px;
      background: rgba(255, 91, 102, 0.08);
      box-shadow: inset 0 0 0 1px rgba(255, 91, 102, 0.08);
    }

    .relayline-surge.is-on {
      background: radial-gradient(circle at 35% 35%, #ffd1d4, #ff5b66 62%);
      box-shadow:
        inset 0 -1px 0 rgba(103, 17, 32, 0.38),
        0 0 12px rgba(255, 91, 102, 0.32);
    }

    .relayline-surge.is-spent {
      background: rgba(255, 91, 102, 0.04);
    }

    .relayline-flag-chip {
      position: absolute;
      left: 50%;
      bottom: calc(var(--stage-y) + 18px);
      transform: translateX(-50%);
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 14px 18px;
      border-radius: 999px;
      border: 1px solid rgba(255, 154, 56, 0.2);
      background:
        linear-gradient(180deg, rgba(255, 154, 56, 0.12), rgba(10, 16, 25, 0.9)),
        rgba(10, 16, 25, 0.9);
      box-shadow: var(--shadow-soft);
      color: var(--ink);
      pointer-events: auto;
      cursor: pointer;
    }

    .relayline-flag-chip:disabled {
      opacity: 0.75;
      cursor: default;
    }

    .relayline-flag-chip.is-on {
      border-color: rgba(255, 154, 56, 0.4);
      box-shadow:
        var(--shadow-soft),
        0 0 20px rgba(255, 154, 56, 0.16);
    }

    .relayline-flag-chip__eyebrow {
      display: block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--ink-dim);
    }

    .relayline-flag-chip__state {
      display: block;
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .relayline-overlay {
      position: absolute;
      left: calc(var(--stage-x) + 18px);
      right: calc(var(--stage-x) + 18px);
      bottom: calc(var(--stage-y) + 96px);
      display: none;
      padding: 18px 18px 20px;
      border-radius: 26px;
      border: 1px solid var(--panel-line);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 18%),
        rgba(10, 16, 25, 0.94);
      box-shadow: var(--shadow-soft);
      backdrop-filter: blur(12px);
      pointer-events: auto;
    }

    .relayline-overlay.is-active {
      display: block;
    }

    .relayline-overlay--gameover {
      border-color: rgba(255, 91, 102, 0.22);
    }

    .relayline-overlay__eyebrow {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--ink-dim);
    }

    .relayline-overlay__title {
      margin: 8px 0 0;
      font-family: var(--font-display);
      font-size: 34px;
      font-weight: 900;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .relayline-overlay__copy {
      margin: 10px 0 0;
      font-size: 16px;
      line-height: 1.45;
      color: var(--ink-soft);
    }

    .relayline-result-meta {
      margin-top: 12px;
      font-size: 14px;
      color: var(--ink-dim);
    }

    .relayline-button-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }

    .relayline-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 96px;
      padding: 12px 14px;
      border-radius: 999px;
      border: 1px solid rgba(74, 240, 255, 0.2);
      background: rgba(10, 16, 25, 0.76);
      color: var(--ink);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
    }

    .relayline-pill--primary {
      border-color: rgba(74, 240, 255, 0.38);
      box-shadow: 0 0 18px rgba(74, 240, 255, 0.12);
    }

    @media (max-width: 640px) {
      .relayline-overlay__title {
        font-size: 30px;
      }

      .relayline-overlay {
        bottom: calc(var(--stage-y) + 92px);
      }
    }
  `;
  document.head.appendChild(style);
}

async function createHostBridge(): Promise<HostBridge> {
  const playdrop = window.playdrop;
  if (!playdrop) {
    return {
      setLoadingState: () => undefined,
      ready: () => undefined,
    };
  }

  const hasHostedChannel = new URLSearchParams(window.location.search).has("playdrop_channel");
  if (!playdrop.init || !hasHostedChannel) {
    const runtimeHost = playdrop.host as RuntimeHost | undefined;
    return {
      setLoadingState: (state) => {
        runtimeHost?.setLoadingState?.(state);
      },
      ready: () => {
        if (typeof runtimeHost?.ready === "function") {
          runtimeHost.ready();
          return;
        }
        runtimeHost?.setLoadingState?.({ status: "ready" });
      },
    };
  }

  const sdk = await playdrop.init();
  const runtimeHost = sdk.host as RuntimeHost;
  return {
    setLoadingState: (state) => {
      runtimeHost.setLoadingState?.(state);
    },
    ready: () => {
      if (typeof runtimeHost.ready === "function") {
        runtimeHost.ready();
        return;
      }
      runtimeHost.setLoadingState?.({ status: "ready" });
    },
  };
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`missing_element:${id}`);
  }
  return element as T;
}

function toFinite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
