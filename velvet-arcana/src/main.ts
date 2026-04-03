/// <reference types="playdrop-sdk-types" />

import {
  FLAWLESS_READING_POINTS,
  OMEN_BONUS_POINTS,
  SPREAD_CLEAR_POINTS,
  SPREAD_LABELS,
  canUseReserve,
  createSpread,
  drawFromStock,
  formatCard,
  getPlayableIndices,
  isHardStuck,
  isSpreadCleared,
  playCard,
  rankLabel,
  settleChain,
  useReserve,
  type Card,
  type SpreadLabel,
  type SpreadState,
  type SuitKey,
} from "./game/state";

type Phase = "intro" | "playing" | "transition" | "gameover";

type GameState = {
  phase: Phase;
  runSeed: number;
  spreadIndex: number;
  spread: SpreadState;
  score: number;
  bestScore: number;
  spreadsCleared: number;
  victory: boolean;
  statusMessage: string;
};

const STORAGE_KEY = "velvet-arcana-best-score";
const TRANSITION_MS = 720;
const SUIT_GLYPHS: Record<SuitKey, string> = {
  moon: "☾",
  rose: "✿",
  sun: "✹",
  blade: "✥",
};

const rootElement = document.getElementById("app");
if (!(rootElement instanceof HTMLElement)) throw new Error("[velvet-arcana] #app element missing");
const root = rootElement;
const HAS_PLAYDROP_HOST = new URLSearchParams(window.location.search).has("playdrop_channel");

let state = createInitialState();
let transitionTimer: number | null = null;

void bootstrap().catch((error) => {
  const playdrop = window.playdrop;
  if (playdrop) {
    playdrop.host.setLoadingState({ status: "error", message: String(error) });
  }
  throw error;
});

async function bootstrap() {
  let host: { setLoadingState(state: { status: string; message?: string; progress?: number }): void } | null = null;
  if (HAS_PLAYDROP_HOST) {
    const playdrop = window.playdrop;
    if (!playdrop) throw new Error("[velvet-arcana] window.playdrop unavailable");

    const sdk = await playdrop.init();
    host = sdk.host;
    host.setLoadingState({
      status: "loading",
      message: "laying out the reading table",
      progress: 0.4,
    });
  }

  render();
  installDebugSurface();

  host?.setLoadingState({ status: "ready" });
}

function createInitialState(seed = readSeedFromUrl() ?? randomSeed()): GameState {
  const label = spreadLabelAt(0);
  return {
    phase: "intro",
    runSeed: seed,
    spreadIndex: 0,
    spread: createSpread(seedForSpread(seed, 0), label),
    score: 0,
    bestScore: readBestScore(),
    spreadsCleared: 0,
    victory: false,
    statusMessage: "",
  };
}

function startRun(seed = readSeedFromUrl() ?? randomSeed()) {
  clearTransition();
  const label = spreadLabelAt(0);
  state = {
    phase: "playing",
    runSeed: seed,
    spreadIndex: 0,
    spread: createSpread(seedForSpread(seed, 0), label),
    score: 0,
    bestScore: readBestScore(),
    spreadsCleared: 0,
    victory: false,
    statusMessage: "",
  };
  render();
}

function handleCard(index: number) {
  if (state.phase !== "playing") return;
  const result = playCard(state.spread, index);
  state.spread = result.spread;
  state.score += result.points;
  state.statusMessage = "";
  resolveAfterAction();
  render();
}

function handleDraw() {
  if (state.phase !== "playing" || state.spread.stock.length === 0) return;
  const result = drawFromStock(state.spread);
  applySettlement(result);
  state.statusMessage = result.omenTriggered ? `OMEN +${OMEN_BONUS_POINTS}` : "";
  resolveAfterAction();
  render();
}

function handleReserve() {
  if (state.phase !== "playing" || !canUseReserve(state.spread)) return;
  state.spread = useReserve(state.spread);
  state.statusMessage = "RESERVE USED";
  resolveAfterAction();
  render();
}

function resolveAfterAction() {
  if (isSpreadCleared(state.spread)) {
    const settled = settleChain(state.spread);
    applySettlement(settled);
    state.spreadsCleared = state.spreadIndex + 1;
    state.score += SPREAD_CLEAR_POINTS;
    if (state.spreadIndex === SPREAD_LABELS.length - 1) {
      state.score += FLAWLESS_READING_POINTS;
      finishRun(true, `FLAWLESS READING +${FLAWLESS_READING_POINTS}`);
      return;
    }

    state.phase = "transition";
    state.statusMessage = `${state.spread.label.toUpperCase()} CLEARED +${SPREAD_CLEAR_POINTS}`;
    queueTransition();
    return;
  }

  if (isHardStuck(state.spread)) {
    const settled = settleChain(state.spread);
    applySettlement(settled);
    finishRun(false, "NO LEGAL MOVE");
  }
}

function queueTransition() {
  clearTransition();
  transitionTimer = window.setTimeout(() => {
    const nextIndex = state.spreadIndex + 1;
    const label = spreadLabelAt(nextIndex);
    state.phase = "playing";
    state.spreadIndex = nextIndex;
    state.spread = createSpread(seedForSpread(state.runSeed, nextIndex), label);
    state.statusMessage = "";
    render();
  }, TRANSITION_MS);
}

function finishRun(victory: boolean, statusMessage: string) {
  clearTransition();
  state.phase = "gameover";
  state.victory = victory;
  state.statusMessage = statusMessage;
  state.bestScore = Math.max(state.bestScore, state.score);
  writeBestScore(state.bestScore);
  render();
}

function applySettlement(result: ReturnType<typeof settleChain> | ReturnType<typeof drawFromStock>) {
  state.spread = result.spread;
  state.score += result.points;
}

function clearTransition() {
  if (transitionTimer !== null) {
    window.clearTimeout(transitionTimer);
    transitionTimer = null;
  }
}

function render() {
  const playable = new Set(getPlayableIndices(state.spread));
  const nextStockCard = state.spread.stock[0] ?? null;
  const reserveReady = state.spread.reserveCharged;
  const reserveFilled = Boolean(state.spread.reserveCard);
  const stockLow = state.spread.stock.length <= 3;
  const toastTone = state.statusMessage.includes("NO LEGAL MOVE")
    ? "toast toast--danger"
    : state.statusMessage.includes("OMEN") || state.statusMessage.includes("FLAWLESS")
      ? "toast toast--reward"
      : "toast";
  root.innerHTML = `
    <div class="page ${HAS_PLAYDROP_HOST ? "page--hosted" : ""}">
      <main class="table-shell">
        <header class="hud hud--top">
          <section class="score-card">
            <div class="score-label">Score</div>
            <div class="score-value">${formatNumber(state.score)}</div>
            <div class="score-best">Best ${formatNumber(state.bestScore)}</div>
          </section>
          <div class="spread-pill">${state.spread.label}</div>
          <section class="omen-card">
            <div class="omen-label">Omen</div>
            <div class="cluster-value suit-${state.spread.omenSuit}">${SUIT_GLYPHS[state.spread.omenSuit]} ${capitalize(state.spread.omenSuit)}</div>
          </section>
        </header>

        <section class="spread-wrap">
          <div class="tableau">
            ${renderRows(state.spread, playable)}
          </div>
        </section>

        ${state.spread.chainLength > 1 ? `<div class="chain-pill">CHAIN x${state.spread.chainLength}</div>` : ""}
        ${state.statusMessage ? `<div class="${toastTone}">${escapeHtml(state.statusMessage)}</div>` : ""}

        <footer class="bottom-bar">
          <section class="cluster ${reserveReady ? "" : "cluster--spent"}">
            <div class="cluster-label">Reserve</div>
            <div class="cluster-status">${reserveReady ? "Charged" : "Spent"}</div>
            <button class="cluster-button js-reserve" ${!canUseReserve(state.spread) || state.phase !== "playing" ? "disabled" : ""}>
              ${
                reserveFilled
                  ? renderMiniCard(state.spread.reserveCard!, "mini-card")
                  : renderCardSocket("mini-card socket-card", reserveReady ? "Ready" : "Empty")
              }
            </button>
            <div class="cluster-copy">${reserveFilled ? "Swap back into the line." : "Stash one active card."}</div>
          </section>

          <section class="cluster cluster--active">
            <div class="cluster-label">Active</div>
            <div class="cluster-status">${state.spread.chainLength > 0 ? `Chain ${state.spread.chainLength}` : "Live card"}</div>
            ${renderMiniCard(state.spread.active, "mini-card active-card active-card--pulse")}
            <div class="cluster-copy">Play exactly one rank higher or lower.</div>
          </section>

          <section class="cluster cluster--stock ${stockLow ? "cluster--danger" : ""}">
            <div class="cluster-label">Next Draw</div>
            <div class="cluster-status">${state.spread.stock.length > 0 ? `${state.spread.stock.length} left` : "Burned out"}</div>
            <button class="cluster-button js-draw" ${state.phase !== "playing" || state.spread.stock.length === 0 ? "disabled" : ""}>
              <div class="preview-stack">
                ${
                  nextStockCard
                    ? renderMiniCard(nextStockCard, "mini-card preview-card")
                    : renderCardSocket("mini-card socket-card", "Out")
                }
              </div>
            </button>
            <div class="cluster-copy">${stockLow ? "Candle low. Plan the next turn." : "Face-up draw keeps the plan readable."}</div>
          </section>
        </footer>

        <div class="title-lockup ${state.phase === "intro" ? "" : "hidden"}">
          <h1>Velvet Arcana</h1>
          <p>Read three spreads. Save one chain. Finish clean.</p>
        </div>

        <section class="overlay overlay--intro ${state.phase === "intro" ? "" : "hidden"}">
          <div class="sheet">
            <p class="sheet-copy">Tap a card that is one rank higher or lower. The next draw stays face up, and the reserve charm lets you bank one active card when the line is about to die.</p>
            <div class="button-row">
              <button class="start-button js-start">Begin Reading</button>
            </div>
          </div>
        </section>

        <section class="overlay overlay--gameover ${state.phase === "gameover" ? "" : "hidden"}">
          <div class="sheet">
            <h2>${state.victory ? "The Reading Landed" : "The Reading Closed"}</h2>
            <p class="sheet-copy">
              ${
                state.victory
                  ? "All three spreads cleared before the candle burned out."
                  : "No legal move remained before the next omen could be turned."
              }
            </p>
            <div class="summary-grid">
              <div class="summary-card">
                <div class="cluster-label">Run Score</div>
                <div class="cluster-value">${formatNumber(state.score)}</div>
              </div>
              <div class="summary-card">
                <div class="cluster-label">Spreads</div>
                <div class="cluster-value">${state.spreadsCleared} / ${SPREAD_LABELS.length}</div>
              </div>
            </div>
            <div class="button-row">
              <button class="retry-button js-restart">Read Again</button>
            </div>
          </div>
        </section>
      </main>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>(".js-card").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      handleCard(index);
    });
  });
  root.querySelector<HTMLButtonElement>(".js-draw")?.addEventListener("click", handleDraw);
  root.querySelector<HTMLButtonElement>(".js-reserve")?.addEventListener("click", handleReserve);
  root.querySelector<HTMLButtonElement>(".js-start")?.addEventListener("click", () => startRun(state.runSeed));
  root.querySelector<HTMLButtonElement>(".js-restart")?.addEventListener("click", () => startRun(randomSeed()));
}

function renderRows(spread: SpreadState, playable: Set<number>) {
  const rows = Array.from({ length: 3 }, (_, rowIndex) => spread.tableau.slice(rowIndex * 7, rowIndex * 7 + 7));
  return rows
    .map(
      (row, rowIndex) => `
        <div class="tableau-row" data-row="${rowIndex}">
          ${row
            .map((card, columnIndex) => {
              const index = rowIndex * 7 + columnIndex;
              if (!card) return `<div class="card hidden" aria-hidden="true"></div>`;
              const playableCard = playable.has(index);
              const omenCard = playableCard && card.suit === spread.omenSuit;
              return `
                <button
                  class="card js-card ${playableCard ? "playable" : ""} ${omenCard ? "omen" : ""}"
                  data-index="${index}"
                  ${state.phase !== "playing" || !playableCard ? "disabled" : ""}
                >
                  <div class="card-top suit-${card.suit}">
                    <span class="card-rank">${rankLabel(card.rank)}</span>
                    <span class="card-glyph">${SUIT_GLYPHS[card.suit]}</span>
                  </div>
                  <div class="card-center suit-${card.suit}">${SUIT_GLYPHS[card.suit]}</div>
                  <div class="card-name suit-${card.suit}">${card.suit}</div>
                </button>
              `;
            })
            .join("")}
        </div>
      `,
    )
    .join("");
}

function renderMiniCard(card: Card, className: string) {
  return `
    <div class="card ${className}">
      <div class="card-top suit-${card.suit}">
        <span class="card-rank">${rankLabel(card.rank)}</span>
        <span class="card-glyph">${SUIT_GLYPHS[card.suit]}</span>
      </div>
      <div class="card-center suit-${card.suit}">${SUIT_GLYPHS[card.suit]}</div>
      <div class="card-name suit-${card.suit}">${card.suit}</div>
    </div>
  `;
}

function renderCardSocket(className: string, label: string) {
  return `
    <div class="card ${className}">
      <div class="socket-copy">${label}</div>
    </div>
  `;
}

function chooseAutoplayIndex(spread: SpreadState) {
  const playable = getPlayableIndices(spread);
  if (playable.length === 0) return null;

  let best = playable[0]!;
  let bestScore = -Infinity;
  for (const index of playable) {
    const afterPlay = playCard(spread, index).spread;
    let score = getPlayableIndices(afterPlay).length * 10;
    if (afterPlay.chainLength >= 2 && afterPlay.active.suit === afterPlay.omenSuit) score += 7;
    if (score > bestScore) {
      best = index;
      bestScore = score;
    }
  }

  return best;
}

function tryAutoplayReserve(spread: SpreadState) {
  if (!canUseReserve(spread)) return null;

  if (spread.reserveCard) {
    const swapped = useReserve(spread);
    return getPlayableIndices(swapped).length > 0 ? swapped : null;
  }

  if (spread.stock.length === 0) return null;
  const stashed = useReserve(spread);
  return getPlayableIndices(stashed).length > 0 ? stashed : null;
}

function installDebugSurface() {
  const debug = {
    getState: () => ({
      phase: state.phase,
      spread: state.spread.label,
      score: state.score,
      bestScore: state.bestScore,
      active: formatCard(state.spread.active),
      reserve: formatCard(state.spread.reserveCard),
      reserveCharged: state.spread.reserveCharged,
      stock: state.spread.stock.length,
      nextDraw: formatCard(state.spread.stock[0] ?? null),
      playable: getPlayableIndices(state.spread).map((index) => index + 1),
      omen: state.spread.omenSuit,
      chain: state.spread.chainLength,
      spreadsCleared: state.spreadsCleared,
      victory: state.victory,
    }),
    startRun: (seed?: number) => startRun(seed ?? randomSeed()),
    playIndex: (index: number) => handleCard(index),
    draw: () => handleDraw(),
    reserve: () => handleReserve(),
    advanceTime: (_ms: number) => {
      if (state.phase === "transition") {
        clearTransition();
        const nextIndex = state.spreadIndex + 1;
        const label = spreadLabelAt(nextIndex);
        state.phase = "playing";
        state.spreadIndex = nextIndex;
        state.spread = createSpread(seedForSpread(state.runSeed, nextIndex), label);
        state.statusMessage = "";
        render();
      }
    },
    autoStep: () => {
      if (state.phase === "intro") {
        startRun(state.runSeed);
        return;
      }
      if (state.phase === "transition") {
        debug.advanceTime(1000);
        return;
      }
      if (state.phase !== "playing") return;

      const choice = chooseAutoplayIndex(state.spread);
      if (choice !== null) {
        handleCard(choice);
        return;
      }

      const reserveState = tryAutoplayReserve(state.spread);
      if (reserveState) {
        const wasSwap = Boolean(state.spread.reserveCard);
        state.spread = reserveState;
        state.statusMessage = wasSwap ? "RESERVE USED" : "CHARM STORED";
        resolveAfterAction();
        render();
        return;
      }

      if (state.spread.stock.length > 0) {
        handleDraw();
        return;
      }

      if (state.spread.reserveCard && state.spread.reserveCharged) {
        handleReserve();
      }
    },
  };

  Object.assign(window as Window & typeof globalThis, {
    render_game_to_text: () => JSON.stringify(debug.getState(), null, 2),
    advanceTime: debug.advanceTime,
    velvetArcanaDebug: debug,
  });
}

function readBestScore() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return 0;
  const parsed = Number(stored);
  return Number.isFinite(parsed) ? parsed : 0;
}

function writeBestScore(score: number) {
  window.localStorage.setItem(STORAGE_KEY, String(score));
}

function seedForSpread(runSeed: number, index: number) {
  return runSeed + index * 977;
}

function readSeedFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("seed");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function randomSeed() {
  return Math.floor(Math.random() * 1_000_000_000);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function escapeHtml(text: string) {
  return text
    .split("&")
    .join("&amp;")
    .split("<")
    .join("&lt;")
    .split(">")
    .join("&gt;")
    .split('"')
    .join("&quot;");
}

function capitalize(value: string) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function spreadLabelAt(index: number): SpreadLabel {
  const label = SPREAD_LABELS[index];
  if (!label) throw new Error(`[velvet-arcana] missing spread label for index ${index}`);
  return label;
}
