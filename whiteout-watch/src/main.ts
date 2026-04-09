/// <reference types="playdrop-sdk-types" />

import { MAX_CHARGES, SYSTEM_DESCRIPTIONS, SYSTEM_KEYS, SYSTEM_LABELS } from "./game/constants";
import {
  createDebugSnapshot,
  createInitialState,
  createPreviewState,
  getForecastView,
  getSystemView,
  spendCharge,
  stepState,
  wasSystemHitRecently,
  wasSystemPulsedRecently,
} from "./game/state";
import type { DebugSnapshot, GameState, SystemKey } from "./game/types";

declare global {
  interface Window {
    advanceTime?: (ms: number) => Promise<void>;
    __whiteoutWatchDebug?: {
      getState: () => DebugSnapshot;
      startRun: (seed?: number) => void;
      spend: (system: SystemKey) => boolean;
      setSystemValue: (system: SystemKey, value: number) => void;
      setCharges: (charges: number, progress?: number) => void;
    };
  }
}

type HostLoadingState = {
  status: "loading" | "ready" | "error";
  message?: string;
  progress?: number;
};

type HostBridge = {
  setLoadingState: (state: HostLoadingState) => void;
  ready: () => void;
};

type RuntimeHost = {
  setLoadingState?: (state: HostLoadingState) => void;
  ready?: () => void;
};

type Screen = "start" | "playing" | "gameover";

type SystemElements = {
  panel: HTMLElement;
  state: HTMLElement;
  percent: HTMLElement;
  meterFill: HTMLElement;
  copy: HTMLElement;
  button: HTMLButtonElement;
};

type UI = {
  app: HTMLElement;
  timer: HTMLElement;
  pulseCells: HTMLElement[];
  forecastTitle: HTMLElement;
  forecastCountdown: HTMLElement;
  forecastHits: HTMLElement;
  forecastCopy: HTMLElement;
  startOverlay: HTMLElement;
  gameoverOverlay: HTMLElement;
  startButton: HTMLButtonElement;
  retryButton: HTMLButtonElement;
  startBest: HTMLElement;
  gameoverBest: HTMLElement;
  gameoverTime: HTMLElement;
  gameoverTitle: HTMLElement;
  gameoverCopy: HTMLElement;
  systems: Record<SystemKey, SystemElements>;
};

const BEST_TIME_KEY = "whiteout-watch-best-ms";

void (async () => {
  const host = await createHostBridge();

  document.title = "Whiteout Watch";
  injectStyles();
  const ui = createUI();

  host.setLoadingState({
    status: "loading",
    message: "bringing the station online",
    progress: 0.45,
  });

  const previewState = createPreviewState();
  let bestTimeMs = readBestTimeMs();
  let state = createInitialState(readSeedFromLocation());
  let screen: Screen = "start";
  let lastFrame = performance.now();

  function displayState(): GameState {
    return screen === "start" ? previewState : state;
  }

  function startRun(seedOverride?: number): void {
    state = createInitialState(seedOverride ?? readSeedFromLocation());
    screen = "playing";
    render();
  }

  function finishRun(): void {
    screen = "gameover";
    if (state.elapsedMs > bestTimeMs) {
      bestTimeMs = state.elapsedMs;
      localStorage.setItem(BEST_TIME_KEY, String(Math.round(bestTimeMs)));
    }
    render();
  }

  function render(): void {
    const nextState = displayState();
    ui.app.dataset.screen = screen;

    ui.timer.textContent = formatElapsed(nextState.elapsedMs);
    renderPulseStrip(ui.pulseCells, nextState.charges, nextState.chargeProgress, screen === "playing");

    const forecast = getForecastView(nextState);
    ui.forecastTitle.textContent = forecast.title;
    ui.forecastCountdown.textContent = forecast.countdown;
    ui.forecastHits.textContent = forecast.impacts;
    ui.forecastCopy.textContent = forecast.copy;
    ui.forecastHits.classList.toggle("whiteout-forecast-hit--noisy", forecast.clarity === "noisy");

    for (const system of SYSTEM_KEYS) {
      const systemState = getSystemView(nextState, system);
      const elements = ui.systems[system];
      const value = Math.round(nextState.systems[system]);
      const interactive = screen === "playing" && nextState.charges > 0;

      elements.panel.dataset.tone = systemState.tone;
      elements.panel.dataset.hit = String(screen !== "start" && wasSystemHitRecently(nextState, system));
      elements.panel.dataset.pulse = String(screen !== "start" && wasSystemPulsedRecently(nextState, system));
      elements.state.textContent = systemState.label;
      elements.state.className = `whiteout-state whiteout-state--${systemState.tone}`;
      elements.percent.textContent = `${value}%`;
      elements.meterFill.style.width = `${value}%`;
      elements.copy.textContent = systemState.copy;
      elements.button.disabled = !interactive;
      elements.button.innerHTML = `Spend 1 Pulse <span>Restore ${SYSTEM_LABELS[system]}</span>`;
    }

    ui.startOverlay.dataset.active = String(screen === "start");
    ui.gameoverOverlay.dataset.active = String(screen === "gameover");
    ui.startBest.textContent = bestTimeMs > 0 ? `Best ${formatElapsed(bestTimeMs)}` : "No best yet";
    ui.gameoverBest.textContent = bestTimeMs > 0 ? `Best ${formatElapsed(bestTimeMs)}` : "First shift";

    if (screen === "gameover") {
      const collapse = state.collapseSystem ?? "heat";
      ui.gameoverTitle.textContent = `${SYSTEM_LABELS[collapse]} collapsed.`;
      ui.gameoverCopy.textContent = buildFailureCopy(collapse);
      ui.gameoverTime.textContent = `${Math.max(1, Math.round(state.elapsedMs / 1000))}s survived`;
    } else {
      ui.gameoverTitle.textContent = "Station Lost";
      ui.gameoverCopy.textContent = "The whiteout finally got inside the board.";
      ui.gameoverTime.textContent = "0s survived";
    }
  }

  function tick(now: number): void {
    const dt = Math.min(32, now - lastFrame);
    lastFrame = now;

    if (screen === "playing") {
      stepState(state, dt);
      if (state.runState === "lost") {
        finishRun();
      }
    }

    render();
    requestAnimationFrame(tick);
  }

  function handleSpend(system: SystemKey): void {
    if (screen !== "playing") return;
    if (spendCharge(state, system)) {
      render();
    }
  }

  ui.startButton.addEventListener("click", () => {
    startRun();
  });

  ui.retryButton.addEventListener("click", () => {
    startRun();
  });

  for (const system of SYSTEM_KEYS) {
    ui.systems[system].button.addEventListener("click", () => {
      handleSpend(system);
    });
  }

  window.addEventListener("keydown", (event) => {
    if (screen !== "playing") {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startRun();
      }
      return;
    }

    if (event.key === "1") handleSpend("heat");
    if (event.key === "2") handleSpend("power");
    if (event.key === "3") handleSpend("comms");
    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      startRun(readSeedFromLocation());
    }
  });

  window.advanceTime = async (ms: number) => {
    if (screen !== "playing") {
      startRun(readSeedFromLocation());
    }
    let remaining = ms;
    while (remaining > 0 && state.runState === "playing") {
      const step = Math.min(16, remaining);
      stepState(state, step);
      remaining -= step;
    }
    if (state.runState === "lost") {
      finishRun();
    } else {
      render();
    }
  };

  window.__whiteoutWatchDebug = {
    getState: () => createDebugSnapshot(screen === "start" ? previewState : state),
    startRun: (seed?: number) => {
      startRun(seed);
    },
    spend: (system) => {
      if (screen !== "playing") {
        startRun(readSeedFromLocation());
      }
      const changed = spendCharge(state, system);
      render();
      return changed;
    },
    setSystemValue: (system, value) => {
      state.systems[system] = Math.max(0, Math.min(100, value));
      render();
    },
    setCharges: (charges, progress = 0) => {
      state.charges = Math.max(0, Math.min(MAX_CHARGES, Math.round(charges)));
      state.chargeProgress = Math.max(0, Math.min(0.99, progress));
      render();
    },
  };

  render();

  host.setLoadingState({
    status: "loading",
    message: "dashboard live",
    progress: 0.9,
  });
  host.ready();

  requestAnimationFrame(tick);
})().catch((error) => {
  const playdrop = window.playdrop;
  playdrop?.host?.setLoadingState?.({
    status: "error",
    message: String(error),
  });
  throw error;
});

function createUI(): UI {
  const app = requireElement<HTMLElement>("app");
  app.innerHTML = `
    <main class="whiteout-screen" data-screen="start">
      <section class="whiteout-topbar" aria-label="Status">
        <div>
          <p class="whiteout-eyebrow">Shift Timer</p>
          <p class="whiteout-timer" id="timer">01:32</p>
        </div>
        <div>
          <p class="whiteout-eyebrow">Battery Pulses</p>
          <div class="whiteout-pulse-strip" aria-label="Battery Pulses">
            <div class="whiteout-pulse" id="pulse-0"></div>
            <div class="whiteout-pulse" id="pulse-1"></div>
            <div class="whiteout-pulse" id="pulse-2"></div>
          </div>
        </div>
      </section>

      <section class="whiteout-forecast" aria-label="Next Storm">
        <p class="whiteout-eyebrow">Next Storm</p>
        <div class="whiteout-forecast-row">
          <div class="whiteout-forecast-meta">
            <strong id="forecast-title">Static Wall</strong>
            <span class="whiteout-forecast-countdown" id="forecast-countdown">2.7s</span>
          </div>
          <span class="whiteout-forecast-hit" id="forecast-hits">Power -8  Comms -14</span>
        </div>
        <p class="whiteout-status-copy" id="forecast-copy"></p>
      </section>

      <section class="whiteout-systems" aria-label="Station Systems">
        ${systemMarkup("heat", "H")}
        ${systemMarkup("power", "P")}
        ${systemMarkup("comms", "C")}
      </section>

      <div class="whiteout-overlay" id="start-overlay" data-active="true">
        <section class="whiteout-overlay-card">
          <p class="whiteout-overlay-chip">Whiteout Watch</p>
          <h1>Hold the station.</h1>
          <p>Tap a system to spend one pulse. Keep heat, power, and comms alive as the storm gets worse.</p>
          <div class="whiteout-overlay-actions">
            <button class="whiteout-action whiteout-action--primary" id="start-button" type="button">Start Shift</button>
            <button class="whiteout-action whiteout-action--secondary" id="start-best" type="button" disabled>No best yet</button>
          </div>
        </section>
      </div>

      <div class="whiteout-overlay" id="gameover-overlay" data-active="false">
        <section class="whiteout-overlay-card">
          <p class="whiteout-overlay-chip">Station Lost</p>
          <h1 id="gameover-title">Heat collapsed.</h1>
          <p id="gameover-copy">The vents sealed under ice before the next pulse recharged.</p>
          <div class="whiteout-overlay-actions">
            <button class="whiteout-action whiteout-action--primary" id="retry-button" type="button">Retry Shift</button>
            <button class="whiteout-action whiteout-action--secondary" id="gameover-time" type="button" disabled>0s survived</button>
            <button class="whiteout-action whiteout-action--secondary" id="gameover-best" type="button" disabled>First shift</button>
          </div>
        </section>
      </div>
    </main>
  `;

  return {
    app,
    timer: requireElement("timer"),
    pulseCells: [
      requireElement("pulse-0"),
      requireElement("pulse-1"),
      requireElement("pulse-2"),
    ],
    forecastTitle: requireElement("forecast-title"),
    forecastCountdown: requireElement("forecast-countdown"),
    forecastHits: requireElement("forecast-hits"),
    forecastCopy: requireElement("forecast-copy"),
    startOverlay: requireElement("start-overlay"),
    gameoverOverlay: requireElement("gameover-overlay"),
    startButton: requireElement("start-button"),
    retryButton: requireElement("retry-button"),
    startBest: requireElement("start-best"),
    gameoverBest: requireElement("gameover-best"),
    gameoverTime: requireElement("gameover-time"),
    gameoverTitle: requireElement("gameover-title"),
    gameoverCopy: requireElement("gameover-copy"),
    systems: {
      heat: collectSystemElements("heat"),
      power: collectSystemElements("power"),
      comms: collectSystemElements("comms"),
    },
  };
}

function collectSystemElements(system: SystemKey): SystemElements {
  return {
    panel: requireElement(`${system}-panel`),
    state: requireElement(`${system}-state`),
    percent: requireElement(`${system}-percent`),
    meterFill: requireElement(`${system}-fill`),
    copy: requireElement(`${system}-copy`),
    button: requireElement(`${system}-button`),
  };
}

function systemMarkup(system: SystemKey, glyph: string): string {
  return `
    <article class="whiteout-system" id="${system}-panel" data-tone="safe" data-hit="false" data-pulse="false">
      <div class="whiteout-system-head">
        <div class="whiteout-system-name">
          <div class="whiteout-icon" aria-hidden="true">${glyph}</div>
          <div class="whiteout-name-stack">
            <h2>${SYSTEM_LABELS[system]}</h2>
            <p>${SYSTEM_DESCRIPTIONS[system]}</p>
          </div>
        </div>
        <p class="whiteout-state whiteout-state--safe" id="${system}-state">Stable</p>
      </div>
      <div class="whiteout-meter-stack">
        <div class="whiteout-meter-row">
          <strong class="whiteout-percent" id="${system}-percent">100%</strong>
          <p class="whiteout-status-copy" id="${system}-copy">Holding steady.</p>
        </div>
        <div class="whiteout-meter">
          <span id="${system}-fill" style="width: 100%"></span>
        </div>
      </div>
      <button class="whiteout-system-button" id="${system}-button" type="button">
        Spend 1 Pulse <span>Restore ${SYSTEM_LABELS[system]}</span>
      </button>
    </article>
  `;
}

function renderPulseStrip(cells: HTMLElement[], active: number, progress: number, animate: boolean): void {
  cells.forEach((cell, index) => {
    cell.className = "whiteout-pulse";
    cell.style.setProperty("--charge-fill", "0%");

    if (index < active) {
      cell.classList.add("whiteout-pulse--active");
      return;
    }

    if (index === active && active < MAX_CHARGES) {
      cell.classList.add("whiteout-pulse--charging");
      if (animate) {
        cell.style.setProperty("--charge-fill", `${Math.round(progress * 100)}%`);
      }
    }
  });
}

function buildFailureCopy(system: SystemKey): string {
  if (system === "heat") {
    return "The vents sealed under ice before the next pulse recharged.";
  }
  if (system === "power") {
    return "The pulse banks froze and the dashboard went dark.";
  }
  return "The mast vanished into the static and the storm finished the board.";
}

function readBestTimeMs(): number {
  const raw = localStorage.getItem(BEST_TIME_KEY);
  if (!raw) return 0;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function readSeedFromLocation(): number {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("seed");
  if (!raw) return Date.now();
  const value = Number(raw);
  return Number.isFinite(value) ? value : Date.now();
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function createHostBridge(): Promise<HostBridge> {
  const playdrop = window.playdrop;
  if (!playdrop) {
    return {
      setLoadingState: () => undefined,
      ready: () => undefined,
    };
  }

  const hasHostedChannel = new URLSearchParams(window.location.search).has("playdrop_channel");
  if (!playdrop.init || !hasHostedChannel) {
    const runtimeHost = playdrop.host as RuntimeHost | undefined;
    return {
      setLoadingState: (state) => {
        runtimeHost?.setLoadingState?.(state);
      },
      ready: () => {
        if (typeof runtimeHost?.ready === "function") {
          runtimeHost.ready();
          return;
        }
        runtimeHost?.setLoadingState?.({ status: "ready" });
      },
    };
  }

  const sdk = await playdrop.init();
  const runtimeHost = sdk.host as RuntimeHost;
  return {
    setLoadingState: (state) => {
      runtimeHost.setLoadingState?.(state);
    },
    ready: () => {
      if (typeof runtimeHost.ready === "function") {
        runtimeHost.ready();
        return;
      }
      runtimeHost.setLoadingState?.({ status: "ready" });
    },
  };
}

function injectStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
    :root {
      color-scheme: dark;
      --whiteout-bg-top: #07121b;
      --whiteout-bg-bottom: #11283a;
      --whiteout-panel: rgba(6, 16, 25, 0.78);
      --whiteout-panel-edge: rgba(210, 240, 255, 0.14);
      --whiteout-text-main: #f4fbff;
      --whiteout-text-soft: rgba(229, 244, 251, 0.75);
      --whiteout-safe: #6fe0f1;
      --whiteout-warn: #ffcc7a;
      --whiteout-danger: #ff695d;
      --whiteout-shadow: 0 22px 70px rgba(0, 0, 0, 0.42);
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      height: 100%;
      margin: 0;
    }

    body {
      overflow: hidden;
      font-family:
        "Avenir Next",
        "SF Pro Display",
        "Segoe UI",
        sans-serif;
      background:
        radial-gradient(circle at 20% 15%, rgba(162, 219, 255, 0.16), transparent 28%),
        radial-gradient(circle at 78% 5%, rgba(255, 255, 255, 0.08), transparent 22%),
        linear-gradient(180deg, var(--whiteout-bg-top), var(--whiteout-bg-bottom));
      color: var(--whiteout-text-main);
    }

    body::before,
    body::after {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
    }

    body::before {
      opacity: 0.55;
      background:
        repeating-linear-gradient(
          115deg,
          transparent 0 22px,
          rgba(255, 255, 255, 0.045) 22px 24px,
          transparent 24px 46px
        );
      animation: whiteout-drift 14s linear infinite;
    }

    body::after {
      inset: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 28px;
    }

    @keyframes whiteout-drift {
      from {
        transform: translate3d(0, -12px, 0);
      }
      to {
        transform: translate3d(-36px, 18px, 0);
      }
    }

    #app,
    .whiteout-screen {
      height: 100%;
    }

    .whiteout-screen {
      position: relative;
      display: grid;
      grid-template-rows: auto auto 1fr;
      gap: 16px;
      min-height: 100%;
      padding:
        max(18px, env(safe-area-inset-top))
        max(18px, env(safe-area-inset-right))
        max(18px, env(safe-area-inset-bottom))
        max(18px, env(safe-area-inset-left));
    }

    .whiteout-topbar,
    .whiteout-forecast,
    .whiteout-system,
    .whiteout-overlay-card {
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0)),
        var(--whiteout-panel);
      border: 1px solid var(--whiteout-panel-edge);
      box-shadow: var(--whiteout-shadow);
    }

    .whiteout-topbar {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 16px;
      padding: 14px 16px;
      border-radius: 22px;
    }

    .whiteout-eyebrow {
      margin: 0;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: var(--whiteout-text-soft);
    }

    .whiteout-timer {
      margin: 4px 0 0;
      font-size: clamp(28px, 6vw, 44px);
      font-weight: 700;
      letter-spacing: -0.04em;
    }

    .whiteout-pulse-strip {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .whiteout-pulse {
      position: relative;
      width: 16px;
      height: 38px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: rgba(157, 236, 255, 0.08);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
      overflow: hidden;
    }

    .whiteout-pulse::after {
      content: "";
      position: absolute;
      inset: auto 0 0;
      height: var(--charge-fill, 0%);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0)),
        linear-gradient(180deg, #c8fbff, #52d7ef);
      transition: height 120ms linear;
    }

    .whiteout-pulse--active::after {
      height: 100%;
    }

    .whiteout-pulse--active {
      box-shadow:
        0 0 18px rgba(134, 239, 255, 0.42),
        inset 0 0 0 1px rgba(255, 255, 255, 0.14);
    }

    .whiteout-pulse--charging::after {
      opacity: 0.7;
    }

    .whiteout-forecast {
      display: grid;
      gap: 10px;
      padding: 14px 16px;
      border-radius: 22px;
    }

    .whiteout-forecast-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 16px;
    }

    .whiteout-forecast-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .whiteout-forecast-row strong {
      font-size: 18px;
      letter-spacing: -0.03em;
    }

    .whiteout-forecast-countdown {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 58px;
      padding: 7px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      color: var(--whiteout-text-main);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
    }

    .whiteout-forecast-hit {
      display: inline-flex;
      gap: 10px;
      align-items: center;
      color: var(--whiteout-warn);
      font-size: 13px;
      font-weight: 600;
    }

    .whiteout-forecast-hit::before {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 10px currentColor;
    }

    .whiteout-forecast-hit--noisy {
      color: rgba(244, 251, 255, 0.75);
    }

    .whiteout-systems {
      display: grid;
      gap: 14px;
      align-content: stretch;
    }

    .whiteout-system {
      position: relative;
      display: grid;
      grid-template-rows: auto auto 1fr auto;
      gap: 14px;
      padding: 16px;
      border-radius: 26px;
      overflow: hidden;
      transition:
        transform 120ms ease,
        border-color 120ms ease,
        box-shadow 120ms ease;
    }

    .whiteout-system::after {
      content: "";
      position: absolute;
      inset: auto -20% -25% 35%;
      height: 80px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.14), transparent 60%);
      transform: rotate(-8deg);
    }

    .whiteout-system[data-tone="safe"] {
      border-color: rgba(117, 227, 242, 0.22);
    }

    .whiteout-system[data-tone="warn"] {
      border-color: rgba(255, 204, 122, 0.26);
    }

    .whiteout-system[data-tone="danger"] {
      border-color: rgba(255, 105, 93, 0.28);
    }

    .whiteout-system[data-hit="true"] {
      box-shadow:
        0 0 0 1px rgba(255, 105, 93, 0.22),
        0 0 28px rgba(255, 105, 93, 0.18),
        var(--whiteout-shadow);
    }

    .whiteout-system[data-pulse="true"] {
      transform: translateY(-2px);
      box-shadow:
        0 0 0 1px rgba(111, 224, 241, 0.22),
        0 0 28px rgba(111, 224, 241, 0.2),
        var(--whiteout-shadow);
    }

    .whiteout-system-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
    }

    .whiteout-system-name {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .whiteout-icon {
      width: 38px;
      height: 38px;
      border-radius: 14px;
      display: grid;
      place-items: center;
      font-size: 18px;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .whiteout-name-stack h2,
    .whiteout-name-stack p,
    .whiteout-state,
    .whiteout-status-copy,
    .whiteout-system-button,
    .whiteout-overlay-chip,
    .whiteout-overlay-actions button {
      margin: 0;
    }

    .whiteout-name-stack h2 {
      font-size: 20px;
      letter-spacing: -0.04em;
    }

    .whiteout-name-stack p,
    .whiteout-status-copy {
      color: var(--whiteout-text-soft);
      font-size: 13px;
    }

    .whiteout-state {
      min-width: 88px;
      padding: 8px 10px;
      border-radius: 999px;
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .whiteout-state--safe {
      background: rgba(111, 224, 241, 0.14);
      color: var(--whiteout-safe);
    }

    .whiteout-state--warn {
      background: rgba(255, 204, 122, 0.16);
      color: var(--whiteout-warn);
    }

    .whiteout-state--danger {
      background: rgba(255, 105, 93, 0.18);
      color: var(--whiteout-danger);
    }

    .whiteout-meter-stack {
      display: grid;
      gap: 10px;
    }

    .whiteout-meter-row {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 16px;
    }

    .whiteout-percent {
      font-size: clamp(38px, 8vw, 62px);
      line-height: 0.94;
      letter-spacing: -0.06em;
      font-weight: 700;
    }

    .whiteout-meter {
      position: relative;
      height: 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }

    .whiteout-meter > span {
      position: absolute;
      inset: 0 auto 0 0;
      border-radius: inherit;
      background:
        linear-gradient(90deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0)),
        linear-gradient(90deg, #94f1ff, #49cae7);
      transition: width 140ms ease;
    }

    .whiteout-system[data-tone="warn"] .whiteout-meter > span {
      background:
        linear-gradient(90deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0)),
        linear-gradient(90deg, #ffd699, #efb04b);
    }

    .whiteout-system[data-tone="danger"] .whiteout-meter > span {
      background:
        linear-gradient(90deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0)),
        linear-gradient(90deg, #ff917d, #ff5b4d);
    }

    .whiteout-system-button {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 15px 16px;
      border: 0;
      border-radius: 18px;
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0)),
        linear-gradient(90deg, rgba(150, 244, 255, 0.36), rgba(116, 174, 255, 0.18));
      color: var(--whiteout-text-main);
      font: inherit;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
      transition:
        transform 120ms ease,
        opacity 120ms ease,
        filter 120ms ease;
    }

    .whiteout-system-button:hover:not(:disabled) {
      transform: translateY(-1px);
      filter: brightness(1.05);
    }

    .whiteout-system-button:disabled {
      opacity: 0.42;
      cursor: default;
    }

    .whiteout-system-button span {
      color: rgba(244, 251, 255, 0.78);
      letter-spacing: 0;
      text-transform: none;
      font-weight: 500;
    }

    .whiteout-system[data-tone="danger"] .whiteout-system-button {
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0)),
        linear-gradient(90deg, rgba(255, 123, 109, 0.42), rgba(255, 99, 89, 0.18));
    }

    .whiteout-overlay {
      position: absolute;
      inset: 0;
      display: none;
      place-items: center;
      padding: 20px;
      background: rgba(3, 10, 16, 0.34);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    .whiteout-overlay[data-active="true"] {
      display: grid;
    }

    .whiteout-overlay-card {
      display: grid;
      gap: 16px;
      width: min(100%, 420px);
      padding: 26px;
      border-radius: 28px;
    }

    .whiteout-overlay-chip {
      display: inline-flex;
      align-items: center;
      width: max-content;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--whiteout-text-soft);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .whiteout-overlay h1 {
      margin: 0;
      font-size: clamp(40px, 10vw, 62px);
      line-height: 0.92;
      letter-spacing: -0.07em;
    }

    .whiteout-overlay p {
      margin: 0;
      color: var(--whiteout-text-soft);
      font-size: 16px;
      line-height: 1.4;
    }

    .whiteout-overlay-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .whiteout-action {
      padding: 14px 18px;
      border-radius: 18px;
      border: 0;
      font: inherit;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .whiteout-action--primary {
      background: linear-gradient(90deg, #dff9ff, #88dfff);
      color: #07202f;
      cursor: pointer;
    }

    .whiteout-action--secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--whiteout-text-main);
    }

    @media (min-width: 860px) {
      .whiteout-screen {
        grid-template-rows: auto 1fr;
        grid-template-columns: 1.1fr 0.9fr;
        align-items: start;
        gap: 18px;
      }

      .whiteout-topbar {
        grid-column: 1 / 2;
      }

      .whiteout-forecast {
        grid-column: 2 / 3;
        grid-row: 1 / 2;
        min-height: 100%;
      }

      .whiteout-systems {
        grid-column: 1 / 3;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        grid-template-rows: 1fr;
        min-height: 0;
        height: 100%;
        align-self: stretch;
      }

      .whiteout-overlay {
        padding: 32px;
      }
    }
  `;
  document.head.appendChild(style);
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`missing_element:${id}`);
  }
  return element as T;
}
