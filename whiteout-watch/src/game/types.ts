export type SystemKey = "heat" | "power" | "comms";

export type SystemTone = "safe" | "warn" | "danger";

export type ForecastClarity = "full" | "partial" | "noisy";

export type RunState = "playing" | "lost";

export type StormEvent = {
  key: string;
  title: string;
  description: string;
  effects: Partial<Record<SystemKey, number>>;
};

export type GameState = {
  rngState: number;
  systems: Record<SystemKey, number>;
  charges: number;
  chargeProgress: number;
  elapsedMs: number;
  timeToStormMs: number;
  nextStorm: StormEvent;
  lastStorm: StormEvent | null;
  lastStormAtMs: number;
  lastPulseSystem: SystemKey | null;
  lastPulseAtMs: number;
  runState: RunState;
  collapseSystem: SystemKey | null;
};

export type ForecastView = {
  title: string;
  impacts: string;
  copy: string;
  countdown: string;
  clarity: ForecastClarity;
};

export type SystemView = {
  tone: SystemTone;
  label: string;
  copy: string;
};

export type DebugSnapshot = {
  systems: Record<SystemKey, number>;
  charges: number;
  chargeProgress: number;
  elapsedMs: number;
  timeToStormMs: number;
  forecast: ForecastView;
  runState: RunState;
  collapseSystem: SystemKey | null;
};
