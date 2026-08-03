import assert from "node:assert/strict";
import test from "node:test";
import { PIECES, type PieceDef } from "../src/game/constants";
import {
  pickTrayPieceSet,
  trayNeighborsFit,
  traySetFits,
} from "../src/game/piece-selection";

function findPiece(cols: number, rows: number): PieceDef {
  const piece = PIECES.find((candidate) => candidate.cols === cols && candidate.rows === rows);
  if (!piece) throw new Error(`missing ${cols}x${rows} test piece`);
  return piece;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test("wide tray pieces only accept compact neighbors", () => {
  const horizontalFive = findPiece(5, 1);
  const horizontalFour = findPiece(4, 1);
  const horizontalThree = findPiece(3, 1);
  const horizontalTwo = findPiece(2, 1);
  const single = findPiece(1, 1);

  assert.equal(trayNeighborsFit(horizontalFive, horizontalFour), false);
  assert.equal(trayNeighborsFit(horizontalFive, horizontalThree), false);
  assert.equal(trayNeighborsFit(horizontalFive, horizontalTwo), true);
  assert.equal(trayNeighborsFit(horizontalFour, horizontalThree), true);
  assert.equal(traySetFits([horizontalFive, single, horizontalFive]), true);
});

test("generated three-piece deals never overlap adjacent tray slots", () => {
  for (const difficulty of [0, 0.35, 0.7, 1]) {
    for (const fill of [0, 0.5, 0.75, 0.98]) {
      for (let seed = 1; seed <= 500; seed++) {
        const pieces = pickTrayPieceSet(difficulty, fill, seededRandom(seed));
        assert.equal(
          traySetFits(pieces),
          true,
          `unsafe tray set at difficulty=${difficulty}, fill=${fill}, seed=${seed}`,
        );
      }
    }
  }
});
