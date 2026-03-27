/// <reference types="playdrop-sdk-types" />

import { AudioEngine } from "./game/audio.ts";
import {
  applyLanePress,
  createInitialState,
  getBalanceSnapshot,
  getSong,
  getUpcomingClusters,
  getVisibleNotes,
  startRun,
  updateGame,
  type GameState,
} from "./game/logic.ts";
import { SceneRenderer } from "./render/scene.ts";
import { createUI, updateUI } from "./ui/dom.ts";

declare global {
  interface Window {
    __keyfallDebug?: ReturnType<typeof getBalanceSnapshot>;
    render_game_to_text?: () => string;
  }
}

type HostLoadingState =
  | { status: "loading"; message?: string; progress?: number }
  | { status: "ready" }
  | { status: "error"; message: string };

const STORAGE_KEYS = {
  bestScore: "keyfall-best-score",
  bestCombo: "keyfall-best-combo",
};

void boot().catch((error) => {
  console.error(error);
  window.playdrop?.host?.setLoadingState?.({
    status: "error",
    message: String(error),
  });
});

async function boot(): Promise<void> {
  const host = await createHostBridge();
  host.setLoadingState({ status: "loading", message: "Building runway", progress: 0.2 });

  const ui = createUI();
  const renderer = new SceneRenderer(ui.canvas);
  const audio = new AudioEngine();

  let muted = false;
  let pressedLanes = new Set<number>();
  let state = createInitialState(4, loadPersistedState());
  let lastFrame = performance.now();
  let pulse = 0;

  function resize(): void {
    renderer.resize(window.innerWidth, window.innerHeight);
  }

  function beginRun(): void {
    state = startRun(state);
    pulse = 1;
    void audio.unlock();
    host.setLoadingState({ status: "ready" });
    renderNow();
  }

  function resetRun(): void {
    state = startRun(state);
    pulse = 1;
    renderNow();
  }

  function toggleMute(): void {
    muted = !muted;
    audio.setMuted(muted);
    renderNow();
  }

  ui.startButton.addEventListener("click", beginRun);
  ui.retryButton.addEventListener("click", resetRun);
  ui.muteButton.addEventListener("click", toggleMute);

  bindPointerInput(ui.stage, (lane, active) => {
    if (active) {
      pressedLanes.add(lane);
      if (state.screen === "playing") {
        const result = applyLanePress(state, lane);
        state = result.state;
        audio.playEvents(result.events);
        pulse = 1;
      } else {
        beginRun();
      }
    } else {
      pressedLanes.delete(lane);
    }
  });

  bindKeyboardInput(
    (lane) => {
      pressedLanes.add(lane);
      if (state.screen === "playing") {
        const result = applyLanePress(state, lane);
        state = result.state;
        audio.playEvents(result.events);
        pulse = 1;
      }
    },
    (lane) => {
      pressedLanes.delete(lane);
    },
    () => {
      if (state.screen === "playing") return;
      beginRun();
    },
    () => toggleMute(),
  );

  window.addEventListener("resize", resize);
  resize();

  function renderNow(): void {
    updateUI(ui, {
      screen: state.screen,
      score: state.score,
      bestScore: state.bestScore,
      combo: Math.max(1, state.combo),
      bestCombo: state.bestCombo,
      lives: state.lives,
      songLabel: state.currentSongLabel,
      preview: getUpcomingClusters(state, 3),
      muted,
    });
    renderer.render({
      notes: getVisibleNotes(state),
      elapsedMs: state.elapsedMs,
      song: getSong(state),
      pressedLanes,
      pulse,
    });
    window.__keyfallDebug = getBalanceSnapshot(state);
  }

  function frame(now: number): void {
    const elapsed = Math.min(32, now - lastFrame);
    lastFrame = now;

    if (state.screen === "playing") {
      const result = updateGame(state, elapsed, pressedLanes);
      state = result.state;
      audio.update(state);
      audio.playEvents(result.events);
      if (result.events.length > 0) {
        pulse = 1;
      }
      if (state.screen === "gameover") {
        persistState(state);
      }
    }

    pulse = Math.max(0, pulse - elapsed / 320);
    renderNow();
    requestAnimationFrame(frame);
  }

  window.render_game_to_text = () => JSON.stringify(getBalanceSnapshot(state));
  host.setLoadingState({ status: "ready" });
  requestAnimationFrame(frame);
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
      return {
        setLoadingState: () => {},
      };
    }
  }

  return {
    setLoadingState: () => {},
  };
}

function bindPointerInput(target: HTMLElement, onLane: (lane: number, active: boolean) => void): void {
  const pointers = new Map<number, number>();
  target.style.touchAction = "none";

  target.addEventListener("pointerdown", (event) => {
    const lane = resolveLane(target, event.clientX);
    pointers.set(event.pointerId, lane);
    onLane(lane, true);
  });

  target.addEventListener("pointerup", (event) => {
    const lane = pointers.get(event.pointerId);
    if (lane !== undefined) {
      onLane(lane, false);
      pointers.delete(event.pointerId);
    }
  });

  target.addEventListener("pointercancel", (event) => {
    const lane = pointers.get(event.pointerId);
    if (lane !== undefined) {
      onLane(lane, false);
      pointers.delete(event.pointerId);
    }
  });
}

function bindKeyboardInput(
  onPress: (lane: number) => void,
  onRelease: (lane: number) => void,
  onStart: () => void,
  onMute: () => void,
): void {
  const map = new Map([
    ["d", 0],
    ["f", 1],
    ["j", 2],
    ["k", 3],
  ]);
  const down = new Set<string>();

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (event.code === "Space") {
      onStart();
      return;
    }
    if (key === "m") {
      onMute();
      return;
    }
    const lane = map.get(key);
    if (lane === undefined || down.has(key)) return;
    down.add(key);
    onPress(lane);
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    const lane = map.get(key);
    if (lane === undefined) return;
    down.delete(key);
    onRelease(lane);
  });
}

function resolveLane(target: HTMLElement, clientX: number): number {
  const rect = target.getBoundingClientRect();
  const relative = (clientX - rect.left) / rect.width;
  return Math.max(0, Math.min(3, Math.floor(relative * 4)));
}

function loadPersistedState(): { bestScore: number; bestCombo: number } {
  return {
    bestScore: Number(localStorage.getItem(STORAGE_KEYS.bestScore) ?? "0"),
    bestCombo: Number(localStorage.getItem(STORAGE_KEYS.bestCombo) ?? "0"),
  };
}

function persistState(state: GameState): void {
  localStorage.setItem(STORAGE_KEYS.bestScore, String(Math.max(state.bestScore, state.score)));
  localStorage.setItem(STORAGE_KEYS.bestCombo, String(Math.max(state.bestCombo, state.combo)));
}
