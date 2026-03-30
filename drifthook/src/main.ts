/// <reference types="playdrop-sdk-types" />

import { AudioEngine } from "./game/audio";
import {
  createInitialState,
  getCurrentTarget,
  getDifficultyStage,
  getOrderSlots,
  getVisibleEntities,
  startRun,
  summarizeBalance,
  updateGame,
  type FishSpecies,
  type GameEvent,
  type GameState,
  type VisibleEntity,
} from "./game/logic";
import { CanvasRenderer, type RenderFish, type RenderModel, type RenderSnag } from "./render/canvas";
import { createUI, updateUI, type UIState } from "./ui/dom";

declare global {
  interface Window {
    __drifthookDebug?: ReturnType<typeof summarizeBalance> & {
      screen: GameState["screen"];
      hold: boolean;
      autoplay: string | null;
    };
    __drifthookControls?: {
      startRun: () => void;
      setHold: (next: boolean) => void;
      setMuted: (next: boolean) => void;
      getState: () => ReturnType<typeof summarizeBalance>;
    };
    advanceTime?: (ms: number) => Promise<void>;
    render_game_to_text?: () => string;
  }
}

type HostLoadingState =
  | { status: "loading"; message?: string; progress?: number }
  | { status: "ready" }
  | { status: "error"; message: string };

type AutoplayMode = "casual" | "expert" | null;

const BEST_SCORE_KEY = "drifthook-best-score";

void boot().catch((error) => {
  console.error(error);
  window.playdrop?.host?.setLoadingState?.({
    status: "error",
    message: String(error),
  });
});

async function boot(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const manualClock = params.get("debug_clock") === "manual";
  const autoplayMode = readAutoplayFromLocation(params);
  const host = await createHostBridge();
  host.setLoadingState({ status: "loading", message: "Casting the lake", progress: 0.16 });

  const ui = createUI();
  const renderer = new CanvasRenderer(ui.canvas);
  const audio = new AudioEngine();
  const forcedSeed = readSeedFromLocation(params);

  let state = createInitialState(forcedSeed);
  state.bestScore = readBestScore();
  let holding = autoplayMode ? true : false;
  let muted = false;
  let catchPulse = 0;
  let damagePulse = 0;
  let orderPulse = 0;
  let autoplaySeed = (forcedSeed ^ 0x9e3779b9) >>> 0;
  let lastFrame = performance.now();

  function resize(): void {
    renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    renderNow();
  }

  function beginRun(): void {
    state = startRun(state, forcedSeed);
    state.bestScore = readBestScore();
    holding = autoplayMode ? true : false;
    catchPulse = 0;
    damagePulse = 0;
    orderPulse = 0;
    autoplaySeed = (forcedSeed ^ 0x9e3779b9) >>> 0;
    renderNow();
  }

  function setHolding(next: boolean): void {
    if (state.screen !== "playing") return;
    holding = next;
  }

  function setMuted(next: boolean): void {
    muted = next;
    audio.setMuted(next);
  }

  ui.startButton.addEventListener("click", () => {
    void audio.unlock();
    beginRun();
  });
  ui.retryButton.addEventListener("click", () => {
    void audio.unlock();
    beginRun();
  });

  bindPointerInput(
    ui.stage,
    () => {
      if (state.screen === "playing") {
        setHolding(true);
        void audio.unlock();
      }
    },
    () => {
      if (state.screen === "playing") setHolding(false);
    },
  );

  bindKeyboardInput(
    () => {
      if (state.screen === "playing") {
        setHolding(true);
        void audio.unlock();
      }
    },
    () => {
      if (state.screen === "playing") setHolding(false);
    },
    () => {
      if (state.screen !== "playing") beginRun();
    },
    () => {
      setMuted(!muted);
      renderNow();
    },
  );

  window.__drifthookControls = {
    startRun: beginRun,
    setHold: (next) => {
      holding = next;
      renderNow();
    },
    setMuted,
    getState: () => summarizeBalance(state),
  };

  function stepFrame(elapsedMs: number): void {
    const clamped = Math.min(48, Math.max(0, elapsedMs));
    if (autoplayMode && state.screen === "playing") {
      holding = applyAutoplayDecision(state, holding, autoplayMode, autoplaySeed);
      autoplaySeed = lcg(autoplaySeed);
    }

    const previousBest = state.bestScore;
    const result = updateGame(state, clamped, holding);
    state = result.state;
    if (state.bestScore > previousBest) {
      writeBestScore(state.bestScore);
    }
    applyEvents(result.events, audio);

    catchPulse = Math.max(0, catchPulse - clamped / 320);
    damagePulse = Math.max(0, damagePulse - clamped / 420);
    orderPulse = Math.max(0, orderPulse - clamped / 620);

    renderNow();
  }

  function renderNow(): void {
    publishDebug(state, holding, autoplayMode);
    updateUI(ui, buildUIState(state));
    renderer.render(buildRenderModel(state, catchPulse, damagePulse, orderPulse));
  }

  function applyEvents(events: GameEvent[], audioEngine: AudioEngine): void {
    for (const event of events) {
      switch (event.kind) {
        case "catch":
          if (event.result === "correct") {
            catchPulse = event.perfect ? 1 : 0.76;
            audioEngine.playCatch(event.perfect);
          } else {
            damagePulse = 1;
            audioEngine.playWrong();
            if (event.knots <= 0) {
              audioEngine.playGameOver();
            }
          }
          break;
        case "order-complete":
          orderPulse = 1;
          audioEngine.playOrderComplete();
          break;
        case "gameover":
          damagePulse = 1;
          audioEngine.playGameOver();
          break;
        default:
          break;
      }
    }
  }

  function frame(now: number): void {
    const elapsed = now - lastFrame;
    lastFrame = now;
    stepFrame(elapsed);
    requestAnimationFrame(frame);
  }

  window.advanceTime = async (ms: number) => {
    const frameStep = 16;
    let remaining = ms;
    while (remaining > 0) {
      stepFrame(Math.min(frameStep, remaining));
      remaining -= frameStep;
    }
  };
  window.render_game_to_text = () => JSON.stringify(summarizeBalance(state));

  host.setLoadingState({ status: "ready" });
  renderNow();
  if (autoplayMode) beginRun();
  if (!manualClock) requestAnimationFrame(frame);
  window.addEventListener("resize", resize);
}

function buildUIState(state: GameState): UIState {
  const orderSlots = getOrderSlots(state);
  return {
    screen: state.screen,
    score: state.score,
    bestScore: state.bestScore,
    completedOrders: state.completedOrders,
    knots: state.knots,
    maxKnots: 4,
    order: orderSlots.map((slot) => slot.species),
    orderProgress: state.orderProgress,
  };
}

function buildRenderModel(
  state: GameState,
  catchPulse: number,
  damagePulse: number,
  orderPulse: number,
): RenderModel {
  const visible = getVisibleEntities(state);
  const fishes: RenderFish[] = [];
  const snags: RenderSnag[] = [];

  for (const entity of visible) {
    if (entity.kind === "snag") {
      snags.push({
        id: entity.id,
        x01: entity.id % 2 === 0 ? 0.36 : 0.64,
        y01: entity.depth,
        scale: 0.8 + ((entity.id % 3) * 0.1),
        alpha: 0.56,
      });
      continue;
    }

    fishes.push({
      id: entity.id,
      species: entity.species ?? "dartfin",
      x01: positionEntityX(entity),
      y01: entity.depth,
      dir: entity.id % 2 === 0 ? 1 : -1,
      scale: entity.species === "mooneel" ? 1.1 : entity.species === "bloomkoi" ? 1.02 : 0.96,
      alpha: 0.88 + ((entity.id % 2) * 0.06),
    });
  }

  return {
    screen: state.screen,
    timeMs: state.elapsedMs,
    fishes,
    snags,
    lureDepth01: clamp((state.lureDepth - 0.08) / 0.84, 0, 1),
    catchPulse01: catchPulse,
    damagePulse01: damagePulse,
    orderPulse01: orderPulse,
  };
}

function positionEntityX(entity: VisibleEntity): number {
  const progress = clamp(entity.ageMs / Math.max(1, entity.lifetimeMs), 0, 1);
  const dir = entity.id % 2 === 0 ? 1 : -1;
  const track = dir === 1 ? 0.16 + progress * 0.68 : 0.84 - progress * 0.68;
  const wobble = Math.sin(progress * Math.PI) * 0.06 * dir;
  return clamp(track + wobble, 0.12, 0.88);
}

function publishDebug(state: GameState, holding: boolean, autoplayMode: AutoplayMode): void {
  const current = summarizeBalance(state);
  window.__drifthookDebug = {
    ...current,
    screen: state.screen,
    hold: holding,
    autoplay: autoplayMode,
  };
}

function readBestScore(): number {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    if (!raw) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeBestScore(score: number): void {
  try {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
  } catch {
    // ignore storage failures
  }
}

async function createHostBridge(): Promise<{ setLoadingState: (state: HostLoadingState) => void }> {
  if (window.playdrop?.host) {
    return {
      setLoadingState: (next) => window.playdrop?.host?.setLoadingState(next),
    };
  }

  const hasPlaydropChannel = new URLSearchParams(window.location.search).has("playdrop_channel");
  if (window.playdrop?.init && hasPlaydropChannel) {
    try {
      const sdk = await window.playdrop.init();
      return {
        setLoadingState: (next) => sdk.host.setLoadingState(next),
      };
    } catch {
      return { setLoadingState: () => {} };
    }
  }

  return { setLoadingState: () => {} };
}

function bindPointerInput(stage: HTMLElement, onDown: () => void, onUp: () => void): void {
  const pointers = new Set<number>();
  stage.addEventListener("pointerdown", (event) => {
    if (event.target instanceof HTMLElement && event.target.closest("button")) return;
    pointers.add(event.pointerId);
    onDown();
  });

  stage.addEventListener("pointerup", (event) => {
    if (pointers.delete(event.pointerId)) onUp();
  });

  stage.addEventListener("pointercancel", (event) => {
    if (pointers.delete(event.pointerId)) onUp();
  });

  stage.addEventListener("pointerleave", () => {
    if (pointers.size > 0) {
      pointers.clear();
      onUp();
    }
  });
}

function bindKeyboardInput(
  onDown: () => void,
  onUp: () => void,
  onStart: () => void,
  onMute: () => void,
): void {
  const held = new Set<string>();
  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "spacebar") {
      event.preventDefault();
      if (!held.has("space")) {
        held.add("space");
        onDown();
      }
      return;
    }

    if (key === "enter") {
      onStart();
      return;
    }

    if (key === "m") {
      onMute();
    }
  });

  document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if ((key === " " || key === "spacebar") && held.delete("space")) {
      onUp();
    }
  });
}

function readSeedFromLocation(params: URLSearchParams): number {
  const raw = params.get("seed");
  if (!raw) return Date.now() >>> 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed >>> 0 : Date.now() >>> 0;
}

function readAutoplayFromLocation(params: URLSearchParams): AutoplayMode {
  const raw = params.get("autoplay");
  if (raw === "expert") return "expert";
  if (raw === "casual" || raw === "1") return "casual";
  return null;
}

function applyAutoplayDecision(state: GameState, holding: boolean, mode: AutoplayMode, seed: number): boolean {
  if (!mode) return holding;
  const target = getCurrentTarget(state);
  const visible = getVisibleEntities(state).sort((a, b) => a.depth - b.depth);
  const desired = chooseDesiredEntity(visible, target, mode, seed);

  if (holding) {
    const releasePadding = mode === "expert" ? 0.018 : 0.038;
    const releaseDepth = desired ? clamp(desired.depth + releasePadding, 0.12, 0.92) : 0.92;
    if (state.lureDepth >= releaseDepth) return false;
  } else if (state.lureDepth <= 0.03) {
    return true;
  }

  if (!desired && state.lureDepth > 0.92) return false;
  return holding;
}

function chooseDesiredEntity(
  visible: VisibleEntity[],
  target: FishSpecies,
  mode: Exclude<AutoplayMode, null>,
  seed: number,
): VisibleEntity | null {
  if (visible.length === 0) return null;
  const catchable = visible.filter((entity) => isCatchableEntity(entity, visible, 1));
  const targetFish = catchable.filter((entity) => entity.kind === "fish" && entity.species === target);
  const roll = ((seed >>> 0) % 1000) / 1000;
  const shallowest = catchable[0] ?? visible[0] ?? null;
  if (!shallowest) return null;

  if (mode === "casual") {
    if (roll > 0.72) return shallowest;
    return targetFish[0] ?? shallowest;
  }

  return targetFish[0] ?? null;
}

function lcg(seed: number): number {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
}

function isCatchableEntity(entity: VisibleEntity, visible: VisibleEntity[], lureDepth: number): boolean {
  if (entity.depth >= lureDepth) return false;
  for (const other of visible) {
    if (other.id === entity.id) continue;
    if (other.depth > entity.depth && other.depth < lureDepth) return false;
  }
  return true;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
