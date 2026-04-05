/// <reference types="playdrop-sdk-types" />

import { InputController } from "./game/input";
import { formatTime } from "./game/math";
import { GameRenderer } from "./game/render";
import {
  createPolicyInput,
  createRestart,
  createSimulation,
  drainFrameEvents,
  getSnapshot,
  stepSimulation,
  type SimulationSnapshot,
  type SimulationState,
} from "./game/sim";

const BEST_SCORE_KEY = "overvolt.best-score";

interface UiRefs {
  root: HTMLElement;
  sceneRoot: HTMLElement;
  batteryFill: HTMLElement;
  batteryValue: HTMLElement;
  scoreValue: HTMLElement;
  timerValue: HTMLElement;
  threatValue: HTMLElement;
  dashValue: HTMLElement;
  comboChip: HTMLElement;
  startOverlay: HTMLElement;
  gameOverOverlay: HTMLElement;
  playButton: HTMLButtonElement;
  retryButton: HTMLButtonElement;
  finalScoreValue: HTMLElement;
  finalTimeValue: HTMLElement;
  finalBestValue: HTMLElement;
  finalDestroyedValue: HTMLElement;
  finalCollectedValue: HTMLElement;
  finalComboValue: HTMLElement;
  summaryTag: HTMLElement;
  joystickZone: HTMLElement;
  joystickKnob: HTMLElement;
  dashButton: HTMLButtonElement;
  touchControls: HTMLElement;
  rotationOverlay: HTMLElement;
  desktopLegend: HTMLElement;
  touchLegend: HTMLElement;
}

async function main(): Promise<void> {
  const playdrop = window.playdrop;
  if (!playdrop) {
    throw new Error("[overvolt] window.playdrop unavailable");
  }

  const refs = getUiRefs();
  setRotationState(refs);
  window.addEventListener("resize", () => setRotationState(refs));

  const sdk = await playdrop.init();
  sdk.host.setLoadingState({ status: "loading", message: "Overvolt booting", progress: 0.2 });
  await sdk.me.login();
  sdk.host.setLoadingState({ status: "loading", message: "Tabletop arena online", progress: 0.5 });

  const renderer = new GameRenderer(refs.sceneRoot);
  const input = new InputController({
    root: refs.root,
    joystickZone: refs.joystickZone,
    joystickKnob: refs.joystickKnob,
    dashButton: refs.dashButton,
    legendDesktop: refs.desktopLegend,
    legendTouch: refs.touchLegend,
  });

  let bestScore = loadBestScore();
  let state = createSimulation({
    seed: randomSeed(),
    bestScore,
    mode: "attract",
    targetSurface: detectTargetSurface(),
  });
  let snapshot = getSnapshot(state);
  updateUi(refs, snapshot);

  refs.playButton.addEventListener("click", () => {
    state = createSimulation({
      seed: randomSeed(),
      bestScore,
      mode: "running",
      targetSurface: detectTargetSurface(),
    });
    refs.startOverlay.classList.add("hidden");
    refs.gameOverOverlay.classList.add("hidden");
    refs.root.classList.add("running");
  });

  refs.retryButton.addEventListener("click", () => {
    state = createRestart(state, { mode: "running" });
    refs.gameOverOverlay.classList.add("hidden");
    refs.startOverlay.classList.add("hidden");
    refs.root.classList.add("running");
  });

  sdk.host.setLoadingState({ status: "ready" });

  let previousTime = performance.now();
  let accumulator = 0;

  const frame = (time: number): void => {
    const delta = Math.min(0.05, (time - previousTime) / 1000);
    previousTime = time;
    accumulator += delta;
    const fixedDt = 1 / 60;

    while (accumulator >= fixedDt) {
      const controls =
        state.mode === "attract"
          ? createPolicyInput(state, "expert")
          : input.consumeInput();
      stepSimulation(state, controls, fixedDt);
      accumulator -= fixedDt;

      if (state.summary?.newBest && state.bestScore > bestScore) {
        bestScore = state.bestScore;
        window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
      }
    }

    snapshot = getSnapshot(state);
    updateUi(refs, snapshot);
    renderer.render(snapshot, drainFrameEvents(state));
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

function getUiRefs(): UiRefs {
  const requireElement = <T extends HTMLElement>(id: string, ctor: { new (): T }): T => {
    const element = document.getElementById(id);
    if (!(element instanceof ctor)) {
      throw new Error(`[overvolt] #${id} missing`);
    }
    return element;
  };

  return {
    root: requireElement("app", HTMLDivElement),
    sceneRoot: requireElement("scene-root", HTMLDivElement),
    batteryFill: requireElement("battery-fill", HTMLDivElement),
    batteryValue: requireElement("battery-value", HTMLSpanElement),
    scoreValue: requireElement("score-value", HTMLSpanElement),
    timerValue: requireElement("time-value", HTMLSpanElement),
    threatValue: requireElement("threat-value", HTMLSpanElement),
    dashValue: requireElement("dash-value", HTMLSpanElement),
    comboChip: requireElement("combo-chip", HTMLDivElement),
    startOverlay: requireElement("start-overlay", HTMLDivElement),
    gameOverOverlay: requireElement("gameover-overlay", HTMLDivElement),
    playButton: requireElement("play-button", HTMLButtonElement),
    retryButton: requireElement("retry-button", HTMLButtonElement),
    finalScoreValue: requireElement("final-score-value", HTMLElement),
    finalTimeValue: requireElement("final-time-value", HTMLElement),
    finalBestValue: requireElement("final-best-value", HTMLElement),
    finalDestroyedValue: requireElement("final-destroyed-value", HTMLElement),
    finalCollectedValue: requireElement("final-collected-value", HTMLElement),
    finalComboValue: requireElement("final-combo-value", HTMLElement),
    summaryTag: requireElement("summary-tag", HTMLParagraphElement),
    joystickZone: requireElement("joystick-zone", HTMLDivElement),
    joystickKnob: requireElement("joystick-knob", HTMLDivElement),
    dashButton: requireElement("dash-button", HTMLButtonElement),
    touchControls: requireElement("touch-controls", HTMLDivElement),
    rotationOverlay: requireElement("rotation-overlay", HTMLDivElement),
    desktopLegend: requireElement("desktop-legend", HTMLParagraphElement),
    touchLegend: requireElement("touch-legend", HTMLParagraphElement),
  };
}

function updateUi(refs: UiRefs, snapshot: SimulationSnapshot): void {
  refs.batteryFill.style.width = `${snapshot.battery}%`;
  refs.batteryValue.textContent = `${Math.round(snapshot.battery)}%`;
  refs.scoreValue.textContent = snapshot.score.toLocaleString();
  refs.timerValue.textContent = snapshot.hudTime;
  refs.threatValue.textContent = snapshot.hudThreat;
  refs.dashValue.textContent = snapshot.dashCooldown <= 0 ? "Ready" : `${snapshot.dashCooldown.toFixed(1)}s`;
  refs.comboChip.textContent = snapshot.combo > 1 ? `Chain x${snapshot.combo}` : "Line up clean rams";
  refs.comboChip.classList.toggle("active", snapshot.combo > 1);
  refs.root.classList.toggle("low-battery", snapshot.battery < 24);

  if (snapshot.mode === "attract") {
    refs.startOverlay.classList.remove("hidden");
    refs.gameOverOverlay.classList.add("hidden");
    refs.root.classList.remove("running");
    refs.summaryTag.textContent = "Dash through rivals, grab the blue battery drops, and stay charged.";
  }

  if (snapshot.mode === "ended" && snapshot.summary) {
    refs.gameOverOverlay.classList.remove("hidden");
    refs.root.classList.remove("running");
    refs.finalScoreValue.textContent = snapshot.summary.score.toLocaleString();
    refs.finalTimeValue.textContent = formatTime(snapshot.summary.time);
    refs.finalBestValue.textContent = snapshot.bestScore.toLocaleString();
    refs.finalDestroyedValue.textContent = String(snapshot.summary.destroyed);
    refs.finalCollectedValue.textContent = String(snapshot.summary.collected);
    refs.finalComboValue.textContent = `x${snapshot.summary.comboBest}`;
    refs.summaryTag.textContent = snapshot.summary.newBest
      ? "New local best. Stay aggressive and keep the battery chain alive."
      : "Best runs come from dash hits that spill charge right into your lane.";
  }
}

function detectTargetSurface(): "mobileLandscape" | "desktop" {
  const touch = window.matchMedia("(pointer: coarse)").matches;
  return touch ? "mobileLandscape" : "desktop";
}

function setRotationState(refs: UiRefs): void {
  const touch = window.matchMedia("(pointer: coarse)").matches;
  const portrait = window.innerHeight > window.innerWidth;
  refs.rotationOverlay.classList.toggle("visible", touch && portrait);
}

function loadBestScore(): number {
  const raw = window.localStorage.getItem(BEST_SCORE_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function randomSeed(): number {
  return ((Math.random() * 0xffffffff) | 0) >>> 0;
}

void main().catch((error) => {
  console.error("[overvolt] boot failed", error);
  const playdrop = window.playdrop;
  if (playdrop?.host && typeof playdrop.host.setLoadingState === "function") {
    playdrop.host.setLoadingState({
      status: "error",
      message: String(error),
    });
  }
  throw error;
});
