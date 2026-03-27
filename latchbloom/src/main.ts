/// <reference types="playdrop-sdk-types" />

import { preloadBackdropPack } from "./game/backdrops";
import { CanvasRenderer, type AccentLabel } from "./game/render";
import { applyCasualToggle, applyExpertToggle, type AutoplayMode } from "./game/autoplay";
import {
  STRIKE_LIMIT,
  createInitialState,
  spawnChargeForState,
  toggleLatch,
  updateGame,
  type GameEvent,
  type Screen,
} from "./game/logic";

declare global {
  interface Window {
    __latchbloomDebug?: {
      screen: Screen;
      score: number;
      bestScore: number;
      streak: number;
      strikes: number;
      nextSpawn: { kind: string; lane: number };
      spawnCharge01: number;
      backdropVariant: "landscape" | "portrait" | "procedural";
      blossoms: Array<{ kind: string; segment: number; fromLane: number; toLane: number; progress: number }>;
      vases: Array<{ target: string; meter: number }>;
      latches: string[][];
      layout: {
        boardX: number;
        boardY: number;
        boardWidth: number;
        boardHeight: number;
        laneCenters: number[];
        latchRows: number[];
      };
    };
    __latchbloomControls?: {
      startRun: () => void;
      toggleLatch: (row: number, pairIndex: number) => void;
    };
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => void;
  }
}

const BEST_SCORE_KEY = "latchbloom-best-score";

void (async () => {
  const host = await createHostBridge();
  host.setLoadingState({ status: "loading", message: "Warming the glasshouse", progress: 0.18 });

  document.title = "Latchbloom";
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.style.background = "#000";
  document.body.style.touchAction = "none";

  const stage = document.createElement("div");
  stage.id = "latchbloom-stage";
  stage.style.position = "fixed";
  stage.style.inset = "0";
  stage.style.background = "#000";
  stage.style.overflow = "hidden";
  stage.style.touchAction = "none";
  document.body.appendChild(stage);

  const canvas = document.createElement("canvas");
  canvas.id = "latchbloom-canvas";
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "none";
  stage.appendChild(canvas);

  host.setLoadingState({ status: "loading", message: "Loading backdrop art", progress: 0.34 });
  const backdropPack = await preloadBackdropPack();
  const renderer = new CanvasRenderer(canvas, backdropPack);
  const forcedSeed = readSeedFromLocation();
  let gameState = createInitialState(forcedSeed);
  let screen: Screen = "start";
  let bestScore = readBestScore();
  let accent: AccentLabel | null = null;
  let lastFrame = performance.now();
  const autoplayMode = readAutoplayFromLocation();
  let autoplayTimerMs = 0;

  const autoplayReactionMs =
    autoplayMode === "expert" ? 50 : autoplayMode === "casual" ? 350 : Number.POSITIVE_INFINITY;

  function startRun(): void {
    gameState = createInitialState(forcedSeed);
    screen = "playing";
    accent = null;
    autoplayTimerMs = 0;
  }

  const overlay = createScreenOverlay(stage, () => {
    startRun();
    renderFrame();
  });

  function finishRun(): void {
    screen = "gameover";
    if (gameState.score > bestScore) {
      bestScore = gameState.score;
      writeBestScore(bestScore);
    }
  }

  function applyEvents(events: GameEvent[]): void {
    for (const event of events) {
      if (event.kind === "correct" && event.streak >= 4) {
        accent = {
          text: `STREAK x${event.streak}`,
          color: "#fff0ae",
          opacity: 1,
        };
      } else if (event.kind === "burst") {
        accent = {
          text: "BOUQUET BURST",
          color: "#fff0ae",
          opacity: 1,
        };
      } else if (event.kind === "wrong") {
        accent = {
          text: "STRIKE",
          color: "#ff9ba7",
          opacity: 1,
        };
      } else if (event.kind === "gameover") {
        finishRun();
      }
    }
  }

  function step(elapsed: number): void {
    if (autoplayMode && screen !== "playing") {
      startRun();
    }

    if (screen === "playing") {
      autoplayTimerMs += elapsed;
      while (autoplayTimerMs >= autoplayReactionMs) {
        gameState = autoplayMode === "expert" ? applyExpertToggle(gameState) : applyCasualToggle(gameState);
        autoplayTimerMs -= autoplayReactionMs;
      }
      const result = updateGame(gameState, elapsed);
      gameState = result.state;
      applyEvents(result.events);
      if (gameState.gameOver) finishRun();
    }

    if (accent) {
      accent = {
        ...accent,
        opacity: Math.max(0, accent.opacity - elapsed / 900),
      };
      if (accent.opacity <= 0) accent = null;
    }
  }

  function publishDebug(): void {
    const layout = renderer.getLayout();
    window.__latchbloomDebug = {
      screen,
      score: gameState.score,
      bestScore,
      streak: gameState.streak,
      strikes: gameState.strikes,
      spawnCharge01: Number(spawnChargeForState(gameState).toFixed(3)),
      backdropVariant: layout.backdropVariant,
      nextSpawn: {
        kind: gameState.nextSpawn.kind,
        lane: gameState.nextSpawn.lane,
      },
      blossoms: gameState.blossoms.map((blossom) => ({
        kind: blossom.kind,
        segment: blossom.segment,
        fromLane: blossom.fromLane,
        toLane: blossom.toLane,
        progress: Number(blossom.progress.toFixed(3)),
      })),
      vases: gameState.vases.map((vase) => ({
        target: vase.target,
        meter: vase.meter,
      })),
      latches: gameState.latches.map((row) => row.slice()),
      layout: {
        boardX: layout.boardX,
        boardY: layout.boardY,
        boardWidth: layout.boardWidth,
        boardHeight: layout.boardHeight,
        laneCenters: layout.laneCenters.slice(),
        latchRows: layout.latchRows.slice(),
      },
    };
  }

  function renderFrame(): void {
    publishDebug();
    overlay.update({
      screen,
      score: gameState.score,
      bestScore,
      portrait: window.innerWidth <= window.innerHeight,
    });
    window.__latchbloomControls = {
      startRun: () => {
        startRun();
        renderFrame();
      },
      toggleLatch: (row, pairIndex) => {
        if (screen !== "playing") return;
        gameState = toggleLatch(gameState, row, pairIndex);
        renderFrame();
      },
    };
    renderer.render({
      state: gameState,
      screen,
      bestScore,
      accent,
      spawnCharge01: spawnChargeForState(gameState),
    });
  }

  function render(now: number): void {
    const elapsed = Math.min(64, now - lastFrame);
    lastFrame = now;
    step(elapsed);
    renderFrame();
    requestAnimationFrame(render);
  }

  window.render_game_to_text = () =>
    JSON.stringify({
      coordinateSystem: "origin top-left, x right, y down",
      screen,
      score: gameState.score,
      bestScore,
      strikes: gameState.strikes,
      spawnCharge01: Number(spawnChargeForState(gameState).toFixed(3)),
      backdropVariant: renderer.getLayout().backdropVariant,
      nextSpawn: gameState.nextSpawn,
      blossoms: gameState.blossoms.map((blossom) => ({
        kind: blossom.kind,
        segment: blossom.segment,
        fromLane: blossom.fromLane,
        toLane: blossom.toLane,
        progress: Number(blossom.progress.toFixed(3)),
      })),
      vases: gameState.vases.map((vase) => ({
        target: vase.target,
        meter: vase.meter,
        warning: Number(vase.wrongTimer.toFixed(3)),
      })),
      latches: gameState.latches.map((row) => row.slice()),
    });

  window.advanceTime = (ms: number) => {
    const steps = Math.max(1, Math.round(ms / 16));
    const stepMs = ms / steps;
    for (let index = 0; index < steps; index += 1) {
      step(stepMs);
    }
    lastFrame = performance.now();
    renderFrame();
  };

  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId);
    if (screen !== "playing") return;

    const latch = renderer.locateLatch(event.clientX, event.clientY);
    if (!latch) return;
    gameState = toggleLatch(gameState, latch.row, latch.pairIndex);
  });

  window.addEventListener("resize", () => {
    renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  });

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "enter") {
      if (screen !== "playing") startRun();
      return;
    }
    if (key === "r") {
      startRun();
    }
  });

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

function readAutoplayFromLocation(): AutoplayMode | null {
  const raw = new URL(window.location.href).searchParams.get("autoplay");
  if (raw === "casual" || raw === "expert") return raw;
  return null;
}

async function createHostBridge(): Promise<{ setLoadingState: (state: { status: "loading" | "ready" | "error"; message?: string; progress?: number }) => void }> {
  const playdrop = window.playdrop;
  const hasPlaydropChannel = new URL(window.location.href).searchParams.has("playdrop_channel");
  if (!playdrop) {
    return {
      setLoadingState: () => undefined,
    };
  }
  if (!hasPlaydropChannel) {
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
    // Fall back when running outside the full shell.
  }
  return {
    setLoadingState: (state) => {
      playdrop.host?.setLoadingState?.(state);
    },
  };
}

function createScreenOverlay(
  host: HTMLElement,
  onAction: () => void,
): {
  update: (params: { screen: Screen; score: number; bestScore: number; portrait: boolean }) => void;
} {
  ensureOverlayStyles();

  const root = document.createElement("div");
  root.id = "latchbloom-overlay";
  root.hidden = true;

  const sheet = document.createElement("section");
  sheet.className = "latchbloom-sheet";

  const eyebrow = document.createElement("div");
  eyebrow.className = "latchbloom-eyebrow";
  sheet.appendChild(eyebrow);

  const title = document.createElement("h1");
  title.className = "latchbloom-title";
  sheet.appendChild(title);

  const body = document.createElement("p");
  body.className = "latchbloom-body";
  sheet.appendChild(body);

  const stats = document.createElement("div");
  stats.className = "latchbloom-stats";
  const scoreCard = createStatCard("RUN SCORE");
  const bestCard = createStatCard("BEST");
  stats.append(scoreCard.card, bestCard.card);
  sheet.appendChild(stats);

  const button = document.createElement("button");
  button.className = "latchbloom-button";
  button.type = "button";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onAction();
  });
  sheet.appendChild(button);

  root.appendChild(sheet);
  host.appendChild(root);

  return {
    update({ screen, score, bestScore, portrait }) {
      root.dataset.portrait = portrait ? "true" : "false";
      root.hidden = screen === "playing";
      if (screen === "playing") return;

      if (screen === "start") {
        root.dataset.mode = "start";
        eyebrow.textContent = "GREENHOUSE ROUTING ARCADE";
        title.textContent = "Latchbloom";
        body.textContent =
          "Route blossoms into matching vases. Bouquets clear 1 strike. Three strikes end the run.";
        stats.hidden = true;
        button.textContent = "Open The Glasshouse";
      } else {
        root.dataset.mode = "gameover";
        eyebrow.textContent = "RUN OVER";
        title.textContent = "Three strikes shut the greenhouse.";
        body.textContent = "Build bouquets to erase strikes and keep the flow alive longer.";
        scoreCard.value.textContent = formatScore(score);
        bestCard.value.textContent = formatScore(bestScore);
        stats.hidden = false;
        button.textContent = "Bloom Again";
      }
    },
  };
}

function createStatCard(label: string): { card: HTMLDivElement; value: HTMLDivElement } {
  const card = document.createElement("div");
  card.className = "latchbloom-stat";

  const labelNode = document.createElement("div");
  labelNode.className = "latchbloom-stat-label";
  labelNode.textContent = label;
  card.appendChild(labelNode);

  const value = document.createElement("div");
  value.className = "latchbloom-stat-value";
  card.appendChild(value);

  return { card, value };
}

function ensureOverlayStyles(): void {
  if (document.getElementById("latchbloom-overlay-styles")) return;
  const style = document.createElement("style");
  style.id = "latchbloom-overlay-styles";
  style.textContent = `
    #latchbloom-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      justify-content: center;
      align-items: flex-end;
      padding: 18px;
      box-sizing: border-box;
      pointer-events: none;
    }

    #latchbloom-overlay[data-portrait="false"] {
      padding: 24px;
    }

    #latchbloom-overlay[hidden] {
      display: none;
    }

    .latchbloom-sheet {
      width: min(620px, calc(100vw - 36px));
      padding: 22px 24px 20px;
      border-radius: 28px;
      background: rgba(10, 22, 31, 0.94);
      border: 1px solid rgba(158, 227, 207, 0.14);
      box-shadow: 0 18px 56px rgba(0, 0, 0, 0.36);
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: auto;
      box-sizing: border-box;
    }

    #latchbloom-overlay[data-portrait="true"] .latchbloom-sheet {
      width: calc(100vw - 36px);
      max-width: none;
      border-radius: 24px;
      padding: 18px 18px 16px;
      gap: 10px;
    }

    .latchbloom-eyebrow {
      color: #9ee3cf;
      font: 700 13px/1.1 "Trebuchet MS", "Avenir Next", sans-serif;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .latchbloom-title {
      margin: 0;
      color: #f8fff8;
      font: 700 42px/1.02 "Trebuchet MS", "Avenir Next", sans-serif;
    }

    #latchbloom-overlay[data-mode="gameover"] .latchbloom-title {
      font-size: 34px;
      line-height: 1.08;
    }

    #latchbloom-overlay[data-portrait="true"] .latchbloom-title {
      font-size: 30px;
    }

    #latchbloom-overlay[data-portrait="true"][data-mode="start"] .latchbloom-title {
      font-size: 36px;
    }

    .latchbloom-body {
      margin: 0;
      color: #c4ddd8;
      font: 500 18px/1.34 "Trebuchet MS", "Avenir Next", sans-serif;
    }

    #latchbloom-overlay[data-portrait="true"] .latchbloom-body {
      font-size: 16px;
      line-height: 1.32;
    }

    .latchbloom-stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 2px;
    }

    .latchbloom-stats[hidden] {
      display: none;
    }

    .latchbloom-stat {
      border-radius: 18px;
      background: rgba(12, 31, 43, 0.74);
      border: 1px solid rgba(158, 227, 207, 0.12);
      padding: 12px 12px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      min-height: 78px;
      box-sizing: border-box;
    }

    .latchbloom-stat-label {
      color: #9ee3cf;
      font: 700 12px/1 "Trebuchet MS", "Avenir Next", sans-serif;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-align: center;
    }

    .latchbloom-stat-value {
      color: #fff3c2;
      font: 700 32px/1 "Trebuchet MS", "Avenir Next", sans-serif;
      text-align: center;
    }

    #latchbloom-overlay[data-portrait="true"] .latchbloom-stat-value {
      font-size: 28px;
    }

    .latchbloom-button {
      border: 0;
      border-radius: 999px;
      height: 56px;
      padding: 0 24px;
      background: linear-gradient(135deg, #f9da90, #e9aa37);
      color: #322006;
      font: 700 22px/1 "Trebuchet MS", "Avenir Next", sans-serif;
      cursor: pointer;
    }

    #latchbloom-overlay[data-portrait="true"] .latchbloom-button {
      height: 52px;
      font-size: 20px;
    }
  `;
  document.head.appendChild(style);
}

function formatScore(score: number): string {
  return score.toLocaleString("en-US");
}
