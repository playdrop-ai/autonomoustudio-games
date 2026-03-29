/// <reference types="playdrop-sdk-types" />

import { STORAGE_KEY, type Vec2 } from './game/config';
import { createInitialState, restartRun, startRun, stepGame } from './game/logic';
import { attachInput, resolveMovement } from './game/input';
import { CanvasRenderer } from './render/canvas';
import { createDomUi } from './ui/dom';

type PlaydropSdk = Awaited<ReturnType<NonNullable<typeof window.playdrop>['init']>>;

void bootstrap().catch(error => {
  const playdrop = window.playdrop;
  if (playdrop) {
    playdrop.host.setLoadingState({
      status: 'error',
      message: String(error),
    });
  }
  throw error;
});

async function bootstrap(): Promise<void> {
  const playdrop = window.playdrop;
  if (!playdrop) {
    throw new Error('wickstreet_playdrop_unavailable');
  }

  const sdk = await playdrop.init();
  sdk.host.setLoadingState({
    status: 'loading',
    message: 'lighting wickstreet',
    progress: 0.3,
  });

  const app = document.getElementById('app');
  const canvas = document.getElementById('game-canvas');
  if (!(app instanceof HTMLDivElement) || !(canvas instanceof HTMLCanvasElement)) {
    throw new Error('wickstreet_dom_missing');
  }

  const ui = createDomUi();
  app.append(ui.root);
  const renderer = new CanvasRenderer(canvas);
  const input = attachInput(app);
  const state = createInitialState(loadProgress());

  let isRotatePromptDismissed = false;
  let lastTimestamp = performance.now();

  const resize = () => {
    renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  };
  resize();
  window.addEventListener('resize', resize);

  const start = () => {
    isRotatePromptDismissed = false;
    startRun(state);
  };
  const retry = () => {
    isRotatePromptDismissed = false;
    restartRun(state);
  };

  ui.bindStart(start);
  ui.bindRetry(retry);
  ui.bindRotate(() => {
    isRotatePromptDismissed = true;
  });

  window.addEventListener('keydown', event => {
    if (event.key === ' ' || event.key === 'Enter') {
      if (state.screen === 'start') {
        start();
      } else if (state.screen === 'gameover') {
        retry();
      }
      event.preventDefault();
    }
  });

  sdk.host.setLoadingState({ status: 'ready' });
  exposeAutomationHooks(renderer, state, start, retry);

  const tick = (timestamp: number) => {
    const deltaSeconds = Math.min(0.033, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;

    const rotatePromptVisible = shouldPromptForLandscape() && !isRotatePromptDismissed;
    if (state.screen === 'playing' && !rotatePromptVisible) {
      const playerScreen = renderer.getPlayerScreenPosition(state.player.position);
      const movement = toWorldMovement(resolveMovement(input.state, playerScreen), renderer);
      stepGame(state, movement, deltaSeconds);
      persistProgress(state, sdk);
    }

    ui.update(state, rotatePromptVisible);
    renderer.render(state);
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

function exposeAutomationHooks(
  renderer: CanvasRenderer,
  state: ReturnType<typeof createInitialState>,
  start: () => void,
  retry: () => void,
): void {
  if (!shouldExposeAutomationHooks()) {
    return;
  }
  const automation = {
    start,
    retry,
    snapshot() {
      return {
        screen: state.screen,
        score: state.score,
        strikes: state.strikes,
        bestScore: state.bestScore,
        bestStreak: state.bestStreak,
        timer: state.timer,
        timerMax: state.timerMax,
        activeRequest: state.activeRequest,
        nextRequest: state.nextRequest,
        carrying: state.carrying,
        player: { ...state.player.position },
        guidePath: state.guidePath.map(cell => ({ ...cell })),
        barriers: Array.from(state.barriers),
        metrics: renderer.getMetricsSnapshot(),
      };
    },
  };
  Object.assign(window, { __wickstreetAutomation: automation });
}

function toWorldMovement(vector: Vec2, renderer: CanvasRenderer): Vec2 {
  void renderer;
  return vector;
}

function loadProgress() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { bestScore: 0, bestStreak: 0 };
    }
    const parsed = JSON.parse(raw) as { bestScore?: number; bestStreak?: number };
    return {
      bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
      bestStreak: typeof parsed.bestStreak === 'number' ? parsed.bestStreak : 0,
    };
  } catch {
    return { bestScore: 0, bestStreak: 0 };
  }
}

function persistProgress(state: ReturnType<typeof createInitialState>, sdk: PlaydropSdk): void {
  const payload = JSON.stringify({
    bestScore: state.bestScore,
    bestStreak: state.bestStreak,
  });
  window.localStorage.setItem(STORAGE_KEY, payload);
  void sdk;
}

function shouldPromptForLandscape(): boolean {
  return window.matchMedia('(pointer: coarse)').matches && window.innerHeight > window.innerWidth;
}

function shouldExposeAutomationHooks(): boolean {
  const params = new URLSearchParams(window.location.search);
  return params.get('automation') === '1' || window.location.protocol === 'file:';
}
