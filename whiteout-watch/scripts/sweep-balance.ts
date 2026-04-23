import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { LOW_THRESHOLD, MAX_CHARGES, SYSTEM_KEYS } from "../src/game/constants";
import { getPrimaryStormSystem } from "../src/game/events";
import { createInitialState, spendCharge, stepState } from "../src/game/state";
import type { GameState, SystemKey } from "../src/game/types";

type PolicyName = "idle" | "casual" | "expert";

type PolicyResult = {
  runs: number;
  medianSeconds: number;
  p25Seconds: number;
  maxSeconds: number;
  minSeconds: number;
};

type Summary = Record<PolicyName, PolicyResult>;

const STEP_MS = 100;
const MAX_SIM_MS = 10 * 60 * 1000;
const SEEDS = 120;

const POLICY_INTERVAL_MS: Record<Exclude<PolicyName, "idle">, number> = {
  casual: 2500,
  expert: 250,
};

const outputDir = join(process.cwd(), "output", "balance");
mkdirSync(outputDir, { recursive: true });

const summary: Summary = {
  idle: summarize(runPolicy("idle")),
  casual: summarize(runPolicy("casual")),
  expert: summarize(runPolicy("expert")),
};

const report = [
  "# Whiteout Watch Balance Sweep",
  "",
  `Runs per policy: ${SEEDS}`,
  `Step: ${STEP_MS}ms`,
  "",
  "Policy definitions:",
  "- idle: never spends a pulse",
  "- casual: reacts slowly and only restores the lowest system once it is clearly in danger",
  "- expert: uses the forecast and preserves thresholds before incoming storm hits",
  "",
  ...(["idle", "casual", "expert"] as const).map((policy) => {
    const result = summary[policy];
    return [
      `## ${policy}`,
      `- median: ${result.medianSeconds.toFixed(1)}s`,
      `- p25: ${result.p25Seconds.toFixed(1)}s`,
      `- min: ${result.minSeconds.toFixed(1)}s`,
      `- max: ${result.maxSeconds.toFixed(1)}s`,
    ].join("\n");
  }),
  "",
].join("\n");

writeFileSync(join(outputDir, "balance-sweep.md"), report, "utf8");
writeFileSync(join(outputDir, "balance-sweep.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");

console.log(report);

function runPolicy(policy: PolicyName): number[] {
  const results: number[] = [];
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const state = createInitialState(seed);
    let nextDecisionAtMs = 0;

    while (state.runState === "playing" && state.elapsedMs < MAX_SIM_MS) {
      if (policy !== "idle" && state.elapsedMs >= nextDecisionAtMs) {
        const system = chooseSystem(policy, state);
        if (system) {
          spendCharge(state, system);
        }
        nextDecisionAtMs = state.elapsedMs + POLICY_INTERVAL_MS[policy];
      }

      stepState(state, STEP_MS);
    }

    results.push(state.elapsedMs / 1000);
  }

  return results;
}

function chooseSystem(policy: Exclude<PolicyName, "idle">, state: GameState): SystemKey | null {
  if (state.charges < 1) {
    return null;
  }

  if (policy === "casual") {
    return chooseCasualSystem(state);
  }

  return chooseExpertSystem(state);
}

function chooseCasualSystem(state: GameState): SystemKey | null {
  if (state.charges < 1) {
    return null;
  }

  const lowest = lowestSystem(state);
  if (state.systems[lowest] < 30) {
    return lowest;
  }
  return null;
}

function chooseExpertSystem(state: GameState): SystemKey | null {
  if (state.charges < 1) {
    return null;
  }

  const incoming = getPrimaryStormSystem(state.nextStorm);
  const predicted = SYSTEM_KEYS.map((system) => {
    const incomingDamage = state.nextStorm.effects[system] ?? 0;
    return {
      system,
      current: state.systems[system],
      afterStorm: state.systems[system] - incomingDamage,
    };
  }).sort((a, b) => a.afterStorm - b.afterStorm);

  if (state.timeToStormMs < 1400) {
    const urgent = predicted.find((item) => item.afterStorm < 28 || item.current < 22);
    if (urgent) {
      return urgent.system;
    }
  }

  const lowest = lowestSystem(state);
  if (state.systems[lowest] < 32) {
    return lowest;
  }
  if (state.timeToStormMs < 2200 && state.systems[incoming] < 55) {
    return incoming;
  }
  if (state.systems.heat < 45) {
    return "heat";
  }
  if (state.systems.power < 38) {
    return "power";
  }
  if (state.charges >= MAX_CHARGES && state.systems[lowest] < 78) {
    return lowest;
  }

  return null;
}

function lowestSystem(state: GameState): SystemKey {
  return SYSTEM_KEYS.reduce<SystemKey>((lowest, candidate) => {
    return state.systems[candidate] < state.systems[lowest] ? candidate : lowest;
  }, "heat");
}

function summarize(values: number[]): PolicyResult {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    runs: values.length,
    medianSeconds: percentile(sorted, 0.5),
    p25Seconds: percentile(sorted, 0.25),
    maxSeconds: sorted[sorted.length - 1] ?? 0,
    minSeconds: sorted[0] ?? 0,
  };
}

function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index] ?? 0;
}
