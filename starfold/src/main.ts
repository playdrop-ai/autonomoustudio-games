/// <reference types="playdrop-sdk-types" />

import { applyMove, boardKinds, createInitialState, type GameState, type Move, type TurnStage } from "./game/logic";
import { CanvasRenderer, type ComboLabel } from "./game/render";

type Screen = "start" | "playing" | "gameover";

declare global {
  interface Window {
    __starfoldDebug?: {
      screen: Screen;
      score: number;
      ashCount: number;
      bestScore: number;
      animating: boolean;
      board: string[][];
      layout: {
        boardX: number;
        boardY: number;
        cellSize: number;
        gap: number;
        width: number;
        height: number;
      };
    };
  }
}

interface ActiveStage {
  stage: TurnStage;
  startTime: number;
  duration: number;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  row: number;
  col: number;
}

const BEST_SCORE_KEY = "starfold-best-score";
const STAGE_DURATIONS: Record<TurnStage["kind"], number> = {
  shift: 150,
  clear: 170,
  collapse: 200,
  ash: 180,
};

void (async () => {
  const host = await createHostBridge();
  host.setLoadingState({ status: "loading", message: "Preparing the shrine", progress: 0.18 });

  const canvas = document.createElement("canvas");
  canvas.id = "starfold-canvas";
  canvas.style.display = "block";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.touchAction = "none";
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(canvas);

  const renderer = new CanvasRenderer(canvas);
  let gameState = createInitialState();
  let bestScore = readBestScore();
  let screen: Screen = "start";
  let activeStage: ActiveStage | null = null;
  let queuedStages: TurnStage[] = [];
  let drag: DragState | null = null;
  let comboLabel: ComboLabel | null = null;
  let lastFrame = performance.now();

  function startNewRun(): void {
    gameState = createInitialState();
    screen = "playing";
    activeStage = null;
    queuedStages = [];
    comboLabel = null;
  }

  function queueMove(move: Move): void {
    if (screen !== "playing" || activeStage || queuedStages.length > 0 || gameState.gameOver) return;
    const result = applyMove(gameState, move);
    if (result.stages.length === 0) return;
    queuedStages = result.stages.slice();
    if (result.maxCombo > 1) {
      comboLabel = {
        text: result.maxCombo >= 3 ? "STARFOLD" : "STAR CHAIN",
        opacity: 1,
      };
    }
    gameState = result.state;
    if (gameState.score > bestScore) {
      bestScore = gameState.score;
      writeBestScore(bestScore);
    }
  }

  function update(now: number): void {
    if (!activeStage && queuedStages.length > 0) {
      const stage = queuedStages.shift()!;
      activeStage = {
        stage,
        startTime: now,
        duration: STAGE_DURATIONS[stage.kind],
      };
    }

    if (activeStage) {
      const elapsed = now - activeStage.startTime;
      if (elapsed >= activeStage.duration) {
        activeStage = null;
      }
    } else if (screen === "playing" && gameState.gameOver) {
      screen = "gameover";
    }

    if (comboLabel) {
      comboLabel = {
        ...comboLabel,
        opacity: Math.max(0, comboLabel.opacity - (now - lastFrame) / 900),
      };
      if (comboLabel.opacity <= 0) comboLabel = null;
    }
    lastFrame = now;
  }

  function render(now: number): void {
    update(now);
    window.__starfoldDebug = {
      screen,
      score: gameState.score,
      ashCount: gameState.ashCount,
      bestScore,
      animating: Boolean(activeStage || queuedStages.length),
      board: boardKinds(gameState.board),
      layout: (() => {
        const layout = renderer.getLayout();
        return {
          boardX: layout.boardX,
          boardY: layout.boardY,
          cellSize: layout.cellSize,
          gap: layout.gap,
          width: layout.width,
          height: layout.height,
        };
      })(),
    };
    renderer.render({
      board: gameState.board,
      score: gameState.score,
      ashCount: gameState.ashCount,
      bestScore,
      stage: activeStage
        ? {
            stage: activeStage.stage,
            progress: Math.min(1, (now - activeStage.startTime) / activeStage.duration),
          }
        : null,
      overlay: screen === "start" ? "start" : screen === "gameover" ? "gameover" : null,
      comboLabel,
    });
    requestAnimationFrame(render);
  }

  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId);

    if (screen === "start") {
      startNewRun();
      return;
    }
    if (screen === "gameover") {
      startNewRun();
      return;
    }
    if (activeStage || queuedStages.length > 0) return;

    const cell = locateCell(renderer, event.clientX, event.clientY);
    if (!cell) return;
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      row: cell.row,
      col: cell.col,
    };
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const threshold = 18;
    if (Math.abs(dx) >= threshold || Math.abs(dy) >= threshold) {
      if (Math.abs(dx) > Math.abs(dy)) {
        queueMove({
          axis: "row",
          index: drag.row,
          direction: dx > 0 ? 1 : -1,
        });
      } else {
        queueMove({
          axis: "col",
          index: drag.col,
          direction: dy > 0 ? 1 : -1,
        });
      }
    }
    drag = null;
  });

  canvas.addEventListener("pointercancel", () => {
    drag = null;
  });

  window.addEventListener("resize", () => {
    renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "r" && screen === "gameover") {
      startNewRun();
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

function locateCell(renderer: CanvasRenderer, clientX: number, clientY: number): { row: number; col: number } | null {
  const layout = renderer.getLayout();
  const localX = clientX - layout.boardX;
  const localY = clientY - layout.boardY;
  if (localX < 0 || localY < 0 || localX > layout.boardWidth || localY > layout.boardHeight) return null;

  const col = Math.floor(localX / (layout.cellSize + layout.gap));
  const row = Math.floor(localY / (layout.cellSize + layout.gap));
  if (col < 0 || row < 0 || col >= 5 || row >= 6) return null;
  return { row, col };
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

async function createHostBridge(): Promise<{ setLoadingState: (state: { status: "loading" | "ready" | "error"; message?: string; progress?: number }) => void }> {
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
    // Fall back to the global host bridge when local development is not running inside the full shell.
  }
  return {
    setLoadingState: (state) => {
      playdrop.host?.setLoadingState?.(state);
    },
  };
}
