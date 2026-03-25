import { describe, expect, it } from "vitest";

import {
  applySuccessfulDelivery,
  canSpawnTrain,
  createDefaultSwitchStates,
  createInitialScoreState,
  fillUpcomingQueue,
  getDifficulty,
  getDeliveryPoints,
  resolveDepartureDestination,
  toggleSwitchState,
} from "../src/game-logic";

describe("switch routing", () => {
  it("routes through the upper branch to the top depot by default", () => {
    const switches = createDefaultSwitchStates();
    expect(resolveDepartureDestination(switches)).toBe("top");
  });

  it("routes to the middle depot when the upper switch flips", () => {
    const switches = toggleSwitchState(createDefaultSwitchStates(), "upper");
    expect(resolveDepartureDestination(switches)).toBe("middle");
  });

  it("routes to the middle depot when the lower branch and lower switch combine", () => {
    const branchSwitched = toggleSwitchState(createDefaultSwitchStates(), "branch");
    const lowerMiddle = toggleSwitchState(branchSwitched, "lower");
    expect(resolveDepartureDestination(lowerMiddle)).toBe("middle");
  });
});

describe("scoring", () => {
  it("awards more points as combo climbs", () => {
    const first = getDeliveryPoints(1);
    const fifth = getDeliveryPoints(5);
    expect(fifth).toBeGreaterThan(first);
  });

  it("increments score, combo, and deliveries together", () => {
    const initial = createInitialScoreState();
    const next = applySuccessfulDelivery(initial);

    expect(next.score).toBe(getDeliveryPoints(1));
    expect(next.combo).toBe(1);
    expect(next.bestCombo).toBe(1);
    expect(next.deliveries).toBe(1);
  });
});

describe("difficulty and spawning", () => {
  it("speeds the game up as deliveries rise", () => {
    const early = getDifficulty(0);
    const late = getDifficulty(16);

    expect(late.speed).toBeGreaterThan(early.speed);
    expect(late.spawnIntervalMs).toBeLessThan(early.spawnIntervalMs);
  });

  it("blocks spawning when a train still occupies the entry lane", () => {
    const difficulty = getDifficulty(0);
    expect(canSpawnTrain(difficulty.spawnIntervalMs, difficulty, [0.2])).toBe(false);
    expect(canSpawnTrain(difficulty.spawnIntervalMs, difficulty, [0.6])).toBe(true);
  });
});

describe("queue generation", () => {
  it("fills the requested number of upcoming trains", () => {
    const random = sequenceRandom([0.0, 0.2, 0.7, 0.9]);
    const queue = fillUpcomingQueue([], 5, random);
    expect(queue).toHaveLength(5);
  });

  it("avoids a triple repeat when the random source keeps returning the same bucket", () => {
    const random = sequenceRandom([0.02, 0.04, 0.01, 0.51, 0.01]);
    const queue = fillUpcomingQueue([], 4, random);
    expect(queue.slice(0, 3)).not.toEqual(["top", "top", "top"]);
  });
});

function sequenceRandom(values: number[]): () => number {
  let index = 0;

  return () => {
    const value = values[index % values.length] ?? 0;
    index += 1;
    return value;
  };
}
