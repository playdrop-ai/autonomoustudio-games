import assert from 'node:assert/strict';
import test from 'node:test';

import { HOUSES } from '../src/game/config';
import { createInitialState, pathExistsToAllHomes, restartRun, stepGame } from '../src/game/logic';

test('restartRun initializes a playable route set', () => {
  const state = createInitialState({ bestScore: 0, bestStreak: 0 }, 12345);
  restartRun(state);
  assert.equal(state.screen, 'playing');
  assert.equal(state.carrying, null);
  assert.equal(state.strikes, 0);
  assert.ok(pathExistsToAllHomes(state.barriers));
  assert.ok(state.guidePath.length > 0);
});

test('delivery increases score and preserves fair barriers', () => {
  const state = createInitialState({ bestScore: 0, bestStreak: 0 }, 24680);
  restartRun(state);
  state.carrying = state.activeRequest;
  const target = HOUSES[state.activeRequest]?.doorstep;
  assert.ok(target);
  state.player.position = { x: target.x + 0.5, y: target.y + 0.5 };
  const activeBefore = state.activeRequest;
  stepGame(state, { x: 0, y: 0 }, 0.016);
  assert.ok(state.score >= 100);
  assert.equal(state.currentStreak, 1);
  assert.notEqual(state.activeRequest, activeBefore);
  assert.ok(pathExistsToAllHomes(state.barriers));
});

test('timer miss adds a strike and resets the carry state', () => {
  const state = createInitialState({ bestScore: 0, bestStreak: 0 }, 13579);
  restartRun(state);
  state.carrying = state.activeRequest;
  state.timer = 0.01;
  stepGame(state, { x: 0, y: 0 }, 0.05);
  assert.equal(state.strikes, 1);
  assert.equal(state.carrying, null);
  assert.equal(state.currentStreak, 0);
});
