/// <reference types="playdrop-sdk-types" />

import { ingredientDefinition } from "./game/data";
import { CanvasRenderer } from "./game/render";
import {
  canAcceptInput,
  chooseAutoplayMove,
  createDebugSnapshot,
  createInitialState,
  performMove,
  previewCluster,
  setHoveredCluster,
  stepGame,
} from "./game/sim";
import type { AutoplayMode, DebugSnapshot, Screen } from "./game/types";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
    __lunchlineDebug?: {
      getState: () => DebugSnapshot & {
        screen: Screen;
        bestScore: number;
        bestOrders: number;
      };
      tapCell: (col: number, row: number) => boolean;
      startRun: () => void;
      setAutoplay: (mode: AutoplayMode | null) => void;
    };
  }
}

type HostLoadingState = {
  status: "loading" | "ready" | "error";
  message?: string;
  progress?: number;
};

type RuntimeHost = {
  setLoadingState?: (state: HostLoadingState) => void;
  ready?: () => void;
};

type HostBridge = {
  setLoadingState: (state: HostLoadingState) => void;
  ready: () => void;
};

type UI = {
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  scoreValue: HTMLElement;
  complaints: HTMLElement[];
  patienceFill: HTMLElement;
  orderLabel: HTMLElement;
  orderSlotIcons: [HTMLElement, HTMLElement];
  orderSlotCounts: [HTMLElement, HTMLElement];
  overlayStart: HTMLElement;
  overlayGameover: HTMLElement;
  playButton: HTMLButtonElement;
  restartButton: HTMLButtonElement;
  gameoverScore: HTMLElement;
  gameoverBest: HTMLElement;
  gameoverOrders: HTMLElement;
  rushChip: HTMLElement;
  complaintChip: HTMLElement;
};

const STORAGE_KEYS = {
  bestScore: "lunchline-best-score",
  bestOrders: "lunchline-best-orders",
};

void (async () => {
  const host = await createHostBridge();
  host.setLoadingState({ status: "loading", message: "Opening the counter", progress: 0.16 });

  document.title = "Lunchline";
  injectStyles();
  const ui = createUI();
  const renderer = new CanvasRenderer(ui.canvas);

  host.setLoadingState({ status: "loading", message: "Stocking the board", progress: 0.44 });

  const seed = readSeedFromLocation();
  let autoplayMode = readAutoplayFromLocation();
  let state = createInitialState(seed);
  let screen: Screen = autoplayMode ? "playing" : "start";
  let bestScore = readNumericStorage(STORAGE_KEYS.bestScore);
  let bestOrders = readNumericStorage(STORAGE_KEYS.bestOrders);
  let lastFrame = performance.now();

  function startRun(): void {
    state = createInitialState(seed);
    screen = "playing";
    renderFrame();
  }

  function finishRun(): void {
    screen = "gameover";
    bestScore = Math.max(bestScore, state.score);
    bestOrders = Math.max(bestOrders, state.ordersServed);
    localStorage.setItem(STORAGE_KEYS.bestScore, String(bestScore));
    localStorage.setItem(STORAGE_KEYS.bestOrders, String(bestOrders));
  }

  function handleEvents(events: ReturnType<typeof stepGame>): void {
    if (events.some((event) => event.kind === "gameover")) {
      finishRun();
    }
  }

  function maybeAutoplay(): void {
    if (screen !== "playing" || autoplayMode === null) return;
    if (!canAcceptInput(state) || state.autoplayCooldownMs > 0) return;
    const move = chooseAutoplayMove(state, autoplayMode);
    if (!move) return;
    performMove(state, move.col, move.row);
  }

  function updateHUD(): void {
    ui.scoreValue.textContent = formatScore(screen === "start" ? 0 : state.score);
    ui.orderLabel.textContent = `Order ${state.orderIndex + 1}`;

    state.order.forEach((slot, index) => {
      const icon = ui.orderSlotIcons[index];
      const count = ui.orderSlotCounts[index];
      if (!icon || !count) return;
      icon.className = `hud-ingredient hud-ingredient--${slot.ingredient}`;
      count.textContent = `${slot.filled}/${slot.need}`;
    });

    ui.patienceFill.style.width = `${Math.round((screen === "start" ? 1 : state.patienceMs / state.maxPatienceMs) * 100)}%`;
    ui.rushChip.classList.toggle("is-hot", screen === "playing" && state.patienceMs / state.maxPatienceMs < 0.3);
    ui.complaintChip.classList.toggle("is-hot", state.complaints >= 2);

    ui.complaints.forEach((dot, index) => {
      dot.classList.toggle("is-on", index < state.complaints);
    });

    ui.overlayStart.classList.toggle("active", screen === "start");
    ui.overlayGameover.classList.toggle("active", screen === "gameover");

    ui.gameoverScore.textContent = formatScore(state.score);
    ui.gameoverBest.textContent = formatScore(bestScore);
    ui.gameoverOrders.textContent = String(Math.max(bestOrders, state.ordersServed));
  }

  function updateDebug(): void {
    window.__lunchlineDebug = {
      getState: () => ({
        ...createDebugSnapshot(state),
        screen,
        bestScore,
        bestOrders,
      }),
      tapCell: (col, row) => performMove(state, col, row),
      startRun,
      setAutoplay: (mode) => {
        autoplayMode = mode;
      },
    };
    window.render_game_to_text = () =>
      JSON.stringify(
        {
          ...createDebugSnapshot(state),
          screen,
          bestScore,
          bestOrders,
        },
        null,
        2,
      );
  }

  function renderFrame(): void {
    renderer.render(state);
    updateHUD();
    updateDebug();
  }

  function advanceFrame(dtMs: number): void {
    if (screen === "playing") {
      handleEvents(stepGame(state, dtMs));
      maybeAutoplay();
    } else {
      stepGame(state, dtMs);
    }
  }

  function frame(now: number): void {
    const dtMs = Math.min(32, now - lastFrame);
    lastFrame = now;
    advanceFrame(dtMs);
    renderFrame();
    requestAnimationFrame(frame);
  }

  function refreshHoverFromPointer(clientX: number, clientY: number): void {
    if (screen !== "playing" || !canAcceptInput(state)) {
      setHoveredCluster(state, null);
      return;
    }
    const cell = renderer.pickCell(clientX, clientY);
    setHoveredCluster(state, cell ? previewCluster(state, cell.col, cell.row) : null);
  }

  ui.canvas.addEventListener("pointermove", (event) => {
    refreshHoverFromPointer(event.clientX, event.clientY);
    renderFrame();
  });

  ui.canvas.addEventListener("pointerleave", () => {
    setHoveredCluster(state, null);
    renderFrame();
  });

  ui.canvas.addEventListener("pointerdown", (event) => {
    if (screen !== "playing") return;
    const cell = renderer.pickCell(event.clientX, event.clientY);
    if (!cell) return;
    if (performMove(state, cell.col, cell.row)) {
      renderFrame();
    }
  });

  ui.playButton.addEventListener("click", () => {
    startRun();
  });

  ui.restartButton.addEventListener("click", () => {
    startRun();
  });

  window.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && screen !== "playing") {
      event.preventDefault();
      startRun();
    }
    if (event.key.toLowerCase() === "r" && screen === "gameover") {
      event.preventDefault();
      startRun();
    }
  });

  window.addEventListener("resize", () => {
    resizeRenderer(renderer, ui);
    renderFrame();
  });

  window.advanceTime = async (ms: number) => {
    if (screen !== "playing") startRun();
    let remaining = ms;
    while (remaining > 0 && screen === "playing") {
      const step = Math.min(16, remaining);
      advanceFrame(step);
      remaining -= step;
    }
    renderFrame();
  };

  resizeRenderer(renderer, ui);
  host.ready();
  renderFrame();
  requestAnimationFrame(frame);
})().catch((error) => {
  const playdrop = window.playdrop;
  playdrop?.host?.setLoadingState?.({
    status: "error",
    message: String(error),
  });
  throw error;
});

function readSeedFromLocation(): number {
  const raw = new URLSearchParams(window.location.search).get("seed");
  return raw ? Number(raw) : Date.now();
}

function readAutoplayFromLocation(): AutoplayMode | null {
  const raw = new URLSearchParams(window.location.search).get("autoplay");
  if (raw === "idle" || raw === "casual" || raw === "expert") return raw;
  return null;
}

function readNumericStorage(key: string): number {
  const raw = localStorage.getItem(key);
  const value = raw ? Number(raw) : 0;
  return Number.isFinite(value) ? value : 0;
}

function formatScore(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(value)));
}

function bridgeFromRuntimeHost(runtimeHost: RuntimeHost | undefined): HostBridge {
  return {
    setLoadingState: (state) => runtimeHost?.setLoadingState?.(state),
    ready: () => {
      if (runtimeHost?.ready) {
        runtimeHost.ready();
        return;
      }
      runtimeHost?.setLoadingState?.({ status: "ready" });
    },
  };
}

async function createHostBridge(): Promise<HostBridge> {
  const playdrop = window.playdrop;
  if (!playdrop) return bridgeFromRuntimeHost(undefined);

  const hasHostedChannel = new URLSearchParams(window.location.search).has("playdrop_channel");
  if (playdrop.init && hasHostedChannel) {
    try {
      const sdk = await playdrop.init();
      return bridgeFromRuntimeHost(sdk.host as RuntimeHost | undefined);
    } catch (error) {
      console.warn("[lunchline] Failed to initialize hosted PlayDrop SDK; falling back to runtime host bridge", error);
    }
  }

  return bridgeFromRuntimeHost(playdrop.host as RuntimeHost | undefined);
}

function resizeRenderer(renderer: CanvasRenderer, ui: UI): void {
  const rect = ui.canvas.getBoundingClientRect();
  renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
}

function createUI(): UI {
  document.body.innerHTML = `
    <div class="mockup-shell">
      <section class="counter-stage" id="stage">
        <header class="hud-strip">
          <section class="chip">
            <span class="chip-label">Score</span>
            <span class="chip-value" id="score-value">0</span>
          </section>

          <section class="order-card" id="rush-chip" aria-label="Active lunchbox order">
            <div class="order-header">
              <div class="order-title">
                <strong class="brand">Lunchline</strong>
                <span class="order-subtitle" id="order-label">Order 1</span>
              </div>
              <div class="patience">
                <span class="patience-label">Rush</span>
                <div class="patience-meter" aria-hidden="true">
                  <div class="patience-fill" id="patience-fill"></div>
                </div>
              </div>
            </div>

            <div class="bento-grid">
              <div class="order-slot">
                <span class="hud-ingredient hud-ingredient--salmon" id="slot-icon-a"></span>
                <div class="order-slot-count" id="slot-count-a">0/0</div>
              </div>
              <div class="order-slot">
                <span class="hud-ingredient hud-ingredient--egg" id="slot-icon-b"></span>
                <div class="order-slot-count" id="slot-count-b">0/0</div>
              </div>
            </div>
          </section>

          <section class="chip chip--complaints" id="complaint-chip">
            <span class="chip-label">Complaints</span>
            <div class="complaint-hearts" aria-label="Complaint lives">
              <span class="complaint-dot" id="complaint-0"></span>
              <span class="complaint-dot" id="complaint-1"></span>
              <span class="complaint-dot" id="complaint-2"></span>
            </div>
          </section>
        </header>

        <main class="playfield">
          <section class="board-frame">
            <canvas class="board-canvas" id="board-canvas"></canvas>
          </section>

          <div class="overlay overlay--start active" id="overlay-start">
            <section class="overlay-card">
              <h1>Lunchline</h1>
              <p>
                Tap matching ingredient groups to fill the order card before the shift racks up three
                complaints.
              </p>
              <div class="cta-row">
                <button class="play-button" id="play-button" type="button">Start Shift</button>
                <span class="mini-note">Portrait-first puzzle run</span>
              </div>
            </section>
          </div>

          <div class="overlay overlay--gameover" id="overlay-gameover">
            <section class="overlay-card">
              <h2>Shift Over</h2>
              <p>
                The rush got away from you. Tighten the next board clear and finish the lunchbox before
                complaints stack up.
              </p>
              <div class="stat-grid">
                <div class="stat-card">
                  <span>Score</span>
                  <strong id="gameover-score">0</strong>
                </div>
                <div class="stat-card">
                  <span>Best</span>
                  <strong id="gameover-best">0</strong>
                </div>
                <div class="stat-card">
                  <span>Orders</span>
                  <strong id="gameover-orders">0</strong>
                </div>
              </div>
              <div class="cta-row">
                <button class="restart-button" id="restart-button" type="button">Run It Back</button>
                <span class="mini-note">Three complaints ends the shift</span>
              </div>
            </section>
          </div>
        </main>
      </section>
    </div>
  `;

  const stage = requiredElement("stage", HTMLElement);
  return {
    stage,
    canvas: requiredElement("board-canvas", HTMLCanvasElement),
    scoreValue: requiredElement("score-value", HTMLElement),
    complaints: [
      requiredElement("complaint-0", HTMLElement),
      requiredElement("complaint-1", HTMLElement),
      requiredElement("complaint-2", HTMLElement),
    ],
    patienceFill: requiredElement("patience-fill", HTMLElement),
    orderLabel: requiredElement("order-label", HTMLElement),
    orderSlotIcons: [
      requiredElement("slot-icon-a", HTMLElement),
      requiredElement("slot-icon-b", HTMLElement),
    ],
    orderSlotCounts: [
      requiredElement("slot-count-a", HTMLElement),
      requiredElement("slot-count-b", HTMLElement),
    ],
    overlayStart: requiredElement("overlay-start", HTMLElement),
    overlayGameover: requiredElement("overlay-gameover", HTMLElement),
    playButton: requiredElement("play-button", HTMLButtonElement),
    restartButton: requiredElement("restart-button", HTMLButtonElement),
    gameoverScore: requiredElement("gameover-score", HTMLElement),
    gameoverBest: requiredElement("gameover-best", HTMLElement),
    gameoverOrders: requiredElement("gameover-orders", HTMLElement),
    rushChip: requiredElement("rush-chip", HTMLElement),
    complaintChip: requiredElement("complaint-chip", HTMLElement),
  };
}

function requiredElement<T extends typeof HTMLElement>(
  id: string,
  expectedType: T,
): InstanceType<T> {
  const node = document.getElementById(id);
  if (!(node instanceof expectedType)) {
    throw new Error(`[lunchline] Expected #${id} to be a ${expectedType.name}`);
  }
  return node as InstanceType<T>;
}

function injectStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --bg-cream: #fff6ea;
      --counter-wood: #603722;
      --counter-wood-dark: #3f2415;
      --board-bg: #fff4df;
      --panel: rgba(255, 248, 235, 0.94);
      --panel-strong: rgba(255, 245, 230, 0.98);
      --ink: #3b2418;
      --ink-soft: #7b5945;
      --accent-coral: #ef7d58;
      --danger: #df4f53;
      --shadow-strong: 0 24px 60px rgba(63, 36, 21, 0.28);
      --shadow-soft: 0 14px 34px rgba(63, 36, 21, 0.18);
      --font-display: "Avenir Next Condensed", "Trebuchet MS", "Gill Sans", sans-serif;
      --font-body: "Avenir Next", "Segoe UI", sans-serif;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      min-height: 100%;
      background:
        radial-gradient(circle at top, rgba(255, 255, 255, 0.42), transparent 24%),
        linear-gradient(180deg, #f7c992 0%, #f1a46c 22%, #7b4022 22.2%, #542d1d 100%);
      color: var(--ink);
      font-family: var(--font-body);
      overflow: hidden;
    }

    body::before,
    body::after {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
    }

    body::before {
      background:
        radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.5), transparent 36%),
        linear-gradient(180deg, transparent 0%, rgba(35, 20, 12, 0.22) 100%);
    }

    body::after {
      background:
        repeating-linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.03) 0 16px,
          rgba(76, 38, 21, 0.05) 16px 32px
        );
      opacity: 0.5;
    }

    .mockup-shell {
      position: relative;
      display: flex;
      align-items: stretch;
      justify-content: center;
      width: 100vw;
      height: 100vh;
      padding: max(20px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
        max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
    }

    .counter-stage {
      position: relative;
      display: flex;
      flex-direction: column;
      width: min(100%, 560px);
      min-height: 100%;
      border-radius: 40px;
      padding: 16px;
      background:
        linear-gradient(180deg, rgba(255, 247, 231, 0.96), rgba(250, 234, 210, 0.93)),
        linear-gradient(180deg, rgba(255, 255, 255, 0.3), transparent 20%);
      box-shadow: var(--shadow-strong);
      overflow: hidden;
    }

    .counter-stage::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at top right, rgba(255, 255, 255, 0.4), transparent 28%),
        linear-gradient(180deg, rgba(122, 185, 109, 0.06), transparent 24%),
        linear-gradient(180deg, transparent 72%, rgba(96, 55, 34, 0.08) 100%);
      pointer-events: none;
    }

    .hud-strip {
      position: relative;
      z-index: 2;
      display: grid;
      grid-template-columns: minmax(0, 96px) minmax(0, 1fr) minmax(0, 96px);
      gap: 10px;
      align-items: start;
      margin-bottom: 14px;
    }

    .chip {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
      padding: 12px 14px;
      border-radius: 20px;
      background: rgba(255, 251, 245, 0.86);
      box-shadow: var(--shadow-soft);
      backdrop-filter: blur(8px);
      transition: transform 180ms ease, box-shadow 180ms ease;
    }

    .chip.is-hot {
      transform: translateY(-1px);
      box-shadow: 0 18px 36px rgba(223, 79, 83, 0.16);
    }

    .chip--complaints {
      align-items: flex-end;
    }

    .chip-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--ink-soft);
    }

    .chip-value {
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 0.03em;
    }

    .complaint-hearts {
      display: flex;
      gap: 5px;
    }

    .complaint-dot {
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: rgba(223, 79, 83, 0.18);
      box-shadow: inset 0 0 0 1px rgba(223, 79, 83, 0.16);
      transition: transform 180ms ease, background 180ms ease;
    }

    .complaint-dot.is-on {
      background: radial-gradient(circle at 35% 35%, #ffcfcf, var(--danger) 62%);
      box-shadow:
        inset 0 -1px 0 rgba(124, 17, 25, 0.26),
        0 6px 12px rgba(223, 79, 83, 0.28);
    }

    .order-card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px 16px 16px;
      border-radius: 24px;
      background: var(--panel-strong);
      box-shadow: var(--shadow-soft);
      overflow: hidden;
      transition: transform 180ms ease, box-shadow 180ms ease;
    }

    .order-card.is-hot {
      transform: translateY(-1px);
      box-shadow: 0 18px 36px rgba(223, 79, 83, 0.16);
    }

    .order-card::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.54), transparent 42%),
        linear-gradient(180deg, rgba(96, 55, 34, 0.04), transparent 44%);
      pointer-events: none;
    }

    .order-header {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 8px;
    }

    .order-title {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 8px;
      width: 100%;
      min-width: 0;
    }

    .brand {
      font-family: var(--font-display);
      font-size: clamp(20px, 5vw, 28px);
      font-weight: 900;
      letter-spacing: 0.03em;
      line-height: 0.88;
    }

    .order-subtitle {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ink-soft);
      white-space: nowrap;
      text-align: right;
    }

    .patience {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
    }

    .patience-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ink-soft);
    }

    .patience-meter {
      position: relative;
      flex: 1;
      min-width: 0;
      width: auto;
      height: 12px;
      border-radius: 999px;
      background: rgba(223, 79, 83, 0.14);
      overflow: hidden;
    }

    .patience-fill {
      position: absolute;
      inset: 0 auto 0 0;
      width: 100%;
      border-radius: inherit;
      background:
        linear-gradient(90deg, var(--danger) 0%, #f08a6a 55%, #ffd3a5 100%);
      transition: width 120ms linear;
    }

    .bento-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .order-slot {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      padding: 12px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.74);
      box-shadow: inset 0 0 0 1px rgba(96, 55, 34, 0.08);
    }

    .order-slot-count {
      margin-left: auto;
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 900;
    }

    .playfield {
      position: relative;
      z-index: 1;
      flex: 1;
      display: flex;
      align-items: stretch;
    }

    .board-frame {
      position: relative;
      flex: 1;
      border-radius: 30px;
      padding: 12px;
      background:
        linear-gradient(180deg, rgba(255, 248, 235, 0.94), rgba(246, 229, 203, 0.95)),
        linear-gradient(180deg, rgba(255, 255, 255, 0.24), transparent 26%);
      box-shadow:
        inset 0 0 0 2px rgba(255, 255, 255, 0.18),
        inset 0 -3px 0 rgba(96, 55, 34, 0.08),
        var(--shadow-soft);
    }

    .board-frame::before {
      content: "";
      position: absolute;
      inset: 12px;
      border-radius: 24px;
      background:
        radial-gradient(circle at top, rgba(255, 255, 255, 0.45), transparent 18%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.25), transparent 20%),
        linear-gradient(180deg, #fef3df 0%, #f6e4c8 100%);
      box-shadow: inset 0 0 0 1px rgba(123, 89, 69, 0.12);
    }

    .board-canvas {
      position: relative;
      z-index: 1;
      width: 100%;
      height: 100%;
      display: block;
      touch-action: manipulation;
      cursor: pointer;
    }

    .overlay {
      position: absolute;
      inset: 16px;
      z-index: 4;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 28px;
      background: rgba(53, 28, 17, 0.14);
      backdrop-filter: blur(9px);
    }

    .overlay.active {
      display: flex;
    }

    .overlay-card {
      width: min(100%, 420px);
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 26px 24px;
      border-radius: 28px;
      background:
        linear-gradient(180deg, rgba(255, 249, 238, 0.98), rgba(247, 231, 207, 0.96));
      box-shadow: var(--shadow-strong);
    }

    .overlay-card h1,
    .overlay-card h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(38px, 6vw, 54px);
      line-height: 0.92;
    }

    .overlay-card p {
      margin: 0;
      font-size: 16px;
      line-height: 1.45;
      color: var(--ink-soft);
    }

    .cta-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 8px;
    }

    .play-button,
    .restart-button {
      border: 0;
      border-radius: 999px;
      padding: 14px 18px;
      font-family: var(--font-display);
      font-size: 22px;
      font-weight: 900;
      color: white;
      background:
        linear-gradient(180deg, #ff936f 0%, var(--accent-coral) 100%);
      box-shadow: 0 14px 24px rgba(239, 125, 88, 0.28);
    }

    .mini-note {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--ink-soft);
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .stat-card {
      padding: 12px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.72);
      box-shadow: inset 0 0 0 1px rgba(96, 55, 34, 0.08);
    }

    .stat-card span {
      display: block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--ink-soft);
    }

    .stat-card strong {
      display: block;
      margin-top: 4px;
      font-family: var(--font-display);
      font-size: 25px;
    }

    .hud-ingredient {
      position: relative;
      width: 52px;
      height: 52px;
      border-radius: 18px;
      box-shadow:
        inset 0 -3px 0 rgba(60, 31, 18, 0.14),
        0 8px 14px rgba(96, 55, 34, 0.09);
      overflow: hidden;
      flex: 0 0 auto;
    }

    .hud-ingredient::before,
    .hud-ingredient::after {
      content: "";
      position: absolute;
    }

    .hud-ingredient--salmon {
      background:
        radial-gradient(circle at top, rgba(255, 255, 255, 0.4), transparent 44%),
        linear-gradient(180deg, #ff9c7d 0%, ${ingredientDefinition("salmon").color} 100%);
    }

    .hud-ingredient--salmon::before {
      inset: 28% 16%;
      border-top: 4px solid rgba(255, 250, 244, 0.86);
      border-bottom: 4px solid rgba(255, 250, 244, 0.72);
      border-radius: 999px;
    }

    .hud-ingredient--salmon::after {
      inset: 16% auto auto 18%;
      width: 58%;
      height: 14%;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.45);
    }

    .hud-ingredient--avocado {
      background:
        radial-gradient(circle at top, rgba(255, 255, 255, 0.38), transparent 42%),
        linear-gradient(180deg, #a6db8b 0%, ${ingredientDefinition("avocado").color} 100%);
    }

    .hud-ingredient--avocado::before {
      inset: 18%;
      border-radius: 999px 999px 64% 64%;
      background: linear-gradient(180deg, #d7f3bf 0%, #94cf78 100%);
    }

    .hud-ingredient--avocado::after {
      inset: 39% 36%;
      border-radius: 999px;
      background: #75502e;
    }

    .hud-ingredient--egg {
      background:
        radial-gradient(circle at top, rgba(255, 255, 255, 0.38), transparent 42%),
        linear-gradient(180deg, #fff6d5 0%, #fff1be 100%);
    }

    .hud-ingredient--egg::before {
      inset: 23% 18%;
      border-radius: 14px;
      background: linear-gradient(180deg, #ffe28f 0%, ${ingredientDefinition("egg").color} 100%);
    }

    .hud-ingredient--egg::after {
      inset: 17% 16%;
      border-radius: 18px;
      box-shadow: inset 0 0 0 4px rgba(255, 255, 255, 0.9);
    }

    .hud-ingredient--cucumber {
      background:
        radial-gradient(circle at top, rgba(255, 255, 255, 0.38), transparent 42%),
        linear-gradient(180deg, #85dbc0 0%, ${ingredientDefinition("cucumber").color} 100%);
    }

    .hud-ingredient--cucumber::before,
    .hud-ingredient--cucumber::after {
      border-radius: 999px;
      border: 4px solid rgba(225, 255, 243, 0.78);
    }

    .hud-ingredient--cucumber::before {
      inset: 20% 18% 20% 18%;
    }

    .hud-ingredient--cucumber::after {
      inset: 33% 31% 33% 31%;
    }

    @media (min-aspect-ratio: 1 / 1) {
      .mockup-shell {
        padding: 18px;
      }

      .counter-stage {
        width: min(100%, 500px);
      }
    }
  `;
  document.head.appendChild(style);
}
