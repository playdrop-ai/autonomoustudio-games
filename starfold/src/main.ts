/// <reference types="playdrop-sdk-types" />

import { GameAudio } from "./audio";
import { applyMove, BOARD_COLS, BOARD_ROWS, boardKinds, boardStateKinds, cloneBoard, countAsh, createBoardFromSpecs, createInitialState, getPlayableMoves, isAshKind, type Board, type ClearPulseKind, type ClearStage, type GameOverReason, type Move, type SigilKind, type TileKind, type TurnResult, type TurnStage } from "./game/logic";
import { classifyGameOverResult, freezeHudSnapshot, type GameOverResult } from "./game/results";
import { CanvasRenderer, type BoardResetTransition, type ComboLabel, type DragPreview, type IdleHint, type RenderQualityTier, type StartupIntroState, type TileInteractionState } from "./game/render";
import { PlaydropController, type PlatformSnapshot } from "./platform";
import { buildGameOverSubtitle, defaultGameOverSubtitle, shouldShowRestartInterstitial, shouldSnapbackDragOnHudPointerUp } from "./runtime-helpers";

type Screen = "playing" | "losing" | "gameover";
type StandardAchievementKey =
  | "first_constellation"
  | "ash_purified"
  | "triple_chain"
  | "shrine_sentinel"
  | "cinder_reclaimed"
  | "shockwave_rite"
  | "sanctum_reset"
  | "starfold_legend";
type IncrementalAchievementKey =
  | "ashbreaker_hundred"
  | "constellation_mason"
  | "three_hundred_guardians";

declare global {
  interface Window {
    __starfoldDebug?: {
      screen: Screen;
      score: number;
      ashCount: number;
      bestScore: number | null;
      edgeFlash: { tier: 4 | 5 | 6; progress: number; strength: number } | null;
      comboLabel: { title: string; detail: string; depth: number; kind: SigilKind; matchCount: number } | null;
      gameOverReason: string | null;
      gameOverResult: GameOverResult;
      startup: StartupIntroState;
      idleHint: Move | null;
      dragPreview: { axis: Move["axis"]; index: number; direction: Move["direction"]; offsetPx: number; settling: boolean } | null;
      activeStage: {
        kind: TurnStage["kind"];
        matchedCount: number;
        damagedCount: number;
        cleansedCount: number;
        restoredCount: number;
        combo: number;
        majorMatchSize: number;
        pulseTargetCount: number;
        pulseKind: ClearPulseKind;
      } | null;
      animating: boolean;
      phase: PlatformSnapshot["phase"];
      previewMode: boolean;
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
        activeOneShots: number;
        pendingOneShots: number;
        sfxReadyCount: number;
        recoveryState: string;
        globalVoices: number;
        audioEnabled: boolean;
        paused: boolean;
        phase: PlatformSnapshot["phase"];
      };
      render: {
        loopActive: boolean;
        qualityTier: RenderQualityTier;
      };
      sync: {
        pendingCompletedRun: boolean;
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
  audioPlayed: boolean;
  revealStartAt: number | null;
}

interface MajorMatchFlashState {
  tier: 4 | 5 | 6;
  startAt: number;
  durationMs: number;
  strength: number;
}

interface StartupIntroSequence {
  assetsReady: boolean;
  heroRevealStartAt: number | null;
  boardRevealStartAt: number | null;
  completed: boolean;
  tileOrder: Array<{ row: number; col: number }>;
}

interface PreviewLoopState {
  nextMoveAt: number | null;
  restartAt: number | null;
}

interface BoardResetSequence {
  startAt: number;
  outgoingBoard: Board;
  outgoingAshedAmount: number;
  incomingBoard: Board;
  tileOrder: Array<{ row: number; col: number }>;
  source: "preview-exit" | "restart";
}

const LEADERBOARD_KEY = "highest_score";
const STAGE_DURATIONS: Record<TurnStage["kind"], number> = {
  shift: 225,
  clear: 255,
  collapse: 300,
  ash: 270,
};
const IDLE_HINT_DELAY_MS = 4500;
const IDLE_HINT_ACTIVE_MS = 1300;
const IDLE_HINT_REST_MS = 2400;
const DRAG_AXIS_LOCK_THRESHOLD = 12;
const DRAG_COMMIT_RATIO = 0.34;
const DRAG_MAX_RATIO = 0.96;
const DRAG_SNAPBACK_MS = 130;
const GAME_OVER_DELAY_MS = 500;
const GAME_OVER_BAR_ANIM_MS = 320;
const GAME_OVER_TILE_GRAY_MS = 1000;
const COMBO_LABEL_BASE_DECAY_MS = 1200;
const COMBO_LABEL_EXTRA_DECAY_MS = 220;
const COMBO_LABEL_BURST_MS = 340;
const MAJOR_MATCH_FLASH_BASE_MS = 120;
const MAJOR_MATCH_FLASH_BASE_STRENGTH = 0.12;
const INTRO_HERO_REVEAL_MS = 500;
const INTRO_BOARD_REVEAL_MS = 420;
const INTRO_HUD_REVEAL_MS = 420;
const INTRO_HERO_EXIT_MS = 340;
const INTRO_TILE_STAGGER_MS = 50;
const INTRO_TILE_REVEAL_MS = 280;
const PREVIEW_START_DELAY_MS = 900;
const PREVIEW_MOVE_DELAY_MS = 1000;
const PREVIEW_RESTART_DELAY_MS = 1100;
const BOARD_RESET_OUT_STAGGER_MS = 22;
const BOARD_RESET_OUT_TILE_MS = 220;
const BOARD_RESET_EMPTY_HOLD_MS = 500;
const BOARD_RESET_IN_STAGGER_MS = 46;
const BOARD_RESET_IN_TILE_MS = 260;
const QUALITY_DEMOTE_FRAME_MS = 20;
const QUALITY_PROMOTE_FRAME_MS = 16.5;
const QUALITY_SAMPLE_WINDOW = 8;
const QUALITY_PROMOTE_STABLE_FRAMES = 18;
const GAME_OVER_CTA_BOUNCE_DELAY_MS = 2000;
const GAME_OVER_CTA_BOUNCE_WINDOW_MS = 1800;
const RESTART_INTERSTITIAL_MIN_RUN_MS = 45_000;
const RESTART_INTERSTITIAL_MIN_RUN_MOVES = 12;
const RESTART_INTERSTITIAL_COOLDOWN_MS = 180_000;

let platform: PlaydropController | null = null;

void (async () => {
  platform = new PlaydropController(LEADERBOARD_KEY);
  const platformInit = platform.init();

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
  const audio = new GameAudio();
  await renderer.loadBootAssets();
  const runtimeAssetsPromise = renderer.loadAssets();
  const audioLoadPromise = audio.load();
  void audioLoadPromise.catch((error) => {
    platform?.reportError(error);
  });
  const forcedSeed = readSeedFromLocation();
  const fixedInitialState = readInitialStateFromLocation(forcedSeed);
  let gameState = createRunState(fixedInitialState, forcedSeed);
  let screen: Screen = "playing";
  let activeStage: ActiveStage | null = null;
  let queuedStages: TurnStage[] = [];
  let drag: DragState | null = null;
  let dragPreview: DragPreviewState | null = null;
  let hoverCell: { row: number; col: number } | null = null;
  let pressFeedback: PressFeedback | null = null;
  let comboLabel: ComboLabel | null = null;
  let runAchievements = new Set<StandardAchievementKey>();
  let lastFrame = performance.now();
  let lastInteractionAt = performance.now();
  let completedRun = false;
  let lossTransition: LossTransition | null = null;
  let majorMatchFlash: MajorMatchFlashState | null = null;
  let frozenHud = freezeHudSnapshot(getPlatformSnapshot());
  let completedRunHud = frozenHud;
  let completedRunScore: number | null = null;
  let gameOverResult: GameOverResult = "normal";
  let gameOverSubtitle = defaultGameOverSubtitle(gameState.gameOverReason);
  let gameOverSyncPending = false;
  let gameOverShownAt: number | null = null;
  const sessionStartedAt = performance.now();
  let currentRunStartedAt = sessionStartedAt;
  let interstitialReady = false;
  let interstitialLoadInFlight = false;
  let interstitialBlocked = false;
  let interstitialRetryAfterAt: number | null = null;
  let lastInterstitialShownAt: number | null = null;
  let restartInterstitialShownForRun = false;
  let restartInterstitialInFlight = false;
  let previewModeActive = false;
  let boardReset: BoardResetSequence | null = null;
  let boardResetSequenceSeed = 0;
  let activeRunId = 0;
  let renderFrameId: number | null = null;
  let renderWakeTimer: number | null = null;
  let renderLoopActive = false;
  let sceneDirty = true;
  const baseQualityTier = getDefaultQualityTier();
  let qualityTier: RenderQualityTier = baseQualityTier;
  let qualitySamples: number[] = [];
  let stableAnimationFrames = 0;
  const previewLoop: PreviewLoopState = {
    nextMoveAt: null,
    restartAt: null,
  };
  const startupIntro: StartupIntroSequence = {
    assetsReady: false,
    heroRevealStartAt: null,
    boardRevealStartAt: null,
    completed: false,
    tileOrder: createIntroTileOrder(forcedSeed),
  };

  window.render_game_to_text = () => {
    const layout = renderer.getLayout();
    const snapshot = getPlatformSnapshot();
    const now = performance.now();
    return JSON.stringify({
      mode: screen,
      phase: snapshot.phase,
      score: gameState.score,
      bestScore: frozenHud.bestScore,
      ashCount: gameState.ashCount,
      edgeFlash: getRenderEdgeFlash(performance.now(), majorMatchFlash),
      gameOverReason: gameState.gameOverReason,
      gameOverResult,
      startup: {
        assetsReady: startupIntro.assetsReady,
        heroRevealStartAt: startupIntro.heroRevealStartAt,
        boardRevealStartAt: startupIntro.boardRevealStartAt,
        completed: startupIntro.completed,
      },
      animating: shouldContinueRenderLoop({
        now,
        previewModeActive,
        startupIntro,
        activeStage,
        queuedStageCount: queuedStages.length,
        boardReset,
        screen,
        lossTransition,
        comboLabel,
        dragPreview,
        drag,
        gameOverShownAt,
        gameState,
        hoverCell,
        pressFeedback,
        lastInteractionAt,
      }),
      dragPreview: dragPreview
        ? {
            axis: dragPreview.move.axis,
            index: dragPreview.move.index,
            direction: dragPreview.move.direction,
            offsetPx: Math.round(dragPreview.offsetPx),
            settling: dragPreview.settling,
          }
        : null,
      board: boardStateKinds(gameState.board),
      boardKinds: boardKinds(gameState.board),
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

  const syncAudioRuntimeState = (): void => {
    const snapshot = getPlatformSnapshot();
    audio.syncRuntimeState({
      audioEnabled: snapshot.audioEnabled,
      paused: snapshot.paused,
      phase: snapshot.phase,
    });
    audio.syncQualityTier(qualityTier);
  };

  const markSceneDirty = (): void => {
    sceneDirty = true;
    requestRender();
  };

  const clearRenderWakeTimer = (): void => {
    if (renderWakeTimer === null) {
      return;
    }
    window.clearTimeout(renderWakeTimer);
    renderWakeTimer = null;
  };

  const scheduleRenderWakeAt = (wakeAt: number | null): void => {
    clearRenderWakeTimer();
    if (wakeAt === null) {
      return;
    }
    const delay = Math.max(0, wakeAt - performance.now());
    renderWakeTimer = window.setTimeout(() => {
      renderWakeTimer = null;
      markSceneDirty();
    }, delay);
  };

  function requestRender(): void {
    clearRenderWakeTimer();
    if (renderFrameId !== null) {
      return;
    }
    if (!renderLoopActive) {
      renderLoopActive = true;
      lastFrame = performance.now();
    }
    renderFrameId = window.requestAnimationFrame(render);
  }

  const readyPromise = Promise.all([runtimeAssetsPromise, platformInit]).then(() => {
    startupIntro.assetsReady = true;
    frozenHud = freezeHudSnapshot(getPlatformSnapshot());
    completedRunHud = frozenHud;
    if (isPreviewMode(getPlatformSnapshot())) {
      previewModeActive = true;
      skipStartupIntroForPreview(startupIntro);
      schedulePreviewStart(performance.now());
    }
    platform?.markReady();
    syncAudioRuntimeState();
    void preloadRestartInterstitial(performance.now());
    markSceneDirty();
  });

  platform?.onChange(() => {
    syncAudioRuntimeState();
    markSceneDirty();
  });

  function applyFreshRunState(nextState: typeof gameState, now: number): void {
    activeRunId += 1;
    gameState = nextState;
    currentRunStartedAt = now;
    screen = "playing";
    activeStage = null;
    queuedStages = [];
    comboLabel = null;
    drag = null;
    dragPreview = null;
    hoverCell = null;
    pressFeedback = null;
    runAchievements = new Set<StandardAchievementKey>();
    completedRun = false;
    lossTransition = null;
    majorMatchFlash = null;
    frozenHud = freezeHudSnapshot(getPlatformSnapshot());
    completedRunHud = frozenHud;
    completedRunScore = null;
    gameOverResult = "normal";
    gameOverSubtitle = defaultGameOverSubtitle(gameState.gameOverReason);
    gameOverSyncPending = false;
    gameOverShownAt = null;
    restartInterstitialShownForRun = false;
    restartInterstitialInFlight = false;
    boardReset = null;
    lastInteractionAt = now;
    qualitySamples = [];
    stableAnimationFrames = 0;
    qualityTier = baseQualityTier;
    previewLoop.nextMoveAt = previewModeActive ? now + PREVIEW_START_DELAY_MS : null;
    previewLoop.restartAt = null;
    syncAudioRuntimeState();
    void preloadRestartInterstitial(now);
    markSceneDirty();
  }

  function startNewRun(): void {
    applyFreshRunState(createRunState(fixedInitialState, forcedSeed), performance.now());
  }

  function startNewRunWithBoardReset(
    now: number,
    outgoingBoard: Board,
    outgoingAshedAmount: number,
    source: BoardResetSequence["source"] = "restart",
  ): void {
    const nextState = createRunState(fixedInitialState, forcedSeed);
    applyFreshRunState(nextState, now);
    boardReset = {
      startAt: now,
      outgoingBoard: cloneBoard(outgoingBoard),
      outgoingAshedAmount,
      incomingBoard: cloneBoard(nextState.board),
      tileOrder: createIntroTileOrder(((forcedSeed ?? 20260422) + boardResetSequenceSeed * 977 + 1) >>> 0),
      source,
    };
    boardResetSequenceSeed += 1;
    previewLoop.nextMoveAt = null;
    previewLoop.restartAt = null;
  }

  function queueMove(move: Move, startOffsetPx = 0): void {
    if (screen !== "playing" || activeStage || queuedStages.length > 0 || boardReset || gameState.gameOver || !startupIntro.completed) return;
    lastInteractionAt = performance.now();
    comboLabel = null;

    const result = applyMove(gameState, move, { startOffsetPx });
    if (result.stages.length === 0) return;

    if (!previewModeActive) {
      audio.startMusicLoop();
      const achievementUpdate = collectAchievements(result, runAchievements);
      platform?.queue({
        unlocks: achievementUpdate.unlocks,
        progressDeltas: achievementUpdate.progressDeltas,
        score: result.state.score,
      });
    }

    queuedStages = result.stages.slice();

    gameState = result.state;
    markSceneDirty();
  }

  async function handleHudLogin(): Promise<void> {
    if (getPlatformSnapshot().busy) {
      return;
    }
    const didLogin = await platform?.promptLogin();
    if (!didLogin) {
      return;
    }
    if (screen === "gameover" && completedRunScore !== null) {
      gameOverSyncPending = true;
      markSceneDirty();
      await finalizeCompletedRunSync(activeRunId);
    }
  }

  async function preloadRestartInterstitial(now: number): Promise<void> {
    if (
      previewModeActive ||
      interstitialReady ||
      interstitialLoadInFlight ||
      interstitialBlocked ||
      (interstitialRetryAfterAt !== null && now < interstitialRetryAfterAt) ||
      !platform?.canUseInterstitialAds()
    ) {
      return;
    }
    interstitialLoadInFlight = true;
    try {
      const result = await platform.preloadInterstitial();
      interstitialReady = result.status === "ready";
      interstitialBlocked = result.status === "blocked";
      interstitialRetryAfterAt =
        result.status === "rate_limited" ? now + result.retryAfterSeconds * 1000 : null;
    } catch (error) {
      interstitialReady = false;
      platform?.reportError(error);
    } finally {
      interstitialLoadInFlight = false;
      markSceneDirty();
    }
  }

  async function maybeShowRestartInterstitial(): Promise<void> {
    const now = performance.now();
    if (
      restartInterstitialInFlight ||
      !shouldShowRestartInterstitial({
        previewModeActive,
        screen,
        runMoves: gameState.moves,
        runElapsedMs: Math.max(0, now - currentRunStartedAt),
        shownThisRun: restartInterstitialShownForRun,
        lastInterstitialShownAt,
        sessionStartedAt,
        now,
        minRunMoves: RESTART_INTERSTITIAL_MIN_RUN_MOVES,
        minRunMs: RESTART_INTERSTITIAL_MIN_RUN_MS,
        cooldownMs: RESTART_INTERSTITIAL_COOLDOWN_MS,
      })
    ) {
      void preloadRestartInterstitial(now);
      return;
    }
    if (!interstitialReady || !platform?.canUseInterstitialAds()) {
      void preloadRestartInterstitial(now);
      return;
    }
    restartInterstitialInFlight = true;
    interstitialReady = false;
    markSceneDirty();
    try {
      const status = await platform.showInterstitial();
      if (status === "dismissed") {
        lastInterstitialShownAt = performance.now();
        restartInterstitialShownForRun = true;
      }
    } catch (error) {
      platform?.reportError(error);
    } finally {
      restartInterstitialInFlight = false;
      void preloadRestartInterstitial(performance.now());
      markSceneDirty();
    }
  }

  async function handleRestartAction(): Promise<void> {
    if (previewModeActive || boardReset || restartInterstitialInFlight) {
      return;
    }
    await maybeShowRestartInterstitial();
    if (previewModeActive || boardReset) {
      return;
    }
    const now = performance.now();
    startNewRunWithBoardReset(now, getVisibleBoardSnapshot(), getCurrentBoardAshedAmount(now));
  }

  async function finalizeCompletedRunSync(runId: number): Promise<void> {
    const finalScore = completedRunScore;
    if (finalScore === null) {
      gameOverSyncPending = false;
      markSceneDirty();
      return;
    }

    try {
      const syncedSnapshot = (await platform?.completeRun()) ?? getPlatformSnapshot();
      if (runId !== activeRunId) {
        return;
      }
      const nextFrozenHud = freezeHudSnapshot(syncedSnapshot);
      frozenHud = nextFrozenHud;
      gameOverResult = classifyGameOverResult({
        previous: completedRunHud,
        current: nextFrozenHud,
        finalScore,
      });
      gameOverSubtitle = buildGameOverSubtitle({
        reason: gameState.gameOverReason,
        result: gameOverResult,
        finalScore,
        previousRank: completedRunHud.rank,
        nextRank: nextFrozenHud.rank,
      });
    } catch (error) {
      if (runId !== activeRunId) {
        return;
      }
      console.warn("[starfold] Failed to sync completed run", error);
      frozenHud = freezeHudSnapshot(getPlatformSnapshot());
      gameOverResult = "normal";
      gameOverSubtitle = defaultGameOverSubtitle(gameState.gameOverReason);
    } finally {
      if (runId === activeRunId) {
        gameOverSyncPending = false;
        markSceneDirty();
      }
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
        markSceneDirty();
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
      markSceneDirty();
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
    markSceneDirty();
  }

  function beginDragSnapback(now: number): void {
    if (!dragPreview || Math.abs(dragPreview.offsetPx) < 1) {
      dragPreview = null;
      markSceneDirty();
      return;
    }
    dragPreview = {
      ...dragPreview,
      settling: true,
      settleStartAt: now,
      settleFromPx: dragPreview.offsetPx,
    };
    markSceneDirty();
  }

  function handleStageStart(stage: TurnStage, startAt: number): void {
    if (stage.kind !== "clear") {
      return;
    }
    const matchKind = getDominantMatchKind(stage);
    const hasMajorMatchCue = stage.majorMatchSize >= 4;
    if (!previewModeActive && matchKind && !hasMajorMatchCue) {
      audio.playMatch(matchKind);
    }
    if (!previewModeActive && stage.cleansed.length > 0) {
      audio.playAshBreak();
    } else if (!previewModeActive && stage.damaged.length > 0) {
      audio.playAshHit();
    }
    if (!previewModeActive && hasMajorMatchCue) {
      audio.playMajorMatch(stage.majorMatchSize);
      majorMatchFlash = createMajorMatchFlash(stage.majorMatchSize, startAt);
    }
    if (!previewModeActive && stage.combo > 1) {
      const matchKind = getDominantMatchKind(stage);
      if (!matchKind) {
        throw new Error("Combo label requires a dominant match kind");
      }
      comboLabel = {
        title: formatComboChain(stage.combo),
        detail: `+${formatScore(stage.comboPreviewBonus)}`,
        opacity: 1,
        depth: stage.combo,
        kind: matchKind,
        matchCount: stage.matched.length,
        decayMs: COMBO_LABEL_BASE_DECAY_MS + Math.max(0, stage.combo - 2) * COMBO_LABEL_EXTRA_DECAY_MS,
        burstElapsedMs: 0,
        burstMs: COMBO_LABEL_BURST_MS,
      };
    }
  }

  function update(now: number): void {
    const delta = now - lastFrame;
    syncPreviewMode(now);
    advanceStartupIntro(now);
    advanceStages(now);
    advanceBoardReset(now);
    advancePreviewLoop(now);

    if (majorMatchFlash && now >= majorMatchFlash.startAt + majorMatchFlash.durationMs) {
      majorMatchFlash = null;
    }

    if (screen === "playing" && gameState.gameOver && !boardReset && !activeStage && queuedStages.length === 0) {
      screen = "losing";
      lossTransition = { startAt: now, audioPlayed: false, revealStartAt: null };
      gameOverShownAt = null;
      comboLabel = null;
      hoverCell = null;
      pressFeedback = null;
      drag = null;
      dragPreview = null;
      if (!completedRun) {
        completedRun = true;
        completedRunHud = { ...frozenHud };
        completedRunScore = gameState.score;
        gameOverResult = "normal";
        gameOverSubtitle = defaultGameOverSubtitle(gameState.gameOverReason);
        gameOverSyncPending = shouldSyncCompletedRunNow();
        if (gameOverSyncPending) {
          void finalizeCompletedRunSync(activeRunId);
        }
      }
    }
    if (screen === "losing" && lossTransition) {
      const elapsed = now - lossTransition.startAt;
      if (!lossTransition.audioPlayed && elapsed >= GAME_OVER_DELAY_MS) {
        lossTransition.audioPlayed = true;
        lossTransition.revealStartAt = now;
        if (!previewModeActive) {
          audio.playGameOver();
        }
      }
      if (
        lossTransition.revealStartAt !== null &&
        now - lossTransition.revealStartAt >= Math.max(GAME_OVER_BAR_ANIM_MS, GAME_OVER_TILE_GRAY_MS)
      ) {
        screen = "gameover";
        lossTransition = null;
        gameOverShownAt = now;
        void preloadRestartInterstitial(now);
      }
    }

    if (comboLabel) {
      comboLabel = {
        ...comboLabel,
        burstElapsedMs: Math.min(comboLabel.burstMs, comboLabel.burstElapsedMs + delta),
      };
    }

    if (comboLabel && !boardReset && !activeStage && queuedStages.length === 0) {
      comboLabel = {
        ...comboLabel,
        opacity: Math.max(0, comboLabel.opacity - delta / comboLabel.decayMs),
      };
      if (comboLabel.opacity <= 0) comboLabel = null;
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

  function advanceStartupIntro(now: number): void {
    if (startupIntro.completed || !startupIntro.assetsReady) {
      return;
    }
    if (startupIntro.heroRevealStartAt === null) {
      startupIntro.heroRevealStartAt = now;
      return;
    }
    if (startupIntro.boardRevealStartAt === null && now - startupIntro.heroRevealStartAt >= INTRO_HERO_REVEAL_MS) {
      startupIntro.boardRevealStartAt = now;
      return;
    }
    if (startupIntro.boardRevealStartAt === null) {
      return;
    }
    const boardElapsed = now - startupIntro.boardRevealStartAt;
    const lastTileStart = Math.max(0, startupIntro.tileOrder.length - 1) * INTRO_TILE_STAGGER_MS;
    const totalRevealMs = Math.max(INTRO_BOARD_REVEAL_MS, INTRO_HUD_REVEAL_MS, INTRO_HERO_EXIT_MS, lastTileStart + INTRO_TILE_REVEAL_MS);
    if (boardElapsed >= totalRevealMs) {
      startupIntro.completed = true;
    }
  }

  function advanceStages(now: number): void {
    let stageCursor = activeStage?.startTime ?? now;

    while (true) {
      if (!activeStage && queuedStages.length > 0) {
        const stage = queuedStages.shift()!;
        handleStageStart(stage, stageCursor);
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

  function schedulePreviewStart(now: number): void {
    previewLoop.nextMoveAt = now + PREVIEW_START_DELAY_MS;
    previewLoop.restartAt = null;
  }

  function syncPreviewMode(now: number): void {
    const nextPreviewMode = isPreviewMode(getPlatformSnapshot());
    if (nextPreviewMode === previewModeActive) {
      return;
    }

    previewModeActive = nextPreviewMode;
    if (previewModeActive) {
      startNewRun();
      if (startupIntro.assetsReady) {
        skipStartupIntroForPreview(startupIntro);
        schedulePreviewStart(now);
      }
      return;
    }

    startNewRunWithBoardReset(now, getVisibleBoardSnapshot(), getCurrentBoardAshedAmount(now), "preview-exit");
    previewLoop.nextMoveAt = null;
    previewLoop.restartAt = null;
  }

  function advanceBoardReset(now: number): void {
    if (!boardReset) {
      return;
    }
    if (now - boardReset.startAt >= getBoardResetTotalMs(boardReset.tileOrder.length)) {
      boardReset = null;
      lastInteractionAt = now;
    }
  }

  function advancePreviewLoop(now: number): void {
    if (!previewModeActive || !startupIntro.completed || boardReset) {
      return;
    }

    if (screen === "gameover") {
      if (previewLoop.restartAt === null) {
        previewLoop.restartAt = now + PREVIEW_RESTART_DELAY_MS;
      }
      if (now >= previewLoop.restartAt) {
        startNewRun();
      }
      return;
    }

    if (screen !== "playing" || gameState.gameOver || activeStage || queuedStages.length > 0 || drag || dragPreview) {
      return;
    }

    if (previewLoop.nextMoveAt === null) {
      previewLoop.nextMoveAt = now + PREVIEW_MOVE_DELAY_MS;
      return;
    }

    if (now < previewLoop.nextMoveAt) {
      return;
    }

    const move = pickPreviewMove(gameState);
    if (!move) {
      throw new Error("Preview autoplay could not find a playable move");
    }
    previewLoop.nextMoveAt = null;
    queueMove(move);
  }

  function getVisibleBoardSnapshot(): Board {
    if (activeStage?.stage.kind === "shift") {
      return cloneBoard(activeStage.stage.before);
    }
    if (activeStage?.stage.kind === "clear") {
      return cloneBoard(activeStage.stage.board);
    }
    if (activeStage?.stage.kind === "collapse") {
      return cloneBoard(activeStage.stage.after);
    }
    if (activeStage?.stage.kind === "ash") {
      return cloneBoard(activeStage.stage.after);
    }
    return cloneBoard(gameState.board);
  }

  function getCurrentBoardAshedAmount(now: number): number {
    if (screen === "gameover") {
      return 1;
    }
    if (screen === "losing" && lossTransition) {
      return getGameOverTransition(now, screen, lossTransition).tileFadeProgress;
    }
    return 0;
  }

  function render(now: number): void {
    renderFrameId = null;
    const frameDelta = now - lastFrame;
    sceneDirty = false;
    update(now);

    if (pressFeedback && pressFeedback.until <= now) {
      pressFeedback = null;
    }

    const snapshot = getPlatformSnapshot();
    const startupState = getStartupIntroState(now, renderer, startupIntro);
    const gameOverTransition = getGameOverTransition(now, screen, lossTransition);
    const boardOpacity = getBoardOpacity(now, screen, lossTransition);
    const showGameOverOverlay = screen === "gameover" || gameOverTransition.overlayProgress > 0;
    const boardResetState = getBoardResetState(now, boardReset);
    const interaction: TileInteractionState | null =
      screen === "playing" && !boardReset && !gameState.gameOver && !activeStage && queuedStages.length === 0 && startupIntro.completed
        ? {
            hovered: drag ? null : hoverCell,
            pressed: drag ? { row: drag.row, col: drag.col } : pressFeedback ? { row: pressFeedback.row, col: pressFeedback.col } : null,
          }
        : null;
    const idleHint =
      startupIntro.completed && !boardReset
        ? getIdleHint(
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
          )
        : null;
    const shouldKeepRendering = shouldContinueRenderLoop({
      now,
      previewModeActive,
      startupIntro,
      activeStage,
      queuedStageCount: queuedStages.length,
      boardReset,
      screen,
      lossTransition,
      comboLabel,
      dragPreview,
      drag,
      gameOverShownAt,
      gameState,
      hoverCell,
      pressFeedback,
      lastInteractionAt,
    });
    const nextQualityTier = updateQualityTier({
      current: qualityTier,
      base: baseQualityTier,
      deltaMs: frameDelta,
      animating: shouldKeepRendering,
      samples: qualitySamples,
      stableAnimationFrames,
    });
    if (nextQualityTier.tier !== qualityTier) {
      qualityTier = nextQualityTier.tier;
      sceneDirty = true;
    }
    qualitySamples = nextQualityTier.samples;
    stableAnimationFrames = nextQualityTier.stableFrames;
    syncAudioRuntimeState();
    const nextWakeAt = shouldKeepRendering
      ? null
      : getNextRenderWakeAt({
          now,
          previewModeActive,
          startupIntro,
          activeStage,
          queuedStageCount: queuedStages.length,
          boardReset,
          screen,
          drag,
          dragPreview,
          gameState,
          previewLoop,
          gameOverShownAt,
          hoverCell,
          pressFeedback,
          lastInteractionAt,
        });

    window.__starfoldDebug = {
      screen,
      score: gameState.score,
      ashCount: gameState.ashCount,
      bestScore: frozenHud.bestScore,
      edgeFlash: getRenderEdgeFlash(now, majorMatchFlash),
      comboLabel: comboLabel
        ? {
            title: comboLabel.title,
            detail: comboLabel.detail,
            depth: comboLabel.depth,
            kind: comboLabel.kind,
            matchCount: comboLabel.matchCount,
          }
        : null,
      gameOverReason: gameState.gameOverReason,
      gameOverResult,
      startup: startupState,
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
      activeStage: activeStage ? summarizeActiveStage(activeStage.stage) : null,
      animating: shouldKeepRendering,
      phase: snapshot.phase,
      previewMode: previewModeActive,
      board: boardStateKinds(gameState.board),
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
      render: {
        loopActive: shouldKeepRendering || renderFrameId !== null,
        qualityTier,
      },
      sync: {
        pendingCompletedRun: gameOverSyncPending || snapshot.pendingMeta,
      },
    };

    renderer.render({
      board: gameState.board,
      score: gameState.score,
      ashCount: gameState.ashCount,
      bestScore: frozenHud.bestScore,
      rank: frozenHud.rank,
      boardOpacity,
      boardReset: boardResetState,
      showHud: !previewModeActive && boardReset?.source !== "preview-exit",
      intro: startupState,
      gameOverReason: gameState.gameOverReason,
      gameOverResult,
      gameOverSubtitle,
      gameOverOverlayProgress: previewModeActive ? 0 : screen === "gameover" ? 1 : gameOverTransition.overlayProgress,
      gameOverTileFadeProgress: screen === "gameover" ? 1 : gameOverTransition.tileFadeProgress,
      gameOverCtaElapsedMs: screen === "gameover" && gameOverShownAt !== null ? now - gameOverShownAt : 0,
      overlayInteractive: !previewModeActive && screen === "gameover" && !restartInterstitialInFlight,
      hudLoginEnabled: !snapshot.isLoggedIn && platform?.canPromptLogin() === true,
      idleHint: previewModeActive ? null : idleHint,
      dragPreview: boardReset ? null : dragPreview ? { move: dragPreview.move, offsetPx: dragPreview.offsetPx, settling: dragPreview.settling } : null,
      stage: boardReset
        ? null
        : activeStage
        ? {
            stage: activeStage.stage,
            progress: Math.min(1, (now - activeStage.startTime) / activeStage.duration),
          }
        : null,
      overlay: previewModeActive ? null : showGameOverOverlay ? "gameover" : null,
      edgeFlash: previewModeActive ? null : getRenderEdgeFlash(now, majorMatchFlash),
      comboLabel: previewModeActive ? null : comboLabel,
      platform: snapshot,
      interaction: previewModeActive ? null : interaction,
      qualityTier,
    });

    if (shouldKeepRendering || sceneDirty) {
      requestRender();
      return;
    }

    renderLoopActive = false;
    scheduleRenderWakeAt(nextWakeAt);
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (previewModeActive || boardReset) {
      return;
    }
    audio.notifyUserGesture();
    const overlayAction = renderer.hitTestOverlayAction(event.clientX, event.clientY);
    if (overlayAction) {
      lastInteractionAt = performance.now();
      drag = null;
      dragPreview = null;
      hoverCell = null;
      markSceneDirty();
      return;
    }
    const hudAction = renderer.hitTestHudAction(event.clientX, event.clientY);
    if (hudAction) {
      lastInteractionAt = performance.now();
      void handleHudLogin();
      markSceneDirty();
      return;
    }
    canvas.setPointerCapture(event.pointerId);

    if (screen === "gameover") {
      return;
    }
    if (!startupIntro.completed) {
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
    markSceneDirty();
  });

  canvas.addEventListener("pointerup", (event) => {
    if (previewModeActive || boardReset) {
      return;
    }
    const overlayAction = renderer.hitTestOverlayAction(event.clientX, event.clientY);
    if (overlayAction) {
      lastInteractionAt = performance.now();
      if (overlayAction === "restart") {
        void handleRestartAction();
      }
      drag = null;
      dragPreview = null;
      hoverCell = null;
      markSceneDirty();
      return;
    }
    if (renderer.hitTestHudAction(event.clientX, event.clientY)) {
      if (
        shouldSnapbackDragOnHudPointerUp({
          hasDrag: drag !== null,
          dragPreviewOffsetPx: dragPreview?.offsetPx ?? null,
        })
      ) {
        beginDragSnapback(performance.now());
      } else {
        dragPreview = null;
      }
      drag = null;
      hoverCell = null;
      markSceneDirty();
      return;
    }

    if (screen === "gameover") {
      markSceneDirty();
      return;
    }
    if (!startupIntro.completed) {
      drag = null;
      dragPreview = null;
      hoverCell = null;
      markSceneDirty();
      return;
    }

    if (gameState.gameOver) {
      drag = null;
      dragPreview = null;
      hoverCell = null;
      markSceneDirty();
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
    markSceneDirty();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (previewModeActive || boardReset) {
      return;
    }
    if (screen !== "playing" || gameState.gameOver || !startupIntro.completed) {
      return;
    }
    lastInteractionAt = performance.now();
    if (!drag || drag.pointerId !== event.pointerId) {
      hoverCell = locateCell(renderer, event.clientX, event.clientY);
      markSceneDirty();
      return;
    }

    hoverCell = null;
    updateDragPreview(event.clientX, event.clientY);
  });

  canvas.addEventListener("pointerleave", () => {
    if (previewModeActive || boardReset) {
      return;
    }
    lastInteractionAt = performance.now();
    hoverCell = null;
    markSceneDirty();
  });

  canvas.addEventListener("pointercancel", () => {
    if (previewModeActive || boardReset) {
      return;
    }
    lastInteractionAt = performance.now();
    beginDragSnapback(performance.now());
    drag = null;
    hoverCell = null;
    markSceneDirty();
  });

  window.addEventListener("resize", () => {
    renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    markSceneDirty();
  });

  document.addEventListener("keydown", (event) => {
    if (previewModeActive || boardReset) {
      return;
    }
    audio.notifyUserGesture();
    if (event.key.toLowerCase() === "r" && screen === "gameover") {
      void handleRestartAction();
      return;
    }

    if (screen === "gameover" && (event.key === "Enter" || event.key === " ")) {
      void handleRestartAction();
      return;
    }
    markSceneDirty();
  });

  requestRender();
  await readyPromise;
})().catch((error) => {
  platform?.reportError(error);
  throw error;
});

function collectAchievements(
  result: TurnResult,
  unlocked: Set<StandardAchievementKey>,
): { unlocks: StandardAchievementKey[]; progressDeltas: Partial<Record<IncrementalAchievementKey, number>> } {
  const clearStages = result.stages.filter((stage): stage is Extract<TurnStage, { kind: "clear" }> => stage.kind === "clear");
  const cleansedCount = clearStages.reduce((total, stage) => total + stage.cleansed.length, 0);
  const restoredCount = clearStages.reduce((total, stage) => total + stage.restored.length, 0);
  const matchGroupCount = clearStages.reduce((total, stage) => total + stage.groupCount, 0);
  const wipeCount = clearStages.reduce((total, stage) => total + (stage.pulseKind === "wipe" ? 1 : 0), 0);
  const newlyUnlocked: StandardAchievementKey[] = [];

  if (result.scoreGained > 0) {
    maybeUnlock("first_constellation", unlocked, newlyUnlocked);
  }
  if (cleansedCount > 0) {
    maybeUnlock("ash_purified", unlocked, newlyUnlocked);
  }
  if (result.maxCombo >= 3) {
    maybeUnlock("triple_chain", unlocked, newlyUnlocked);
  }
  if (result.state.score >= 5000) {
    maybeUnlock("shrine_sentinel", unlocked, newlyUnlocked);
  }
  if (restoredCount > 0) {
    maybeUnlock("cinder_reclaimed", unlocked, newlyUnlocked);
  }
  if (clearStages.some((stage) => stage.pulseKind === "shockwave")) {
    maybeUnlock("shockwave_rite", unlocked, newlyUnlocked);
  }
  if (wipeCount > 0) {
    maybeUnlock("sanctum_reset", unlocked, newlyUnlocked);
  }
  if (result.state.score >= 100000) {
    maybeUnlock("starfold_legend", unlocked, newlyUnlocked);
  }

  return {
    unlocks: newlyUnlocked,
    progressDeltas: {
      ...(cleansedCount > 0 ? { ashbreaker_hundred: cleansedCount } : {}),
      ...(matchGroupCount > 0 ? { constellation_mason: matchGroupCount } : {}),
      ...(wipeCount > 0 ? { three_hundred_guardians: wipeCount } : {}),
    },
  };
}

function maybeUnlock(
  key: StandardAchievementKey,
  unlocked: Set<StandardAchievementKey>,
  target: StandardAchievementKey[],
): void {
  if (unlocked.has(key)) {
    return;
  }
  unlocked.add(key);
  target.push(key);
}

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

function isPreviewMode(snapshot: PlatformSnapshot): boolean {
  return snapshot.phase === "preview";
}

function skipStartupIntroForPreview(intro: StartupIntroSequence): void {
  intro.heroRevealStartAt = null;
  intro.boardRevealStartAt = null;
  intro.completed = true;
}

function pickPreviewMove(state: ReturnType<typeof createInitialState>): Move | null {
  const moves = getPlayableMoves(state.board);
  if (moves.length === 0) {
    return null;
  }

  let bestMove = moves[0]!;
  let bestScoreGained = Number.NEGATIVE_INFINITY;
  let bestComboDepth = Number.NEGATIVE_INFINITY;
  let bestMajorMatch = Number.NEGATIVE_INFINITY;
  let bestAshCount = Number.POSITIVE_INFINITY;

  for (const move of moves) {
    const result = applyMove(state, move);
    let majorMatchSize = 0;
    for (const stage of result.stages) {
      if (stage.kind === "clear") {
        majorMatchSize = Math.max(majorMatchSize, stage.majorMatchSize);
      }
    }

    const isBetter =
      result.scoreGained > bestScoreGained ||
      (result.scoreGained === bestScoreGained && result.maxCombo > bestComboDepth) ||
      (result.scoreGained === bestScoreGained &&
        result.maxCombo === bestComboDepth &&
        majorMatchSize > bestMajorMatch) ||
      (result.scoreGained === bestScoreGained &&
        result.maxCombo === bestComboDepth &&
        majorMatchSize === bestMajorMatch &&
        result.state.ashCount < bestAshCount);

    if (!isBetter) {
      continue;
    }

    bestMove = move;
    bestScoreGained = result.scoreGained;
    bestComboDepth = result.maxCombo;
    bestMajorMatch = majorMatchSize;
    bestAshCount = result.state.ashCount;
  }

  return bestMove;
}

function getStartupIntroState(now: number, renderer: CanvasRenderer, intro: StartupIntroSequence): StartupIntroState {
  const layout = renderer.getLayout();
  const hiddenHudOffsetX = layout.portrait ? 0 : -Math.max(36, Math.round(layout.hudWidth * 0.34));
  const hiddenHudOffsetY = layout.portrait ? -Math.max(34, Math.round(layout.hudHeight * 0.18)) : 0;

  if (intro.completed) {
    return {
      active: false,
      heroOnly: false,
      backgroundOpacity: 1,
      heroOpacity: 0,
      boardOpacity: 1,
      hudOpacity: 1,
      hudOffsetX: 0,
      hudOffsetY: 0,
      tileReveal: null,
    };
  }

  if (!intro.assetsReady || intro.heroRevealStartAt === null) {
    return {
      active: true,
      heroOnly: true,
      backgroundOpacity: 0,
      heroOpacity: 1,
      boardOpacity: 0,
      hudOpacity: 0,
      hudOffsetX: hiddenHudOffsetX,
      hudOffsetY: hiddenHudOffsetY,
      tileReveal: buildIntroTileReveal(intro.tileOrder, -1),
    };
  }

  if (intro.boardRevealStartAt === null) {
    const heroRevealProgress = clamp((now - intro.heroRevealStartAt) / INTRO_HERO_REVEAL_MS, 0, 1);
    const eased = easeOutCubic(heroRevealProgress);
    return {
      active: true,
      heroOnly: false,
      backgroundOpacity: eased,
      heroOpacity: lerp(0.86, 1, eased),
      boardOpacity: 0,
      hudOpacity: 0,
      hudOffsetX: hiddenHudOffsetX,
      hudOffsetY: hiddenHudOffsetY,
      tileReveal: buildIntroTileReveal(intro.tileOrder, -1),
    };
  }

  const boardElapsed = now - intro.boardRevealStartAt;
  const boardProgress = easeOutCubic(clamp(boardElapsed / INTRO_BOARD_REVEAL_MS, 0, 1));
  const hudProgress = easeOutCubic(clamp(boardElapsed / INTRO_HUD_REVEAL_MS, 0, 1));
  const heroExitProgress = easeOutCubic(clamp(boardElapsed / INTRO_HERO_EXIT_MS, 0, 1));
  return {
    active: true,
    heroOnly: false,
    backgroundOpacity: 1,
    heroOpacity: 1 - heroExitProgress,
    boardOpacity: boardProgress,
    hudOpacity: hudProgress,
    hudOffsetX: lerp(hiddenHudOffsetX, 0, hudProgress),
    hudOffsetY: lerp(hiddenHudOffsetY, 0, hudProgress),
    tileReveal: buildIntroTileReveal(intro.tileOrder, boardElapsed),
  };
}

function buildIntroTileReveal(order: Array<{ row: number; col: number }>, elapsedMs: number): number[][] {
  return buildTileStaggerProgress(order, elapsedMs, INTRO_TILE_STAGGER_MS, INTRO_TILE_REVEAL_MS);
}

function createIntroTileOrder(seed: number | undefined): Array<{ row: number; col: number }> {
  const positions = Array.from({ length: BOARD_ROWS * BOARD_COLS }, (_, index) => ({
    row: Math.floor(index / BOARD_COLS),
    col: index % BOARD_COLS,
  }));
  let rng = (seed ?? 20260422) >>> 0;
  for (let index = positions.length - 1; index > 0; index -= 1) {
    rng = (rng * 1664525 + 1013904223) >>> 0;
    const swapIndex = rng % (index + 1);
    const current = positions[index]!;
    positions[index] = positions[swapIndex]!;
    positions[swapIndex] = current;
  }
  return positions;
}

function getBoardResetState(now: number, boardReset: BoardResetSequence | null): BoardResetTransition | null {
  if (!boardReset) {
    return null;
  }
  const elapsedMs = now - boardReset.startAt;
  const incomingStartMs = getBoardResetIncomingStartMs(boardReset.tileOrder.length);
  return {
    outgoingBoard: boardReset.outgoingBoard,
    outgoingAshedAmount: boardReset.outgoingAshedAmount,
    outgoingProgress: buildTileStaggerProgress(boardReset.tileOrder, elapsedMs, BOARD_RESET_OUT_STAGGER_MS, BOARD_RESET_OUT_TILE_MS),
    incomingBoard: boardReset.incomingBoard,
    incomingReveal: buildTileStaggerProgress(
      boardReset.tileOrder,
      elapsedMs - incomingStartMs,
      BOARD_RESET_IN_STAGGER_MS,
      BOARD_RESET_IN_TILE_MS,
    ),
  };
}

function getBoardResetTotalMs(tileCount: number): number {
  const incomingMs =
    getBoardResetIncomingStartMs(tileCount) + Math.max(0, tileCount - 1) * BOARD_RESET_IN_STAGGER_MS + BOARD_RESET_IN_TILE_MS;
  const outgoingMs = getBoardResetOutgoingTotalMs(tileCount);
  return Math.max(outgoingMs, incomingMs);
}

function getBoardResetOutgoingTotalMs(tileCount: number): number {
  return Math.max(0, tileCount - 1) * BOARD_RESET_OUT_STAGGER_MS + BOARD_RESET_OUT_TILE_MS;
}

function getBoardResetIncomingStartMs(tileCount: number): number {
  return getBoardResetOutgoingTotalMs(tileCount) + BOARD_RESET_EMPTY_HOLD_MS;
}

function buildTileStaggerProgress(
  order: Array<{ row: number; col: number }>,
  elapsedMs: number,
  staggerMs: number,
  durationMs: number,
): number[][] {
  const reveal = Array.from({ length: BOARD_ROWS }, () => Array.from({ length: BOARD_COLS }, () => 0));
  for (let index = 0; index < order.length; index += 1) {
    const position = order[index]!;
    const startMs = index * staggerMs;
    reveal[position.row]![position.col] = clamp((elapsedMs - startMs) / durationMs, 0, 1);
  }
  return reveal;
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

function readSeedFromLocation(): number | undefined {
  const raw = new URL(window.location.href).searchParams.get("seed");
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed >>> 0 : undefined;
}

function createRunState(fixedInitialState: ReturnType<typeof readInitialStateFromLocation>, seed: number | undefined) {
  if (fixedInitialState) {
    return {
      ...fixedInitialState,
      board: cloneBoard(fixedInitialState.board),
    };
  }
  return createInitialState(seed);
}

function readInitialStateFromLocation(seed: number | undefined) {
  const boardSpecsFromLocation = readBoardSpecsFromLocation();
  if (!boardSpecsFromLocation) {
    return null;
  }
  const created = createBoardFromSpecs(boardSpecsFromLocation);
  return {
    board: created.board,
    nextId: created.nextId,
    score: 0,
    moves: 0,
    ashCount: countAsh(created.board),
    rngState: seed ?? 1,
    gameOver: false,
    gameOverReason: null,
  };
}

function readBoardSpecsFromLocation(): Array<Array<{ kind: TileKind; contaminated: boolean }>> | null {
  const raw = new URL(window.location.href).searchParams.get("board");
  if (!raw) {
    return null;
  }
  const validKinds = new Set<TileKind>(["sun", "moon", "wave", "leaf", "ember", "ash5", "ash4", "ash3", "ash2", "ash1"]);
  const rows = raw
    .split(";")
    .map((row) => row.trim())
    .filter((row) => row.length > 0);
  if (rows.length !== BOARD_ROWS) {
    throw new Error(`Expected ${BOARD_ROWS} board rows, received ${rows.length}`);
  }
  return rows.map((row, rowIndex) => {
    const tiles = row
      .split(",")
      .map((tile) => tile.trim())
      .filter((tile) => tile.length > 0);
    if (tiles.length !== BOARD_COLS) {
      throw new Error(`Expected ${BOARD_COLS} tiles in row ${rowIndex}, received ${tiles.length}`);
    }
    return tiles.map((tile, colIndex) => {
      const contaminated = tile.endsWith("*");
      const normalized = contaminated ? tile.slice(0, -1) : tile;
      if (!validKinds.has(normalized as TileKind)) {
        throw new Error(`Invalid tile kind at row ${rowIndex}, col ${colIndex}: ${tile}`);
      }
      if (contaminated && isAshKind(normalized as TileKind)) {
        throw new Error(`Ash tile cannot be contaminated at row ${rowIndex}, col ${colIndex}: ${tile}`);
      }
      return {
        kind: normalized as TileKind,
        contaminated,
      };
    });
  });
}

function summarizeActiveStage(stage: TurnStage): {
  kind: TurnStage["kind"];
  matchedCount: number;
  damagedCount: number;
  cleansedCount: number;
  restoredCount: number;
  combo: number;
  majorMatchSize: number;
  pulseTargetCount: number;
  pulseKind: ClearPulseKind;
} {
  if (stage.kind !== "clear") {
    return {
      kind: stage.kind,
      matchedCount: 0,
      damagedCount: 0,
      cleansedCount: 0,
      restoredCount: 0,
      combo: 0,
      majorMatchSize: 0,
      pulseTargetCount: 0,
      pulseKind: "none",
    };
  }
  return {
    kind: stage.kind,
    matchedCount: stage.matched.length,
    damagedCount: stage.damaged.length,
    cleansedCount: stage.cleansed.length,
    restoredCount: stage.restored.length,
    combo: stage.combo,
    majorMatchSize: stage.majorMatchSize,
    pulseTargetCount: stage.pulseTargets.length,
    pulseKind: stage.pulseKind,
  };
}

function getDragCommitThreshold(renderer: CanvasRenderer): number {
  const layout = renderer.getLayout();
  return (layout.cellSize + layout.gap) * DRAG_COMMIT_RATIO;
}

function getDefaultQualityTier(): RenderQualityTier {
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const mobileUserAgent = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return coarsePointer || mobileUserAgent ? "reduced" : "full";
}

function updateQualityTier(options: {
  current: RenderQualityTier;
  base: RenderQualityTier;
  deltaMs: number;
  animating: boolean;
  samples: number[];
  stableAnimationFrames: number;
}): { tier: RenderQualityTier; samples: number[]; stableFrames: number } {
  if (!options.animating) {
    return {
      tier: options.base,
      samples: [],
      stableFrames: 0,
    };
  }

  const nextSamples = [...options.samples, options.deltaMs].slice(-QUALITY_SAMPLE_WINDOW);
  const averageDelta = nextSamples.reduce((total, sample) => total + sample, 0) / nextSamples.length;
  if (averageDelta > QUALITY_DEMOTE_FRAME_MS) {
    return {
      tier: downgradeQualityTier(options.current),
      samples: [],
      stableFrames: 0,
    };
  }

  const stableFrames =
    averageDelta <= QUALITY_PROMOTE_FRAME_MS ? options.stableAnimationFrames + 1 : 0;
  if (stableFrames >= QUALITY_PROMOTE_STABLE_FRAMES && options.current !== options.base) {
    return {
      tier: upgradeQualityTier(options.current, options.base),
      samples: [],
      stableFrames: 0,
    };
  }

  return {
    tier: options.current,
    samples: nextSamples,
    stableFrames,
  };
}

function downgradeQualityTier(tier: RenderQualityTier): RenderQualityTier {
  if (tier === "full") {
    return "reduced";
  }
  return "minimal";
}

function upgradeQualityTier(tier: RenderQualityTier, base: RenderQualityTier): RenderQualityTier {
  if (tier === "minimal") {
    return base === "full" ? "reduced" : "reduced";
  }
  return base === "minimal" ? "minimal" : "full";
}

function shouldContinueRenderLoop(options: {
  now: number;
  previewModeActive: boolean;
  startupIntro: StartupIntroSequence;
  activeStage: ActiveStage | null;
  queuedStageCount: number;
  boardReset: BoardResetSequence | null;
  screen: Screen;
  lossTransition: LossTransition | null;
  comboLabel: ComboLabel | null;
  dragPreview: DragPreviewState | null;
  drag: DragState | null;
  gameOverShownAt: number | null;
  gameState: ReturnType<typeof createInitialState>;
  hoverCell: { row: number; col: number } | null;
  pressFeedback: PressFeedback | null;
  lastInteractionAt: number;
}): boolean {
  if (!options.startupIntro.completed) {
    return true;
  }
  if (options.activeStage || options.queuedStageCount > 0 || options.boardReset) {
    return true;
  }
  if (options.screen === "losing") {
    return true;
  }
  if (options.comboLabel) {
    return true;
  }
  if (options.dragPreview?.settling) {
    return true;
  }
  if (options.previewModeActive) {
    return false;
  }
  if (isGameOverCtaBounceAnimating(options.now, options.gameOverShownAt, options.screen)) {
    return true;
  }
  return isIdleHintAnimating({
    now: options.now,
    gameState: options.gameState,
    screen: options.screen,
    activeStage: options.activeStage,
    queuedStageCount: options.queuedStageCount,
    drag: options.drag,
    dragPreview: options.dragPreview,
    hoverCell: options.hoverCell,
    pressFeedback: options.pressFeedback,
    lastInteractionAt: options.lastInteractionAt,
  });
}

function getNextRenderWakeAt(options: {
  now: number;
  previewModeActive: boolean;
  startupIntro: StartupIntroSequence;
  activeStage: ActiveStage | null;
  queuedStageCount: number;
  boardReset: BoardResetSequence | null;
  screen: Screen;
  drag: DragState | null;
  dragPreview: DragPreviewState | null;
  gameState: ReturnType<typeof createInitialState>;
  previewLoop: PreviewLoopState;
  gameOverShownAt: number | null;
  hoverCell: { row: number; col: number } | null;
  pressFeedback: PressFeedback | null;
  lastInteractionAt: number;
}): number | null {
  if (!options.startupIntro.completed || options.activeStage || options.queuedStageCount > 0 || options.boardReset) {
    return null;
  }
  if (options.previewModeActive) {
    if (options.screen === "gameover") {
      return options.previewLoop.restartAt;
    }
    return options.previewLoop.nextMoveAt;
  }
  if (options.screen === "gameover" && options.gameOverShownAt !== null && options.now < options.gameOverShownAt + GAME_OVER_CTA_BOUNCE_DELAY_MS) {
    return options.gameOverShownAt + GAME_OVER_CTA_BOUNCE_DELAY_MS;
  }
  return getNextIdleHintWakeAt({
    now: options.now,
    gameState: options.gameState,
    screen: options.screen,
    activeStage: options.activeStage,
    queuedStageCount: options.queuedStageCount,
    drag: options.drag,
    dragPreview: options.dragPreview,
    hoverCell: options.hoverCell,
    pressFeedback: options.pressFeedback,
    lastInteractionAt: options.lastInteractionAt,
  });
}

function isIdleHintAnimating(options: {
  now: number;
  gameState: ReturnType<typeof createInitialState>;
  screen: Screen;
  activeStage: ActiveStage | null;
  queuedStageCount: number;
  drag: DragState | null;
  dragPreview: DragPreviewState | null;
  hoverCell: { row: number; col: number } | null;
  pressFeedback: PressFeedback | null;
  lastInteractionAt: number;
}): boolean {
  if (
    options.screen !== "playing" ||
    options.gameState.gameOver ||
    options.activeStage ||
    options.queuedStageCount > 0 ||
    options.drag ||
    options.dragPreview ||
    options.hoverCell ||
    options.pressFeedback
  ) {
    return false;
  }

  const idleMs = options.now - options.lastInteractionAt;
  if (idleMs < IDLE_HINT_DELAY_MS) {
    return false;
  }

  const cycleMs = IDLE_HINT_ACTIVE_MS + IDLE_HINT_REST_MS;
  const cycleTime = (idleMs - IDLE_HINT_DELAY_MS) % cycleMs;
  return cycleTime <= IDLE_HINT_ACTIVE_MS;
}

function getNextIdleHintWakeAt(options: {
  now: number;
  gameState: ReturnType<typeof createInitialState>;
  screen: Screen;
  activeStage: ActiveStage | null;
  queuedStageCount: number;
  drag: DragState | null;
  dragPreview: DragPreviewState | null;
  hoverCell: { row: number; col: number } | null;
  pressFeedback: PressFeedback | null;
  lastInteractionAt: number;
}): number | null {
  if (
    options.screen !== "playing" ||
    options.gameState.gameOver ||
    options.activeStage ||
    options.queuedStageCount > 0 ||
    options.drag ||
    options.dragPreview ||
    options.hoverCell ||
    options.pressFeedback
  ) {
    return null;
  }

  const firstWakeAt = options.lastInteractionAt + IDLE_HINT_DELAY_MS;
  if (options.now < firstWakeAt) {
    return firstWakeAt;
  }

  const cycleMs = IDLE_HINT_ACTIVE_MS + IDLE_HINT_REST_MS;
  const cycleTime = (options.now - firstWakeAt) % cycleMs;
  if (cycleTime <= IDLE_HINT_ACTIVE_MS) {
    return null;
  }
  return options.now + (cycleMs - cycleTime);
}

function isGameOverCtaBounceAnimating(now: number, gameOverShownAt: number | null, screen: Screen): boolean {
  if (screen !== "gameover" || gameOverShownAt === null) {
    return false;
  }
  const elapsed = now - gameOverShownAt;
  return elapsed >= GAME_OVER_CTA_BOUNCE_DELAY_MS && elapsed <= GAME_OVER_CTA_BOUNCE_DELAY_MS + GAME_OVER_CTA_BOUNCE_WINDOW_MS;
}

function getBoardOpacity(now: number, screen: Screen, lossTransition: LossTransition | null): number {
  return 1;
}

function getGameOverTransition(now: number, screen: Screen, lossTransition: LossTransition | null): {
  overlayProgress: number;
  tileFadeProgress: number;
} {
  if (screen === "gameover") {
    return { overlayProgress: 1, tileFadeProgress: 1 };
  }
  if (screen !== "losing" || !lossTransition || lossTransition.revealStartAt === null) {
    return { overlayProgress: 0, tileFadeProgress: 0 };
  }

  const animationElapsed = Math.max(0, now - lossTransition.revealStartAt);
  return {
    overlayProgress: clamp(animationElapsed / GAME_OVER_BAR_ANIM_MS, 0, 1),
    tileFadeProgress: clamp(animationElapsed / GAME_OVER_TILE_GRAY_MS, 0, 1),
  };
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

function getPlatformSnapshot(): PlatformSnapshot {
  return (
    platform?.getSnapshot() ?? {
      available: false,
      phase: "play" as const,
      authMode: "NONE" as const,
      isLoggedIn: false,
      audioEnabled: true,
      paused: false,
      pendingMeta: false,
      busy: false,
      playerRank: null,
      playerBestScore: null,
      leaderboard: [],
    }
  );
}

function shouldSyncCompletedRunNow(): boolean {
  const snapshot = getPlatformSnapshot();
  return snapshot.phase === "play" && snapshot.isLoggedIn;
}

function formatComboChain(depth: number): string {
  return `CHAIN x${depth}`;
}

function formatScore(score: number): string {
  return new Intl.NumberFormat("en-US").format(score);
}

function createMajorMatchFlash(size: number, startAt: number): MajorMatchFlashState {
  const tier = size >= 6 ? 6 : size === 5 ? 5 : 4;
  const multiplier = tier === 6 ? 4 : tier === 5 ? 2 : 1;
  return {
    tier,
    startAt,
    durationMs: MAJOR_MATCH_FLASH_BASE_MS * multiplier,
    strength: MAJOR_MATCH_FLASH_BASE_STRENGTH * multiplier,
  };
}

function getRenderEdgeFlash(
  now: number,
  flash: MajorMatchFlashState | null,
): { tier: 4 | 5 | 6; progress: number; strength: number } | null {
  if (!flash) {
    return null;
  }
  const progress = clamp((now - flash.startAt) / flash.durationMs, 0, 1);
  if (progress >= 1) {
    return null;
  }
  return {
    tier: flash.tier,
    progress,
    strength: flash.strength,
  };
}
