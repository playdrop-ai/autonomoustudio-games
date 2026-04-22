import test from "node:test";
import assert from "node:assert/strict";

import { classifyGameOverResult, formatNewHighScoreSubtitle } from "../src/game/results.ts";

test("classifies a refreshed higher synced score as new_best", () => {
  const result = classifyGameOverResult({
    previous: {
      rank: 34,
      bestScore: 32000,
    },
    current: {
      rank: 33,
      bestScore: 37800,
    },
    finalScore: 37800,
  });

  assert.equal(result, "new_best");
});

test("classifies a first synced score as first_recorded", () => {
  const result = classifyGameOverResult({
    previous: {
      rank: null,
      bestScore: null,
    },
    current: {
      rank: 41,
      bestScore: 2400,
    },
    finalScore: 2400,
  });

  assert.equal(result, "first_recorded");
});

test("classifies unchanged synced best as normal", () => {
  const result = classifyGameOverResult({
    previous: {
      rank: 34,
      bestScore: 402420,
    },
    current: {
      rank: 34,
      bestScore: 402420,
    },
    finalScore: 37800,
  });

  assert.equal(result, "normal");
});

test("formats the new best subtitle as a short single line", () => {
  const result = formatNewHighScoreSubtitle({
    finalScore: 37800,
    previousRank: 34,
    nextRank: 33,
  });

  assert.equal(result, "new high score");
});
