import test from "node:test";
import assert from "node:assert/strict";

import {
  COLUMN_COUNT,
  COLUMN_DEPTH,
  STOCK_CARD_COUNT,
  TABLEAU_CARD_COUNT,
  createSpread,
  drawFromStock,
  formatCard,
  getPlayableIndices,
  isHardStuck,
  isPlayable,
  isSpreadCleared,
  playCard,
  type Card,
  type ColumnState,
  type SpreadState,
} from "../src/game/state.ts";

function makeCard(id: string, rank: number, suit: Card["suit"]): Card {
  return { id, rank, suit };
}

function makeColumn(cards: Array<{ card: Card; faceUp?: boolean }>): ColumnState {
  return cards.map(({ card, faceUp = true }) => ({ card, faceUp }));
}

function makeSpread(overrides: Partial<SpreadState> = {}): SpreadState {
  const base = createSpread(1234, "Past");
  return {
    ...base,
    ...overrides,
    columns: overrides.columns ?? base.columns,
    stock: overrides.stock ?? base.stock,
    active: Object.prototype.hasOwnProperty.call(overrides, "active") ? (overrides.active ?? null) : base.active,
    activeTrail: overrides.activeTrail ?? base.activeTrail,
  };
}

test("rank adjacency wraps between ace and king", () => {
  assert.equal(isPlayable(makeCard("a", 1, "moon"), makeCard("b", 13, "sun")), true);
  assert.equal(isPlayable(makeCard("a", 5, "moon"), makeCard("b", 8, "sun")), false);
});

test("new spreads deal exact golf-style counts and always start with a playable first reveal", () => {
  const spread = createSpread(88, "Present");
  assert.equal(spread.columns.length, COLUMN_COUNT);
  assert.equal(spread.columns.every((column) => column.length === COLUMN_DEPTH), true);
  assert.equal(spread.stock.length, STOCK_CARD_COUNT);
  assert.equal(spread.active, null);

  const allIds = [
    ...spread.stock.map((card) => card.id),
    ...spread.columns.flatMap((column) => column.map((entry) => entry.card.id)),
  ];
  assert.equal(allIds.length, TABLEAU_CARD_COUNT + STOCK_CARD_COUNT);
  assert.equal(new Set(allIds).size, 52);

  const opened = drawFromStock(spread);
  assert.equal(getPlayableIndices(opened).length > 0, true);
});

test("spread options change preview and buried-card visibility", () => {
  const past = createSpread(101, "Past");
  assert.equal(past.showNextStockPreview, true);
  assert.equal(past.showBuriedFaces, true);
  assert.equal(past.columns.every((column) => column.every((entry) => entry.faceUp)), true);

  const present = createSpread(202, "Present");
  assert.equal(present.showNextStockPreview, false);
  assert.equal(present.showBuriedFaces, true);
  assert.equal(present.columns.every((column) => column.every((entry) => entry.faceUp)), true);

  const future = createSpread(303, "Future");
  assert.equal(future.showNextStockPreview, false);
  assert.equal(future.showBuriedFaces, false);
  assert.equal(
    future.columns.every(
      (column) => column.slice(0, -1).every((entry) => !entry.faceUp) && column.at(-1)?.faceUp === true,
    ),
    true,
  );
});

test("only exposed top cards are playable and buried cards are ignored", () => {
  const spread = makeSpread({
    active: makeCard("active", 6, "moon"),
    stock: [],
    columns: [
      makeColumn([
        { card: makeCard("buried-playable", 7, "sun"), faceUp: true },
        { card: makeCard("top-blocker", 2, "rose"), faceUp: true },
      ]),
      makeColumn([{ card: makeCard("top-playable", 5, "blade"), faceUp: true }]),
      ...Array.from({ length: COLUMN_COUNT - 2 }, (_, index) =>
        makeColumn([{ card: makeCard(`filler-${index}`, 11, "sun"), faceUp: true }]),
      ),
    ],
  });

  assert.deepEqual(getPlayableIndices(spread), [1]);
});

test("playing a top card updates active and reveals the next buried card", () => {
  const spread = makeSpread({
    active: makeCard("active", 6, "moon"),
    stock: [],
    columns: [
      makeColumn([
        { card: makeCard("hidden-under", 9, "rose"), faceUp: false },
        { card: makeCard("playable-top", 7, "sun"), faceUp: true },
      ]),
      ...Array.from({ length: COLUMN_COUNT - 1 }, (_, index) =>
        makeColumn([{ card: makeCard(`filler-${index}`, 11, "blade"), faceUp: true }]),
      ),
    ],
  });

  const result = playCard(spread, 0);
  assert.equal(formatCard(result.spread.active), "7-sun");
  assert.equal(result.points, 100);
  assert.equal(result.revealedCardId, "hidden-under");
  assert.equal(result.spread.columns[0]?.length, 1);
  assert.equal(result.spread.columns[0]?.[0]?.faceUp, true);
  assert.equal(formatCard(result.spread.columns[0]?.[0]?.card ?? null), "9-rose");
});

test("drawing from stock replaces the active card", () => {
  const spread = makeSpread({
    active: null,
    stock: [makeCard("drawn", 10, "blade"), makeCard("next", 4, "sun")],
    activeTrail: [],
  });

  const result = drawFromStock(spread);
  assert.equal(formatCard(result.active), "10-blade");
  assert.equal(result.stock.length, 1);
  assert.equal(formatCard(result.stock[0] ?? null), "4-sun");
  assert.deepEqual(result.activeTrail, []);
});

test("drawing from stock archives the previous reading after the first reveal", () => {
  const spread = makeSpread({
    active: makeCard("active", 6, "moon"),
    stock: [makeCard("drawn", 10, "blade"), makeCard("next", 4, "sun")],
    activeTrail: [makeCard("older", 2, "rose")],
  });

  const result = drawFromStock(spread);
  assert.equal(formatCard(result.active), "10-blade");
  assert.deepEqual(result.activeTrail.map((card) => formatCard(card)), ["2-rose", "6-moon"]);
});

test("hard-stuck only happens when no playable top cards remain and stock is empty", () => {
  const stuck = makeSpread({
    active: makeCard("active", 4, "moon"),
    stock: [],
    columns: Array.from({ length: COLUMN_COUNT }, (_, index) =>
      makeColumn([{ card: makeCard(`blocked-${index}`, 9, "sun"), faceUp: true }]),
    ),
  });
  assert.equal(isHardStuck(stuck), true);

  const rescuedByStock = { ...stuck, stock: [makeCard("stock", 6, "rose")] };
  assert.equal(isHardStuck(rescuedByStock), false);
});

test("spread clear depends on every column being empty", () => {
  const cleared = makeSpread({
    columns: Array.from({ length: COLUMN_COUNT }, () => []),
  });
  assert.equal(isSpreadCleared(cleared), true);

  const uncleared = makeSpread({
    columns: [makeColumn([{ card: makeCard("one", 3, "sun"), faceUp: true }]), ...Array.from({ length: COLUMN_COUNT - 1 }, () => [])],
  });
  assert.equal(isSpreadCleared(uncleared), false);
});
