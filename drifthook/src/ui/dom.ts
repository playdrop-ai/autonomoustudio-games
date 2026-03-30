export type UISpecies = "dartfin" | "bloomkoi" | "glassperch" | "mooneel";
export type UIScreen = "start" | "playing" | "gameover";

export interface UIState {
  screen: UIScreen;
  score: number;
  bestScore: number;
  completedOrders: number;
  knots: number;
  maxKnots: number;
  order: UISpecies[];
  orderProgress: number;
}

export interface UIRefs {
  stage: HTMLDivElement;
  canvas: HTMLCanvasElement;
  hudRoot: HTMLDivElement;
  scoreValue: HTMLDivElement;
  knotPips: HTMLDivElement;
  orderSlots: HTMLDivElement[];
  startOverlay: HTMLDivElement;
  startButton: HTMLButtonElement;
  gameoverOverlay: HTMLDivElement;
  retryButton: HTMLButtonElement;
  resultScore: HTMLDivElement;
  resultBest: HTMLDivElement;
  resultOrders: HTMLDivElement;
}

export function createUI(): UIRefs {
  injectStyles();
  document.title = "Drifthook";
  document.body.className = "";
  document.body.style.margin = "0";
  document.body.style.background = "#060912";
  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none";

  const stage = document.createElement("div");
  stage.className = "drifthook-stage";
  document.body.appendChild(stage);

  const canvas = document.createElement("canvas");
  canvas.className = "drifthook-canvas";
  stage.appendChild(canvas);

  const hud = document.createElement("div");
  hud.className = "drifthook-ui";
  stage.appendChild(hud);

  const scoreChip = document.createElement("div");
  scoreChip.className = "dh-chip dh-score";
  scoreChip.innerHTML = `<span class="dh-label">Score</span>`;
  const scoreValue = document.createElement("div");
  scoreValue.className = "dh-score-value";
  scoreChip.appendChild(scoreValue);

  const orderStrip = document.createElement("div");
  orderStrip.className = "dh-order-strip";
  const orderSlots = Array.from({ length: 3 }, () => {
    const slot = document.createElement("div");
    slot.className = "dh-order-slot";
    const fish = document.createElement("div");
    fish.className = "dh-fish-token dh-fish-token--dartfin";
    slot.appendChild(fish);
    orderStrip.appendChild(slot);
    return slot;
  });

  const knotChip = document.createElement("div");
  knotChip.className = "dh-chip dh-knots";
  const knotPips = document.createElement("div");
  knotPips.className = "dh-knot-row";
  knotChip.appendChild(knotPips);

  hud.append(scoreChip, orderStrip, knotChip);

  const startOverlay = document.createElement("div");
  startOverlay.className = "dh-overlay dh-overlay--start";
  startOverlay.innerHTML = `
    <div class="dh-pill">
      <strong>Drifthook</strong>
      <span>Catch the leftmost fish next</span>
    </div>
    <div class="dh-sheet">
      <h1>Moonlit order-fishing.</h1>
      <p>Hold to lower the lantern lure. Release to reel it back up through the fish you need next.</p>
    </div>
  `;
  const startButton = document.createElement("button");
  startButton.className = "dh-cta";
  startButton.textContent = "Play";
  startOverlay.querySelector(".dh-sheet")!.appendChild(startButton);

  const gameoverOverlay = document.createElement("div");
  gameoverOverlay.className = "dh-overlay dh-overlay--gameover";
  gameoverOverlay.innerHTML = `
    <div class="dh-pill dh-pill--loss">
      <strong>Line Frayed</strong>
      <span>One more clean order was within reach</span>
    </div>
    <div class="dh-sheet">
      <h2>Keep the lantern steady.</h2>
      <p>Wrong fish and snag hits break the order card. Clean catches buy your line back.</p>
      <div class="dh-stat-grid">
        <div class="dh-stat"><span>Score</span><strong id="dh-result-score">0</strong></div>
        <div class="dh-stat"><span>Best</span><strong id="dh-result-best">0</strong></div>
        <div class="dh-stat"><span>Orders</span><strong id="dh-result-orders">0</strong></div>
      </div>
    </div>
  `;
  const retryButton = document.createElement("button");
  retryButton.className = "dh-cta";
  retryButton.textContent = "Retry";
  gameoverOverlay.querySelector(".dh-sheet")!.appendChild(retryButton);

  stage.append(startOverlay, gameoverOverlay);

  return {
    stage,
    canvas,
    hudRoot: hud,
    scoreValue,
    knotPips,
    orderSlots,
    startOverlay,
    startButton,
    gameoverOverlay,
    retryButton,
    resultScore: gameoverOverlay.querySelector("#dh-result-score") as HTMLDivElement,
    resultBest: gameoverOverlay.querySelector("#dh-result-best") as HTMLDivElement,
    resultOrders: gameoverOverlay.querySelector("#dh-result-orders") as HTMLDivElement,
  };
}

export function updateUI(refs: UIRefs, state: UIState): void {
  refs.hudRoot.style.opacity = state.screen === "playing" ? "1" : "0";
  refs.hudRoot.style.visibility = state.screen === "playing" ? "visible" : "hidden";
  refs.scoreValue.textContent = String(state.score);
  refs.resultScore.textContent = String(state.score);
  refs.resultBest.textContent = String(state.bestScore);
  refs.resultOrders.textContent = String(state.completedOrders);

  refs.knotPips.replaceChildren(
    ...Array.from({ length: state.maxKnots }, (_, index) => {
      const pip = document.createElement("div");
      pip.className = index < state.knots ? "dh-knot dh-knot--live" : "dh-knot";
      return pip;
    }),
  );

  refs.orderSlots.forEach((slot, index) => {
    slot.className = index < state.orderProgress ? "dh-order-slot dh-order-slot--done" : "dh-order-slot";
    const fish = slot.firstElementChild as HTMLDivElement;
    applySpeciesToken(fish, state.order[index] ?? "dartfin");
  });

  refs.startOverlay.style.visibility = state.screen === "start" ? "visible" : "hidden";
  refs.startOverlay.style.opacity = state.screen === "start" ? "1" : "0";
  refs.gameoverOverlay.style.visibility = state.screen === "gameover" ? "visible" : "hidden";
  refs.gameoverOverlay.style.opacity = state.screen === "gameover" ? "1" : "0";
}

function applySpeciesToken(element: HTMLDivElement, species: UISpecies): void {
  element.className = `dh-fish-token dh-fish-token--${species}`;
}

let stylesInjected = false;

function injectStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    :root {
      color-scheme: dark;
      --dh-text: #f6f1e6;
      --dh-muted: rgba(246, 241, 230, 0.7);
      --dh-panel: rgba(7, 12, 21, 0.72);
      --dh-border: rgba(255, 255, 255, 0.08);
      --dh-gold: #e8bf68;
      --dh-shadow: 0 18px 48px rgba(0, 0, 0, 0.26);
      font-family: "Avenir Next", "Nunito Sans", "Trebuchet MS", sans-serif;
    }

    .drifthook-stage {
      position: fixed;
      inset: 0;
      overflow: hidden;
      background: linear-gradient(180deg, #04070d 0%, #07111f 100%);
      touch-action: none;
    }

    .drifthook-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      touch-action: none;
    }

    .drifthook-ui {
      position: absolute;
      inset: 0;
      pointer-events: none;
      user-select: none;
    }

    .dh-chip {
      position: absolute;
      top: max(18px, env(safe-area-inset-top));
      border-radius: 20px;
      background: var(--dh-panel);
      border: 1px solid var(--dh-border);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(12px);
    }

    .dh-score {
      left: max(18px, env(safe-area-inset-left));
      min-width: 124px;
      padding: 12px 14px;
    }

    .dh-score-value {
      font-size: clamp(30px, 6vw, 40px);
      line-height: 1;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: var(--dh-text);
    }

    .dh-label {
      display: block;
      margin-bottom: 5px;
      font-size: 11px;
      line-height: 1;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--dh-muted);
    }

    .dh-order-strip {
      position: absolute;
      left: 50%;
      top: max(18px, env(safe-area-inset-top));
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 22px;
      background: var(--dh-panel);
      border: 1px solid var(--dh-border);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(12px);
    }

    .dh-order-slot {
      width: 66px;
      height: 66px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.07);
    }

    .dh-order-slot--done {
      background: rgba(232, 191, 104, 0.14);
      border-color: rgba(232, 191, 104, 0.35);
    }

    .dh-knots {
      right: max(18px, env(safe-area-inset-right));
      padding: 16px 18px;
    }

    .dh-knot-row {
      display: flex;
      gap: 10px;
    }

    .dh-knot {
      width: 14px;
      height: 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.15);
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    }

    .dh-knot--live {
      background: radial-gradient(circle at 30% 30%, #fff5dd 0%, var(--dh-gold) 55%, rgba(232, 191, 104, 0.24) 100%);
      box-shadow: 0 0 18px rgba(232, 191, 104, 0.2);
    }

    .dh-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transition: opacity 160ms ease;
    }

    .dh-pill {
      position: absolute;
      left: 50%;
      top: max(22px, env(safe-area-inset-top));
      transform: translateX(-50%);
      min-width: min(72vw, 340px);
      padding: 14px 18px;
      border-radius: 999px;
      text-align: center;
      background: var(--dh-panel);
      border: 1px solid var(--dh-border);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(12px);
    }

    .dh-pill strong,
    .dh-pill span {
      display: block;
    }

    .dh-pill strong {
      font-size: clamp(28px, 7vw, 40px);
      line-height: 1;
      color: var(--dh-text);
    }

    .dh-pill span {
      margin-top: 7px;
      color: var(--dh-muted);
      font-size: 12px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .dh-sheet {
      position: absolute;
      left: 50%;
      bottom: max(20px, env(safe-area-inset-bottom));
      transform: translateX(-50%);
      width: min(88vw, 520px);
      padding: 22px;
      border-radius: 28px;
      background: rgba(7, 12, 21, 0.84);
      border: 1px solid var(--dh-border);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), var(--dh-shadow);
      backdrop-filter: blur(14px);
      pointer-events: auto;
    }

    .dh-sheet h1,
    .dh-sheet h2,
    .dh-sheet p {
      margin: 0;
      color: var(--dh-text);
    }

    .dh-sheet h1,
    .dh-sheet h2 {
      font-size: clamp(34px, 8vw, 48px);
      line-height: 0.94;
      letter-spacing: -0.04em;
      margin-bottom: 10px;
    }

    .dh-sheet p {
      font-size: clamp(18px, 4vw, 22px);
      line-height: 1.34;
      color: var(--dh-muted);
    }

    .dh-cta {
      margin-top: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 12px 18px;
      border-radius: 999px;
      border: 0;
      background: linear-gradient(180deg, rgba(255, 235, 186, 0.98), rgba(232, 191, 104, 0.95));
      color: #0b1020;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
    }

    .dh-stat-grid {
      display: flex;
      gap: 12px;
      margin-top: 14px;
    }

    .dh-stat {
      flex: 1;
      padding: 12px 14px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .dh-stat span,
    .dh-stat strong {
      display: block;
    }

    .dh-stat span {
      margin-bottom: 6px;
      color: var(--dh-muted);
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    .dh-stat strong {
      font-size: clamp(24px, 5vw, 32px);
      color: var(--dh-text);
      letter-spacing: -0.04em;
    }

    .dh-fish-token {
      position: relative;
      height: 24px;
      border-radius: 999px;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.08);
    }

    .dh-fish-token::before {
      content: "";
      position: absolute;
      right: -12px;
      top: 5px;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 7px 0 7px 12px;
      border-color: transparent transparent transparent currentColor;
    }

    .dh-fish-token::after {
      content: "";
      position: absolute;
      left: 12px;
      top: 8px;
      width: 10px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.22);
    }

    .dh-fish-token--dartfin {
      width: 52px;
      color: #9fe7ff;
      background: linear-gradient(90deg, rgba(159, 231, 255, 0.96), rgba(129, 207, 245, 0.72));
    }

    .dh-fish-token--bloomkoi {
      width: 60px;
      color: #ffb16b;
      background: linear-gradient(90deg, rgba(255, 190, 116, 0.98), rgba(255, 141, 91, 0.78));
    }

    .dh-fish-token--glassperch {
      width: 56px;
      color: #d6d7ff;
      background: linear-gradient(90deg, rgba(221, 224, 255, 0.95), rgba(170, 177, 255, 0.7));
    }

    .dh-fish-token--mooneel {
      width: 64px;
      color: #9b88ff;
      background: linear-gradient(90deg, rgba(166, 151, 255, 0.98), rgba(124, 103, 242, 0.74));
    }

    @media (min-aspect-ratio: 1/1) {
      .dh-sheet {
        width: min(42vw, 560px);
      }

      .dh-pill {
        min-width: 320px;
      }
    }

    @media (max-width: 480px) {
      .dh-order-strip {
        top: calc(max(18px, env(safe-area-inset-top)) + 62px);
        gap: 8px;
        padding: 8px 10px;
      }

      .dh-order-slot {
        width: 58px;
        height: 58px;
      }

      .dh-score {
        min-width: 110px;
        padding: 12px 12px;
      }

      .dh-knots {
        padding: 14px 14px;
      }
    }
  `;
  document.head.appendChild(style);
}
