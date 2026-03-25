export const DESTINATIONS = ["top", "middle", "bottom"] as const;

export type DestinationId = (typeof DESTINATIONS)[number];
export type BranchState = "upper" | "lower";
export type UpperSwitchState = "top" | "middle";
export type LowerSwitchState = "middle" | "bottom";
export type SwitchKey = "branch" | "upper" | "lower";

export interface SwitchStates {
  branch: BranchState;
  upper: UpperSwitchState;
  lower: LowerSwitchState;
}

export interface ScoreState {
  score: number;
  combo: number;
  bestCombo: number;
  deliveries: number;
}

export interface DifficultyProfile {
  speed: number;
  spawnIntervalMs: number;
  queueSize: number;
}

export interface DestinationMeta {
  color: string;
  label: string;
  shortLabel: string;
  carriageAsset: string;
}

export const DESTINATION_META: Record<DestinationId, DestinationMeta> = {
  top: {
    color: "#58b6ff",
    label: "Blue Depot",
    shortLabel: "Blue",
    carriageAsset: "assets/models/train-carriage-container-blue.glb",
  },
  middle: {
    color: "#ff6c63",
    label: "Red Depot",
    shortLabel: "Red",
    carriageAsset: "assets/models/train-carriage-container-red.glb",
  },
  bottom: {
    color: "#67db94",
    label: "Green Depot",
    shortLabel: "Green",
    carriageAsset: "assets/models/train-carriage-container-green.glb",
  },
};

export function createDefaultSwitchStates(): SwitchStates {
  return {
    branch: "upper",
    upper: "top",
    lower: "bottom",
  };
}

export function createInitialScoreState(): ScoreState {
  return {
    score: 0,
    combo: 0,
    bestCombo: 0,
    deliveries: 0,
  };
}

export function toggleSwitchState(states: SwitchStates, key: SwitchKey): SwitchStates {
  switch (key) {
    case "branch":
      return {
        ...states,
        branch: states.branch === "upper" ? "lower" : "upper",
      };
    case "upper":
      return {
        ...states,
        upper: states.upper === "top" ? "middle" : "top",
      };
    case "lower":
      return {
        ...states,
        lower: states.lower === "middle" ? "bottom" : "middle",
      };
  }
}

export function resolveDepartureDestination(states: SwitchStates): DestinationId {
  return states.branch === "upper" ? states.upper : states.lower;
}

export function getDifficulty(deliveries: number): DifficultyProfile {
  const tier = Math.min(12, Math.floor(deliveries / 4));

  return {
    speed: 4.4 + tier * 0.38,
    spawnIntervalMs: Math.max(1125, 2225 - tier * 110),
    queueSize: 5,
  };
}

export function getDeliveryPoints(nextCombo: number): number {
  return 100 + nextCombo * 25;
}

export function applySuccessfulDelivery(state: ScoreState): ScoreState {
  const combo = state.combo + 1;

  return {
    score: state.score + getDeliveryPoints(combo),
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    deliveries: state.deliveries + 1,
  };
}

export function resetCombo(state: ScoreState): ScoreState {
  if (state.combo === 0) {
    return state;
  }

  return {
    ...state,
    combo: 0,
  };
}

export function fillUpcomingQueue(
  currentQueue: readonly DestinationId[],
  minimumLength: number,
  random: () => number = Math.random,
): DestinationId[] {
  const queue = [...currentQueue];

  while (queue.length < minimumLength) {
    const candidate = drawDestination(queue, random);
    queue.push(candidate);
  }

  return queue;
}

export function canSpawnTrain(
  elapsedMs: number,
  difficulty: DifficultyProfile,
  entryProgressBlockers: readonly number[],
): boolean {
  if (elapsedMs < difficulty.spawnIntervalMs) {
    return false;
  }

  return entryProgressBlockers.every((progress) => progress >= 0.44);
}

function drawDestination(queue: readonly DestinationId[], random: () => number): DestinationId {
  const firstIndex = Math.floor(random() * DESTINATIONS.length);
  let candidate = DESTINATIONS[firstIndex] ?? DESTINATIONS[0];
  const previous = queue[queue.length - 1];
  const previousPrevious = queue[queue.length - 2];

  if (previous && previousPrevious && previous === previousPrevious && candidate === previous) {
    const fallbackIndex = (DESTINATIONS.indexOf(candidate) + 1 + Math.floor(random() * 2)) % DESTINATIONS.length;
    candidate = DESTINATIONS[fallbackIndex] ?? DESTINATIONS[0];
  }

  return candidate;
}
