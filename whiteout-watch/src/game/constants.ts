import type { SystemKey } from "./types";

export const SYSTEM_KEYS = ["heat", "power", "comms"] as const;

export const SYSTEM_LABELS: Record<SystemKey, string> = {
  heat: "Heat",
  power: "Power",
  comms: "Comms",
};

export const SYSTEM_DESCRIPTIONS: Record<SystemKey, string> = {
  heat: "Low heat increases all station drift.",
  power: "Low power slows battery recharge.",
  comms: "Low comms scrambles the next storm forecast.",
};

export const MAX_SYSTEM_VALUE = 100;
export const MAX_CHARGES = 3;
export const RESTORE_AMOUNT = 24;
export const BASE_RECHARGE_PER_SECOND = 0.5;

export const LOW_THRESHOLD = 35;
export const CRITICAL_THRESHOLD = 25;

export const BASE_DRIFT_PER_SECOND: Record<SystemKey, number> = {
  heat: 2.3,
  power: 1.2,
  comms: 0.95,
};

export const EVENT_INTERVAL_BASE_MIN_MS = 5000;
export const EVENT_INTERVAL_BASE_MAX_MS = 7000;
export const EVENT_INTERVAL_MIN_FLOOR_MS = 3600;
export const EVENT_INTERVAL_REDUCTION_PER_STEP_MS = 160;

export const STORM_SEVERITY_STEP_MS = 20000;
export const STORM_SEVERITY_STEP_MULTIPLIER = 0.05;

export const PULSE_FLASH_DURATION_MS = 550;
export const STORM_FLASH_DURATION_MS = 850;
