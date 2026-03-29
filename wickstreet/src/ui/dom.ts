import { HOUSES } from '../game/config';
import type { GameState } from '../game/logic';

export interface DomUi {
  root: HTMLDivElement;
  bindStart(handler: () => void): void;
  bindRetry(handler: () => void): void;
  bindRotate(handler: () => void): void;
  update(state: GameState, isRotatePromptVisible: boolean): void;
}

export function createDomUi(): DomUi {
  const root = document.createElement('div');
  root.className = 'ui-layer';
  root.innerHTML = `
    <div class="hud-row hud-row-top">
      <div class="hud-pill hud-score">
        <span class="hud-label">SCORE</span>
        <span class="hud-value" data-role="score-value">0</span>
      </div>
      <div class="hud-pill hud-blackout">
        <span class="hud-label">BLACKOUT</span>
        <div class="strike-row" data-role="strikes"></div>
      </div>
    </div>
    <div class="request-strip">
      <div class="request-card">
        <span class="request-label">ACTIVE</span>
        <div class="request-main">
          <span class="sigil-chip" data-role="active-sigil"></span>
          <span class="request-name" data-role="active-name"></span>
          <span class="timer-ring" data-role="timer-ring"></span>
        </div>
      </div>
      <div class="request-card">
        <span class="request-label">NEXT</span>
        <div class="request-main">
          <span class="sigil-chip" data-role="next-sigil"></span>
          <span class="request-name" data-role="next-name"></span>
        </div>
      </div>
    </div>
    <div class="overlay-card overlay-card-start" data-role="start-card">
      <div class="overlay-title">WICKSTREET</div>
      <div class="overlay-copy">Match the glow core to the lit home before the blackout timer burns out.</div>
      <button type="button" class="overlay-button" data-role="start-button">PLAY</button>
    </div>
    <div class="overlay-card overlay-card-gameover" data-role="gameover-card">
      <div class="overlay-title">BLOCK LOST</div>
      <div class="overlay-stats">
        <div><span class="hud-label">SCORE</span><strong data-role="gameover-score">0</strong></div>
        <div><span class="hud-label">BEST</span><strong data-role="gameover-best">0</strong></div>
        <div><span class="hud-label">STREAK</span><strong data-role="gameover-streak">0</strong></div>
      </div>
      <button type="button" class="overlay-button" data-role="retry-button">RETRY</button>
    </div>
    <div class="rotate-card" data-role="rotate-card">
      <div class="overlay-title">ROTATE DEVICE</div>
      <div class="overlay-copy">Wickstreet is built for landscape play.</div>
      <button type="button" class="overlay-button" data-role="rotate-button">CONTINUE</button>
    </div>
  `;

  const startButton = getButton(root, '[data-role="start-button"]');
  const retryButton = getButton(root, '[data-role="retry-button"]');
  const rotateButton = getButton(root, '[data-role="rotate-button"]');
  const hudTop = getDiv(root, '.hud-row-top');
  const requestStrip = getDiv(root, '.request-strip');
  const strikesRow = getDiv(root, '[data-role="strikes"]');
  const activeSigil = getSpan(root, '[data-role="active-sigil"]');
  const nextSigil = getSpan(root, '[data-role="next-sigil"]');
  const activeName = getSpan(root, '[data-role="active-name"]');
  const nextName = getSpan(root, '[data-role="next-name"]');
  const scoreValue = getSpan(root, '[data-role="score-value"]');
  const timerRing = getSpan(root, '[data-role="timer-ring"]');
  const startCard = getDiv(root, '[data-role="start-card"]');
  const gameoverCard = getDiv(root, '[data-role="gameover-card"]');
  const rotateCard = getDiv(root, '[data-role="rotate-card"]');
  const gameoverScore = getStrong(root, '[data-role="gameover-score"]');
  const gameoverBest = getStrong(root, '[data-role="gameover-best"]');
  const gameoverStreak = getStrong(root, '[data-role="gameover-streak"]');

  for (let index = 0; index < 3; index += 1) {
    const dot = document.createElement('span');
    dot.className = 'strike-dot';
    strikesRow.append(dot);
  }
  const strikeDots = Array.from(strikesRow.querySelectorAll<HTMLElement>('.strike-dot'));

  return {
    root,
    bindStart(handler) {
      startButton.onclick = handler;
    },
    bindRetry(handler) {
      retryButton.onclick = handler;
    },
    bindRotate(handler) {
      rotateButton.onclick = handler;
    },
    update(state, isRotatePromptVisible) {
      scoreValue.textContent = formatScore(state.score);
      const activeHouse = HOUSES[state.activeRequest];
      const nextHouse = HOUSES[state.nextRequest];
      if (!activeHouse || !nextHouse) {
        throw new Error('wickstreet_ui_house_missing');
      }
      activeSigil.textContent = activeHouse.label;
      activeSigil.style.setProperty('--sigil-color', activeHouse.color);
      nextSigil.textContent = nextHouse.label;
      nextSigil.style.setProperty('--sigil-color', nextHouse.color);
      activeName.textContent = activeHouse.label;
      nextName.textContent = nextHouse.label;
      timerRing.style.setProperty('--timer-progress', String(Math.max(0, Math.min(1, state.timer / state.timerMax))));
      timerRing.style.setProperty('--timer-color', activeHouse.color);
      strikeDots.forEach((dot, index) => {
        dot.classList.toggle('is-active', index < state.strikes);
      });
      startCard.hidden = state.screen !== 'start';
      gameoverCard.hidden = state.screen !== 'gameover';
      rotateCard.hidden = !isRotatePromptVisible;
      hudTop.hidden = state.screen !== 'playing';
      requestStrip.hidden = state.screen !== 'playing';
      gameoverScore.textContent = formatScore(state.score);
      gameoverBest.textContent = formatScore(state.bestScore);
      gameoverStreak.textContent = String(state.bestStreak);
      root.classList.toggle('is-playing', state.screen === 'playing');
    },
  };
}

function formatScore(value: number): string {
  return value.toLocaleString('en-US');
}

function getButton(root: ParentNode, selector: string): HTMLButtonElement {
  const value = root.querySelector(selector);
  if (!(value instanceof HTMLButtonElement)) {
    throw new Error(`wickstreet_missing_button:${selector}`);
  }
  return value;
}

function getDiv(root: ParentNode, selector: string): HTMLDivElement {
  const value = root.querySelector(selector);
  if (!(value instanceof HTMLDivElement)) {
    throw new Error(`wickstreet_missing_div:${selector}`);
  }
  return value;
}

function getSpan(root: ParentNode, selector: string): HTMLSpanElement {
  const value = root.querySelector(selector);
  if (!(value instanceof HTMLSpanElement)) {
    throw new Error(`wickstreet_missing_span:${selector}`);
  }
  return value;
}

function getStrong(root: ParentNode, selector: string): HTMLElement {
  const value = root.querySelector(selector);
  if (!(value instanceof HTMLElement)) {
    throw new Error(`wickstreet_missing_stat:${selector}`);
  }
  return value;
}
