/// <reference types="playdrop-sdk-types" />

import {
  COLS,
  MAX_ROWS,
  applyShotAtSlot,
  boardKinds,
  createInitialState,
  isAttachable,
  listAttachableSlots,
  neighborSlots,
  swapShots,
  type GameState,
  type LanternColor,
  type Slot,
} from "./game/logic";
import {
  chooseCasualPlacement,
  chooseExpertPlacement,
  chooseIdlePlacement,
  type BotChoice,
} from "./game/bots";
import { AudioDirector } from "./game/audio";
import { CanvasRenderer, type DOMRectLike, type RenderBurst, type RenderFalling } from "./game/render";
import { GAME_COPY, loadThemeAssets } from "./game/theme";

declare global {
  interface Window {
    __glowknotDebug?: {
      screen: "start" | "playing" | "gameover";
      score: number;
      bestScore: number;
      shotsUntilSink: number;
      largestDrop: number;
      occupied: number;
      currentShot: LanternColor;
      reserveShot: LanternColor;
      animating: boolean;
      board: string[][];
      layout: ReturnType<CanvasRenderer["getLayout"]>;
    };
    __glowknotControls?: {
      startRun: () => void;
      swapShots: () => void;
      getState: () => NonNullable<Window["__glowknotDebug"]>;
    };
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
  }
}

interface PathPoint {
  x: number;
  y: number;
}

interface ActiveShotAnimation {
  color: LanternColor;
  path: PathPoint[];
  pathLengths: number[];
  totalLength: number;
  distance: number;
  target: Slot;
}

interface AimState {
  active: boolean;
  x: number;
  y: number;
}

type AutoplayMode = "idle" | "casual" | "expert";

const BEST_SCORE_KEY = "fruit-salad-best-score";
const SHOT_SPEED = 1140;
const FRAME_STEP_MS = 16;

void boot().catch((error) => {
  console.error(error);
  window.playdrop?.host?.setLoadingState?.({
    status: "error",
    message: String(error),
  });
});

async function boot(): Promise<void> {
  const host = await createHostBridge();
  host.setLoadingState({ status: "loading", message: "Gathering the fruit", progress: 0.16 });

  const audio = new AudioDirector();
  const themeAssetsPromise = loadThemeAssets();
  const audioPreloadPromise = audio.preload();

  const canvas = document.createElement("canvas");
  canvas.id = "glowknot-canvas";
  canvas.style.display = "block";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.touchAction = "none";
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(canvas);

  const themeAssets = await themeAssetsPromise;
  host.setLoadingState({ status: "loading", message: "Mixing the soundtrack", progress: 0.58 });
  await audioPreloadPromise;
  host.setLoadingState({ status: "loading", message: "Tossing the first bowl", progress: 0.84 });

  const renderer = new CanvasRenderer(canvas, themeAssets);
  const params = new URLSearchParams(window.location.search);
  const manualClock = params.get("debug_clock") === "manual";
  const autoplayMode = readAutoplayMode(params);
  const autostart = params.get("autostart") === "1" || autoplayMode !== null;
  const seed = readSeedFromLocation(params);

  let state = createInitialState(seed);
  state = { ...state, bestScore: readBestScore() };
  let screen: "start" | "playing" | "gameover" = "start";
  let aim: AimState = { active: false, x: 0, y: 0 };
  let activeShot: ActiveShotAnimation | null = null;
  let popBursts: RenderBurst[] = [];
  let falling: RenderFalling[] = [];
  let dropLabel: { text: string; age01: number } | null = null;
  let autoplayCooldownMs = 0;
  let lastFrame = performance.now();

  function resize(): void {
    renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    renderNow();
  }

  function startRun(): void {
    state = createInitialState(seed);
    state = { ...state, bestScore: readBestScore() };
    screen = "playing";
    aim = { active: false, x: 0, y: 0 };
    activeShot = null;
    popBursts = [];
    falling = [];
    dropLabel = null;
    autoplayCooldownMs = autoplayMode ? 200 : 0;
    void audio.startMusic().catch((error) => console.error(error));
    renderNow();
  }

  async function unlockAudio(): Promise<void> {
    await audio.unlock();
    await audio.startMusic();
  }

  function performSwap(): void {
    state = swapShots(state);
    audio.playSwap();
  }

  function getStateSummary() {
    return {
      screen,
      score: state.score,
      bestScore: state.bestScore,
      shotsUntilSink: state.shotsUntilSink,
      largestDrop: state.largestDrop,
      occupied: state.board.flat().filter(Boolean).length,
      currentShot: state.currentShot,
      reserveShot: state.reserveShot,
      animating: Boolean(activeShot || popBursts.length || falling.length || dropLabel),
      board: boardKinds(state.board),
      layout: renderer.getLayout(),
    };
  }

  window.__glowknotControls = {
    startRun,
    swapShots: () => {
      if (screen === "playing" && !activeShot) {
        performSwap();
        renderNow();
      }
    },
    getState: getStateSummary,
  };
  window.render_game_to_text = () => JSON.stringify(getStateSummary());
  window.advanceTime = async (ms: number) => {
    let remaining = ms;
    while (remaining > 0) {
      stepFrame(Math.min(FRAME_STEP_MS, remaining));
      remaining -= FRAME_STEP_MS;
    }
  };

  canvas.addEventListener("pointerdown", (event) => {
    void unlockAudio().catch((error) => console.error(error));
    canvas.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };

    if (screen === "start" || screen === "gameover") {
      if (contains(renderer.getLayout().primaryButtonRect, point.x, point.y) || screen === "start") {
        startRun();
      }
      return;
    }

    if (activeShot) return;
    if (contains(renderer.getLayout().reserveRect, point.x, point.y)) {
      performSwap();
      renderNow();
      return;
    }

    aim = { active: true, x: point.x, y: point.y };
    renderNow();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!aim.active || screen !== "playing" || activeShot) return;
    aim = { active: true, x: event.clientX, y: event.clientY };
    renderNow();
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!aim.active || screen !== "playing" || activeShot) {
      aim = { active: false, x: 0, y: 0 };
      return;
    }
    aim = { active: false, x: event.clientX, y: event.clientY };
    const trace = traceShotPath(state.board, renderer, state.currentShot, event.clientX, event.clientY);
    aim = { active: false, x: 0, y: 0 };
    if (trace) {
      activeShot = trace;
      audio.playFire();
    }
    renderNow();
  });

  canvas.addEventListener("pointercancel", () => {
    aim = { active: false, x: 0, y: 0 };
  });

  window.addEventListener("resize", resize);
  document.addEventListener("keydown", (event) => {
    void unlockAudio().catch((error) => console.error(error));
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (screen !== "playing") {
        startRun();
      }
      return;
    }
    if ((event.key === "Shift" || event.key.toLowerCase() === "r") && screen === "playing" && !activeShot) {
      performSwap();
      renderNow();
    }
  });

  function resolveShot(target: Slot): void {
    const beforeBoard = state.board;
    const result = applyShotAtSlot(state, target);
    const layout = renderer.getLayout();
    popBursts = result.popped.map((cell) => {
      const center = renderer.cellCenter(cell.row, cell.col);
      return { x: center.x, y: center.y, age01: 0, color: cell.color };
    });
    falling = result.dropped.map((cell) => {
      const center = renderer.cellCenter(cell.row, cell.col);
      return { x: center.x, y: center.y, age01: 0, color: cell.color };
    });
    if (result.popped.length > 0) {
      audio.playPop(result.placed.color);
    }
    if (result.dropped.length > 0) {
      dropLabel = { text: `${GAME_COPY.dropPrefix} x${result.dropped.length}`, age01: 0 };
      audio.playDrop();
    }
    state = {
      ...result.state,
      bestScore: Math.max(readBestScore(), result.state.bestScore),
    };
    if (state.bestScore > readBestScore()) writeBestScore(state.bestScore);
    if (state.gameOver) screen = "gameover";
    autoplayCooldownMs = autoplayMode ? 240 : 0;
    void beforeBoard;
    void layout;
  }

  function stepFrame(elapsedMs: number): void {
    const dt = Math.min(40, Math.max(0, elapsedMs));
    if (activeShot) {
      activeShot.distance = Math.min(activeShot.totalLength, activeShot.distance + (SHOT_SPEED * dt) / 1000);
      if (activeShot.distance >= activeShot.totalLength) {
        const target = activeShot.target;
        activeShot = null;
        resolveShot(target);
      }
    }

    popBursts = popBursts
      .map((burst) => ({ ...burst, age01: Math.min(1, burst.age01 + dt / 280) }))
      .filter((burst) => burst.age01 < 1);
    falling = falling
      .map((item) => ({ ...item, y: item.y + dt * 0.32, age01: Math.min(1, item.age01 + dt / 520) }))
      .filter((item) => item.age01 < 1);
    if (dropLabel) {
      dropLabel = { ...dropLabel, age01: Math.min(1, dropLabel.age01 + dt / 780) };
      if (dropLabel.age01 >= 1) dropLabel = null;
    }
    if (screen === "playing" && autoplayMode && !activeShot) {
      autoplayCooldownMs = Math.max(-1000, autoplayCooldownMs - dt);
      if (autoplayCooldownMs <= 0) {
        fireAutoplayShot();
      }
    }
    renderNow();
  }

  function renderNow(): void {
    window.__glowknotDebug = getStateSummary();
    renderer.render({
      board: state.board,
      score: state.score,
      bestScore: state.bestScore,
      largestDrop: state.largestDrop,
      shotsUntilSink: state.shotsUntilSink,
      currentShot: state.currentShot,
      reserveShot: state.reserveShot,
      screen,
      aimTo: aim.active ? { x: aim.x, y: aim.y } : null,
      activeShot: activeShot ? positionOnPath(activeShot) : null,
      popBursts,
      falling,
      dropLabel,
    });
  }

  function frame(now: number): void {
    const elapsed = now - lastFrame;
    lastFrame = now;
    stepFrame(elapsed);
    requestAnimationFrame(frame);
  }

  host.setLoadingState({ status: "ready" });
  renderNow();
  if (autostart) startRun();
  if (!manualClock) requestAnimationFrame(frame);

  function fireAutoplayShot(): void {
    const choice = chooseAutoplayShot(state, autoplayMode);
    if (!choice) return;

    const workingState = choice.useReserve ? swapShots(state) : state;
    if (choice.useReserve) {
      state = workingState;
      audio.playSwap();
    }

    const trace = traceTowardSlot(workingState.board, renderer, workingState.currentShot, choice.slot);
    if (trace) {
      activeShot = trace;
      autoplayCooldownMs = 280;
      audio.playFire();
      return;
    }

    for (const fallback of listAttachableSlots(workingState.board)) {
      const fallbackTrace = traceTowardSlot(workingState.board, renderer, workingState.currentShot, fallback);
      if (fallbackTrace) {
        activeShot = fallbackTrace;
        autoplayCooldownMs = 280;
        audio.playFire();
        return;
      }
    }
  }
}

function traceShotPath(
  board: GameState["board"],
  renderer: CanvasRenderer,
  color: LanternColor,
  targetX: number,
  targetY: number,
): ActiveShotAnimation | null {
  const layout = renderer.getLayout();
  let dx = targetX - layout.launcherX;
  let dy = targetY - layout.launcherY;
  if (dy >= -8) dy = -8;
  const magnitude = Math.hypot(dx, dy);
  if (magnitude === 0) return null;
  dx /= magnitude;
  dy /= magnitude;

  const leftBound = layout.boardX + layout.cell * 0.18;
  const rightBound = layout.boardX + layout.cell * COLS + layout.cell * 0.32;
  const radius = layout.radius * 0.92;
  const path: PathPoint[] = [{ x: layout.launcherX, y: layout.launcherY }];
  let x = layout.launcherX;
  let y = layout.launcherY;

  for (let step = 0; step < 2400; step += 1) {
    x += dx * 4;
    y += dy * 4;
    if (x <= leftBound + radius || x >= rightBound - radius) {
      dx *= -1;
      x = Math.max(leftBound + radius, Math.min(rightBound - radius, x));
    }
    path.push({ x, y });
    if (y <= layout.boardY + radius) {
      const topSlot = nearestTopSlot(board, renderer, x);
      if (topSlot) return buildShotAnimation(path, topSlot, color);
      return null;
    }

    const collision = firstCollision(board, renderer, x, y, radius * 1.88);
    if (!collision) continue;

    const candidate = pickAttachableNeighbor(board, collision, renderer, x, y);
    if (candidate) return buildShotAnimation(path, candidate, color);
    return null;
  }

  return null;
}

function nearestTopSlot(board: GameState["board"], renderer: CanvasRenderer, x: number): Slot | null {
  let best: Slot | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let col = 0; col < COLS; col += 1) {
    const slot = { row: 0, col };
    if (!isAttachable(board, slot)) continue;
    const center = renderer.cellCenter(slot.row, slot.col);
    const distance = Math.abs(center.x - x);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = slot;
    }
  }
  return best;
}

function firstCollision(board: GameState["board"], renderer: CanvasRenderer, x: number, y: number, threshold: number): Slot | null {
  let best: Slot | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let row = 0; row < MAX_ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (!board[row]![col]) continue;
      const center = renderer.cellCenter(row, col);
      const distance = Math.hypot(center.x - x, center.y - y);
      if (distance <= threshold && distance < bestDistance) {
        bestDistance = distance;
        best = { row, col };
      }
    }
  }
  return best;
}

function pickAttachableNeighbor(
  board: GameState["board"],
  collided: Slot,
  renderer: CanvasRenderer,
  x: number,
  y: number,
): Slot | null {
  let best: Slot | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const slot of neighborSlots(collided.row, collided.col)) {
    if (!isAttachable(board, slot)) continue;
    const center = renderer.cellCenter(slot.row, slot.col);
    const distance = Math.hypot(center.x - x, center.y - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = slot;
    }
  }
  return best;
}

function buildShotAnimation(path: PathPoint[], target: Slot, color: LanternColor): ActiveShotAnimation {
  const lengths: number[] = [0];
  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1]!;
    const current = path[index]!;
    lengths.push(lengths[index - 1]! + Math.hypot(current.x - previous.x, current.y - previous.y));
  }
  return {
    color,
    path,
    pathLengths: lengths,
    totalLength: lengths[lengths.length - 1]!,
    distance: 0,
    target,
  };
}

function traceTowardSlot(
  board: GameState["board"],
  renderer: CanvasRenderer,
  color: LanternColor,
  slot: Slot,
): ActiveShotAnimation | null {
  const center = renderer.cellCenter(slot.row, slot.col);
  return traceShotPath(board, renderer, color, center.x, center.y);
}

function positionOnPath(shot: ActiveShotAnimation) {
  const index = shot.pathLengths.findIndex((value) => value >= shot.distance);
  if (index <= 0) {
    return { x: shot.path[0]!.x, y: shot.path[0]!.y, color: shot.color };
  }
  const previousPoint = shot.path[index - 1]!;
  const currentPoint = shot.path[index]!;
  const previousLength = shot.pathLengths[index - 1]!;
  const currentLength = shot.pathLengths[index]!;
  const progress = currentLength === previousLength ? 0 : (shot.distance - previousLength) / (currentLength - previousLength);
  return {
    x: previousPoint.x + (currentPoint.x - previousPoint.x) * progress,
    y: previousPoint.y + (currentPoint.y - previousPoint.y) * progress,
    color: shot.color,
  };
}

function contains(rect: DOMRectLike, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function readBestScore(): number {
  const raw = window.localStorage.getItem(BEST_SCORE_KEY);
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function writeBestScore(value: number): void {
  window.localStorage.setItem(BEST_SCORE_KEY, String(value));
}

function readSeedFromLocation(params: URLSearchParams): number {
  const raw = params.get("seed");
  if (!raw) return 1;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 1;
}

function readAutoplayMode(params: URLSearchParams): AutoplayMode | null {
  const raw = params.get("autoplay");
  if (raw === "idle" || raw === "casual" || raw === "expert") return raw;
  return null;
}

function chooseAutoplayShot(state: GameState, mode: AutoplayMode | null): BotChoice | null {
  if (mode === "idle") return chooseIdlePlacement(state);
  if (mode === "casual") return chooseCasualPlacement(state);
  if (mode === "expert") return chooseExpertPlacement(state);
  return null;
}

async function createHostBridge(): Promise<{
  setLoadingState: (state:
    | { status: "loading"; message?: string; progress?: number }
    | { status: "ready" }
    | { status: "error"; message: string }) => void;
}> {
  const playdrop = window.playdrop;
  if (!playdrop) {
    return {
      setLoadingState: () => undefined,
    };
  }

  const hasPlaydropChannel = new URLSearchParams(window.location.search).has("playdrop_channel");
  if (playdrop.init && hasPlaydropChannel) {
    try {
      const sdk = await playdrop.init();
      return {
        setLoadingState: (next) => sdk.host.setLoadingState(next),
      };
    } catch {
      // Fall back to the global host bridge when the full channel is unavailable.
    }
  }

  return {
    setLoadingState: (next) => playdrop.host?.setLoadingState?.(next),
  };
}
