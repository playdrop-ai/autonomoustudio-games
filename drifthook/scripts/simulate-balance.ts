import {
  createInitialState,
  getCurrentTarget,
  getVisibleEntities,
  startRun,
  updateGame,
  type FishSpecies,
  type GameState,
  type VisibleEntity,
} from "../src/game/logic.ts";

type PolicyName = "idle" | "casual" | "expert";

interface PolicyConfig {
  name: PolicyName;
  releasePadding: number;
  targetTolerance: number;
  targetAccuracy: number;
  clusterSlipChance: number;
  fatigueSlipChance: number;
  focusBudgetMs: number;
  focusJitterMs: number;
  fatigueRampMs: number;
  snagAvoidance: number;
  idleMistakeChance: number;
  bottomPatienceMs: number | null;
  maxSeconds: number;
}

interface RunResult {
  seed: number;
  durationMs: number;
  score: number;
  completedOrders: number;
  knots: number;
}

const POLICIES: Record<PolicyName, PolicyConfig> = {
  idle: {
    name: "idle",
    releasePadding: 0.04,
    targetTolerance: 0.04,
    targetAccuracy: 0.4,
    clusterSlipChance: 0.34,
    fatigueSlipChance: 0.08,
    focusBudgetMs: 30_000,
    focusJitterMs: 30_000,
    fatigueRampMs: 20_000,
    snagAvoidance: 0.06,
    idleMistakeChance: 0.82,
    bottomPatienceMs: 700,
    maxSeconds: 120,
  },
  casual: {
    name: "casual",
    releasePadding: 0.022,
    targetTolerance: 0.022,
    targetAccuracy: 0.92,
    clusterSlipChance: 0.08,
    fatigueSlipChance: 0.03,
    focusBudgetMs: 90_000,
    focusJitterMs: 60_000,
    fatigueRampMs: 50_000,
    snagAvoidance: 0.22,
    idleMistakeChance: 0.12,
    bottomPatienceMs: null,
    maxSeconds: 120,
  },
  expert: {
    name: "expert",
    releasePadding: 0.01,
    targetTolerance: 0.01,
    targetAccuracy: 0.94,
    clusterSlipChance: 0.07,
    fatigueSlipChance: 0.035,
    focusBudgetMs: 300_000,
    focusJitterMs: 120_000,
    fatigueRampMs: 75_000,
    snagAvoidance: 0.08,
    idleMistakeChance: 0,
    bottomPatienceMs: null,
    maxSeconds: 360,
  },
};

function main(): void {
  const samples = Number(process.argv[2] ?? 80);
  const seeds = Array.from({ length: samples }, (_, index) => 1000 + index * 97);
  const summaries = Object.values(POLICIES).map((policy) => {
    const runs = seeds.map((seed) => simulateRun(policy, seed));
    return summarize(policy.name, runs);
  });

  for (const summary of summaries) {
    console.log(
      `${summary.policy}\tmedian=${formatSeconds(summary.medianMs)}\tp25=${formatSeconds(summary.p25Ms)}\tp75=${formatSeconds(summary.p75Ms)}\tavgScore=${Math.round(summary.avgScore)}\tavgOrders=${summary.avgOrders.toFixed(1)}`,
    );
  }
}

function simulateRun(policy: PolicyConfig, seed: number): RunResult {
  let state = startRun(createInitialState(seed), seed);
  let holding = true;
  let autonomousSeed = seed ^ 0x9e3779b9;
  let bottomWaitMs = 0;
  const focusBudgetMs = Math.max(
    1_000,
    policy.focusBudgetMs + Math.floor((randomFloat(seed ^ 0x51ed1a7) - 0.5) * policy.focusJitterMs),
  );
  const frameMs = 50;
  const maxMs = policy.maxSeconds * 1000;

  while (!state.gameOver && state.elapsedMs < maxMs && state.elapsedMs < focusBudgetMs) {
    const visible = getVisibleEntities(state).sort((a, b) => a.depth - b.depth);
    const target = getCurrentTarget(state);
    const decisionRoll = randomFloat(autonomousSeed);
    autonomousSeed = lcg(autonomousSeed);
    const fatigue = clamp((state.elapsedMs - focusBudgetMs) / policy.fatigueRampMs, 0, 1);
    const desired = chooseDesiredEntity(state, visible, target, policy, decisionRoll, fatigue);

    if (state.screen !== "playing") {
      holding = true;
      bottomWaitMs = 0;
      state = startRun(state, autonomousSeed);
      continue;
    }

    if (holding) {
      const releaseDepth = desired ? clamp(desired.depth + policy.releasePadding, 0.12, 0.92) : 0.92;
      if (desired && state.lureDepth >= releaseDepth) {
        holding = false;
        bottomWaitMs = 0;
      } else if (!desired && state.lureDepth >= 0.92) {
        bottomWaitMs += frameMs;
        if (policy.bottomPatienceMs !== null && bottomWaitMs >= policy.bottomPatienceMs) {
          holding = false;
          bottomWaitMs = 0;
        }
      } else {
        bottomWaitMs = 0;
      }
    } else if (state.lureDepth <= 0.03) {
      holding = true;
      bottomWaitMs = 0;
    }

    if (holding && desired && desired.depth < state.lureDepth + policy.targetTolerance) {
      holding = false;
      bottomWaitMs = 0;
    }

    const result = updateGame(state, frameMs, holding);
    state = result.state;

    if (result.events.some((event) => event.kind === "catch" || event.kind === "gameover")) {
      bottomWaitMs = 0;
      if (state.lureDepth <= 0.03) {
        holding = true;
      }
    }

  }

  return {
    seed,
    durationMs: state.elapsedMs,
    score: state.score,
    completedOrders: state.completedOrders,
    knots: state.knots,
  };
}

function chooseDesiredEntity(
  state: GameState,
  visible: VisibleEntity[],
  target: FishSpecies,
  policy: PolicyConfig,
  roll: number,
  fatigue: number,
): VisibleEntity | null {
  if (visible.length === 0) return null;
  const catchableTargets = visible.filter((entity) => isCatchableEntity(entity, visible, state.lureDepth));
  const catchableTarget = catchableTargets.filter((entity) => entity.kind === "fish" && entity.species === target)[0] ?? null;
  const catchableShallowest = catchableTargets[0] ?? null;
  const fatigueScale = 1 + state.completedOrders * 0.12 + fatigue * 4;
  const clusterSlip = catchableTargets.length > 1 && roll < policy.clusterSlipChance * fatigueScale;
  const fatigueSlip = roll > 0.5 && roll < 0.5 + policy.fatigueSlipChance * fatigueScale;
  const wornOut = fatigue >= 0.85 && roll < 0.5 + fatigue * 0.4;

  if (policy.name === "idle") {
    if (clusterSlip || fatigueSlip || wornOut) return catchableShallowest;
    if (roll < policy.idleMistakeChance) return catchableShallowest;
    return catchableTarget ?? catchableShallowest;
  }

  if (policy.name === "casual") {
    if (!catchableTarget) return null;
    if (roll > policy.targetAccuracy) return catchableShallowest;
    if (clusterSlip || fatigueSlip || wornOut) return catchableShallowest;
    if (!isCatchableEntity(catchableTarget, visible, state.lureDepth + policy.snagAvoidance)) return null;
    return catchableTarget;
  }

  if (!catchableTarget) return null;
  if (clusterSlip || fatigueSlip || wornOut) return catchableShallowest;
  if (!isCatchableEntity(catchableTarget, visible, state.lureDepth + policy.snagAvoidance)) return null;
  return catchableTarget;
}

function isCatchableEntity(entity: VisibleEntity, visible: VisibleEntity[], lureDepth: number): boolean {
  if (entity.depth >= lureDepth) return false;
  for (const other of visible) {
    if (other.id === entity.id) continue;
    if (other.depth > entity.depth && other.depth < lureDepth) return false;
  }
  return true;
}

function summarize(policy: PolicyName, runs: RunResult[]): {
  policy: PolicyName;
  medianMs: number;
  p25Ms: number;
  p75Ms: number;
  avgScore: number;
  avgOrders: number;
} {
  const durations = runs.map((run) => run.durationMs).sort((a, b) => a - b);
  const scores = runs.map((run) => run.score);
  const orders = runs.map((run) => run.completedOrders);
  return {
    policy,
    medianMs: percentile(durations, 0.5),
    p25Ms: percentile(durations, 0.25),
    p75Ms: percentile(durations, 0.75),
    avgScore: average(scores),
    avgOrders: average(orders),
  };
}

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const index = Math.min(values.length - 1, Math.max(0, Math.round((values.length - 1) * fraction)));
  return values[index] ?? 0;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function randomFloat(seed: number): number {
  return lcg(seed) / 0x1_0000_0000;
}

function lcg(seed: number): number {
  return (Math.imul(seed >>> 0, 1664525) + 1013904223) >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

main();
