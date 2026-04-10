/// <reference types="playdrop-sdk-types" />

import { BEACON_CENTER, BEACON_MAX_INTEGRITY } from "./game/constants";
import { CanvasRenderer } from "./game/render";
import {
  createDebugSnapshot,
  createInitialState,
  createInputState,
  createPreviewState,
  createShowcaseState,
  createVictoryState,
  stepGame,
} from "./game/sim";
import type { DebugSnapshot, GameState, InputState, Screen } from "./game/types";

declare global {
  interface Window {
    advanceTime?: (ms: number) => Promise<void>;
    __scrapSignalDebug?: {
      getState: () => DebugSnapshot;
      startRun: (seed?: number) => void;
      setBeaconIntegrity: (value: number) => void;
      setTimeRemaining: (value: number) => void;
      setCarryBattery: (value: boolean) => void;
      clearEnemies: () => void;
      loadScene: (scene: "start" | "play" | "won") => void;
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
  timerValue: HTMLElement;
  integrityValue: HTMLElement;
  integrityFill: HTMLElement;
  scoreValue: HTMLElement;
  carryBadge: HTMLElement;
  carryText: HTMLElement;
  startOverlay: HTMLElement;
  gameoverOverlay: HTMLElement;
  startButton: HTMLButtonElement;
  retryButton: HTMLButtonElement;
  startMeta: HTMLElement;
  resultTitle: HTMLElement;
  resultCopy: HTMLElement;
  resultScore: HTMLElement;
  resultDeposits: HTMLElement;
  resultBest: HTMLElement;
  resultMeta: HTMLElement;
};

const BEST_SCORE_KEY = "scrap-signal-best-score";

void (async () => {
  const host = await createHostBridge();

  document.title = "Scrap Signal";
  injectStyles();
  const ui = createUI();
  const renderer = new CanvasRenderer(ui.canvas);
  const input = createInputState();
  const keys = new Set<string>();

  let bestScore = readBestScore();
  let previewState = createPreviewState(readSeedFromLocation(7));
  let state = createInitialState(readSeedFromLocation());
  let screen: Screen = readAutostart() ? "playing" : "start";
  let lastFrame = performance.now();

  if (screen === "playing") {
    state = createInitialState(readSeedFromLocation());
  }

  function displayState(): GameState {
    return screen === "start" ? previewState : state;
  }

  function startRun(seedOverride?: number): void {
    state = createInitialState(seedOverride ?? readSeedFromLocation());
    screen = "playing";
    render();
  }

  function finishRun(): void {
    screen = "gameover";
    if (state.score > bestScore) {
      bestScore = state.score;
      localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
    }
    render();
  }

  function syncLayout(): void {
    renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  }

  function render(): void {
    const current = displayState();
    renderer.render(current);
    updateUI(ui, current, screen, bestScore);
  }

  function frame(now: number): void {
    const dtMs = Math.min(32, now - lastFrame);
    lastFrame = now;

    if (screen === "playing") {
      updateInputAxes(input, keys);
      stepGame(state, input, dtMs);
      if (state.runState !== "playing") {
        finishRun();
      }
    }

    render();
    requestAnimationFrame(frame);
  }

  function updateAim(event: PointerEvent | MouseEvent): void {
    const world = renderer.clientToWorld(event.clientX, event.clientY);
    input.aimX = world.x;
    input.aimY = world.y;
  }

  ui.startButton.addEventListener("click", () => {
    startRun();
  });

  ui.retryButton.addEventListener("click", () => {
    startRun();
  });

  window.addEventListener("pointermove", (event) => {
    updateAim(event);
  });

  window.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (screen === "playing") {
      updateAim(event);
      input.firing = true;
    }
  });

  window.addEventListener("pointerup", (event) => {
    if (event.button !== 0) return;
    input.firing = false;
  });

  window.addEventListener("keydown", (event) => {
    keys.add(event.key.toLowerCase());
    if (screen !== "playing") {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startRun();
      }
      return;
    }

    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      startRun(readSeedFromLocation());
    }
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
  });

  window.addEventListener("blur", () => {
    keys.clear();
    updateInputAxes(input, keys);
    input.firing = false;
  });

  window.addEventListener("resize", () => {
    syncLayout();
    render();
  });

  window.advanceTime = async (ms: number) => {
    if (screen !== "playing") {
      startRun(readSeedFromLocation());
    }

    updateInputAxes(input, keys);
    input.firing = false;

    let remaining = ms;
    while (remaining > 0 && state.runState === "playing") {
      const step = Math.min(16, remaining);
      stepGame(state, input, step);
      remaining -= step;
    }

    if (state.runState !== "playing") {
      finishRun();
    } else {
      render();
    }
  };

  window.__scrapSignalDebug = {
    getState: () => createDebugSnapshot(displayState()),
    startRun: (seed) => {
      startRun(seed);
    },
    setBeaconIntegrity: (value) => {
      state.beaconIntegrity = clamp(Math.round(value), 0, state.beaconMaxIntegrity);
      render();
    },
    setTimeRemaining: (value) => {
      const remaining = clamp(value, 0, state.rescueMs);
      state.elapsedMs = state.rescueMs - remaining;
      render();
    },
    setCarryBattery: (value) => {
      state.player.carryBattery = value;
      render();
    },
    clearEnemies: () => {
      state.enemies = [];
      render();
    },
    loadScene: (scene) => {
      if (scene === "start") {
        previewState = createPreviewState(readSeedFromLocation(7));
        screen = "start";
      } else if (scene === "play") {
        state = createShowcaseState(readSeedFromLocation(7));
        screen = "playing";
      } else {
        state = createVictoryState(readSeedFromLocation(7));
        bestScore = Math.max(bestScore, 34120);
        screen = "gameover";
      }
      render();
    },
  };

  syncLayout();
  render();
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
    <div class="scrap-signal-shell">
      <canvas id="scrap-signal-canvas" aria-label="Scrap Signal playfield"></canvas>

      <div class="scrap-signal-hud">
        <section class="scrap-signal-panel scrap-signal-panel--timer">
          <span class="scrap-signal-label">Rescue</span>
          <div class="scrap-signal-value" data-role="timer">06:00</div>
        </section>

        <section class="scrap-signal-panel scrap-signal-panel--integrity">
          <div class="scrap-signal-integrity-head">
            <span class="scrap-signal-label">Beacon Integrity</span>
            <strong data-role="integrity-value">12 / 12</strong>
          </div>
          <div class="scrap-signal-bar">
            <div class="scrap-signal-bar__fill" data-role="integrity-fill"></div>
          </div>
        </section>

        <section class="scrap-signal-panel scrap-signal-panel--score">
          <div>
            <span class="scrap-signal-label">Score</span>
            <div class="scrap-signal-value" data-role="score">000000</div>
          </div>
          <div class="scrap-signal-carry" data-role="carry-badge">
            <span class="scrap-signal-carry__dot"></span>
            <span data-role="carry-text">Cell Aboard</span>
          </div>
        </section>
      </div>

      <section class="scrap-signal-overlay scrap-signal-overlay--start" data-role="start-overlay">
        <div class="scrap-signal-card">
          <div class="scrap-signal-eyebrow">Harbor Shift</div>
          <h1>Scrap<br />Signal</h1>
          <p>
            Hold the beacon through the storm. Cut down scrap drones, ferry battery cells back
            into the light, and keep the channel alive until rescue arrives.
          </p>
          <div class="scrap-signal-controls">
            <span>WASD Move</span>
            <span>Mouse Aim</span>
            <span>Hold Fire</span>
          </div>
          <div class="scrap-signal-cta-row">
            <button type="button" class="scrap-signal-button" data-role="start-button">Start Shift</button>
            <div class="scrap-signal-meta" data-role="start-meta">One carry slot. One beacon. Six hard minutes.</div>
          </div>
        </div>
      </section>

      <section class="scrap-signal-overlay scrap-signal-overlay--gameover" data-role="gameover-overlay">
        <div class="scrap-signal-card">
          <div class="scrap-signal-eyebrow">Shift Report</div>
          <h2 data-role="result-title">Rescue Arrived</h2>
          <p data-role="result-copy">
            The beacon held. The channel stayed open long enough to pull the last skiffs through the storm.
          </p>
          <div class="scrap-signal-stats">
            <div class="scrap-signal-stat">
              <span class="scrap-signal-stat__label">Score</span>
              <div class="scrap-signal-stat__value" data-role="result-score">000000</div>
            </div>
            <div class="scrap-signal-stat">
              <span class="scrap-signal-stat__label">Deposits</span>
              <div class="scrap-signal-stat__value" data-role="result-deposits">0</div>
            </div>
            <div class="scrap-signal-stat">
              <span class="scrap-signal-stat__label">Best</span>
              <div class="scrap-signal-stat__value" data-role="result-best">000000</div>
            </div>
          </div>
          <div class="scrap-signal-cta-row">
            <button type="button" class="scrap-signal-button" data-role="retry-button">Shift Again</button>
            <div class="scrap-signal-meta" data-role="result-meta">Bank cells fast. Rescue does not wait.</div>
          </div>
        </div>
      </section>
    </div>
  `;

  return {
    root,
    canvas: requireElement<HTMLCanvasElement>("scrap-signal-canvas"),
    timerValue: requireDataRole(root, "timer"),
    integrityValue: requireDataRole(root, "integrity-value"),
    integrityFill: requireDataRole(root, "integrity-fill"),
    scoreValue: requireDataRole(root, "score"),
    carryBadge: requireDataRole(root, "carry-badge"),
    carryText: requireDataRole(root, "carry-text"),
    startOverlay: requireDataRole(root, "start-overlay"),
    gameoverOverlay: requireDataRole(root, "gameover-overlay"),
    startButton: requireDataRole<HTMLButtonElement>(root, "start-button"),
    retryButton: requireDataRole<HTMLButtonElement>(root, "retry-button"),
    startMeta: requireDataRole(root, "start-meta"),
    resultTitle: requireDataRole(root, "result-title"),
    resultCopy: requireDataRole(root, "result-copy"),
    resultScore: requireDataRole(root, "result-score"),
    resultDeposits: requireDataRole(root, "result-deposits"),
    resultBest: requireDataRole(root, "result-best"),
    resultMeta: requireDataRole(root, "result-meta"),
  };
}

function updateUI(ui: UI, state: GameState, screen: Screen, bestScore: number): void {
  ui.root.dataset.screen = screen;

  const timeRemainingMs = screen === "start" ? state.rescueMs : Math.max(0, state.rescueMs - state.elapsedMs);
  ui.timerValue.textContent = formatTimeRemaining(timeRemainingMs);
  ui.integrityValue.textContent = `${state.beaconIntegrity.toString().padStart(2, "0")} / ${state.beaconMaxIntegrity}`;
  ui.integrityFill.style.width = `${(state.beaconIntegrity / state.beaconMaxIntegrity) * 100}%`;
  ui.scoreValue.textContent = String(state.score).padStart(6, "0");

  const showCarry = state.player.carryBattery && screen === "playing";
  ui.carryBadge.dataset.active = String(showCarry);
  ui.carryText.textContent = state.player.carryBattery ? "Cell Aboard" : "Beacon Stable";

  ui.startOverlay.dataset.active = String(screen === "start");
  ui.gameoverOverlay.dataset.active = String(screen === "gameover");
  ui.startMeta.textContent = bestScore > 0
    ? `Best ${String(bestScore).padStart(6, "0")} this session. One carry slot. Six hard minutes.`
    : "One carry slot. One beacon. Six hard minutes.";

  if (screen === "gameover") {
    const won = state.runState === "won";
    ui.resultTitle.textContent = won ? "Rescue Arrived" : "Blackout";
    ui.resultCopy.textContent = won
      ? "The beacon held. The channel stayed open long enough to pull the last skiffs through the storm."
      : "The signal collapsed before the rescue window. The harbor lane went dark.";
    ui.resultScore.textContent = String(state.score).padStart(6, "0");
    ui.resultDeposits.textContent = String(state.deposits);
    ui.resultBest.textContent = bestScore > 0 ? String(bestScore).padStart(6, "0") : "000000";
    ui.resultMeta.textContent = won
      ? "Bank more cells next run and squeeze the score higher."
      : "Carriers pay for repairs. Cut them first and haul the cells home.";
  }
}

function updateInputAxes(input: InputState, keys: Set<string>): void {
  const left = keys.has("a") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");
  const up = keys.has("w") || keys.has("arrowup");
  const down = keys.has("s") || keys.has("arrowdown");

  input.moveX = (right ? 1 : 0) - (left ? 1 : 0);
  input.moveY = (down ? 1 : 0) - (up ? 1 : 0);
}

function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function readBestScore(): number {
  if (typeof localStorage === "undefined") return 0;
  const raw = localStorage.getItem(BEST_SCORE_KEY);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function readSeedFromLocation(fallback = Date.now()): number {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("seed");
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function readAutostart(): boolean {
  return new URLSearchParams(window.location.search).get("autostart") === "1";
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
  return {
    setLoadingState: (state) => {
      sdk.host.setLoadingState?.(state);
    },
    ready: () => {
      // @ts-expect-error The hosted runtime exposes sdk.host.ready() even when the local SDK types lag behind.
      if (typeof sdk.host.ready === "function") {
        // @ts-expect-error The hosted runtime exposes sdk.host.ready() even when the local SDK types lag behind.
        sdk.host.ready();
        return;
      }
      sdk.host.setLoadingState?.({ status: "ready" });
    },
  };
}

function injectStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
    :root {
      color-scheme: dark;
      --scrap-bg-0: #071218;
      --scrap-bg-1: #0d1f29;
      --scrap-bg-2: #123040;
      --scrap-ink: #eef8fb;
      --scrap-ink-soft: rgba(221, 239, 245, 0.72);
      --scrap-panel: rgba(7, 20, 27, 0.72);
      --scrap-panel-line: rgba(153, 219, 239, 0.14);
      --scrap-accent: #5bb7d4;
      --scrap-button: #9fe6f7;
      --scrap-shadow: 0 24px 72px rgba(0, 0, 0, 0.42);
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      height: 100%;
      margin: 0;
    }

    body {
      overflow: hidden;
      font-family:
        "Avenir Next",
        "SF Pro Display",
        "Segoe UI",
        sans-serif;
      color: var(--scrap-ink);
      background:
        radial-gradient(circle at 20% 18%, rgba(108, 190, 214, 0.2), transparent 28%),
        radial-gradient(circle at 84% 10%, rgba(255, 195, 123, 0.12), transparent 22%),
        linear-gradient(180deg, #071015 0%, #020608 100%);
    }

    #app,
    .scrap-signal-shell {
      position: relative;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }

    .scrap-signal-shell {
      isolation: isolate;
    }

    .scrap-signal-shell::before,
    .scrap-signal-shell::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .scrap-signal-shell::before {
      background:
        radial-gradient(circle at center, rgba(255, 255, 255, 0.05), transparent 34%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 40%);
    }

    .scrap-signal-shell::after {
      inset: 14px;
      border-radius: 26px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    #scrap-signal-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      cursor: crosshair;
    }

    .scrap-signal-hud {
      position: absolute;
      top: max(22px, env(safe-area-inset-top));
      left: max(22px, env(safe-area-inset-left));
      right: max(22px, env(safe-area-inset-right));
      display: grid;
      grid-template-columns: 170px 1fr 220px;
      gap: 16px;
      z-index: 3;
      pointer-events: none;
    }

    .scrap-signal-panel {
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid var(--scrap-panel-line);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 40%),
        var(--scrap-panel);
      box-shadow: 0 18px 42px rgba(0, 0, 0, 0.22);
      border-radius: 22px;
    }

    .scrap-signal-panel--timer,
    .scrap-signal-panel--score {
      padding: 14px 16px;
    }

    .scrap-signal-panel--integrity {
      display: grid;
      gap: 10px;
      padding: 14px 18px;
    }

    .scrap-signal-label {
      display: block;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--scrap-ink-soft);
    }

    .scrap-signal-value {
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.05em;
    }

    .scrap-signal-integrity-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
    }

    .scrap-signal-integrity-head strong {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .scrap-signal-bar {
      position: relative;
      height: 16px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
    }

    .scrap-signal-bar__fill {
      position: absolute;
      inset: 0 auto 0 0;
      width: 100%;
      border-radius: inherit;
      background:
        linear-gradient(90deg, #9fe6f7 0%, var(--scrap-accent) 50%, #2f87ab 100%);
      box-shadow:
        0 0 18px rgba(91, 183, 212, 0.24),
        inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    }

    .scrap-signal-panel--score {
      display: grid;
      gap: 12px;
    }

    .scrap-signal-carry {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      width: fit-content;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--scrap-ink-soft);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .scrap-signal-carry[data-active="false"] {
      visibility: hidden;
    }

    .scrap-signal-carry__dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #ffe2a8, #f1b55d 60%, #8f5a1e 100%);
      box-shadow: 0 0 14px rgba(241, 181, 93, 0.46);
    }

    .scrap-signal-overlay {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      z-index: 5;
      pointer-events: none;
      opacity: 0;
      transition: opacity 120ms ease;
    }

    .scrap-signal-overlay[data-active="true"] {
      opacity: 1;
      pointer-events: auto;
    }

    .scrap-signal-overlay::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at center, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.44) 82%),
        linear-gradient(180deg, rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0.32));
    }

    .scrap-signal-card {
      position: relative;
      width: min(430px, calc(100vw - 48px));
      padding: 28px 28px 26px;
      border-radius: 28px;
      text-align: left;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(193, 237, 248, 0.16);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0)),
        rgba(6, 18, 24, 0.8);
      box-shadow: 0 22px 60px rgba(0, 0, 0, 0.32);
    }

    .scrap-signal-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      color: var(--scrap-ink-soft);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .scrap-signal-eyebrow::before {
      content: "";
      width: 18px;
      height: 1px;
      background: rgba(255, 255, 255, 0.24);
    }

    .scrap-signal-card h1,
    .scrap-signal-card h2,
    .scrap-signal-card p {
      margin: 0;
    }

    .scrap-signal-card h1,
    .scrap-signal-card h2 {
      font-size: 52px;
      line-height: 0.94;
      letter-spacing: -0.06em;
    }

    .scrap-signal-card p {
      margin-top: 14px;
      color: var(--scrap-ink-soft);
      font-size: 17px;
      line-height: 1.45;
    }

    .scrap-signal-controls {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 18px;
    }

    .scrap-signal-controls span {
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--scrap-ink-soft);
    }

    .scrap-signal-cta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      margin-top: 24px;
    }

    .scrap-signal-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 14px 20px;
      border: 0;
      border-radius: 999px;
      background: linear-gradient(135deg, #d9f8ff, #5bb7d4);
      color: #07202a;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
    }

    .scrap-signal-meta {
      color: var(--scrap-ink-soft);
      font-size: 14px;
      line-height: 1.4;
    }

    .scrap-signal-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-top: 22px;
    }

    .scrap-signal-stat {
      padding: 12px 14px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.06);
    }

    .scrap-signal-stat__label {
      display: block;
      margin-bottom: 6px;
      color: var(--scrap-ink-soft);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .scrap-signal-stat__value {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.05em;
    }

    @media (max-width: 980px) {
      .scrap-signal-hud {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`missing_element:${id}`);
  return element as T;
}

function requireDataRole<T extends HTMLElement>(root: HTMLElement, role: string): T {
  const element = root.querySelector(`[data-role="${role}"]`);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`missing_data_role:${role}`);
  }
  return element as T;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
