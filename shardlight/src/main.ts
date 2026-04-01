/// <reference types="playdrop-sdk-types" />

import { BOT_ACTION_DELAY_MS, applyBotAction, chooseBotAction, type BotMode } from "./bots";
import { BOARD_COLS, boardSnapshot, chordCell, countFlags, createInitialState, createNextChamber, toggleFlag, uncoverCell, type ActionResult, type GameState } from "./game";
import { styles } from "./styles";

type OverlayState = "start" | "playing" | "gameover";

interface HostLoadingState {
  status: "loading" | "ready" | "error";
  message?: string;
  progress?: number;
}

interface HostBridge {
  setLoadingState: (state: HostLoadingState) => void;
  ready: () => void;
}

interface AppRefs {
  boardShell: HTMLElement;
  board: HTMLElement;
  mural: HTMLElement;
  scoreValue: HTMLElement;
  chamberValue: HTMLElement;
  startSheet: HTMLElement;
  gameoverSheet: HTMLElement;
  gameoverScore: HTMLElement;
  gameoverDepth: HTMLElement;
  gameoverBest: HTMLElement;
  startButton: HTMLButtonElement;
  retryButton: HTMLButtonElement;
}

interface TouchPress {
  timerId: number | null;
  index: number | null;
  fired: boolean;
}

declare global {
  interface Window {
    __shardlightDebug?: {
      overlay: OverlayState;
      clearing: boolean;
      score: number;
      chamber: number;
      chambersCleared: number;
      bestScore: number;
      mineCount: number;
      flagCount: number;
      remainingSafe: number;
      board: string[];
    };
    __shardlightControls?: {
      startRun: () => void;
      clickIndex: (index: number) => void;
      flagIndex: (index: number) => void;
      getState: () => NonNullable<Window["__shardlightDebug"]>;
    };
  }
}

const BEST_SCORE_KEY = "shardlight-best-score";
const CLEAR_DELAY_MS = 460;
const LONG_PRESS_MS = 320;
const START_PREVIEW_INDEX = BOARD_COLS + 1;

void (async () => {
  const host = await createHostBridge();
  host.setLoadingState({ status: "loading", message: "Unearthing the chamber", progress: 0.18 });

  injectStyles();
  const refs = createApp();

  const seed = readSeedFromLocation();
  const autoplayMode = readAutoplayMode();
  const autostart = readAutostartFlag();
  let state = createStartPreview(seed);
  let bestScore = readBestScore();
  let overlay: OverlayState = "start";
  let clearing = false;
  let clearTimerId: number | null = null;
  let autoplayTimerId: number | null = null;
  let suppressedClickUntil = 0;
  const touchPress: TouchPress = {
    timerId: null,
    index: null,
    fired: false,
  };

  refs.startButton.addEventListener("click", () => {
    startRun();
  });
  refs.retryButton.addEventListener("click", () => {
    startRun();
  });

  refs.board.addEventListener("click", (event) => {
    const button = findCellButton(event.target);
    if (!button) return;
    if (performance.now() < suppressedClickUntil) return;
    if (overlay !== "playing" || clearing) return;
    const index = Number.parseInt(button.dataset.index ?? "", 10);
    if (!Number.isFinite(index)) return;

    const cell = state.board.cells[index];
    if (!cell) return;
    const result = cell.revealed ? chordCell(state, index) : cell.flagged ? noopAction(state) : uncoverCell(state, index);
    applyResult(result);
  });

  refs.board.addEventListener("contextmenu", (event) => {
    const button = findCellButton(event.target);
    if (!button) return;
    event.preventDefault();
    if (overlay !== "playing" || clearing) return;
    const index = Number.parseInt(button.dataset.index ?? "", 10);
    if (!Number.isFinite(index)) return;
    const cell = state.board.cells[index];
    if (!cell) return;
    if (cell.revealed) return;
    state = toggleFlag(state, index);
    render();
  });

  refs.board.addEventListener("pointerdown", (event) => {
    const button = findCellButton(event.target);
    if (!button) return;
    if (overlay !== "playing" || clearing || event.pointerType === "mouse") return;

    const index = Number.parseInt(button.dataset.index ?? "", 10);
    if (!Number.isFinite(index)) return;
    const cell = state.board.cells[index];
    if (!cell) return;
    if (cell.revealed) return;

    clearTouchPress(touchPress);
    touchPress.index = index;
    touchPress.fired = false;
    touchPress.timerId = window.setTimeout(() => {
      if (touchPress.index === null) return;
      state = toggleFlag(state, touchPress.index);
      touchPress.timerId = null;
      touchPress.fired = true;
      suppressedClickUntil = performance.now() + 420;
      render();
    }, LONG_PRESS_MS);
  });

  refs.board.addEventListener("pointerup", () => {
    clearTouchPress(touchPress);
  });
  refs.board.addEventListener("pointercancel", () => clearTouchPress(touchPress));
  refs.board.addEventListener("pointerleave", () => clearTouchPress(touchPress));

  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "r" && overlay === "gameover") {
      startRun();
    }
  });

  window.__shardlightControls = {
    startRun,
    clickIndex: (index) => {
      if (overlay !== "playing" || clearing) return;
      const cell = state.board.cells[index];
      if (!cell) return;
      const result = cell.revealed ? chordCell(state, index) : cell.flagged ? noopAction(state) : uncoverCell(state, index);
      applyResult(result);
    },
    flagIndex: (index) => {
      if (overlay !== "playing" || clearing) return;
      const cell = state.board.cells[index];
      if (!cell || cell.revealed) return;
      state = toggleFlag(state, index);
      render();
    },
    getState: () => {
      if (!window.__shardlightDebug) {
        throw new Error("[shardlight] Debug state unavailable.");
      }
      return window.__shardlightDebug;
    },
  };

  render();
  host.ready();
  if (autostart) {
    startRun();
  }

  function startRun(): void {
    if (clearTimerId !== null) {
      window.clearTimeout(clearTimerId);
      clearTimerId = null;
    }
    clearTouchPress(touchPress);
    state = createInitialState(seed);
    overlay = "playing";
    clearing = false;
    render();
  }

  function applyResult(result: ActionResult): void {
    state = result.state;
    if (state.score > bestScore) {
      bestScore = state.score;
      writeBestScore(bestScore);
    }

    render(result.revealedIndices);

    if (result.outcome === "clear") {
      clearing = true;
      stopAutoplay();
      refs.boardShell.classList.add("is-clearing");
      clearTimerId = window.setTimeout(() => {
        state = createNextChamber(state);
        clearing = false;
        refs.boardShell.classList.remove("is-clearing");
        render();
      }, CLEAR_DELAY_MS);
      return;
    }

    if (result.outcome === "failed") {
      overlay = "gameover";
      render();
    }
  }

  function render(pulseIndices: number[] = []): void {
    refs.scoreValue.textContent = String(state.score);
    refs.chamberValue.textContent = String(state.chamber);
    refs.startSheet.classList.toggle("sheet--hidden", overlay !== "start");
    refs.gameoverSheet.classList.toggle("sheet--hidden", overlay !== "gameover");
    refs.gameoverScore.textContent = String(state.score);
    refs.gameoverDepth.textContent = `Deepest chamber ${state.status === "failed" ? state.chamber : state.chambersCleared}`;
    refs.gameoverBest.textContent = `Best ${bestScore}`;
    refs.board.innerHTML = buildBoardMarkup(state);
    refs.mural.innerHTML = buildMuralMarkup(state.chamber);
    pulseRevealIndices(refs.board, pulseIndices);
    window.__shardlightDebug = {
      overlay,
      clearing,
      score: state.score,
      chamber: state.chamber,
      chambersCleared: state.chambersCleared,
      bestScore,
      mineCount: state.mineCount,
      flagCount: countFlags(state.board),
      remainingSafe: state.board.remainingSafe,
      board: boardSnapshot(state.board),
    };
    syncAutoplay();
  }

  function syncAutoplay(): void {
    if (!autoplayMode || overlay !== "playing" || clearing) {
      stopAutoplay();
      return;
    }
    if (autoplayTimerId !== null) return;
    autoplayTimerId = window.setTimeout(() => {
      autoplayTimerId = null;
      const action = chooseBotAction(state, autoplayMode);
      if (!action) return;
      applyResult(applyBotAction(state, action));
    }, BOT_ACTION_DELAY_MS[autoplayMode]);
  }

  function stopAutoplay(): void {
    if (autoplayTimerId !== null) {
      window.clearTimeout(autoplayTimerId);
      autoplayTimerId = null;
    }
  }
})().catch((error) => {
  const playdrop = window.playdrop;
  if (playdrop) {
    playdrop.host?.setLoadingState?.({
      status: "error",
      message: String(error),
    });
  }
  throw error;
});

function injectStyles(): void {
  const styleTag = document.createElement("style");
  styleTag.textContent = styles;
  document.head.appendChild(styleTag);
  document.title = "Shardlight";
}

function createApp(): AppRefs {
  document.body.innerHTML = `
    <div class="app">
      <div class="ambience ambience--a" aria-hidden="true"></div>
      <div class="ambience ambience--b" aria-hidden="true"></div>
      <div class="dune" aria-hidden="true"></div>
      <section id="board-shell" class="board-shell">
        <div class="board-inner">
          <header class="topbar">
            <div class="hud-block">
              <div class="hud-label">Score</div>
              <div id="score-value" class="hud-value">0</div>
            </div>
            <div class="hud-block">
              <div class="hud-label">Chamber</div>
              <div id="chamber-value" class="hud-value">1</div>
            </div>
          </header>
          <div class="board-stage">
            <div id="mural" class="mural-layer" aria-hidden="true"></div>
            <div id="board" class="board" role="grid" aria-label="Shardlight chamber"></div>
          </div>
        </div>
      </section>
      <section id="start-sheet" class="sheet" aria-label="Start game">
        <div class="sheet__inner">
          <div class="sheet__eyebrow">Excavation Run</div>
          <h1 class="sheet__title">Clear the chamber.</h1>
          <p class="sheet__copy">Keep the dig alive.</p>
          <button id="start-button" class="button" type="button">Play</button>
        </div>
      </section>
      <section id="gameover-sheet" class="sheet sheet--hidden" aria-label="Run over">
        <div class="sheet__inner">
          <div class="sheet__eyebrow">Final Score</div>
          <div id="gameover-score" class="sheet__score">0</div>
          <p id="gameover-depth" class="sheet__copy">Deepest chamber 1</p>
          <p id="gameover-best" class="sheet__copy">Best 0</p>
          <button id="retry-button" class="button" type="button">Retry</button>
        </div>
      </section>
    </div>
  `;

  return {
    boardShell: requireElement("board-shell"),
    board: requireElement("board"),
    mural: requireElement("mural"),
    scoreValue: requireElement("score-value"),
    chamberValue: requireElement("chamber-value"),
    startSheet: requireElement("start-sheet"),
    gameoverSheet: requireElement("gameover-sheet"),
    gameoverScore: requireElement("gameover-score"),
    gameoverDepth: requireElement("gameover-depth"),
    gameoverBest: requireElement("gameover-best"),
    startButton: requireButton("start-button"),
    retryButton: requireButton("retry-button"),
  };
}

function buildBoardMarkup(state: GameState): string {
  return state.board.cells
    .map((cell, index) => {
      const classes = ["cell"];
      let label = "Covered tile";
      let content = "";
      if (cell.revealed) {
        classes.push("cell--revealed");
        if (state.board.explodedIndex === index) {
          classes.push("cell--exploded");
          content = "✕";
          label = "Exploded cursed tile";
        } else if (cell.mine) {
          classes.push("cell--mine");
          content = "◆";
          label = "Cursed tile";
        } else if (cell.adjacent > 0) {
          classes.push(`cell--digit-${cell.adjacent}`);
          content = String(cell.adjacent);
          label = `Revealed clue ${cell.adjacent}`;
        } else {
          label = "Revealed empty tile";
        }
      } else {
        classes.push("cell--covered");
        if (cell.flagged) {
          classes.push("cell--flagged");
          content = "◆";
          label = "Marked cursed tile";
        }
      }
      const disabled = cell.revealed ? "type=\"button\"" : "type=\"button\"";
      return `<button ${disabled} class="${classes.join(" ")}" data-index="${index}" aria-label="${label}"><span class="cell__content">${content}</span></button>`;
    })
    .join("");
}

function buildMuralMarkup(chamber: number): string {
  const preset = MURAL_PRESETS[(chamber - 1) % MURAL_PRESETS.length]!;
  return `
    <div class="mural-core" style="left:${preset.core.left};top:${preset.core.top};width:${preset.core.size};height:${preset.core.size};"></div>
    <div class="mural-halo" style="left:${preset.halo.left};top:${preset.halo.top};width:${preset.halo.size};height:${preset.halo.size};"></div>
    <div class="mural-trace" style="left:${preset.traceA.left};top:${preset.traceA.top};width:${preset.traceA.width};transform:rotate(${preset.traceA.rotate});"></div>
    <div class="mural-trace" style="left:${preset.traceB.left};top:${preset.traceB.top};width:${preset.traceB.width};transform:rotate(${preset.traceB.rotate});"></div>
    <div class="mural-gem" style="left:${preset.gem.left};top:${preset.gem.top};"></div>
  `;
}

const MURAL_PRESETS = [
  {
    core: { left: "14%", top: "16%", size: "28%" },
    halo: { left: "44%", top: "40%", size: "34%" },
    traceA: { left: "10%", top: "52%", width: "44%", rotate: "-24deg" },
    traceB: { left: "44%", top: "18%", width: "36%", rotate: "18deg" },
    gem: { left: "66%", top: "24%" },
  },
  {
    core: { left: "52%", top: "18%", size: "26%" },
    halo: { left: "12%", top: "50%", size: "32%" },
    traceA: { left: "18%", top: "28%", width: "42%", rotate: "24deg" },
    traceB: { left: "34%", top: "68%", width: "34%", rotate: "-16deg" },
    gem: { left: "28%", top: "64%" },
  },
  {
    core: { left: "28%", top: "34%", size: "30%" },
    halo: { left: "56%", top: "56%", size: "24%" },
    traceA: { left: "12%", top: "72%", width: "36%", rotate: "-10deg" },
    traceB: { left: "40%", top: "14%", width: "38%", rotate: "32deg" },
    gem: { left: "72%", top: "52%" },
  },
  {
    core: { left: "44%", top: "28%", size: "22%" },
    halo: { left: "10%", top: "18%", size: "26%" },
    traceA: { left: "18%", top: "42%", width: "46%", rotate: "14deg" },
    traceB: { left: "50%", top: "66%", width: "30%", rotate: "-18deg" },
    gem: { left: "22%", top: "22%" },
  },
];

function pulseRevealIndices(board: HTMLElement, indices: number[]): void {
  if (indices.length === 0) return;
  for (const index of indices) {
    const button = board.querySelector<HTMLButtonElement>(`[data-index="${index}"]`);
    if (!button) continue;
    button.classList.add("cell--pulse");
    window.setTimeout(() => {
      button.classList.remove("cell--pulse");
    }, 220);
  }
}

function createStartPreview(seed: number | undefined): GameState {
  const previewSeed = seed ?? 0x4f2a6c1d;
  const preview = uncoverCell(createInitialState(previewSeed), START_PREVIEW_INDEX).state;
  return {
    ...preview,
    score: 0,
    status: "ready",
    chambersCleared: 0,
  };
}

function findCellButton(target: EventTarget | null): HTMLButtonElement | null {
  if (!(target instanceof HTMLElement)) return null;
  const button = target.closest<HTMLButtonElement>(".cell");
  return button ?? null;
}

function clearTouchPress(press: TouchPress): void {
  if (press.timerId !== null) {
    window.clearTimeout(press.timerId);
  }
  press.timerId = null;
  press.index = null;
  press.fired = false;
}

function readBestScore(): number {
  const raw = window.localStorage.getItem(BEST_SCORE_KEY);
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function writeBestScore(score: number): void {
  window.localStorage.setItem(BEST_SCORE_KEY, String(score));
}

function readSeedFromLocation(): number | undefined {
  const raw = new URL(window.location.href).searchParams.get("seed");
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed >>> 0 : undefined;
}

function readAutoplayMode(): BotMode | null {
  const raw = new URL(window.location.href).searchParams.get("autoplay");
  if (raw === "idle" || raw === "casual" || raw === "expert") {
    return raw;
  }
  return null;
}

function readAutostartFlag(): boolean {
  return new URL(window.location.href).searchParams.get("autostart") === "1";
}

function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`[shardlight] Missing #${id}.`);
  }
  return element;
}

function requireButton(id: string): HTMLButtonElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`[shardlight] Missing button #${id}.`);
  }
  return element;
}

async function createHostBridge(): Promise<HostBridge> {
  const playdrop = await loadPlaydropSdkIfNeeded();
  if (!playdrop) {
    return {
      setLoadingState: () => undefined,
      ready: () => undefined,
    };
  }
  try {
    const sdk = await playdrop.init();
    return {
      setLoadingState: (state) => sdk.host.setLoadingState(state),
      ready: () => {
        if ("ready" in sdk.host && typeof sdk.host.ready === "function") {
          sdk.host.ready();
          return;
        }
        sdk.host.setLoadingState({ status: "ready" });
      },
    };
  } catch {
    return {
      setLoadingState: (state) => playdrop.host?.setLoadingState?.(state),
      ready: () => {
        if (playdrop.host && "ready" in playdrop.host && typeof playdrop.host.ready === "function") {
          playdrop.host.ready();
          return;
        }
        playdrop.host?.setLoadingState?.({ status: "ready" });
      },
    };
  }
}

function noopAction(state: GameState): ActionResult {
  return {
    state,
    outcome: "noop",
    revealed: 0,
    revealedIndices: [],
    scoreGained: 0,
    clearBonus: 0,
  };
}

async function loadPlaydropSdkIfNeeded(): Promise<typeof window.playdrop | undefined> {
  if (!shouldUsePlaydropHost()) {
    return undefined;
  }
  if (window.playdrop) return window.playdrop;

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://assets.playdrop.ai/sdk/playdrop.js";
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("[shardlight] Failed to load Playdrop SDK."));
    document.head.appendChild(script);
  });

  return window.playdrop;
}

function shouldUsePlaydropHost(): boolean {
  const url = new URL(window.location.href);
  if (url.searchParams.has("playdrop_channel")) {
    return true;
  }

  try {
    if (window.self !== window.top) {
      return true;
    }
  } catch {
    return true;
  }

  if (document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      if (referrer.hostname.endsWith("playdrop.ai")) {
        return true;
      }
    } catch {
      // Ignore malformed referrers and continue with a local-only boot.
    }
  }

  return false;
}
