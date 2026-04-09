import {
  BASE_DRIFT_PER_SECOND,
  BASE_RECHARGE_PER_SECOND,
  CRITICAL_THRESHOLD,
  LOW_THRESHOLD,
  MAX_CHARGES,
  MAX_SYSTEM_VALUE,
  PULSE_FLASH_DURATION_MS,
  RESTORE_AMOUNT,
  STORM_FLASH_DURATION_MS,
  SYSTEM_KEYS,
  SYSTEM_LABELS,
} from "./constants";
import {
  createStormByKey,
  formatStormImpacts,
  formatStormTargets,
  getPrimaryStormSystem,
  getStormDamageMultiplier,
  normalizeSeed,
  pickNextStorm,
} from "./events";
import type { DebugSnapshot, ForecastClarity, ForecastView, GameState, SystemKey, SystemView } from "./types";

export function createInitialState(seed: number = Date.now()): GameState {
  const normalizedSeed = normalizeSeed(seed);
  const firstStorm = pickNextStorm(normalizedSeed, 0);
  return {
    rngState: firstStorm.rngState,
    systems: {
      heat: MAX_SYSTEM_VALUE,
      power: MAX_SYSTEM_VALUE,
      comms: MAX_SYSTEM_VALUE,
    },
    charges: MAX_CHARGES,
    chargeProgress: 0,
    elapsedMs: 0,
    timeToStormMs: firstStorm.delayMs,
    nextStorm: firstStorm.event,
    lastStorm: null,
    lastStormAtMs: -STORM_FLASH_DURATION_MS,
    lastPulseSystem: null,
    lastPulseAtMs: -PULSE_FLASH_DURATION_MS,
    runState: "playing",
    collapseSystem: null,
  };
}

export function createPreviewState(): GameState {
  const preview = createInitialState(20260409);
  preview.systems.heat = 18;
  preview.systems.power = 44;
  preview.systems.comms = 71;
  preview.charges = 2;
  preview.chargeProgress = 0.42;
  preview.elapsedMs = 92000;
  preview.timeToStormMs = 2700;
  preview.nextStorm = createStormByKey("static-wall");
  preview.lastPulseSystem = "heat";
  preview.lastPulseAtMs = preview.elapsedMs - 120;
  return preview;
}

export function spendCharge(state: GameState, system: SystemKey): boolean {
  if (state.runState !== "playing" || state.charges < 1) {
    return false;
  }
  state.charges -= 1;
  state.systems[system] = clampValue(state.systems[system] + RESTORE_AMOUNT);
  state.lastPulseSystem = system;
  state.lastPulseAtMs = state.elapsedMs;
  return true;
}

export function stepState(state: GameState, dtMs: number): void {
  if (state.runState !== "playing") {
    return;
  }

  const dtSeconds = dtMs / 1000;
  state.elapsedMs += dtMs;

  const stormMultiplier = getStormDamageMultiplier(state.elapsedMs);
  const heatPenalty = getHeatPenaltyMultiplier(state.systems.heat);

  for (const key of SYSTEM_KEYS) {
    const drift = BASE_DRIFT_PER_SECOND[key] * heatPenalty * stormMultiplier * dtSeconds;
    state.systems[key] = clampValue(state.systems[key] - drift);
  }

  if (state.charges < MAX_CHARGES) {
    state.chargeProgress += BASE_RECHARGE_PER_SECOND * getRechargeMultiplier(state.systems.power) * dtSeconds;
    while (state.chargeProgress >= 1 && state.charges < MAX_CHARGES) {
      state.chargeProgress -= 1;
      state.charges += 1;
    }
    if (state.charges >= MAX_CHARGES) {
      state.charges = MAX_CHARGES;
      state.chargeProgress = 0;
    }
  } else {
    state.chargeProgress = 0;
  }

  state.timeToStormMs -= dtMs;
  while (state.timeToStormMs <= 0 && state.runState === "playing") {
    applyStorm(state);
    if (state.runState !== "playing") {
      break;
    }
    const nextStorm = pickNextStorm(state.rngState, state.elapsedMs);
    state.nextStorm = nextStorm.event;
    state.rngState = nextStorm.rngState;
    state.timeToStormMs += nextStorm.delayMs;
  }

  collapseIfNeeded(state);
}

export function getHeatPenaltyMultiplier(heat: number): number {
  if (heat < CRITICAL_THRESHOLD) return 1.4;
  if (heat < LOW_THRESHOLD) return 1.2;
  return 1;
}

export function getRechargeMultiplier(power: number): number {
  if (power < CRITICAL_THRESHOLD) return 0.5;
  if (power < LOW_THRESHOLD) return 0.75;
  return 1;
}

export function getForecastClarity(comms: number): ForecastClarity {
  if (comms < CRITICAL_THRESHOLD) return "noisy";
  if (comms < LOW_THRESHOLD) return "partial";
  return "full";
}

export function getForecastView(state: GameState): ForecastView {
  const clarity = getForecastClarity(state.systems.comms);
  const countdown = `${Math.max(0, state.timeToStormMs / 1000).toFixed(1)}s`;

  if (clarity === "full") {
    return {
      title: state.nextStorm.title,
      impacts: formatStormImpacts(state.nextStorm),
      copy: state.nextStorm.description,
      countdown,
      clarity,
    };
  }

  if (clarity === "partial") {
    return {
      title: state.nextStorm.title,
      impacts: formatStormTargets(state.nextStorm),
      copy: "Signal drift. Targets hold, but exact damage values are gone.",
      countdown,
      clarity,
    };
  }

  return {
    title: "Signal Snow",
    impacts: `Likely ${SYSTEM_LABELS[getPrimaryStormSystem(state.nextStorm)]}`,
    copy: "Countdown holds. Exact storm read is breaking up in the static.",
    countdown,
    clarity,
  };
}

export function getSystemView(state: GameState, system: SystemKey): SystemView {
  const value = state.systems[system];
  if (system === "heat") {
    if (value < CRITICAL_THRESHOLD) {
      return {
        tone: "danger",
        label: "Critical",
        copy: "Icing is spreading through every line.",
      };
    }
    if (value < LOW_THRESHOLD) {
      return {
        tone: "warn",
        label: "Unstable",
        copy: "Drift is rising across the station.",
      };
    }
    return {
      tone: "safe",
      label: "Stable",
      copy: "Global drift remains contained.",
    };
  }

  if (system === "power") {
    if (value < CRITICAL_THRESHOLD) {
      return {
        tone: "danger",
        label: "Critical",
        copy: "Pulse recharge is crawling.",
      };
    }
    if (value < LOW_THRESHOLD) {
      return {
        tone: "warn",
        label: "Unstable",
        copy: "Recharge is already dragging.",
      };
    }
    return {
      tone: "safe",
      label: "Stable",
      copy: "Pulse banks are charging cleanly.",
    };
  }

  if (value < CRITICAL_THRESHOLD) {
    return {
      tone: "danger",
      label: "Critical",
      copy: "Only a noisy target hint remains.",
    };
  }
  if (value < LOW_THRESHOLD) {
    return {
      tone: "warn",
      label: "Unstable",
      copy: "Targets hold, damage values are lost.",
    };
  }
  return {
    tone: "safe",
    label: "Stable",
    copy: "Forecast is still readable.",
  };
}

export function wasSystemPulsedRecently(state: GameState, system: SystemKey): boolean {
  return state.lastPulseSystem === system && state.elapsedMs - state.lastPulseAtMs < PULSE_FLASH_DURATION_MS;
}

export function wasSystemHitRecently(state: GameState, system: SystemKey): boolean {
  return !!state.lastStorm && (state.lastStorm.effects[system] ?? 0) > 0 && state.elapsedMs - state.lastStormAtMs < STORM_FLASH_DURATION_MS;
}

export function createDebugSnapshot(state: GameState): DebugSnapshot {
  return {
    systems: {
      heat: roundToTenths(state.systems.heat),
      power: roundToTenths(state.systems.power),
      comms: roundToTenths(state.systems.comms),
    },
    charges: state.charges,
    chargeProgress: roundToTenths(state.chargeProgress),
    elapsedMs: Math.round(state.elapsedMs),
    timeToStormMs: Math.round(state.timeToStormMs),
    forecast: getForecastView(state),
    runState: state.runState,
    collapseSystem: state.collapseSystem,
  };
}

function applyStorm(state: GameState): void {
  state.lastStorm = {
    key: state.nextStorm.key,
    title: state.nextStorm.title,
    description: state.nextStorm.description,
    effects: { ...state.nextStorm.effects },
  };
  state.lastStormAtMs = state.elapsedMs;

  const multiplier = getStormDamageMultiplier(state.elapsedMs);
  for (const key of SYSTEM_KEYS) {
    const baseDamage = state.nextStorm.effects[key] ?? 0;
    if (baseDamage <= 0) continue;
    state.systems[key] = clampValue(state.systems[key] - baseDamage * multiplier);
  }

  collapseIfNeeded(state);
}

function collapseIfNeeded(state: GameState): void {
  const lowest = SYSTEM_KEYS.reduce<SystemKey>((lowestKey, candidate) => {
    return state.systems[candidate] < state.systems[lowestKey] ? candidate : lowestKey;
  }, "heat");

  if (state.systems[lowest] <= 0) {
    state.runState = "lost";
    state.collapseSystem = lowest;
  }
}

function clampValue(value: number): number {
  return Math.max(0, Math.min(MAX_SYSTEM_VALUE, value));
}

function roundToTenths(value: number): number {
  return Math.round(value * 10) / 10;
}
