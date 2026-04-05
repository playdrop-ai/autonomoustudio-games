/// <reference types="playdrop-sdk-types" />

import {
  RUN_CLEAR_POINTS,
  SPREAD_CLEAR_POINTS,
  SPREAD_LABELS,
  createSpread,
  drawFromStock,
  formatCard,
  getPlayableIndices,
  getTopCard,
  isHardStuck,
  isPlayable,
  isSpreadCleared,
  playCard,
  type Card,
  type ColumnCard,
  type SpreadLabel,
  type SpreadState,
  type SuitKey,
} from "./game/state";

type Phase = "playing" | "transition" | "gameover";
type TutorialStep = "welcome" | "reveal" | "match" | "await-draw" | "draw";
type AutoPolicy = "random" | "casual" | "planner";
type AutoAction = { kind: "play"; columnIndex: number } | { kind: "draw" };

type GameState = {
  phase: Phase;
  runSeed: number;
  spreadIndex: number;
  spread: SpreadState;
  score: number;
  bestScore: number;
  spreadsCleared: number;
  victory: boolean;
  summaryMessage: string;
  recentRevealCardId: string | null;
  tutorialStep: TutorialStep | null;
  dismissedTutorialStep: TutorialStep | null;
  helpOpen: boolean;
};

const STORAGE_KEY = "velvet-arcana-best-score";
const TRANSITION_MS = 600;
const REVEAL_MS = 280;
const WELCOME_TO_REVEAL_MS = 1100;
const HOW_TO_PLAY_LINES = [
  "Turn a new reading from the deck when the target is empty.",
  "Only the top card in each column can be played.",
  "A legal play is exactly 1 rank higher or lower.",
  "If no card matches, reveal a new reading from the deck.",
  "Clear all 7 columns to finish the spread.",
];
const CARD_ASSET_DIR = "./assets/purple-deck-png";
const CARD_BACK_ASSET = `${CARD_ASSET_DIR}/back.png`;

const rootElement = document.getElementById("app");
if (!(rootElement instanceof HTMLElement)) throw new Error("[velvet-arcana] #app element missing");
const root = rootElement;
const HAS_PLAYDROP_HOST = new URLSearchParams(window.location.search).has("playdrop_channel");

let state = createInitialState();
let transitionTimer: number | null = null;
let revealTimer: number | null = null;
let tutorialTimer: number | null = null;

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
      message: "resetting the reading table",
      progress: 0.4,
    });
  }

  render();
  installDebugSurface();

  host?.setLoadingState({ status: "ready" });
}

function createInitialState(seed = readSeedFromUrl() ?? randomSeed()): GameState {
  return createRunState(seed);
}

function createRunState(seed: number): GameState {
  return {
    phase: "playing",
    runSeed: seed,
    spreadIndex: 0,
    spread: createSpread(seedForSpread(seed, 0), spreadLabelAt(0)),
    score: 0,
    bestScore: readBestScore(),
    spreadsCleared: 0,
    victory: false,
    summaryMessage: "",
    recentRevealCardId: null,
    tutorialStep: "welcome",
    dismissedTutorialStep: null,
    helpOpen: false,
  };
}

function startRun(seed = readSeedFromUrl() ?? randomSeed()) {
  clearTransition();
  clearRevealTimer();
  clearTutorialTimer();
  state = createRunState(seed);
  render();
}

function handleCard(columnIndex: number) {
  if (state.phase !== "playing" || state.helpOpen) return;
  const playable = getPlayableIndices(state.spread);
  if (!playable.includes(columnIndex)) return;

  const result = playCard(state.spread, columnIndex);
  state.spread = result.spread;
  state.score += result.points;
  state.helpOpen = false;
  if (state.tutorialStep === "match") {
    state.tutorialStep = "await-draw";
    state.dismissedTutorialStep = null;
  }
  setRecentReveal(result.revealedCardId);
  resolveAfterAction();
  render();
}

function handleDraw() {
  if (state.phase !== "playing" || state.helpOpen || state.spread.stock.length === 0) return;
  state.spread = drawFromStock(state.spread);
  state.helpOpen = false;
  if (state.tutorialStep === "welcome" || state.tutorialStep === "reveal") {
    state.tutorialStep = "match";
    state.dismissedTutorialStep = null;
  } else if (state.tutorialStep === "draw" || state.tutorialStep === "await-draw") {
    state.tutorialStep = null;
    state.dismissedTutorialStep = null;
  }
  state.recentRevealCardId = null;
  resolveAfterAction();
  render();
}

function resolveAfterAction() {
  if (isSpreadCleared(state.spread)) {
    state.spreadsCleared = state.spreadIndex + 1;
    state.score += SPREAD_CLEAR_POINTS;

    if (state.spreadIndex === SPREAD_LABELS.length - 1) {
      state.score += RUN_CLEAR_POINTS;
      finishRun(true, "All three spreads cleared.");
      return;
    }

    state.phase = "transition";
    state.summaryMessage = `${state.spread.label} cleared`;
    queueTransition();
    return;
  }

  if (isHardStuck(state.spread)) {
    finishRun(false, "No legal move remained.");
    return;
  }

  if (
    state.spread.label === "Past" &&
    state.tutorialStep === "await-draw" &&
    state.spread.active &&
    getPlayableIndices(state.spread).length === 0 &&
    state.spread.stock.length > 0
  ) {
    state.tutorialStep = "draw";
    state.dismissedTutorialStep = null;
  }
}

function queueTransition() {
  clearTransition();
  transitionTimer = window.setTimeout(() => {
    startNextSpread();
  }, TRANSITION_MS);
}

function startNextSpread() {
  clearTransition();
  clearTutorialTimer();
  const nextIndex = state.spreadIndex + 1;
  state.phase = "playing";
  state.spreadIndex = nextIndex;
  state.spread = createSpread(seedForSpread(state.runSeed, nextIndex), spreadLabelAt(nextIndex));
  state.summaryMessage = "";
  state.recentRevealCardId = null;
  state.tutorialStep = null;
  state.dismissedTutorialStep = null;
  state.helpOpen = false;
  render();
}

function finishRun(victory: boolean, summaryMessage: string) {
  clearTransition();
  clearRevealTimer();
  clearTutorialTimer();
  state.phase = "gameover";
  state.victory = victory;
  state.summaryMessage = summaryMessage;
  state.recentRevealCardId = null;
  state.tutorialStep = null;
  state.dismissedTutorialStep = null;
  state.helpOpen = false;
  state.bestScore = Math.max(state.bestScore, state.score);
  writeBestScore(state.bestScore);
  render();
}

function setRecentReveal(cardId: string | null) {
  clearRevealTimer();
  state.recentRevealCardId = cardId;
  if (!cardId) return;

  revealTimer = window.setTimeout(() => {
    if (state.recentRevealCardId === cardId) {
      state.recentRevealCardId = null;
      render();
    }
  }, REVEAL_MS);
}

function clearTransition() {
  if (transitionTimer !== null) {
    window.clearTimeout(transitionTimer);
    transitionTimer = null;
  }
}

function clearRevealTimer() {
  if (revealTimer !== null) {
    window.clearTimeout(revealTimer);
    revealTimer = null;
  }
}

function clearTutorialTimer() {
  if (tutorialTimer !== null) {
    window.clearTimeout(tutorialTimer);
    tutorialTimer = null;
  }
}

function getVisibleSpeechStep(): Exclude<TutorialStep, "await-draw"> | null {
  if (state.phase !== "playing") return null;
  if (!state.tutorialStep || state.tutorialStep === "await-draw") return null;
  return state.dismissedTutorialStep === state.tutorialStep ? null : state.tutorialStep;
}

function tutorialMessage(step: Exclude<TutorialStep, "await-draw">) {
  if (step === "welcome") return "Welcome to the reading. We will start with the Past.";
  if (step === "reveal") return "Tap below to reveal your reading.";
  if (step === "match") return "Now tap a top card that is 1 above or 1 below your reading.";
  return "No match? Tap below to reveal a new reading.";
}

function tutorialPulseTarget(playableColumns: number[]): { kind: "stock" } | { kind: "column"; columnIndex: number } | null {
  if (state.phase !== "playing" || state.helpOpen) return null;

  if (state.tutorialStep === "reveal" || state.tutorialStep === "draw") {
    return state.spread.stock.length > 0 ? { kind: "stock" } : null;
  }

  if (state.tutorialStep === "match") {
    const columnIndex = playableColumns[0];
    return columnIndex === undefined ? null : { kind: "column", columnIndex };
  }

  return null;
}

function syncTutorialTimer() {
  clearTutorialTimer();
  if (getVisibleSpeechStep() !== "welcome") return;

  tutorialTimer = window.setTimeout(() => {
    if (state.phase !== "playing" || state.tutorialStep !== "welcome") return;
    state.tutorialStep = "reveal";
    state.dismissedTutorialStep = null;
    render();
  }, WELCOME_TO_REVEAL_MS);
}

function handleGuide() {
  if (state.helpOpen) return;

  const speechStep = getVisibleSpeechStep();
  if (speechStep) {
    if (speechStep === "welcome") {
      clearTutorialTimer();
      state.tutorialStep = "reveal";
      state.dismissedTutorialStep = null;
    } else {
      state.dismissedTutorialStep = state.tutorialStep;
    }
    render();
    return;
  }

  if (state.phase !== "playing") return;
  state.helpOpen = true;
  render();
}

function dismissHelp() {
  if (!state.helpOpen) return;
  state.helpOpen = false;
  render();
}

function render() {
  const playableColumnIndices = getPlayableIndices(state.spread);
  const playableColumns = new Set(playableColumnIndices);
  const speechStep = getVisibleSpeechStep();
  const pulseTarget = tutorialPulseTarget(playableColumnIndices);
  const nextSpreadLabel =
    state.phase === "transition" ? spreadLabelAt(state.spreadIndex + 1) : state.spread.label;
  const spreadDisplayLabel = `${state.spread.label.toLowerCase()} ${state.spreadIndex + 1}/${SPREAD_LABELS.length}`;
  const phaseClass = `page--phase-${state.spread.label.toLowerCase()}`;

  root.innerHTML = `
    <div class="page ${phaseClass} ${HAS_PLAYDROP_HOST ? "page--hosted" : ""}">
      <main class="table">
        ${renderHud(spreadDisplayLabel, speechStep)}

        <section class="board">
          <div class="tableau">
            ${renderColumns(playableColumns, pulseTarget)}
          </div>

          <div class="piles">
            ${renderStockPile(state.spread.stock, state.spread.showNextStockPreview, pulseTarget?.kind === "stock")}
            ${renderActivePile(state.spread)}
          </div>
        </section>

        <section class="overlay overlay--transition ${state.phase === "transition" ? "" : "hidden"}" aria-hidden="${state.phase === "transition" ? "false" : "true"}">
          <div class="phase-transition">${escapeHtml(nextSpreadLabel)}</div>
        </section>

        <section class="overlay overlay--help ${state.helpOpen ? "" : "hidden"} js-help-dismiss" aria-hidden="${state.helpOpen ? "false" : "true"}">
          <div class="overlay-panel overlay-panel--help">
            <h2>How To Play</h2>
            <ul class="help-list">
              ${HOW_TO_PLAY_LINES.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
            </ul>
          </div>
        </section>

        <section class="overlay overlay--gameover ${state.phase === "gameover" ? "" : "hidden"}">
          <div class="overlay-panel">
            <h2>${state.victory ? "Reading Complete" : "Reading Closed"}</h2>
            <p>${escapeHtml(state.summaryMessage)}</p>
            <div class="summary-row">
              <div class="summary-value">${formatNumber(state.score)}</div>
              <div class="summary-label">score</div>
            </div>
            <div class="summary-row">
              <div class="summary-value">${state.spreadsCleared} / ${SPREAD_LABELS.length}</div>
              <div class="summary-label">spreads</div>
            </div>
            <div class="summary-row">
              <div class="summary-value">${formatNumber(state.bestScore)}</div>
              <div class="summary-label">best</div>
            </div>
            <button class="primary-button js-restart" type="button">Play Again</button>
          </div>
        </section>
      </main>
    </div>
  `;

  root.querySelectorAll<HTMLButtonElement>(".js-column-card").forEach((button) => {
    button.addEventListener("click", () => {
      const columnIndex = Number(button.dataset.column);
      handleCard(columnIndex);
    });
  });
  root.querySelector<HTMLButtonElement>(".js-draw")?.addEventListener("click", handleDraw);
  root.querySelector<HTMLButtonElement>(".js-guide")?.addEventListener("click", handleGuide);
  root.querySelector<HTMLElement>(".js-help-dismiss")?.addEventListener("click", dismissHelp);
  root.querySelector<HTMLButtonElement>(".js-restart")?.addEventListener("click", () => startRun(randomSeed()));
  syncTutorialTimer();
}

function renderHud(spreadDisplayLabel: string, speechStep: Exclude<TutorialStep, "await-draw"> | null) {
  const guideButton = `
    <button class="guide-button js-guide" type="button" aria-label="${speechStep ? "Dismiss speech" : "How to play"}">
      <span class="guide-avatar" aria-hidden="true">
        <span class="guide-avatar__head"></span>
        <span class="guide-avatar__body"></span>
      </span>
    </button>
  `;

  if (speechStep) {
    return `
      <header class="hud hud--speaking">
        <div class="hud-speech">
          <div class="speech-bubble">${escapeHtml(tutorialMessage(speechStep))}</div>
          ${guideButton}
        </div>
      </header>
    `;
  }

  return `
    <header class="hud">
      <div class="score-readout">${formatNumber(state.score)}</div>
      <div class="hud-right">
        <div class="phase-pill">${escapeHtml(spreadDisplayLabel)}</div>
        ${guideButton}
      </div>
    </header>
  `;
}

function renderColumns(
  playableColumns: Set<number>,
  pulseTarget: { kind: "stock" } | { kind: "column"; columnIndex: number } | null,
) {
  return state.spread.columns
    .map((column, columnIndex) => {
      const topIndex = column.length - 1;
      return `
        <div class="column" data-column="${columnIndex + 1}">
          ${column
            .map((entry, depthIndex) =>
              renderStackCard({
                entry,
                columnIndex,
                depthIndex,
                isTop: depthIndex === topIndex,
                playable: playableColumns.has(columnIndex),
                pulse: pulseTarget?.kind === "column" && pulseTarget.columnIndex === columnIndex && depthIndex === topIndex,
              }),
            )
            .join("")}
        </div>
      `;
    })
    .join("");
}

function renderStackCard({
  entry,
  columnIndex,
  depthIndex,
  isTop,
  playable,
  pulse,
}: {
  entry: ColumnCard;
  columnIndex: number;
  depthIndex: number;
  isTop: boolean;
  playable: boolean;
  pulse: boolean;
}) {
  const tag = isTop && entry.faceUp ? "button" : "div";
  const interactiveClass = tag === "button" ? "js-column-card" : "";
  const revealed = state.recentRevealCardId === entry.card.id;
  return `
    <${tag}
      class="stack-card ${interactiveClass} ${isTop ? "stack-card--top" : ""}"
      style="--stack-index: ${depthIndex};"
      ${tag === "button" ? `type="button" data-column="${columnIndex}" data-playable="${playable ? "true" : "false"}"` : ""}
      aria-label="${escapeHtml(formatCard(entry.card))}"
    >
      ${renderPlayingCard(entry.card, {
        faceUp: entry.faceUp,
        playable,
        revealed,
      })}
      ${pulse ? `<div class="tap-target" aria-hidden="true"></div>` : ""}
    </${tag}>
  `;
}

function renderPlayingCard(
  card: Card,
  options: { faceUp: boolean; playable?: boolean; revealed?: boolean; compact?: boolean },
) {
  const classes = [
    "playing-card",
    options.faceUp ? "is-face-up" : "is-face-down",
    options.revealed ? "is-revealed" : "",
    options.compact ? "playing-card--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <div class="${classes}" data-suit="${card.suit}">
      <div class="playing-card__inner">
        <div class="playing-card__side playing-card__side--face">
          <img class="playing-card__art" src="${faceAssetForCard(card)}" alt="" draggable="false" />
        </div>
        <div class="playing-card__side playing-card__side--reverse">
          <img class="playing-card__art" src="${CARD_BACK_ASSET}" alt="" draggable="false" />
        </div>
      </div>
    </div>
  `;
}

function renderStockPile(stock: Card[], showTopCard: boolean, pulse: boolean) {
  if (stock.length === 0) {
    return `
      <div class="stock-slot">
        <div class="pile pile--stock pile--empty" aria-hidden="true">
          <div class="pile-frame"></div>
        </div>
      </div>
    `;
  }

  const topCard = stock[0]!;
  const underCards = stock.slice(1, 3);
  const stackMarkup = [
    ...underCards.map((card, index) =>
      renderPileLayer({
        card,
        pileClass: "pile-layer--stock",
        layerIndex: underCards.length - index,
        faceUp: false,
      }),
    ),
    renderPileLayer({
      card: topCard,
      pileClass: "pile-layer--stock",
      layerIndex: 0,
      faceUp: showTopCard,
    }),
  ].join("");

  return `
    <div class="stock-slot">
      <button class="pile pile--stock js-draw" type="button" aria-label="Draw from stock">
        <div class="pile-stack">
          ${stackMarkup}
          ${pulse ? `<div class="tap-target tap-target--pile" aria-hidden="true"></div>` : ""}
        </div>
      </button>
    </div>
  `;
}

function renderActivePile(spread: SpreadState) {
  const altarMarkup = renderActiveAltar(Boolean(spread.active));

  if (!spread.active) {
    return `
      <div class="pile pile--active pile--active-empty" aria-label="Current reading">
        <div class="pile-stack pile-stack--active">
          ${altarMarkup}
        </div>
      </div>
    `;
  }

  const visibleTrail = spread.activeTrail.slice(-2);
  const stackMarkup = [
    altarMarkup,
    ...visibleTrail.map((card, index) =>
      renderPileLayer({
        card,
        pileClass: "pile-layer--active",
        layerIndex: visibleTrail.length - index,
        faceUp: true,
        extraClass: "pile-layer--trail",
      }),
    ),
    renderPileLayer({
      card: spread.active,
      pileClass: "pile-layer--active",
      layerIndex: 0,
      faceUp: true,
      extraClass: "pile-layer--current",
    }),
  ].join("");

  return `
    <div class="pile pile--active" aria-label="Current reading">
      <div class="pile-stack pile-stack--active">${stackMarkup}</div>
    </div>
  `;
}

function renderActiveAltar(occupied: boolean) {
  return `
    <div class="active-altar ${occupied ? "active-altar--occupied" : "active-altar--idle"}" aria-hidden="true">
      <img class="active-altar__image active-altar__image--idle" src="./assets/card-altar-isolated-no-glow-generated.png" alt="" />
      <img class="active-altar__image active-altar__image--glow" src="./assets/card-altar-isolated-generated.png" alt="" />
    </div>
  `;
}

function renderPileLayer({
  card,
  pileClass,
  layerIndex,
  faceUp,
  extraClass,
}: {
  card: Card;
  pileClass: string;
  layerIndex: number;
  faceUp: boolean;
  extraClass?: string;
}) {
  return `
    <div class="pile-layer ${pileClass} ${extraClass ?? ""}" style="--pile-layer-index: ${layerIndex};">
      ${renderPlayingCard(card, { faceUp, compact: true })}
    </div>
  `;
}

function faceAssetForCard(card: Card) {
  return `${CARD_ASSET_DIR}/${assetSuitKey(card.suit)}-${assetRankKey(card.rank)}.png`;
}

function assetSuitKey(suit: SuitKey) {
  return suit === "blade" ? "tree" : suit;
}

function assetRankKey(rank: number) {
  if (rank === 11) return "jack";
  if (rank === 12) return "queen";
  if (rank === 13) return "king";
  return String(rank);
}

function chooseAutoplayAction(spread: SpreadState, policy: AutoPolicy, seed: number): AutoAction | null {
  const playable = getPlayableIndices(spread);

  if (policy === "random") {
    const actions: AutoAction[] = [
      ...playable.map((columnIndex) => ({ kind: "play" as const, columnIndex })),
      ...(spread.stock.length > 0 ? [{ kind: "draw" as const }] : []),
    ];
    return actions.length > 0 ? actions[seededIndex(seed, actions.length)]! : null;
  }

  const candidates: Array<{ action: AutoAction; score: number }> = [];

  for (const columnIndex of playable) {
    const result = playCard(spread, columnIndex);
    const immediateScore =
      100 +
      (result.revealedCardId ? 16 : 0) +
      ((result.spread.columns[columnIndex]?.length ?? 0) === 0 ? 6 : 0);
    const lookahead =
      policy === "planner"
        ? evaluateSpreadPosition(result.spread, 3, seed + columnIndex * 17)
        : staticSpreadScore(result.spread);
    candidates.push({
      action: { kind: "play", columnIndex },
      score: immediateScore + lookahead,
    });
  }

  if (spread.stock.length > 0) {
    const drawnSpread = drawFromStock(spread);
    const drawScore =
      (policy === "planner"
        ? evaluateSpreadPosition(drawnSpread, 3, seed + 97)
        : staticSpreadScore(drawnSpread)) - 10;
    candidates.push({
      action: { kind: "draw" },
      score: drawScore,
    });
  }

  if (candidates.length === 0) return null;

  let bestAction = candidates[0]!.action;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    if (candidate.score > bestScore) {
      bestScore = candidate.score;
      bestAction = candidate.action;
    }
  }

  return bestAction;
}

function evaluateSpreadPosition(spread: SpreadState, depth: number, seed: number): number {
  if (isSpreadCleared(spread)) return 600;

  const playable = getPlayableIndices(spread);
  if (depth <= 0) return staticSpreadScore(spread);

  let best = spread.stock.length > 0 ? evaluateSpreadPosition(drawFromStock(spread), depth - 1, seed + 53) - 10 : -240;

  for (const columnIndex of playable) {
    const result = playCard(spread, columnIndex);
    const immediateScore =
      90 +
      (result.revealedCardId ? 18 : 0) +
      ((result.spread.columns[columnIndex]?.length ?? 0) === 0 ? 10 : 0);
    const futureScore = evaluateSpreadPosition(result.spread, depth - 1, seed + columnIndex * 19);
    best = Math.max(best, immediateScore + futureScore);
  }

  return best;
}

function staticSpreadScore(spread: SpreadState) {
  const playable = getPlayableIndices(spread);
  const hiddenCards = spread.columns.reduce(
    (total, column) => total + column.reduce((columnTotal, entry) => columnTotal + (entry.faceUp ? 0 : 1), 0),
    0,
  );
  const remainingColumns = spread.columns.reduce((total, column) => total + (column.length > 0 ? 1 : 0), 0);
  const remainingCards = spread.columns.reduce((total, column) => total + column.length, 0);

  return playable.length * 26 + hiddenCards * 4 + remainingColumns * 3 - spread.stock.length + (35 - remainingCards) * 4;
}

function simulateRuns(policy: AutoPolicy, runs = 100, seedStart = 10_000) {
  let wins = 0;
  let totalScore = 0;
  let clearedPast = 0;
  let clearedPresent = 0;

  for (let run = 0; run < runs; run += 1) {
    const runSeed = seedStart + run;
    let spreadIndex = 0;
    let spread = createSpread(seedForSpread(runSeed, 0), spreadLabelAt(0));
    let score = 0;
    let cleared = 0;

    while (true) {
      if (isSpreadCleared(spread)) {
        score += SPREAD_CLEAR_POINTS;
        cleared = spreadIndex + 1;
        if (spreadIndex === SPREAD_LABELS.length - 1) {
          score += RUN_CLEAR_POINTS;
          wins += 1;
          break;
        }
        spreadIndex += 1;
        spread = createSpread(seedForSpread(runSeed, spreadIndex), spreadLabelAt(spreadIndex));
        continue;
      }

      const action = chooseAutoplayAction(spread, policy, runSeed + score + spread.stock.length + spreadIndex * 17);
      if (action?.kind === "play") {
        const result = playCard(spread, action.columnIndex);
        spread = result.spread;
        score += result.points;
        continue;
      }

      if (action?.kind === "draw") {
        spread = drawFromStock(spread);
        continue;
      }

      break;
    }

    if (cleared >= 1) clearedPast += 1;
    if (cleared >= 2) clearedPresent += 1;
    totalScore += score;
  }

  return {
    policy,
    runs,
    wins,
    winRate: wins / runs,
    clearedPastRate: clearedPast / runs,
    clearedPresentRate: clearedPresent / runs,
    averageScore: totalScore / runs,
  };
}

function installDebugSurface() {
  const debug = {
    getState: () => ({
      phase: state.phase,
      spread: state.spread.label,
      spreadMode: state.spread.showBuriedFaces
        ? state.spread.showNextStockPreview
          ? "past"
          : "present"
        : "future",
      score: state.score,
      bestScore: state.bestScore,
      active: formatCard(state.spread.active),
      stock: state.spread.stock.length,
      stockPreviewVisible: state.spread.showNextStockPreview,
      stockPreview: state.spread.showNextStockPreview ? formatCard(state.spread.stock[0] ?? null) : "hidden",
      playableColumns: getPlayableIndices(state.spread).map((index) => index + 1),
      tutorialStep: state.tutorialStep,
      speechVisible: Boolean(getVisibleSpeechStep()),
      helpOpen: state.helpOpen,
      columns: state.spread.columns.map((column, index) => ({
        column: index + 1,
        exposed: formatCard(getTopCard(column)),
        hiddenCount: column.filter((entry) => !entry.faceUp).length,
        cards: column.map((entry) => (entry.faceUp ? formatCard(entry.card) : "back")),
      })),
      spreadsCleared: state.spreadsCleared,
      victory: state.victory,
    }),
    startRun: (seed?: number) => startRun(seed ?? randomSeed()),
    playColumn: (columnIndex: number) => handleCard(columnIndex),
    draw: () => handleDraw(),
    setTutorialStep: (step: TutorialStep | null) => {
      clearTutorialTimer();
      state.tutorialStep = step;
      state.dismissedTutorialStep = null;
      render();
    },
    dismissSpeech: () => {
      if (!state.tutorialStep) return;
      state.dismissedTutorialStep = state.tutorialStep;
      render();
    },
    setHelpOpen: (open: boolean) => {
      state.helpOpen = open;
      render();
    },
    advanceTime: (_ms: number) => {
      if (state.phase === "transition") {
        startNextSpread();
      }
    },
    autoStep: (policy: AutoPolicy = "planner") => {
      if (state.phase === "transition") {
        startNextSpread();
        return;
      }

      if (state.phase !== "playing") return;

      const action = chooseAutoplayAction(
        state.spread,
        policy,
        state.runSeed + state.score + state.spread.stock.length + state.spreadIndex * 13,
      );

      if (action?.kind === "play") {
        handleCard(action.columnIndex);
        return;
      }

      if (action?.kind === "draw") {
        handleDraw();
      }
    },
    simulateRuns: (policy: AutoPolicy = "planner", runs = 100, seedStart = 10_000) =>
      simulateRuns(policy, runs, seedStart),
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

function seededIndex(seed: number, length: number) {
  const normalized = Math.abs(seed % length);
  return normalized;
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

function spreadLabelAt(index: number): SpreadLabel {
  const label = SPREAD_LABELS[index];
  if (!label) throw new Error(`[velvet-arcana] missing spread label for index ${index}`);
  return label;
}
