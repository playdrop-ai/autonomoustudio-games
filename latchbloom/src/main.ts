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
  document.body.style.background = "#09131d";
  document.body.style.touchAction = "none";

  const canvas = document.createElement("canvas");
  canvas.id = "latchbloom-canvas";
  canvas.style.display = "block";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.touchAction = "none";
  document.body.appendChild(canvas);

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
    if (screen === "start") {
      startRun();
      return;
    }
    if (screen === "gameover") {
      startRun();
      return;
    }

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
