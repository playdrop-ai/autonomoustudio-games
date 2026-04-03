import test from "node:test";
import assert from "node:assert/strict";

import {
  createSpread,
  drawFromStock,
  formatCard,
  getPlayableIndices,
  isHardStuck,
  isPlayable,
  playCard,
  settleChain,
  useReserve,
  STOCK_CARD_COUNT,
  TABLEAU_CARD_COUNT,
  type SpreadState,
} from "../src/game/state.ts";

function makeSpread(overrides: Partial<SpreadState> = {}): SpreadState {
  const base = createSpread(1234, "Past");
  return {
    ...base,
    ...overrides,
    tableau: overrides.tableau ?? base.tableau,
    stock: overrides.stock ?? base.stock,
    active: overrides.active ?? base.active,
    reserveCard: overrides.reserveCard ?? base.reserveCard,
  };
}

test("rank adjacency wraps between ace and king", () => {
  assert.equal(isPlayable({ id: "a", rank: 1, suit: "moon" }, { id: "b", rank: 13, suit: "sun" }), true);
  assert.equal(isPlayable({ id: "a", rank: 5, suit: "moon" }, { id: "b", rank: 8, suit: "sun" }), false);
});

test("new spreads always start with at least one playable move", () => {
  const spread = createSpread(88, "Present");
  assert.ok(getPlayableIndices(spread).length > 0);
  assert.equal(spread.tableau.length, TABLEAU_CARD_COUNT);
  assert.equal(spread.stock.length, STOCK_CARD_COUNT);
});

test("playing a card updates active card and chain scoring", () => {
  const spread = makeSpread({
    active: { id: "active", rank: 6, suit: "moon" },
    tableau: [
      { id: "play", rank: 7, suit: "sun" },
      null,
      { id: "other", rank: 3, suit: "rose" },
      ...Array.from({ length: 18 }, (_, index) => ({ id: `filler-${index}`, rank: 10, suit: "blade" as const })),
    ],
    stock: [{ id: "stock", rank: 8, suit: "blade" }],
  });

  const result = playCard(spread, 0);
  assert.equal(formatCard(result.spread.active), "7-sun");
  assert.equal(result.spread.chainLength, 1);
  assert.equal(result.points, 100);
});

test("drawing from stock settles omen bonus and resets the chain", () => {
  const spread = makeSpread({
    omenSuit: "sun",
    active: { id: "active", rank: 6, suit: "moon" },
    stock: [{ id: "stock", rank: 9, suit: "blade" }],
    chainLength: 3,
    lastClearedSuit: "sun",
    reserveCharged: false,
  });

  const result = drawFromStock(spread);
  assert.equal(result.points, 300);
  assert.equal(result.omenTriggered, true);
  assert.equal(result.spread.reserveCharged, true);
  assert.equal(result.spread.chainLength, 0);
  assert.equal(formatCard(result.spread.active), "9-blade");
});

test("reserve stores and swaps the active card", () => {
  const stashed = useReserve(
    makeSpread({
      active: { id: "active", rank: 4, suit: "moon" },
      stock: [{ id: "stock", rank: 5, suit: "rose" }],
      reserveCard: null,
      reserveCharged: true,
    }),
  );

  assert.equal(formatCard(stashed.reserveCard), "4-moon");
  assert.equal(formatCard(stashed.active), "5-rose");
  assert.equal(stashed.reserveCharged, false);

  const swapped = useReserve({ ...stashed, reserveCharged: true });
  assert.equal(formatCard(swapped.reserveCard), "5-rose");
  assert.equal(formatCard(swapped.active), "4-moon");
});

test("hard-stuck detection checks the reserve fallback", () => {
  const stuck = makeSpread({
    active: { id: "active", rank: 4, suit: "moon" },
    tableau: Array.from({ length: 21 }, (_, index) => ({ id: `t-${index}`, rank: 9, suit: "sun" as const })),
    stock: [],
    reserveCard: null,
    reserveCharged: false,
  });
  assert.equal(isHardStuck(stuck), true);

  const rescue = { ...stuck, reserveCard: { id: "reserve", rank: 8, suit: "rose" as const }, reserveCharged: true };
  assert.equal(isHardStuck(rescue), false);
});

test("settleChain without omen match only resets chain state", () => {
  const spread = makeSpread({
    omenSuit: "moon",
    chainLength: 4,
    lastClearedSuit: "rose",
    reserveCharged: false,
  });
  const result = settleChain(spread);
  assert.equal(result.points, 0);
  assert.equal(result.omenTriggered, false);
  assert.equal(result.spread.chainLength, 0);
});
