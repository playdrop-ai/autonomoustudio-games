/// <reference types="playdrop-sdk-types" />

import {
  COLS,
  MAX_ROWS,
  applyShotAtSlot,
  cloneBoard,
  boardKinds,
  type Board,
  createInitialState,
  isAttachable,
  listAttachableSlots,
  neighborSlots,
  previewShotAtSlot,
  swapShots,
  type GameState,
  type LanternColor,
  type ShotPreview,
  type Slot,
} from "./game/logic";
import {
  chooseCasualPlacement,
  chooseExpertPlacement,
  chooseIdlePlacement,
  type BotChoice,
} from "./game/bots";
import { AudioDirector } from "./game/audio";
import {
  CanvasRenderer,
  type DOMRectLike,
  type RenderAppearing,
  type RenderBurst,
  type RenderFalling,
  type RenderSinkSlide,
} from "./game/render";
import { GAME_COPY, loadThemeAssets } from "./game/theme";

declare global {
  interface Window {
    __fruitSaladDebug?: {
      screen: "start" | "playing" | "gameover";
      score: number;
      bestScore: number;
      shotsUntilSink: number;
      largestDrop: number;
      occupied: number;
      currentShot: LanternColor;
      animating: boolean;
      sinkSlides: number;
      refillQueued: boolean;
      board: string[][];
      layout: ReturnType<CanvasRenderer["getLayout"]>;
    };
    __fruitSaladControls?: {
      startRun: () => void;
      getState: () => NonNullable<Window["__fruitSaladDebug"]>;
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

interface RefillSequence {
  finalBoard: Board;
  entries: Array<{ row: number; col: number; color: LanternColor }>;
  nextEntryIndex: number;
  countdownMs: number;
}

interface HostBridge {
  setLoadingState: (state:
    | { status: "loading"; message?: string; progress?: number }
    | { status: "ready" }
    | { status: "error"; message: string }) => void;
  ready: () => void;
  audioPolicy: unknown;
  paused: boolean;
  onAudioPolicyChange: (cb: (policy: unknown) => void) => () => void;
  onPause: (cb: () => void) => () => void;
  onResume: (cb: () => void) => () => void;
}

type AutoplayMode = "idle" | "casual" | "expert";

const BEST_SCORE_KEY = "fruit-salad-best-score";
const SHOT_SPEED = 1140;
const FRAME_STEP_MS = 16;
const REFILL_REVEAL_MS = 420;
const REFILL_ENTRY_STAGGER_MS = 56;
const REFILL_ENTRY_ANIM_MS = 220;

void boot().catch((error) => {
  console.error(error);
});

async function boot(): Promise<void> {
  const host = await createHostBridge();

  const audio = new AudioDirector();
  const themeAssetsPromise = loadThemeAssets();
  const audioPreloadPromise = audio.preload();

  const canvas = document.createElement("canvas");
  canvas.id = "fruit-salad-canvas";
  canvas.style.display = "block";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.touchAction = "none";
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(canvas);

  const themeAssets = await themeAssetsPromise;
  await audioPreloadPromise;

  const renderer = new CanvasRenderer(canvas, themeAssets);
  audio.setAudioPolicy(resolveAudioPolicy(host.audioPolicy));
  audio.setPaused(host.paused);
  host.onAudioPolicyChange((policy) => audio.setAudioPolicy(resolveAudioPolicy(policy)));
  host.onPause(() => audio.setPaused(true));
  host.onResume(() => audio.setPaused(false));
  const params = new URLSearchParams(window.location.search);
  const manualClock = params.get("debug_clock") === "manual";
  const autoplayMode = readAutoplayMode(params);
  const autostart = params.get("autostart") === "1" || autoplayMode !== null;
  const seed = readSeedFromLocation(params);

  let state = createInitialState(seed);
  state = { ...state, bestScore: readBestScore() };
  let screen: "start" | "playing" | "gameover" = "start";
  let aim: AimState = { active: false, x: 0, y: 0 };
  let aimTrace: ActiveShotAnimation | null = null;
  let aimPreview: ShotPreview | null = null;
  let activeShot: ActiveShotAnimation | null = null;
  let popBursts: RenderBurst[] = [];
  let falling: RenderFalling[] = [];
  let appearing: RenderAppearing[] = [];
  let sinkSlides: RenderSinkSlide[] = [];
  let refillSequence: RefillSequence | null = null;
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
    aimTrace = null;
    aimPreview = null;
    activeShot = null;
    popBursts = [];
    falling = [];
    appearing = [];
    sinkSlides = [];
    refillSequence = null;
    dropLabel = null;
    autoplayCooldownMs = autoplayMode ? 200 : 0;
    void audio.startMusic().catch((error) => console.error(error));
    renderNow();
  }

  async function unlockAudio(): Promise<void> {
    await audio.unlock();
    await audio.startMusic();
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
      animating: Boolean(activeShot || popBursts.length || falling.length || appearing.length || sinkSlides.length || refillSequence || dropLabel),
      sinkSlides: sinkSlides.length,
      refillQueued: Boolean(refillSequence),
      board: boardKinds(state.board),
      layout: renderer.getLayout(),
    };
  }

  function setAimPreview(x: number, y: number): void {
    aim = { active: true, x, y };
    aimTrace = traceShotPath(state.board, renderer, state.currentShot, x, y);
    aimPreview = aimTrace ? previewShotAtSlot(state, aimTrace.target) : null;
  }

  function clearAim(): void {
    aim = { active: false, x: 0, y: 0 };
    aimTrace = null;
    aimPreview = null;
  }

  window.__fruitSaladControls = {
    startRun,
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

    if (activeShot || refillSequence) return;

    setAimPreview(point.x, point.y);
    renderNow();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!aim.active || screen !== "playing" || activeShot || refillSequence) return;
    setAimPreview(event.clientX, event.clientY);
    renderNow();
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!aim.active || screen !== "playing" || activeShot || refillSequence) {
      clearAim();
      return;
    }
    const trace = aimTrace ?? traceShotPath(state.board, renderer, state.currentShot, event.clientX, event.clientY);
    clearAim();
    if (trace) {
      activeShot = trace;
    }
    renderNow();
  });

  canvas.addEventListener("pointercancel", () => {
    clearAim();
  });

  window.addEventListener("resize", resize);
  document.addEventListener("keydown", (event) => {
    void unlockAudio().catch((error) => console.error(error));
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (screen !== "playing") {
        startRun();
      }
    }
  });

  function resolveShot(target: Slot): void {
    const result = applyShotAtSlot(state, target);
    popBursts = result.popped.map((cell) => {
      const center = renderer.cellCenter(cell.row, cell.col);
      return { x: center.x, y: center.y, age01: 0, color: cell.color };
    });
    falling = result.dropped.map((cell) => {
      const center = renderer.cellCenter(cell.row, cell.col);
      return { x: center.x, y: center.y, age01: 0, color: cell.color };
    });
    sinkSlides = buildSinkSlides(result.boardBeforeSink, result.sinkSteps, renderer);
    const removedColors = [...result.popped, ...result.dropped].map((cell) => cell.color);
    if (removedColors.length > 0) {
      audio.playFruitBurst(removedColors);
    }
    if (result.dropped.length > 0) {
      dropLabel = { text: `${GAME_COPY.dropPrefix} x${result.dropped.length}`, age01: 0 };
      audio.playDrop();
    }
    if (result.sinkSteps > 0) {
      audio.playSink();
    }
    const nextState = {
      ...result.state,
      bestScore: Math.max(readBestScore(), result.state.bestScore),
    };
    if (result.injectedWave && result.boardBeforeRefill) {
      refillSequence = {
        finalBoard: cloneBoard(nextState.board),
        entries: buildRefillEntries(result.boardBeforeRefill, nextState.board),
        nextEntryIndex: 0,
        countdownMs: REFILL_REVEAL_MS,
      };
      state = {
        ...nextState,
        board: cloneBoard(result.boardBeforeRefill),
      };
    } else {
      refillSequence = null;
      state = nextState;
    }
    if (state.bestScore > readBestScore()) writeBestScore(state.bestScore);
    if (state.gameOver) screen = "gameover";
    autoplayCooldownMs = autoplayMode ? 240 : 0;
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
    appearing = appearing
      .map((item) => ({ ...item, age01: Math.min(1, item.age01 + dt / REFILL_ENTRY_ANIM_MS) }))
      .filter((item) => item.age01 < 1);
    sinkSlides = sinkSlides
      .map((item) => ({ ...item, age01: Math.min(1, item.age01 + dt / 240) }))
      .filter((item) => item.age01 < 1);
    if (refillSequence) {
      refillSequence.countdownMs -= dt;
      while (refillSequence && refillSequence.countdownMs <= 0) {
        if (refillSequence.nextEntryIndex >= refillSequence.entries.length) {
          state = {
            ...state,
            board: cloneBoard(refillSequence.finalBoard),
          };
          refillSequence = null;
          break;
        }
        const entry = refillSequence.entries[refillSequence.nextEntryIndex]!;
        state.board[entry.row]![entry.col] = entry.color;
        appearing.push({ row: entry.row, col: entry.col, color: entry.color, age01: 0 });
        audio.playFruitAppear(entry.color);
        refillSequence.nextEntryIndex += 1;
        refillSequence.countdownMs += REFILL_ENTRY_STAGGER_MS;
      }
    }
    if (dropLabel) {
      dropLabel = { ...dropLabel, age01: Math.min(1, dropLabel.age01 + dt / 780) };
      if (dropLabel.age01 >= 1) dropLabel = null;
    }
    if (screen === "playing" && autoplayMode && !activeShot && !refillSequence) {
      autoplayCooldownMs = Math.max(-1000, autoplayCooldownMs - dt);
      if (autoplayCooldownMs <= 0) {
        fireAutoplayShot();
      }
    }
    renderNow();
  }

  function renderNow(): void {
    window.__fruitSaladDebug = getStateSummary();
    renderer.render({
      board: state.board,
      score: state.score,
      bestScore: state.bestScore,
      largestDrop: state.largestDrop,
      shotsUntilSink: state.shotsUntilSink,
      currentShot: state.currentShot,
      screen,
      aimPath: aim.active && aimTrace ? samplePath(aimTrace.path) : null,
      activeShot: activeShot ? positionOnPath(activeShot) : null,
      popBursts,
      falling,
      appearing,
      sinkSlides,
      prediction: aimPreview
        ? {
            placed: aimPreview.placed,
            popped: aimPreview.popped,
            dropped: aimPreview.dropped,
            willSink: aimPreview.willSink,
          }
        : null,
      dropLabel,
    });
  }

  function frame(now: number): void {
    const elapsed = now - lastFrame;
    lastFrame = now;
    stepFrame(elapsed);
    requestAnimationFrame(frame);
  }

  host.ready();
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
      return;
    }

    for (const fallback of listAttachableSlots(workingState.board)) {
      const fallbackTrace = traceTowardSlot(workingState.board, renderer, workingState.currentShot, fallback);
      if (fallbackTrace) {
        activeShot = fallbackTrace;
        autoplayCooldownMs = 280;
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

  const leftBound = layout.shotLeftBound;
  const rightBound = layout.shotRightBound;
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

function samplePath(path: PathPoint[]): PathPoint[] {
  if (path.length <= 24) return path;
  const sampled: PathPoint[] = [path[0]!];
  for (let index = 6; index < path.length - 1; index += 6) {
    sampled.push(path[index]!);
  }
  sampled.push(path[path.length - 1]!);
  return sampled;
}

function buildSinkSlides(
  boardBeforeSink: GameState["board"] | null,
  sinkSteps: number,
  renderer: CanvasRenderer,
): RenderSinkSlide[] {
  if (!boardBeforeSink || sinkSteps <= 0) return [];

  const slides: RenderSinkSlide[] = [];
  for (let row = 0; row < boardBeforeSink.length; row += 1) {
    for (let col = 0; col < boardBeforeSink[row]!.length; col += 1) {
      const color = boardBeforeSink[row]![col];
      if (!color) continue;
      const toRow = row + sinkSteps;
      if (toRow >= MAX_ROWS) continue;
      const from = renderer.cellCenter(row, col);
      const to = renderer.cellCenter(toRow, col);
      slides.push({
        fromX: from.x,
        fromY: from.y,
        toX: to.x,
        toY: to.y,
        to: { row: toRow, col },
        age01: 0,
        color,
      });
    }
  }
  return slides;
}

function buildRefillEntries(fromBoard: Board, toBoard: Board): Array<{ row: number; col: number; color: LanternColor }> {
  const entries: Array<{ row: number; col: number; color: LanternColor }> = [];
  for (let row = 0; row < toBoard.length; row += 1) {
    for (let col = 0; col < toBoard[row]!.length; col += 1) {
      const color = toBoard[row]![col];
      if (!color || fromBoard[row]![col] === color) continue;
      entries.push({ row, col, color });
    }
  }
  return entries;
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

type RuntimeHost = {
  setLoadingState?: HostBridge["setLoadingState"];
  ready?: () => void;
  audioEnabled?: unknown;
  isPaused?: boolean;
  onAudioPolicyChange?: (cb: (policy: unknown) => void) => () => void;
  onPause?: (cb: () => void) => () => void;
  onResume?: (cb: () => void) => () => void;
};

const NOOP_UNSUBSCRIBE = () => undefined;

function bridgeFromRuntimeHost(runtimeHost: RuntimeHost | undefined, fallbackAudioPolicy: unknown): HostBridge {
  return {
    setLoadingState: (next) => runtimeHost?.setLoadingState?.(next),
    ready: () => {
      if (runtimeHost?.ready) {
        runtimeHost.ready();
        return;
      }
      runtimeHost?.setLoadingState?.({ status: "ready" });
    },
    audioPolicy: runtimeHost?.audioEnabled ?? fallbackAudioPolicy,
    paused: runtimeHost?.isPaused ?? false,
    onAudioPolicyChange: runtimeHost?.onAudioPolicyChange
      ? (cb) => runtimeHost.onAudioPolicyChange!(cb)
      : () => NOOP_UNSUBSCRIBE,
    onPause: runtimeHost?.onPause ? (cb) => runtimeHost.onPause!(cb) : () => NOOP_UNSUBSCRIBE,
    onResume: runtimeHost?.onResume ? (cb) => runtimeHost.onResume!(cb) : () => NOOP_UNSUBSCRIBE,
  };
}

async function createHostBridge(): Promise<HostBridge> {
  const playdrop = window.playdrop;
  if (!playdrop) {
    return bridgeFromRuntimeHost(undefined, true);
  }

  const hasPlaydropChannel = new URLSearchParams(window.location.search).has("playdrop_channel");
  if (playdrop.init && hasPlaydropChannel) {
    try {
      const sdk = await playdrop.init();
      return bridgeFromRuntimeHost(sdk.host as RuntimeHost | undefined, false);
    } catch (error) {
      console.warn("[fruit-salad] failed to initialize playdrop host bridge; muting until host policy is known", error);
    }
  }

  return bridgeFromRuntimeHost(playdrop.host as RuntimeHost | undefined, hasPlaydropChannel ? false : true);
}

function resolveAudioPolicy(policy: unknown): { musicEnabled: boolean; sfxEnabled: boolean } {
  if (typeof policy === "boolean") {
    return { musicEnabled: policy, sfxEnabled: policy };
  }

  if (!policy || typeof policy !== "object") {
    return { musicEnabled: false, sfxEnabled: false };
  }

  const record = policy as Record<string, unknown>;
  const hasExplicitPolicy = [
    record.audioEnabled,
    record.soundEnabled,
    record.enabled,
    record.musicEnabled,
    record.musicAllowed,
    record.sfxEnabled,
    record.effectsEnabled,
    record.fxEnabled,
  ].some((value) => typeof value === "boolean");
  if (!hasExplicitPolicy) {
    return { musicEnabled: false, sfxEnabled: false };
  }
  const globalEnabled = firstBoolean(record.audioEnabled, record.soundEnabled, record.enabled);
  const musicEnabled = firstBoolean(record.musicEnabled, record.musicAllowed, globalEnabled, false);
  const sfxEnabled = firstBoolean(record.sfxEnabled, record.effectsEnabled, record.fxEnabled, globalEnabled, false);
  return { musicEnabled, sfxEnabled };
}

function firstBoolean(...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === "boolean") return value;
  }
  return true;
}
