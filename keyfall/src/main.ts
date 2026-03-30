/// <reference types="playdrop-sdk-types" />

import { AudioEngine } from "./game/audio.ts";
import {
  applyLanePress,
  buildChartReport,
  createInitialState,
  getBalanceSnapshot,
  getSong,
  getUpcomingClusters,
  getVisibleNotes,
  setSelectedDifficulty,
  setSelectedSong,
  startRun,
  updateGame,
  type GameEvent,
  type GameState,
} from "./game/logic.ts";
import { DIFFICULTIES, SONG_IDS, SONG_LIBRARY, type DifficultyId, type SongId } from "./game/songbook.ts";
import { SceneRenderer } from "./render/scene.ts";
import { createUI, updateUI } from "./ui/dom.ts";

declare global {
  interface Window {
    __keyfallDebug?: ReturnType<typeof getBalanceSnapshot>;
    __keyfallControl?: {
      startRun: () => void;
      setAutoplay: (enabled: boolean) => void;
      setMuted: (enabled: boolean) => void;
      selectSong: (songId: SongId) => void;
      selectDifficulty: (difficulty: DifficultyId) => void;
      getState: () => ReturnType<typeof getBalanceSnapshot>;
      getChartReport: () => ReturnType<typeof buildChartReport>;
      pressLane: (lane: number) => void;
      releaseLane: (lane: number) => void;
    };
    advanceTime?: (ms: number) => Promise<void>;
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
  const params = new URLSearchParams(window.location.search);
  const manualClock = params.get("debug_clock") === "manual";
  const host = await createHostBridge();
  host.setLoadingState({ status: "loading", message: "Building runway", progress: 0.2 });

  const ui = createUI();
  const renderer = new SceneRenderer(ui.canvas);
  const audio = new AudioEngine();
  host.setLoadingState({ status: "loading", message: "Tuning tracks", progress: 0.55 });
  await audio.prime(SONG_LIBRARY);

  let muted = false;
  let autoplay = params.get("autoplay") === "1";
  let pressedLanes = new Set<number>();
  const autoplayHeldLanes = new Map<number, number>();
  let state = createInitialState(loadPersistedState());
  let lastFrame = performance.now();
  let pulse = 0;

  function resize(): void {
    renderer.resize(window.innerWidth, window.innerHeight);
  }

  function beginRun(): void {
    state = startRun(state);
    autoplayHeldLanes.clear();
    pressedLanes = new Set<number>();
    pulse = 1;
    void audio.unlock();
    host.setLoadingState({ status: "ready" });
    renderNow();
  }

  function resetRun(): void {
    beginRun();
  }

  function selectSong(songId: SongId): void {
    state = setSelectedSong(state, songId);
    renderNow();
  }

  function selectDifficulty(difficulty: DifficultyId): void {
    state = setSelectedDifficulty(state, difficulty);
    renderNow();
  }

  function toggleMute(): void {
    muted = !muted;
    audio.setMuted(muted);
    renderNow();
  }

  SONG_IDS.forEach((songId) => {
    ui.songButtons[songId].addEventListener("click", () => selectSong(songId));
  });
  DIFFICULTIES.forEach((difficulty) => {
    ui.difficultyButtons[difficulty].addEventListener("click", () => selectDifficulty(difficulty));
  });
  ui.startButton.addEventListener("click", beginRun);
  ui.retryButton.addEventListener("click", resetRun);
  ui.muteButton.addEventListener("click", toggleMute);

  bindPointerInput(ui.stage, ui.canvas, (lane, active) => {
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

  window.__keyfallControl = {
    startRun: beginRun,
    setAutoplay: (enabled) => {
      autoplay = enabled;
      if (!enabled) autoplayHeldLanes.clear();
      renderNow();
    },
    setMuted: (enabled) => {
      muted = enabled;
      audio.setMuted(enabled);
      renderNow();
    },
    selectSong,
    selectDifficulty,
    getState: () => getBalanceSnapshot(state),
    getChartReport: () => buildChartReport(),
    pressLane: (lane) => pressLane(lane),
    releaseLane: (lane) => releaseLane(lane),
  };

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
      difficultyLabel: state.currentDifficultyLabel,
      preview: getUpcomingClusters(state, 3),
      muted,
      selectedSongId: state.selectedSongId,
      selectedDifficulty: state.selectedDifficulty,
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

  function pressLane(lane: number): void {
    pressedLanes.add(lane);
    if (state.screen === "playing") {
      const result = applyLanePress(state, lane);
      state = result.state;
      audio.playEvents(result.events);
      pulse = 1;
      renderNow();
    }
  }

  function releaseLane(lane: number): void {
    pressedLanes.delete(lane);
  }

  function runAutoplay(frameElapsedMs: number): GameEvent[] {
    if (!autoplay || state.screen !== "playing") return [];
    const events: GameEvent[] = [];
    const frameStart = state.elapsedMs;
    const frameEnd = frameStart + frameElapsedMs + 0.5;

    for (const [lane, untilMs] of autoplayHeldLanes) {
      if (untilMs <= frameStart) autoplayHeldLanes.delete(lane);
    }

    const targets = state.notes
      .filter((note) => !note.resolved && note.timeMs >= frameStart - 0.5 && note.timeMs <= frameEnd)
      .sort((a, b) => a.timeMs - b.timeMs);

    for (const note of targets) {
      for (const lane of note.lanes) {
        const result = applyLanePress(state, lane, note.timeMs);
        state = result.state;
        events.push(...result.events);
      }
      if (note.kind === "hold") {
        const lane = note.lanes[0];
        if (lane !== undefined) {
          autoplayHeldLanes.set(lane, note.timeMs + note.durationMs + 24);
        }
      }
    }

    return events;
  }

  function getActivePressedLanes(): Set<number> {
    const active = new Set<number>(pressedLanes);
    for (const [lane, untilMs] of autoplayHeldLanes) {
      if (untilMs > state.elapsedMs) active.add(lane);
    }
    return active;
  }

  function stepFrame(elapsed: number): void {
    const clampedElapsed = Math.min(32, elapsed);

    if (state.screen === "playing") {
      const autoplayEvents = runAutoplay(clampedElapsed);
      const result = updateGame(state, clampedElapsed, getActivePressedLanes());
      state = result.state;
      audio.update(state);
      audio.playEvents([...autoplayEvents, ...result.events]);
      if (autoplayEvents.length > 0 || result.events.length > 0) {
        pulse = 1;
      }
      if (state.screen === "gameover" || state.screen === "clear") {
        persistState(state);
      }
    } else {
      audio.update(state);
    }

    pulse = Math.max(0, pulse - clampedElapsed / 320);
    renderNow();
  }

  function frame(now: number): void {
    const elapsed = Math.min(32, now - lastFrame);
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
  window.render_game_to_text = () => JSON.stringify(getBalanceSnapshot(state));

  host.setLoadingState({ status: "ready" });
  renderNow();
  if (!manualClock) {
    requestAnimationFrame(frame);
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
      return {
        setLoadingState: () => {},
      };
    }
  }

  return {
    setLoadingState: () => {},
  };
}

function bindPointerInput(target: HTMLElement, surface: HTMLElement, onLane: (lane: number, active: boolean) => void): void {
  const pointers = new Map<number, number>();
  target.style.touchAction = "none";

  target.addEventListener("pointerdown", (event) => {
    if (event.target !== target && event.target !== surface) {
      return;
    }
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
    ["arrowleft", 0],
    ["arrowup", 1],
    ["arrowdown", 2],
    ["arrowright", 3],
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
