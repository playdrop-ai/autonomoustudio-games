/// <reference types="playdrop-sdk-types" />

import { CanvasRenderer, type AccentLabel } from "./game/render";
import {
  createInitialState,
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
      queue: string[];
      blossoms: Array<{ kind: string; segment: number; fromLane: number; toLane: number; progress: number }>;
      vases: Array<{ target: string; meter: number; thorns: number }>;
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

  const renderer = new CanvasRenderer(canvas);
  const forcedSeed = readSeedFromLocation();
  let gameState = createInitialState(forcedSeed);
  let screen: Screen = "start";
  let bestScore = readBestScore();
  let accent: AccentLabel | null = null;
  let lastFrame = performance.now();

  function startRun(): void {
    gameState = createInitialState(forcedSeed);
    screen = "playing";
    accent = null;
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
          text: "THORNS +1",
          color: "#ff9ba7",
          opacity: 1,
        };
      } else if (event.kind === "gameover") {
        finishRun();
      }
    }
  }

  function update(now: number): void {
    const elapsed = Math.min(64, now - lastFrame);
    lastFrame = now;

    if (screen === "playing") {
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

  function render(now: number): void {
    update(now);
    window.__latchbloomDebug = {
      screen,
      score: gameState.score,
      bestScore,
      streak: gameState.streak,
      queue: gameState.queue.slice(),
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
        thorns: vase.thorns,
      })),
      latches: gameState.latches.map((row) => row.slice()),
      layout: (() => {
        const layout = renderer.getLayout();
        return {
          boardX: layout.boardX,
          boardY: layout.boardY,
          boardWidth: layout.boardWidth,
          boardHeight: layout.boardHeight,
          laneCenters: layout.laneCenters.slice(),
          latchRows: layout.latchRows.slice(),
        };
      })(),
    };
    renderer.render({
      state: gameState,
      screen,
      bestScore,
      accent,
    });
    requestAnimationFrame(render);
  }

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
