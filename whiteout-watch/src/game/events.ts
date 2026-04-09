import {
  EVENT_INTERVAL_BASE_MAX_MS,
  EVENT_INTERVAL_BASE_MIN_MS,
  EVENT_INTERVAL_MIN_FLOOR_MS,
  EVENT_INTERVAL_REDUCTION_PER_STEP_MS,
  STORM_SEVERITY_STEP_MS,
  STORM_SEVERITY_STEP_MULTIPLIER,
  SYSTEM_KEYS,
  SYSTEM_LABELS,
} from "./constants";
import type { StormEvent, SystemKey } from "./types";

const STORM_TEMPLATES: readonly StormEvent[] = [
  {
    key: "ice-squeeze",
    title: "Ice Squeeze",
    description: "Wind pressure is locking the vent shutters and pushing heat down.",
    effects: { heat: 15 },
  },
  {
    key: "rotor-stall",
    title: "Rotor Stall",
    description: "The turbine is icing over and power is sagging under the load.",
    effects: { power: 13 },
  },
  {
    key: "signal-burial",
    title: "Signal Burial",
    description: "Static is swallowing the mast and the next read is getting worse.",
    effects: { comms: 17 },
  },
  {
    key: "crosswind-leak",
    title: "Crosswind Leak",
    description: "A hard side gust is hitting the heater loop and the power lines at once.",
    effects: { heat: 8, power: 8 },
  },
  {
    key: "static-wall",
    title: "Static Wall",
    description: "A charged snow wall is clipping the grid and scraping the mast together.",
    effects: { power: 6, comms: 12 },
  },
  {
    key: "frozen-mast",
    title: "Frozen Mast",
    description: "The mast is icing over while interior frost creeps through the heat rails.",
    effects: { heat: 7, comms: 10 },
  },
] as const;

export function normalizeSeed(seed: number): number {
  const normalized = Math.floor(Math.abs(seed)) >>> 0;
  return normalized === 0 ? 1 : normalized;
}

export function nextRandom(seed: number): [number, number] {
  const nextSeed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [nextSeed / 0xffffffff, nextSeed];
}

export function createStormByKey(key: string): StormEvent {
  const template = STORM_TEMPLATES.find((entry) => entry.key === key);
  if (!template) {
    throw new Error(`unknown_storm:${key}`);
  }
  return cloneStorm(template);
}

export function pickNextStorm(
  rngState: number,
  elapsedMs: number,
): {
  event: StormEvent;
  rngState: number;
  delayMs: number;
} {
  const [eventRoll, nextSeed] = nextRandom(rngState);
  const index = Math.min(STORM_TEMPLATES.length - 1, Math.floor(eventRoll * STORM_TEMPLATES.length));
  const template = STORM_TEMPLATES[index] ?? STORM_TEMPLATES[0];
  if (!template) {
    throw new Error("missing_storm_templates");
  }
  const event = cloneStorm(template);

  const [delayRoll, finalSeed] = nextRandom(nextSeed);
  const window = getEventDelayWindow(elapsedMs);
  const delayMs = Math.round(window.minMs + (window.maxMs - window.minMs) * delayRoll);

  return {
    event,
    rngState: finalSeed,
    delayMs,
  };
}

export function getStormDamageMultiplier(elapsedMs: number): number {
  const steps = Math.floor(elapsedMs / STORM_SEVERITY_STEP_MS);
  return 1 + steps * STORM_SEVERITY_STEP_MULTIPLIER;
}

export function getPrimaryStormSystem(event: StormEvent): SystemKey {
  let bestKey: SystemKey = "heat";
  let bestValue = -1;
  for (const key of SYSTEM_KEYS) {
    const amount = event.effects[key] ?? 0;
    if (amount > bestValue) {
      bestValue = amount;
      bestKey = key;
    }
  }
  return bestKey;
}

export function formatStormTargets(event: StormEvent): string {
  return SYSTEM_KEYS.filter((key) => (event.effects[key] ?? 0) > 0)
    .map((key) => SYSTEM_LABELS[key])
    .join(" + ");
}

export function formatStormImpacts(event: StormEvent): string {
  return SYSTEM_KEYS.filter((key) => (event.effects[key] ?? 0) > 0)
    .map((key) => `${SYSTEM_LABELS[key]} -${event.effects[key] ?? 0}`)
    .join("  ");
}

function cloneStorm(template: StormEvent): StormEvent {
  return {
    key: template.key,
    title: template.title,
    description: template.description,
    effects: { ...template.effects },
  };
}

function getEventDelayWindow(elapsedMs: number): { minMs: number; maxMs: number } {
  const steps = Math.floor(elapsedMs / STORM_SEVERITY_STEP_MS);
  const reduction = steps * EVENT_INTERVAL_REDUCTION_PER_STEP_MS;
  const minMs = Math.max(EVENT_INTERVAL_MIN_FLOOR_MS, EVENT_INTERVAL_BASE_MIN_MS - reduction);
  const maxMs = Math.max(minMs + 500, EVENT_INTERVAL_BASE_MAX_MS - reduction);
  return { minMs, maxMs };
}
