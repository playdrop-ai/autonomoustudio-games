/// <reference types="playdrop-sdk-types" />

import { CanvasRenderer } from "./game/render";
import { chooseAutoplayTarget, createDebugSnapshot, createInitialState, stepGame } from "./game/sim";
import { type AutoplayMode, type District, type Screen } from "./game/types";

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
    __powderPostDebug?: ReturnType<typeof createDebugSnapshot> & {
      screen: Screen;
      bestScore: number;
      bestStreak: number;
      width: number;
      height: number;
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
};

const STORAGE_KEYS = {
  bestScore: "powder-post-best-score",
  bestStreak: "powder-post-best-streak",
};

void (async () => {
  const host = await createHostBridge();
  host.setLoadingState({ status: "loading", message: "Packing the satchel", progress: 0.16 });

  document.title = "Powder Post";
  injectStyles();
  const ui = createUI();
  const renderer = new CanvasRenderer(ui.canvas);

  host.setLoadingState({ status: "loading", message: "Tracing the slope", progress: 0.42 });

  const seed = readSeedFromLocation();
  const autoplayMode = readAutoplayFromLocation();
  let state = createInitialState(seed);
  let screen: Screen = autoplayMode ? "playing" : "start";
  let bestScore = readNumericStorage(STORAGE_KEYS.bestScore);
  let bestStreak = readNumericStorage(STORAGE_KEYS.bestStreak);
  let lastFrame = performance.now();
  let pointerTarget: number | null = null;
  let pointerActive = false;
  const keys = new Set<string>();

  if (screen === "playing" && autoplayMode) {
    state.targetX = chooseAutoplayTarget(state, autoplayMode);
  }

  function startRun(): void {
    state = createInitialState(seed);
    screen = "playing";
    pointerTarget = null;
    pointerActive = false;
    if (autoplayMode) {
      state.targetX = chooseAutoplayTarget(state, autoplayMode);
    }
  }

  function finishRun(): void {
    screen = "gameover";
    bestScore = Math.max(bestScore, state.score);
    bestStreak = Math.max(bestStreak, state.bestRunStreak);
    localStorage.setItem(STORAGE_KEYS.bestScore, String(bestScore));
    localStorage.setItem(STORAGE_KEYS.bestStreak, String(bestStreak));
  }

  function updateHUD(): void {
    ui.scoreValue.textContent = formatScore(screen === "start" ? 0 : state.score);
    ui.streakValue.textContent = `x${screen === "start" ? 0 : state.streak}`;
    ui.bestLineValue.textContent = `${Math.max(bestStreak, state.bestRunStreak)} GATES`;
    ui.parcelCurrent.innerHTML = crestSvg(screen === "start" ? state.activeParcel : state.activeParcel);
    ui.parcelNext.innerHTML = crestSvg(screen === "start" ? state.nextParcel : state.nextParcel);
    ui.stormFill.style.width = `${Math.round((screen === "start" ? 0.24 : state.storm01) * 100)}%`;

    ui.overlayStart.classList.toggle("active", screen === "start");
    ui.overlayGameover.classList.toggle("active", screen === "gameover");

    ui.gameoverScore.textContent = formatScore(state.score);
    ui.bestScoreValue.textContent = formatScore(bestScore);
    ui.bestStreakValue.textContent = `x${Math.max(bestStreak, state.bestRunStreak)}`;
    ui.gatesValue.textContent = String(state.deliveries);
  }

  function updateDebug(): void {
    const layout = renderer.getLayout();
    window.__powderPostDebug = {
      ...createDebugSnapshot(state),
      screen,
      bestScore,
      bestStreak,
      width: layout.width,
      height: layout.height,
    };
  }

  function currentSteerTarget(dtMs: number): number | null {
    if (autoplayMode && screen === "playing") {
      return chooseAutoplayTarget(state, autoplayMode);
    }

    if (pointerTarget !== null) {
      return pointerTarget;
    }

    const keyboardDirection = (keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
    if (keyboardDirection !== 0) {
      return clamp(state.targetX + keyboardDirection * dtMs * 0.0012, -0.94, 0.94);
    }

    return null;
  }

  function advanceFrame(dtMs: number): void {
    if (screen === "playing") {
      const result = stepGame(state, dtMs, currentSteerTarget(dtMs));
      state = result.state;
      if (result.events.some((event) => event.kind === "gameover")) finishRun();
    }
  }

  function renderFrame(): void {
    renderer.render(state, screen);
    updateHUD();
    updateDebug();
  }

  function frame(now: number): void {
    const dtMs = Math.min(40, now - lastFrame);
    lastFrame = now;
    advanceFrame(dtMs);
    renderFrame();
    requestAnimationFrame(frame);
  }

  function updatePointerTarget(clientX: number): void {
    const rect = ui.stage.getBoundingClientRect();
    const normalized = (clientX - rect.left) / Math.max(1, rect.width);
    pointerTarget = clamp(normalized * 2 - 1, -0.94, 0.94);
  }

  ui.stage.addEventListener("pointerdown", (event) => {
    if (screen !== "playing") startRun();
    pointerActive = true;
    updatePointerTarget(event.clientX);
  });

  window.addEventListener("pointermove", (event) => {
    if (!pointerActive) return;
    updatePointerTarget(event.clientX);
  });

  window.addEventListener("pointerup", () => {
    pointerActive = false;
    pointerTarget = null;
  });

  window.addEventListener("pointercancel", () => {
    pointerActive = false;
    pointerTarget = null;
  });

  ui.playButton.addEventListener("click", () => {
    startRun();
    renderFrame();
  });

  ui.restartButton.addEventListener("click", () => {
    startRun();
    renderFrame();
  });

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "enter") {
      event.preventDefault();
      if (screen !== "playing") {
        startRun();
        renderFrame();
      }
      return;
    }
    if (key === "r" && screen === "gameover") {
      startRun();
      renderFrame();
      return;
    }
    if (key === "arrowleft" || key === "arrowright" || key === "a" || key === "d") {
      keys.add(key);
    }
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    keys.delete(key);
  });

  window.addEventListener("resize", () => {
    renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    renderFrame();
  });

  window.advanceTime = async (ms: number) => {
    if (screen !== "playing") startRun();
    let remaining = ms;
    while (remaining > 0 && screen === "playing") {
      const stepMs = Math.min(16, remaining);
      advanceFrame(stepMs);
      remaining -= stepMs;
    }
    renderFrame();
  };

  window.render_game_to_text = () => JSON.stringify(window.__powderPostDebug ?? {});

  host.setLoadingState({ status: "ready" });
  renderFrame();
  requestAnimationFrame(frame);
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

function createUI(): {
  stage: HTMLDivElement;
  canvas: HTMLCanvasElement;
  scoreValue: HTMLElement;
  streakValue: HTMLElement;
  parcelCurrent: HTMLElement;
  parcelNext: HTMLElement;
  stormFill: HTMLElement;
  overlayStart: HTMLElement;
  overlayGameover: HTMLElement;
  playButton: HTMLButtonElement;
  restartButton: HTMLButtonElement;
  bestLineValue: HTMLElement;
  gameoverScore: HTMLElement;
  bestScoreValue: HTMLElement;
  bestStreakValue: HTMLElement;
  gatesValue: HTMLElement;
} {
  document.body.innerHTML = `
    <div id="app">
      <canvas id="scene"></canvas>
      <div class="hud-cluster hud-primary">
        <div class="hud-score">
          <div class="hud-kicker">SCORE</div>
          <div class="hud-value" id="score-value">0</div>
        </div>
        <div class="hud-streak">
          <div class="hud-kicker">STREAK</div>
          <div class="hud-value" id="streak-value">x0</div>
        </div>
      </div>
      <div class="hud-cluster hud-secondary">
        <div class="parcel-panel">
          <div class="parcel-stack">
            <span class="crest" id="parcel-current"></span>
            <span class="crest parcel-next" id="parcel-next"></span>
          </div>
        </div>
        <div class="storm-panel">
          <div class="hud-kicker">STORM</div>
          <div class="storm-bar"><div class="storm-fill" id="storm-fill"></div></div>
        </div>
      </div>
      <section class="overlay" id="overlay-start">
        <div class="title-lockup">
          <p class="eyebrow">MIDNIGHT DELIVERY RUN</p>
          <h1 class="game-title">Powder<br />Post</h1>
          <p class="deck-copy">Thread the right gate, keep the streak alive, and do not let the storm close the slope.</p>
        </div>
        <div class="start-card">
          <div class="card-row">
            <div>
              <div class="hud-kicker">BEST LINE</div>
              <div class="hud-value" id="best-line-value">0 GATES</div>
            </div>
            <button class="button" id="play-button" type="button">Play</button>
          </div>
          <div class="start-chip">DRAG / A D TO CARVE</div>
        </div>
      </section>
      <section class="overlay" id="overlay-gameover">
        <div class="title-lockup">
          <p class="eyebrow">RUN LOST TO THE STORM</p>
          <h1 class="game-title">Whiteout</h1>
          <p class="deck-copy">A late gate miss let the avalanche bite back. Reset the route and take the cleaner line.</p>
        </div>
        <div class="gameover-card">
          <div class="card-row">
            <div>
              <div class="hud-kicker">RUN REPORT</div>
              <div class="hud-value" id="gameover-score">0</div>
            </div>
            <button class="button" id="restart-button" type="button">Run Again</button>
          </div>
          <div class="stat-grid">
            <div class="stat">
              <div class="hud-kicker">BEST</div>
              <div class="hud-value" id="best-score-value">0</div>
            </div>
            <div class="stat">
              <div class="hud-kicker">STREAK</div>
              <div class="hud-value" id="best-streak-value">x0</div>
            </div>
            <div class="stat">
              <div class="hud-kicker">GATES</div>
              <div class="hud-value" id="gates-value">0</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;

  const stage = document.getElementById("app");
  const canvas = document.getElementById("scene");
  const scoreValue = document.getElementById("score-value");
  const streakValue = document.getElementById("streak-value");
  const parcelCurrent = document.getElementById("parcel-current");
  const parcelNext = document.getElementById("parcel-next");
  const stormFill = document.getElementById("storm-fill");
  const overlayStart = document.getElementById("overlay-start");
  const overlayGameover = document.getElementById("overlay-gameover");
  const playButton = document.getElementById("play-button");
  const restartButton = document.getElementById("restart-button");
  const bestLineValue = document.getElementById("best-line-value");
  const gameoverScore = document.getElementById("gameover-score");
  const bestScoreValue = document.getElementById("best-score-value");
  const bestStreakValue = document.getElementById("best-streak-value");
  const gatesValue = document.getElementById("gates-value");

  if (!(stage instanceof HTMLDivElement)) throw new Error("[powder-post] #app missing");
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error("[powder-post] #scene missing");
  if (!(scoreValue instanceof HTMLElement)) throw new Error("[powder-post] #score-value missing");
  if (!(streakValue instanceof HTMLElement)) throw new Error("[powder-post] #streak-value missing");
  if (!(parcelCurrent instanceof HTMLElement)) throw new Error("[powder-post] #parcel-current missing");
  if (!(parcelNext instanceof HTMLElement)) throw new Error("[powder-post] #parcel-next missing");
  if (!(stormFill instanceof HTMLElement)) throw new Error("[powder-post] #storm-fill missing");
  if (!(overlayStart instanceof HTMLElement)) throw new Error("[powder-post] #overlay-start missing");
  if (!(overlayGameover instanceof HTMLElement)) throw new Error("[powder-post] #overlay-gameover missing");
  if (!(playButton instanceof HTMLButtonElement)) throw new Error("[powder-post] #play-button missing");
  if (!(restartButton instanceof HTMLButtonElement)) throw new Error("[powder-post] #restart-button missing");
  if (!(bestLineValue instanceof HTMLElement)) throw new Error("[powder-post] #best-line-value missing");
  if (!(gameoverScore instanceof HTMLElement)) throw new Error("[powder-post] #gameover-score missing");
  if (!(bestScoreValue instanceof HTMLElement)) throw new Error("[powder-post] #best-score-value missing");
  if (!(bestStreakValue instanceof HTMLElement)) throw new Error("[powder-post] #best-streak-value missing");
  if (!(gatesValue instanceof HTMLElement)) throw new Error("[powder-post] #gates-value missing");

  return {
    stage,
    canvas,
    scoreValue,
    streakValue,
    parcelCurrent,
    parcelNext,
    stormFill,
    overlayStart,
    overlayGameover,
    playButton,
    restartButton,
    bestLineValue,
    gameoverScore,
    bestScoreValue,
    bestStreakValue,
    gatesValue,
  };
}

function injectStyles(): void {
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#091321";

  const style = document.createElement("style");
  style.textContent = `
    :root {
      color-scheme: dark;
    }

    * { box-sizing: border-box; }

    html, body {
      width: 100%;
      height: 100%;
      font-family: "Avenir Next", "Trebuchet MS", sans-serif;
      background: #091321;
      color: #f7fbff;
      touch-action: none;
      -webkit-font-smoothing: antialiased;
    }

    button {
      font: inherit;
      border: 0;
      cursor: pointer;
    }

    #app {
      position: fixed;
      inset: 0;
      overflow: hidden;
      background: linear-gradient(180deg, #102341, #214a76 46%, #6d8eb1 78%, #aac1d7);
    }

    canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }

    .hud-cluster {
      position: absolute;
      display: flex;
      align-items: center;
      gap: 12px;
      pointer-events: none;
      z-index: 3;
    }

    .hud-primary {
      top: 18px;
      left: 18px;
      padding: 12px 16px;
      border-radius: 20px;
      background: rgba(14, 25, 40, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.14);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(12px);
    }

    .hud-score {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .hud-kicker {
      font-size: 10px;
      line-height: 1;
      letter-spacing: 0.22em;
      color: rgba(255, 255, 255, 0.72);
    }

    .hud-value {
      font-size: 26px;
      line-height: 1;
      font-weight: 800;
    }

    .hud-streak {
      min-width: 58px;
      padding: 10px 12px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.08);
      text-align: center;
    }

    .hud-streak .hud-value {
      font-size: 24px;
    }

    .hud-secondary {
      top: 18px;
      right: 18px;
      gap: 10px;
    }

    .parcel-panel,
    .storm-panel {
      padding: 10px 12px;
      border-radius: 18px;
      background: rgba(14, 25, 40, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.14);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.28);
      backdrop-filter: blur(12px);
    }

    .parcel-stack {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .crest {
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    }

    .crest svg {
      width: 24px;
      height: 24px;
    }

    .parcel-next {
      transform: scale(0.82);
      opacity: 0.84;
    }

    .storm-panel {
      width: 148px;
    }

    .storm-bar {
      margin-top: 8px;
      width: 100%;
      height: 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      overflow: hidden;
    }

    .storm-fill {
      width: 0%;
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #e6f7ff 0%, #b6deff 44%, #86b6ef 100%);
      transition: width 110ms linear;
    }

    .overlay {
      position: absolute;
      inset: 0;
      display: none;
      pointer-events: none;
      z-index: 4;
    }

    .overlay.active {
      display: block;
    }

    .title-lockup {
      position: absolute;
      left: 22px;
      top: 92px;
      max-width: min(34vw, 340px);
      pointer-events: none;
    }

    .eyebrow {
      margin: 0 0 10px;
      font-size: 11px;
      letter-spacing: 0.28em;
      color: rgba(240, 248, 255, 0.75);
    }

    .game-title {
      margin: 0;
      font-size: clamp(42px, 7vw, 72px);
      line-height: 0.92;
      font-weight: 900;
      text-transform: uppercase;
      text-shadow: 0 22px 44px rgba(0, 0, 0, 0.28);
    }

    .deck-copy {
      margin: 14px 0 0;
      max-width: 24ch;
      font-size: 16px;
      line-height: 1.38;
      color: rgba(247, 251, 255, 0.84);
    }

    .start-card,
    .gameover-card {
      position: absolute;
      right: 22px;
      bottom: 22px;
      width: min(35vw, 360px);
      padding: 18px 18px 20px;
      border-radius: 24px;
      background: rgba(10, 18, 30, 0.86);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.34);
      backdrop-filter: blur(16px);
      pointer-events: auto;
    }

    .gameover-card {
      width: min(38vw, 388px);
    }

    .card-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .start-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.82);
      font-size: 12px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 142px;
      padding: 14px 18px;
      border-radius: 18px;
      background: linear-gradient(180deg, #ffd47a 0%, #ffb443 100%);
      color: #1f2732;
      font-size: 16px;
      font-weight: 800;
      box-shadow: 0 18px 44px rgba(255, 177, 67, 0.34);
    }

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 16px;
    }

    .stat {
      padding: 12px 12px 13px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .stat .hud-kicker {
      margin-bottom: 6px;
    }

    .stat .hud-value {
      font-size: 22px;
    }

    @media (max-width: 920px) {
      .hud-primary {
        top: 12px;
        left: 12px;
        padding: 10px 12px;
        gap: 10px;
      }

      .hud-value {
        font-size: 22px;
      }

      .hud-streak {
        min-width: 48px;
        padding: 8px 9px;
      }

      .hud-streak .hud-value {
        font-size: 20px;
      }

      .hud-secondary {
        top: 12px;
        right: 12px;
        gap: 8px;
      }

      .parcel-panel,
      .storm-panel {
        padding: 8px 10px;
      }

      .storm-panel {
        width: 132px;
      }

      .title-lockup {
        top: 66px;
        left: 14px;
        max-width: min(38vw, 280px);
      }

      .deck-copy {
        font-size: 13px;
      }

      .game-title {
        font-size: clamp(34px, 10vw, 52px);
      }

      .start-card,
      .gameover-card {
        right: 14px;
        bottom: 14px;
        width: min(42vw, 250px);
        padding: 14px 14px 16px;
        border-radius: 20px;
      }

      .button {
        min-width: 112px;
        padding: 12px 14px;
        font-size: 14px;
      }

      .stat-grid {
        gap: 8px;
      }

      .stat {
        padding: 10px;
        border-radius: 14px;
      }

      .stat .hud-value {
        font-size: 18px;
      }
    }
  `;
  document.head.appendChild(style);
}

async function createHostBridge(): Promise<HostBridge> {
  const hasHostQuery = new URL(window.location.href).searchParams.has("playdrop_channel");
  if (!window.playdrop || !hasHostQuery) {
    return {
      setLoadingState: (state) => window.playdrop?.host?.setLoadingState?.(state),
    };
  }

  try {
    const sdk = await window.playdrop.init();
    return {
      setLoadingState: (state) => sdk.host.setLoadingState(state),
    };
  } catch {
    return {
      setLoadingState: (state) => window.playdrop?.host?.setLoadingState?.(state),
    };
  }
}

function crestSvg(district: District): string {
  const palette =
    district === "amber"
      ? { fill: "#ffc868", stroke: "#7f4b12" }
      : district === "coral"
        ? { fill: "#ff936c", stroke: "#82311c" }
        : { fill: "#7ce7dc", stroke: "#145055" };

  const shape =
    district === "amber"
      ? `<path d="M12 3 20 12 12 21 4 12Z" fill="${palette.stroke}" opacity="0.18"/><path d="M12 5.5 18.5 12 12 18.5 5.5 12Z" fill="${palette.stroke}"/>`
      : district === "coral"
        ? `<path d="M12 4 19 19H5Z" fill="${palette.stroke}" opacity="0.16"/><path d="M12 6.5 16.5 16H7.5Z" fill="${palette.stroke}"/>`
        : `<circle cx="12" cy="12" r="7.5" fill="${palette.stroke}" opacity="0.15"/><circle cx="12" cy="12" r="5" fill="${palette.stroke}"/>`;

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1.25" y="1.25" width="21.5" height="21.5" rx="8" fill="${palette.fill}" />
      ${shape}
    </svg>
  `;
}

function readSeedFromLocation(): number | undefined {
  const raw = new URL(window.location.href).searchParams.get("seed");
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readAutoplayFromLocation(): AutoplayMode | null {
  const raw = new URL(window.location.href).searchParams.get("autoplay");
  if (raw === "idle" || raw === "casual" || raw === "expert") return raw;
  return null;
}

function readNumericStorage(key: string): number {
  const raw = localStorage.getItem(key);
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatScore(score: number): string {
  return score.toLocaleString("en-US");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
