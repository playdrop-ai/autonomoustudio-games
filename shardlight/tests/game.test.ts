import test from "node:test";
import assert from "node:assert/strict";

import { boardSnapshot, createInitialState, createNextChamber, neighborIndices, toggleFlag, uncoverCell } from "../src/game";

test("first uncover always lands on a safe zero-region starter", () => {
  const startIndex = 9;
  const result = uncoverCell(createInitialState(12345), startIndex);
  const cell = result.state.board.cells[startIndex];
  assert.ok(cell);
  assert.equal(cell.mine, false);
  assert.equal(cell.adjacent, 0);
  for (const neighborIndex of neighborIndices(startIndex)) {
    const neighbor = result.state.board.cells[neighborIndex];
    assert.ok(neighbor);
    assert.equal(neighbor.mine, false);
  }
  assert.ok(result.revealed > 1);
});

test("flagging toggles before any uncover", () => {
  let state = createInitialState(12);
  state = toggleFlag(state, 7);
  assert.equal(state.board.cells[7]?.flagged, true);
  state = toggleFlag(state, 7);
  assert.equal(state.board.cells[7]?.flagged, false);
});

test("generated clue values match adjacent mine counts", () => {
  const state = uncoverCell(createInitialState(2026), 10).state;
  const snapshot = boardSnapshot(state.board);
  for (let row = 0; row < state.board.rows; row += 1) {
    for (let col = 0; col < state.board.cols; col += 1) {
      const index = row * state.board.cols + col;
      const cell = state.board.cells[index];
      assert.ok(cell);
      if (cell.mine) continue;
      const counted = neighborIndices(index, state.board.rows, state.board.cols).reduce((sum, neighborIndex) => {
        const neighbor = state.board.cells[neighborIndex];
        return sum + (neighbor?.mine ? 1 : 0);
      }, 0);
      assert.equal(cell.adjacent, counted, `Mismatch at ${row},${col} in ${snapshot[row]}`);
    }
  }
});

test("clearing every safe tile advances to the next chamber", () => {
  let state = uncoverCell(createInitialState(987654), 10).state;
  for (let index = 0; index < state.board.cells.length; index += 1) {
    const cell = state.board.cells[index];
    assert.ok(cell);
    if (cell.mine || cell.revealed) continue;
    state = uncoverCell(state, index).state;
  }
  assert.equal(state.status, "cleared");
  assert.equal(state.chambersCleared, 1);

  const next = createNextChamber(state);
  assert.equal(next.chamber, 2);
  assert.equal(next.status, "ready");
  assert.equal(next.mineCount, 11);
});
