import { describe, expect, it } from "vitest";

import { ENEMY_DEFINITIONS, TOWER_DEFINITIONS } from "../src/game/config";
import { PADS } from "../src/game/level";
import { pointAtDistance, rotationAtDistance } from "../src/game/level";
import {
  advanceGame,
  createInitialState,
  drainMetaEvents,
  getTowerLevel,
  placeTowerOnPad,
  resolveDamageAfterDefense,
  startGame,
  upgradeTowerOnPad,
} from "../src/game/simulation";
import type { Enemy, GameState } from "../src/game/types";

function stepForSeconds(seconds: number, state = createInitialState(), step = 1 / 30) {
  for (let elapsed = 0; elapsed < seconds; elapsed += step) {
    advanceGame(state, Math.min(step, seconds - elapsed));
    if (state.phase === "lost") {
      break;
    }
  }

  return state;
}

function stepUntil(state: GameState, predicate: (state: GameState) => boolean, maxSeconds = 60, step = 1 / 30) {
  let elapsed = 0;

  while (elapsed < maxSeconds && !predicate(state) && state.phase !== "lost") {
    const dt = Math.min(step, maxSeconds - elapsed);
    advanceGame(state, dt);
    elapsed += dt;
  }

  return elapsed;
}

function timeUntilLoss(state = createInitialState(), maxSeconds = 180, step = 1 / 30) {
  let elapsed = 0;

  while (elapsed < maxSeconds && state.phase !== "lost") {
    const dt = Math.min(step, maxSeconds - elapsed);
    advanceGame(state, dt);
    elapsed += dt;
  }

  return elapsed;
}

function injectEnemy(state: GameState, kind: keyof typeof ENEMY_DEFINITIONS, distance: number): Enemy {
  const definition = ENEMY_DEFINITIONS[kind];
  const point = pointAtDistance(distance);
  const enemy: Enemy = {
    id: state.nextIds.enemy,
    kind,
    x: point.x,
    y: point.y,
    distance,
    health: definition.health,
    maxHealth: definition.health,
    speed: definition.speed,
    defense: definition.defense,
    reward: definition.reward,
    leakDamage: definition.leakDamage,
    rotation: rotationAtDistance(distance),
  };

  state.nextIds.enemy += 1;
  state.enemies.push(enemy);
  return enemy;
}

describe("simulation", () => {
  it("does not allow tower placement before the run starts", () => {
    const state = createInitialState();
    const result = placeTowerOnPad(state, "p1", "blaster");

    expect(result.ok).toBe(false);
    expect(state.towers).toHaveLength(0);
    expect(state.phase).toBe("ready");
  });

  it("advances through authored waves and exposes wave numbers", () => {
    const state = createInitialState();
    startGame(state);
    state.gold = 999;

    placeTowerOnPad(state, "p1", "blaster");
    placeTowerOnPad(state, "p2", "rocket");
    placeTowerOnPad(state, "p4", "blaster");

    const elapsed = stepUntil(state, (candidate) => candidate.waveNumber >= 2, 30);

    expect(elapsed).toBeLessThan(30);
    expect(state.waveNumber).toBeGreaterThanOrEqual(2);
    expect(state.highestWave).toBeGreaterThanOrEqual(2);
    expect(state.totalKills).toBeGreaterThan(0);
  });

  it("applies flat defense with a minimum of one damage", () => {
    expect(resolveDamageAfterDefense(12, 0)).toBe(12);
    expect(resolveDamageAfterDefense(12, 5)).toBe(7);
    expect(resolveDamageAfterDefense(12, 99)).toBe(1);
  });

  it("moves the top-right pad inward and increases tower range on upgrades", () => {
    const topRightPad = PADS.find((pad) => pad.id === "p4");
    expect(topRightPad?.cell).toEqual({ x: 14, y: 2 });

    for (const kind of ["blaster", "rocket"] as const) {
      const definition = TOWER_DEFINITIONS[kind];
      const level1 = getTowerLevel(definition, 1);
      const level2 = getTowerLevel(definition, 2);
      const level3 = getTowerLevel(definition, 3);

      expect(level2.range).toBeGreaterThan(level1.range);
      expect(level3.range).toBeGreaterThan(level2.range);
    }
  });

  it("lets rocket splash damage clustered enemies", () => {
    const state = createInitialState();
    startGame(state);
    state.gold = 999;

    placeTowerOnPad(state, "p2", "rocket");
    state.wavePlan = { waveNumber: 1, intermission: 999, entries: [] };
    state.waveCursor = 0;
    state.wavePhase = "spawning";
    state.enemies.length = 0;

    injectEnemy(state, "walker", 472);
    injectEnemy(state, "walker", 494);
    stepForSeconds(4, state);

    expect(state.totalKills).toBeGreaterThanOrEqual(1);
    expect(state.enemies.length).toBeLessThan(2);
  });

  it("limits rockets to one live shot and a full reload before refiring", () => {
    const state = createInitialState();
    startGame(state);
    state.gold = 999;

    placeTowerOnPad(state, "p2", "rocket");
    upgradeTowerOnPad(state, "p2");
    upgradeTowerOnPad(state, "p2");
    state.wavePlan = { waveNumber: 1, intermission: 999, entries: [] };
    state.waveCursor = 0;
    state.wavePhase = "spawning";
    state.enemies.length = 0;
    state.projectiles.length = 0;

    const tower = state.towers.find((candidate) => candidate.padId === "p2");
    expect(tower).toBeTruthy();
    if (!tower) {
      return;
    }

    const target = injectEnemy(state, "tank", 832);
    target.health = 999;
    target.maxHealth = 999;
    target.speed = 0;
    target.defense = 0;
    target.reward = 0;

    tower.cooldown = 0;
    state.projectiles.push({
      id: state.nextIds.projectile,
      kind: "rocket",
      sourceTowerId: tower.id,
      targetId: target.id,
      x: tower.x,
      y: tower.y,
      speed: 0,
      damage: 1,
      splashRadius: 0,
      rotation: 0,
      rotationOffset: 0,
      frame: 0,
      tint: 0xffffff,
      scale: 1,
    });
    state.nextIds.projectile += 1;

    advanceGame(state, 0);
    expect(state.projectiles).toHaveLength(1);

    state.projectiles.length = 0;
    advanceGame(state, 0);
    expect(state.projectiles).toHaveLength(1);
    expect(tower.cooldown).toBeCloseTo(1, 5);

    state.projectiles.length = 0;
    advanceGame(state, 0.5);
    expect(state.projectiles).toHaveLength(0);

    advanceGame(state, 0.49);
    expect(state.projectiles).toHaveLength(0);

    advanceGame(state, 0.02);
    expect(state.projectiles).toHaveLength(1);
  });

  it("requires currency for upgrades and grants the max-upgrade achievement", () => {
    const state = createInitialState();
    startGame(state);
    state.gold = 30;
    placeTowerOnPad(state, "p1", "blaster");

    const tooPoor = upgradeTowerOnPad(state, "p1");
    expect(tooPoor.ok).toBe(false);

    state.gold = 999;
    expect(upgradeTowerOnPad(state, "p1").ok).toBe(true);
    expect(upgradeTowerOnPad(state, "p1").ok).toBe(true);

    const tower = state.towers.find((candidate) => candidate.padId === "p1");
    expect(tower?.level).toBe(3);

    const metaEvents = drainMetaEvents(state);
    expect(metaEvents.some((event) => event.type === "achievement" && event.key === "max_upgrade_reached")).toBe(true);
  });

  it("eventually loses if no towers are built", () => {
    const state = createInitialState();
    startGame(state);
    stepForSeconds(70, state);

    expect(state.phase).toBe("lost");
    expect(state.baseHealth).toBe(0);
  });

  it("still loses within the target window with a fully upgraded mixed defense", () => {
    const state = createInitialState();
    startGame(state);
    state.gold = 99999;

    for (const [padId, kind] of [
      ["p1", "blaster"],
      ["p2", "rocket"],
      ["p3", "blaster"],
      ["p4", "rocket"],
    ] as const) {
      placeTowerOnPad(state, padId, kind);
    }

    for (const padId of ["p1", "p2", "p3", "p4"] as const) {
      upgradeTowerOnPad(state, padId);
      upgradeTowerOnPad(state, padId);
    }

    const lossTime = timeUntilLoss(state, 150);

    expect(state.phase).toBe("lost");
    expect(lossTime).toBeGreaterThanOrEqual(90);
    expect(lossTime).toBeLessThanOrEqual(120);
  });
});
