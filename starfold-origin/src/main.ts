/// <reference types="playdrop-sdk-types" />

import { GameAudio } from "./audio";
import { applyMove, BOARD_COLS, BOARD_ROWS, boardKinds, createInitialState, getPlayableMoves, isAshKind, type ClearStage, type Move, type SigilKind, type TurnStage } from "./game/logic";
import { CanvasRenderer, type ComboLabel, type DragPreview, type IdleHint, type TileInteractionState, type ToastLabel } from "./game/render";
import { PlaydropController, type PlatformSnapshot } from "./platform";

type Screen = "playing" | "losing" | "gameover";

declare global {
  interface Window {
    __starfoldDebug?: {
      screen: Screen;
      score: number;
      ashCount: number;
      bestScore: number;
      gameOverReason: string | null;
      idleHint: Move | null;
      dragPreview: { axis: Move["axis"]; index: number; direction: Move["direction"]; offsetPx: number; settling: boolean } | null;
      animating: boolean;
      phase: PlatformSnapshot["phase"];
      board: string[][];
      layout: {
        boardX: number;
        boardY: number;
        cellSize: number;
        gap: number;
        width: number;
        height: number;
      };
      audio: {
        loaded: boolean;
        userActivated: boolean;
        musicWanted: boolean;
        musicStarted: boolean;
        contextState: AudioContextState;
        audioEnabled: boolean;
        paused: boolean;
        phase: PlatformSnapshot["phase"];
      };
    };
    render_game_to_text?: () => string;
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
  axis: Move["axis"] | null;
}

interface DragPreviewState extends DragPreview {
  settleStartAt: number | null;
  settleFromPx: number;
}

interface PressFeedback {
  row: number;
  col: number;
  until: number;
}

interface LossTransition {
  startAt: number;
}

const BEST_SCORE_KEY = "starfold-origin-best-score";
const LEADERBOARD_KEY = "highest_score";
const STAGE_DURATIONS: Record<TurnStage["kind"], number> = {
  shift: 150,
  clear: 170,
  collapse: 200,
  ash: 180,
};
const IDLE_HINT_DELAY_MS = 4500;
const IDLE_HINT_ACTIVE_MS = 1300;
const IDLE_HINT_REST_MS = 2400;
const DRAG_AXIS_LOCK_THRESHOLD = 12;
const DRAG_COMMIT_RATIO = 0.34;
const DRAG_MAX_RATIO = 0.96;
const DRAG_SNAPBACK_MS = 130;
const LOSS_FADE_MS = 260;

let platform: PlaydropController | null = null;

void (async () => {
  platform = new PlaydropController(LEADERBOARD_KEY);
  const platformInit = platform.init();

  const canvas = document.createElement("canvas");
  canvas.id = "starfold-origin-canvas";
  canvas.style.display = "block";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.touchAction = "none";
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(canvas);

  const renderer = new CanvasRenderer(canvas);
  const audio = new GameAudio();
  await renderer.loadAssets();
  await audio.load();
  const forcedSeed = readSeedFromLocation();
  let gameState = createInitialState(forcedSeed);
  let bestScore = readBestScore();
  let screen: Screen = "playing";
  let activeStage: ActiveStage | null = null;
  let queuedStages: TurnStage[] = [];
  let drag: DragState | null = null;
  let dragPreview: DragPreviewState | null = null;
  let hoverCell: { row: number; col: number } | null = null;
  let pressFeedback: PressFeedback | null = null;
  let comboLabel: ComboLabel | null = null;
  let toastLabel: ToastLabel | null = null;
  let lastFrame = performance.now();
  let lastInteractionAt = performance.now();
  let completedRun = false;
  let lossTransition: LossTransition | null = null;

  window.render_game_to_text = () => {
    const layout = renderer.getLayout();
    const snapshot = platform?.getSnapshot() ?? {
      available: false,
      phase: "play" as const,
      authMode: "NONE" as const,
      isLoggedIn: false,
      audioEnabled: true,
      paused: false,
      pendingMeta: false,
      busy: false,
      leaderboard: [],
    };
    return JSON.stringify({
      mode: screen,
      phase: snapshot.phase,
      score: gameState.score,
      bestScore,
      ashCount: gameState.ashCount,
      gameOverReason: gameState.gameOverReason,
      animating: Boolean(activeStage || queuedStages.length || screen === "losing"),
      dragPreview: dragPreview
        ? {
            axis: dragPreview.move.axis,
            index: dragPreview.move.index,
            direction: dragPreview.move.direction,
            offsetPx: Math.round(dragPreview.offsetPx),
            settling: dragPreview.settling,
          }
        : null,
      board: boardKinds(gameState.board),
      boardRect: {
        x: layout.boardX,
        y: layout.boardY,
        width: layout.boardWidth,
        height: layout.boardHeight,
        cellSize: layout.cellSize,
        gap: layout.gap,
      },
      viewport: {
        width: layout.width,
        height: layout.height,
        portrait: layout.portrait,
      },
      coordinateSystem: {
        origin: "top-left",
        xDirection: "right",
        yDirection: "down",
      },
    });
  };

  await platformInit;

  function startNewRun(): void {
    gameState = createInitialState(forcedSeed);
    screen = "playing";
    activeStage = null;
    queuedStages = [];
    comboLabel = null;
    toastLabel = null;
    drag = null;
    dragPreview = null;
    hoverCell = null;
    pressFeedback = null;
    completedRun = false;
    lossTransition = null;
    lastInteractionAt = performance.now();
  }

  function queueMove(move: Move, startOffsetPx = 0): void {
    if (screen !== "playing" || activeStage || queuedStages.length > 0 || gameState.gameOver) return;
    lastInteractionAt = performance.now();

    const result = applyMove(gameState, move, { startOffsetPx });
    if (result.stages.length === 0) return;

    audio.startMusicLoop();
    platform?.queue({
      score: result.state.score,
    });

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

  function updateDragPreview(clientX: number, clientY: number): void {
    if (!drag) {
      return;
    }

    const dx = clientX - drag.startX;
    const dy = clientY - drag.startY;
    if (!drag.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_AXIS_LOCK_THRESHOLD) {
        dragPreview = null;
        return;
      }
      drag.axis = Math.abs(dx) >= Math.abs(dy) ? "row" : "col";
    }

    const layout = renderer.getLayout();
    const step = layout.cellSize + layout.gap;
    const rawOffset = drag.axis === "row" ? dx : dy;
    const offsetPx = clamp(rawOffset, -step * DRAG_MAX_RATIO, step * DRAG_MAX_RATIO);
    if (Math.abs(offsetPx) < 1) {
      dragPreview = null;
      return;
    }

    dragPreview = {
      move: {
        axis: drag.axis,
        index: drag.axis === "row" ? drag.row : drag.col,
        direction: offsetPx >= 0 ? 1 : -1,
      },
      offsetPx,
      settling: false,
      settleStartAt: null,
      settleFromPx: offsetPx,
    };
  }

  function beginDragSnapback(now: number): void {
    if (!dragPreview || Math.abs(dragPreview.offsetPx) < 1) {
      dragPreview = null;
      return;
    }
    dragPreview = {
      ...dragPreview,
      settling: true,
      settleStartAt: now,
      settleFromPx: dragPreview.offsetPx,
    };
  }

  function handleStageStart(stage: TurnStage): void {
    if (stage.kind !== "clear") {
      return;
    }
    const matchKind = getDominantMatchKind(stage);
    if (matchKind) {
      audio.playMatch(matchKind);
    }
    if (stage.cleansed.length > 0) {
      audio.playAshBreak();
    } else if (stage.damaged.length > 0) {
      audio.playAshHit();
    }
  }

  function update(now: number): void {
    const delta = now - lastFrame;
    advanceStages(now);

    if (screen === "playing" && gameState.gameOver && !activeStage && queuedStages.length === 0) {
      screen = "losing";
      lossTransition = { startAt: now };
      comboLabel = null;
      toastLabel = null;
      hoverCell = null;
      pressFeedback = null;
      drag = null;
      dragPreview = null;
      if (!completedRun) {
        completedRun = true;
        void platform?.completeRun();
      }
    }
    if (screen === "losing" && lossTransition) {
      if (now - lossTransition.startAt >= LOSS_FADE_MS) {
        screen = "gameover";
        lossTransition = null;
        audio.playGameOver();
      }
    }

    if (comboLabel) {
      comboLabel = {
        ...comboLabel,
        opacity: Math.max(0, comboLabel.opacity - delta / 900),
      };
      if (comboLabel.opacity <= 0) comboLabel = null;
    }

    if (toastLabel) {
      toastLabel = {
        ...toastLabel,
        opacity: Math.max(0, toastLabel.opacity - delta / 2100),
      };
      if (toastLabel.opacity <= 0) toastLabel = null;
    }

    const settlingPreview = dragPreview;
    if (settlingPreview && settlingPreview.settleStartAt !== null) {
      const progress = (now - settlingPreview.settleStartAt) / DRAG_SNAPBACK_MS;
      if (progress >= 1) {
        dragPreview = null;
      } else {
        dragPreview = {
          ...settlingPreview,
          offsetPx: lerp(settlingPreview.settleFromPx, 0, easeOutCubic(progress)),
        };
      }
    }

    lastFrame = now;
  }

  function advanceStages(now: number): void {
    let stageCursor = activeStage?.startTime ?? now;

    while (true) {
      if (!activeStage && queuedStages.length > 0) {
        const stage = queuedStages.shift()!;
        handleStageStart(stage);
        activeStage = {
          stage,
          startTime: stageCursor,
          duration: STAGE_DURATIONS[stage.kind],
        };
      }

      if (!activeStage) {
        return;
      }

      const stageEnd = activeStage.startTime + activeStage.duration;
      if (now < stageEnd) {
        return;
      }

      stageCursor = stageEnd;
      activeStage = null;
    }
  }

  function render(now: number): void {
    update(now);

    if (pressFeedback && pressFeedback.until <= now) {
      pressFeedback = null;
    }

    const snapshot = platform?.getSnapshot() ?? {
      available: false,
      phase: "play" as const,
      authMode: "NONE" as const,
      isLoggedIn: false,
      audioEnabled: true,
      paused: false,
      pendingMeta: false,
      busy: false,
      leaderboard: [],
    };
    audio.syncRuntimeState({
      audioEnabled: snapshot.audioEnabled,
      paused: snapshot.paused,
      phase: snapshot.phase,
    });
    const boardOpacity = getBoardOpacity(now, screen, lossTransition);
    const interaction: TileInteractionState | null =
      screen === "playing" && !gameState.gameOver && !activeStage && queuedStages.length === 0
        ? {
            hovered: drag ? null : hoverCell,
            pressed: drag ? { row: drag.row, col: drag.col } : pressFeedback ? { row: pressFeedback.row, col: pressFeedback.col } : null,
          }
        : null;
    const idleHint = getIdleHint(
      now,
      gameState.board,
      screen,
      activeStage,
      queuedStages.length,
      drag,
      dragPreview,
      hoverCell,
      pressFeedback,
      lastInteractionAt,
    );

    window.__starfoldDebug = {
      screen,
      score: gameState.score,
      ashCount: gameState.ashCount,
      bestScore,
      gameOverReason: gameState.gameOverReason,
      idleHint: idleHint?.move ?? null,
      dragPreview: dragPreview
        ? {
            axis: dragPreview.move.axis,
            index: dragPreview.move.index,
            direction: dragPreview.move.direction,
            offsetPx: Math.round(dragPreview.offsetPx),
            settling: dragPreview.settling,
          }
        : null,
      animating: Boolean(activeStage || queuedStages.length),
      phase: snapshot.phase,
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
      audio: audio.getDebugState(),
    };

    renderer.render({
      board: gameState.board,
      score: gameState.score,
      ashCount: gameState.ashCount,
      bestScore,
      boardOpacity,
      showHud: screen === "playing",
      gameOverReason: gameState.gameOverReason,
      idleHint,
      dragPreview: dragPreview ? { move: dragPreview.move, offsetPx: dragPreview.offsetPx, settling: dragPreview.settling } : null,
      stage: activeStage
        ? {
            stage: activeStage.stage,
            progress: Math.min(1, (now - activeStage.startTime) / activeStage.duration),
          }
        : null,
      overlay: screen === "gameover" ? "gameover" : null,
      comboLabel,
      toastLabel,
      platform: snapshot,
      interaction,
    });
    requestAnimationFrame(render);
  }

  canvas.addEventListener("pointerdown", (event) => {
    audio.notifyUserGesture();
    canvas.setPointerCapture(event.pointerId);

    if (screen === "gameover") {
      return;
    }
    if (gameState.gameOver) {
      return;
    }
    if (activeStage || queuedStages.length > 0) return;

    const cell = locateCell(renderer, event.clientX, event.clientY);
    if (!cell) return;
    lastInteractionAt = performance.now();
    hoverCell = cell;
    pressFeedback = {
      row: cell.row,
      col: cell.col,
      until: performance.now() + 180,
    };
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      row: cell.row,
      col: cell.col,
      axis: null,
    };
    dragPreview = null;
  });

  canvas.addEventListener("pointerup", (event) => {
    if (screen === "gameover") {
      const action = renderer.hitTestOverlayAction(event.clientX, event.clientY);
      if (action === "restart") {
        startNewRun();
      }
      return;
    }

    if (gameState.gameOver) {
      drag = null;
      dragPreview = null;
      hoverCell = null;
      return;
    }
    if (!drag || drag.pointerId !== event.pointerId) return;
    lastInteractionAt = performance.now();
    updateDragPreview(event.clientX, event.clientY);
    const currentPreview = dragPreview;
    if (currentPreview && Math.abs(currentPreview.offsetPx) >= getDragCommitThreshold(renderer) && isPlayableMove(gameState.board, currentPreview.move)) {
      const releaseOffsetPx = currentPreview.offsetPx;
      drag = null;
      dragPreview = null;
      queueMove(currentPreview.move, releaseOffsetPx);
    } else {
      beginDragSnapback(performance.now());
      drag = null;
    }
    hoverCell = locateCell(renderer, event.clientX, event.clientY);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (screen !== "playing" || gameState.gameOver) {
      return;
    }
    lastInteractionAt = performance.now();
    if (!drag || drag.pointerId !== event.pointerId) {
      hoverCell = locateCell(renderer, event.clientX, event.clientY);
      return;
    }

    hoverCell = null;
    updateDragPreview(event.clientX, event.clientY);
  });

  canvas.addEventListener("pointerleave", () => {
    lastInteractionAt = performance.now();
    hoverCell = null;
  });

  canvas.addEventListener("pointercancel", () => {
    lastInteractionAt = performance.now();
    beginDragSnapback(performance.now());
    drag = null;
    hoverCell = null;
  });

  window.addEventListener("resize", () => {
    renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  });

  document.addEventListener("keydown", (event) => {
    audio.notifyUserGesture();
    if (event.key.toLowerCase() === "r" && screen === "gameover") {
      startNewRun();
      return;
    }

    if (screen === "gameover" && (event.key === "Enter" || event.key === " ")) {
      startNewRun();
    }
  });

  platform.markReady();
  requestAnimationFrame(render);
})().catch((error) => {
  platform?.reportError(error);
  throw error;
});

function getDominantMatchKind(stage: ClearStage): SigilKind | null {
  const counts = new Map<SigilKind, number>();
  let topKind: SigilKind | null = null;
  let topCount = 0;

  for (const position of stage.matched) {
    const kind = stage.board[position.row]![position.col]!.kind;
    if (isAshKind(kind)) {
      continue;
    }
    const nextCount = (counts.get(kind) ?? 0) + 1;
    counts.set(kind, nextCount);
    if (nextCount > topCount) {
      topCount = nextCount;
      topKind = kind;
    }
  }

  return topKind;
}

function getIdleHint(
  now: number,
  board: ReturnType<typeof createInitialState>["board"],
  screen: Screen,
  activeStage: ActiveStage | null,
  queuedStageCount: number,
  drag: DragState | null,
  dragPreview: DragPreviewState | null,
  hoverCell: { row: number; col: number } | null,
  pressFeedback: PressFeedback | null,
  lastInteractionAt: number,
): IdleHint | null {
  if (screen !== "playing" || activeStage || queuedStageCount > 0 || drag || dragPreview || hoverCell || pressFeedback) {
    return null;
  }

  const idleMs = now - lastInteractionAt;
  if (idleMs < IDLE_HINT_DELAY_MS) {
    return null;
  }

  const cycleMs = IDLE_HINT_ACTIVE_MS + IDLE_HINT_REST_MS;
  const cycleTime = (idleMs - IDLE_HINT_DELAY_MS) % cycleMs;
  if (cycleTime > IDLE_HINT_ACTIVE_MS) {
    return null;
  }

  const moves = getPlayableMoves(board);
  if (moves.length === 0) {
    return null;
  }

  const move = moves[Math.floor((idleMs - IDLE_HINT_DELAY_MS) / cycleMs) % moves.length]!;
  return {
    move,
    progress: cycleTime / IDLE_HINT_ACTIVE_MS,
  };
}

function locateCell(renderer: CanvasRenderer, clientX: number, clientY: number): { row: number; col: number } | null {
  const layout = renderer.getLayout();
  const localX = clientX - layout.boardX;
  const localY = clientY - layout.boardY;
  if (localX < 0 || localY < 0 || localX > layout.boardWidth || localY > layout.boardHeight) return null;

  const col = Math.floor(localX / (layout.cellSize + layout.gap));
  const row = Math.floor(localY / (layout.cellSize + layout.gap));
  if (col < 0 || row < 0 || col >= BOARD_COLS || row >= BOARD_ROWS) return null;
  return { row, col };
}

function readBestScore(): number {
  const raw = window.localStorage.getItem(BEST_SCORE_KEY);
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
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

function getDragCommitThreshold(renderer: CanvasRenderer): number {
  const layout = renderer.getLayout();
  return (layout.cellSize + layout.gap) * DRAG_COMMIT_RATIO;
}

function getBoardOpacity(now: number, screen: Screen, lossTransition: LossTransition | null): number {
  if (screen === "losing" && lossTransition) {
    const progress = clamp((now - lossTransition.startAt) / LOSS_FADE_MS, 0, 1);
    return lerp(1, 0.8, easeOutCubic(progress));
  }
  if (screen === "gameover") {
    return 0.8;
  }
  return 1;
}

function isPlayableMove(board: ReturnType<typeof createInitialState>["board"], move: Move): boolean {
  return getPlayableMoves(board).some(
    (candidate) =>
      candidate.axis === move.axis && candidate.index === move.index && candidate.direction === move.direction,
  );
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
