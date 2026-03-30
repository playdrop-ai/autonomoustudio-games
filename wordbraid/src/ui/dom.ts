import type { Screen } from "../game/logic.ts";

export interface UIModel {
  screen: Screen;
  score: number;
  bestScore: number;
  combo: number;
  bestCombo: number;
  wordsPlayed: number;
  threatText: string;
  threatDetail: string;
  trayLetters: string[];
  trayWord: string;
  trayValid: boolean;
  canSubmit: boolean;
  canClear: boolean;
  helperText: string;
}

export interface UIRefs {
  stage: HTMLDivElement;
  canvas: HTMLCanvasElement;
  hudRoot: HTMLDivElement;
  scoreValue: HTMLDivElement;
  comboValue: HTMLDivElement;
  threatValue: HTMLDivElement;
  threatDetail: HTMLDivElement;
  helperText: HTMLDivElement;
  trayWord: HTMLDivElement;
  traySlots: HTMLButtonElement[];
  weaveButton: HTMLButtonElement;
  clearButton: HTMLButtonElement;
  startOverlay: HTMLDivElement;
  startButton: HTMLButtonElement;
  gameoverOverlay: HTMLDivElement;
  retryButton: HTMLButtonElement;
  resultScore: HTMLDivElement;
  resultBest: HTMLDivElement;
  resultCombo: HTMLDivElement;
  resultWords: HTMLDivElement;
}

export function createUI(): UIRefs {
  injectStyles();
  document.title = "Wordbraid";
  document.body.className = "";
  document.body.style.margin = "0";
  document.body.style.background = "#08111f";
  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "manipulation";

  const stage = document.createElement("div");
  stage.className = "wb-stage";
  document.body.replaceChildren(stage);

  const canvas = document.createElement("canvas");
  canvas.className = "wb-canvas";
  stage.appendChild(canvas);

  const hudRoot = document.createElement("div");
  hudRoot.className = "wb-ui";
  stage.appendChild(hudRoot);

  const scoreChip = chip("Score");
  const scoreValue = document.createElement("div");
  scoreValue.className = "wb-chip-value";
  scoreChip.appendChild(scoreValue);

  const comboChip = chip("Combo");
  const comboValue = document.createElement("div");
  comboValue.className = "wb-chip-value";
  comboChip.appendChild(comboValue);

  const threatChip = chip("Ink");
  const threatValue = document.createElement("div");
  threatValue.className = "wb-chip-value wb-chip-value--threat";
  const threatDetail = document.createElement("div");
  threatDetail.className = "wb-chip-subtle";
  threatChip.append(threatValue, threatDetail);

  const trayDock = document.createElement("div");
  trayDock.className = "wb-tray-dock";

  const trayWord = document.createElement("div");
  trayWord.className = "wb-tray-word";
  trayDock.appendChild(trayWord);

  const trayRow = document.createElement("div");
  trayRow.className = "wb-tray-row";
  const traySlots = Array.from({ length: 5 }, () => {
    const button = document.createElement("button");
    button.className = "wb-tray-slot";
    button.type = "button";
    trayRow.appendChild(button);
    return button;
  });

  const trayActions = document.createElement("div");
  trayActions.className = "wb-tray-actions";
  const clearButton = document.createElement("button");
  clearButton.className = "wb-secondary";
  clearButton.type = "button";
  clearButton.textContent = "Clear";
  const weaveButton = document.createElement("button");
  weaveButton.className = "wb-primary";
  weaveButton.type = "button";
  weaveButton.textContent = "Weave";
  trayActions.append(clearButton, weaveButton);

  const helperText = document.createElement("div");
  helperText.className = "wb-helper";

  trayDock.append(trayRow, trayActions, helperText);

  hudRoot.append(scoreChip, comboChip, threatChip, trayDock);

  const startOverlay = document.createElement("div");
  startOverlay.className = "wb-overlay wb-overlay--start";
  startOverlay.innerHTML = `
    <div class="wb-pill">
      <strong>Wordbraid</strong>
      <span>Five ribbons. One ink-fed press.</span>
    </div>
    <div class="wb-sheet">
      <h1>Build 3-to-5-letter words before the loom jams.</h1>
      <p>Tap ribbons to pull their front tiles. Longer words scrub ink from the most threatened lane.</p>
      <div class="wb-hint-row">
        <span>Mobile: tap ribbons, tap the tray tail to undo</span>
        <span>Desktop: 1-5, Enter, Backspace, Escape</span>
      </div>
    </div>
  `;
  const startButton = document.createElement("button");
  startButton.className = "wb-primary wb-primary--wide";
  startButton.type = "button";
  startButton.textContent = "Start";
  startOverlay.querySelector(".wb-sheet")!.appendChild(startButton);

  const gameoverOverlay = document.createElement("div");
  gameoverOverlay.className = "wb-overlay wb-overlay--gameover";
  gameoverOverlay.innerHTML = `
    <div class="wb-pill wb-pill--loss">
      <strong>Press Jammed</strong>
      <span>Ink reached the braid front.</span>
    </div>
    <div class="wb-sheet">
      <h2>Hold longer next run.</h2>
      <p>Cash short words when you must, but 4- and 5-letter braids are what buy the loom back.</p>
      <div class="wb-stat-grid">
        <div class="wb-stat"><span>Score</span><strong id="wb-result-score">0</strong></div>
        <div class="wb-stat"><span>Best</span><strong id="wb-result-best">0</strong></div>
        <div class="wb-stat"><span>Best Combo</span><strong id="wb-result-combo">0</strong></div>
        <div class="wb-stat"><span>Words</span><strong id="wb-result-words">0</strong></div>
      </div>
    </div>
  `;
  const retryButton = document.createElement("button");
  retryButton.className = "wb-primary wb-primary--wide";
  retryButton.type = "button";
  retryButton.textContent = "Play Again";
  gameoverOverlay.querySelector(".wb-sheet")!.appendChild(retryButton);

  stage.append(startOverlay, gameoverOverlay);

  return {
    stage,
    canvas,
    hudRoot,
    scoreValue,
    comboValue,
    threatValue,
    threatDetail,
    helperText,
    trayWord,
    traySlots,
    weaveButton,
    clearButton,
    startOverlay,
    startButton,
    gameoverOverlay,
    retryButton,
    resultScore: gameoverOverlay.querySelector("#wb-result-score") as HTMLDivElement,
    resultBest: gameoverOverlay.querySelector("#wb-result-best") as HTMLDivElement,
    resultCombo: gameoverOverlay.querySelector("#wb-result-combo") as HTMLDivElement,
    resultWords: gameoverOverlay.querySelector("#wb-result-words") as HTMLDivElement,
  };
}

export function updateUI(refs: UIRefs, model: UIModel): void {
  refs.scoreValue.textContent = formatNumber(model.score);
  refs.comboValue.textContent = model.combo > 0 ? `x${model.combo}` : "x1";
  refs.threatValue.textContent = model.threatText;
  refs.threatDetail.textContent = model.threatDetail;
  refs.helperText.textContent = model.helperText;
  refs.trayWord.textContent = model.trayWord || "Pick a braid";
  refs.trayWord.className = model.trayValid ? "wb-tray-word wb-tray-word--valid" : "wb-tray-word";

  refs.traySlots.forEach((slot, index) => {
    const letter = model.trayLetters[index] ?? "";
    slot.textContent = letter;
    slot.className = "wb-tray-slot";
    if (letter) slot.classList.add("wb-tray-slot--filled");
    if (index === model.trayLetters.length - 1) slot.classList.add("wb-tray-slot--tail");
    slot.disabled = index !== model.trayLetters.length - 1;
    slot.ariaLabel = index === model.trayLetters.length - 1 ? "Undo last letter" : "Tray slot";
  });

  refs.weaveButton.disabled = !model.canSubmit;
  refs.clearButton.disabled = !model.canClear;

  refs.hudRoot.style.opacity = model.screen === "playing" ? "1" : "0";
  refs.hudRoot.style.visibility = model.screen === "playing" ? "visible" : "hidden";
  refs.startOverlay.style.opacity = model.screen === "start" ? "1" : "0";
  refs.startOverlay.style.visibility = model.screen === "start" ? "visible" : "hidden";
  refs.gameoverOverlay.style.opacity = model.screen === "gameover" ? "1" : "0";
  refs.gameoverOverlay.style.visibility = model.screen === "gameover" ? "visible" : "hidden";

  refs.resultScore.textContent = formatNumber(model.score);
  refs.resultBest.textContent = formatNumber(model.bestScore);
  refs.resultCombo.textContent = `x${model.bestCombo}`;
  refs.resultWords.textContent = String(model.wordsPlayed);
}

function chip(label: string): HTMLDivElement {
  const root = document.createElement("div");
  root.className = "wb-chip";
  const tag = document.createElement("span");
  tag.className = "wb-chip-label";
  tag.textContent = label;
  root.appendChild(tag);
  return root;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

let stylesInjected = false;

function injectStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    :root {
      color-scheme: dark;
      --wb-text: #f6eed6;
      --wb-muted: rgba(246, 238, 214, 0.68);
      --wb-panel: rgba(6, 10, 16, 0.54);
      --wb-panel-strong: rgba(10, 16, 25, 0.82);
      --wb-border: rgba(255, 255, 255, 0.08);
      --wb-gold: #d2af68;
      --wb-copper: #d7894e;
      --wb-danger: #cb6558;
      --wb-ink: #0a1220;
      font-family: "Avenir Next", "Gill Sans", "Trebuchet MS", sans-serif;
    }

    .wb-stage {
      position: fixed;
      inset: 0;
      overflow: hidden;
      touch-action: manipulation;
      background: #08111f;
    }

    .wb-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
      touch-action: manipulation;
    }

    .wb-ui {
      position: absolute;
      inset: 0;
      pointer-events: none;
      user-select: none;
      transition: opacity 160ms ease;
    }

    .wb-chip {
      position: absolute;
      top: max(14px, env(safe-area-inset-top));
      padding: 12px 14px;
      border-radius: 22px;
      background: var(--wb-panel);
      border: 1px solid var(--wb-border);
      backdrop-filter: blur(14px);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }

    .wb-chip:nth-child(1) {
      left: max(14px, env(safe-area-inset-left));
      min-width: 118px;
    }

    .wb-chip:nth-child(2) {
      left: 50%;
      transform: translateX(-50%);
      min-width: 102px;
      text-align: center;
    }

    .wb-chip:nth-child(3) {
      right: max(14px, env(safe-area-inset-right));
      min-width: 132px;
      text-align: right;
    }

    .wb-chip-label {
      display: block;
      margin-bottom: 6px;
      font-size: 11px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--wb-muted);
    }

    .wb-chip-value {
      font-size: clamp(22px, 6vw, 36px);
      font-weight: 800;
      letter-spacing: -0.04em;
      color: var(--wb-text);
      line-height: 1;
    }

    .wb-chip-value--threat {
      color: #ffd4bf;
    }

    .wb-chip-subtle {
      margin-top: 6px;
      font-size: 12px;
      color: var(--wb-muted);
    }

    .wb-tray-dock {
      position: absolute;
      left: 50%;
      bottom: max(18px, env(safe-area-inset-bottom));
      transform: translateX(-50%);
      width: min(calc(100vw - 24px), 470px);
      padding: 14px;
      border-radius: 28px;
      background: var(--wb-panel-strong);
      border: 1px solid var(--wb-border);
      backdrop-filter: blur(16px);
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
      pointer-events: auto;
    }

    .wb-tray-word {
      min-height: 28px;
      margin-bottom: 10px;
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--wb-muted);
    }

    .wb-tray-word--valid {
      color: #ffe3b4;
    }

    .wb-tray-row {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
    }

    .wb-tray-slot {
      min-height: 60px;
      border: 0;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.06);
      color: var(--wb-text);
      font-size: 28px;
      font-weight: 800;
      cursor: default;
      transition: transform 120ms ease, background 120ms ease, box-shadow 120ms ease;
    }

    .wb-tray-slot--filled {
      background: linear-gradient(180deg, #f5ebd2 0%, #d9c298 100%);
      color: var(--wb-ink);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.46);
    }

    .wb-tray-slot--tail {
      cursor: pointer;
      box-shadow: 0 0 0 2px rgba(215, 137, 78, 0.42);
    }

    .wb-tray-slot--tail:active {
      transform: translateY(1px);
    }

    .wb-tray-actions {
      display: grid;
      grid-template-columns: 1fr 1.2fr;
      gap: 10px;
      margin-top: 12px;
    }

    .wb-primary,
    .wb-secondary {
      min-height: 52px;
      border-radius: 18px;
      border: 0;
      font-size: 17px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      cursor: pointer;
      transition: transform 120ms ease, opacity 120ms ease, filter 120ms ease;
    }

    .wb-primary {
      color: #1b1310;
      background: linear-gradient(180deg, #f3c87f 0%, #d7894e 100%);
    }

    .wb-secondary {
      color: var(--wb-text);
      background: rgba(255, 255, 255, 0.08);
    }

    .wb-primary:disabled,
    .wb-secondary:disabled,
    .wb-tray-slot:disabled {
      opacity: 0.46;
      cursor: default;
      filter: grayscale(0.1);
    }

    .wb-helper {
      margin-top: 10px;
      min-height: 18px;
      text-align: center;
      font-size: 12px;
      letter-spacing: 0.02em;
      color: var(--wb-muted);
    }

    .wb-overlay {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      padding: 28px 20px;
      pointer-events: auto;
      transition: opacity 180ms ease;
    }

    .wb-pill,
    .wb-sheet {
      width: min(100%, 460px);
    }

    .wb-pill {
      margin-bottom: 14px;
      padding: 12px 16px;
      border-radius: 999px;
      background: rgba(5, 10, 18, 0.74);
      border: 1px solid var(--wb-border);
      color: var(--wb-text);
      text-align: center;
      backdrop-filter: blur(16px);
    }

    .wb-pill strong {
      display: block;
      margin-bottom: 4px;
      font-size: 13px;
      letter-spacing: 0.26em;
      text-transform: uppercase;
    }

    .wb-pill span {
      font-size: 13px;
      color: var(--wb-muted);
    }

    .wb-pill--loss strong {
      color: #ffd3c7;
    }

    .wb-sheet {
      padding: 22px 20px 20px;
      border-radius: 28px;
      background: rgba(8, 14, 24, 0.82);
      border: 1px solid var(--wb-border);
      box-shadow: 0 22px 64px rgba(0, 0, 0, 0.34);
      backdrop-filter: blur(18px);
      color: var(--wb-text);
      text-align: center;
    }

    .wb-sheet h1,
    .wb-sheet h2 {
      margin: 0 0 10px;
      font-size: clamp(28px, 8vw, 42px);
      line-height: 0.98;
      letter-spacing: -0.04em;
    }

    .wb-sheet p {
      margin: 0;
      color: var(--wb-muted);
      font-size: 15px;
      line-height: 1.45;
    }

    .wb-hint-row {
      display: grid;
      gap: 6px;
      margin: 14px 0 0;
      font-size: 12px;
      color: var(--wb-muted);
    }

    .wb-primary--wide {
      width: min(100%, 280px);
      margin-top: 16px;
    }

    .wb-stat-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 16px;
    }

    .wb-stat {
      padding: 12px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.05);
    }

    .wb-stat span {
      display: block;
      margin-bottom: 6px;
      font-size: 11px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--wb-muted);
    }

    .wb-stat strong {
      font-size: 28px;
      letter-spacing: -0.04em;
    }

    @media (min-width: 900px) {
      .wb-tray-dock {
        width: min(430px, 38vw);
      }
    }
  `;
  document.head.appendChild(style);
}
