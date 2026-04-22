import type { GameSnapshot, PlacementResult, TowerKind } from "../game/types";

export interface GameApi {
  buildSelectedTower(kind: TowerKind): PlacementResult;
  clearSelection(): void;
  getSnapshot(): GameSnapshot;
  openMeta(): void;
  restart(): void;
  selectPad(padId: string): void;
  startGame(): boolean;
  upgradeSelectedTower(): PlacementResult;
}

const HUD_STYLE_ID = "pocket-bastion-hud-style";

const HUD_STYLE = `
  :root {
    --pb-ink: #f7f1dc;
    --pb-ink-muted: rgba(247, 241, 220, 0.72);
    --pb-edge: rgba(255, 244, 215, 0.14);
    --pb-panel: rgba(18, 28, 24, 0.72);
    --pb-panel-strong: rgba(16, 24, 21, 0.92);
    --pb-accent: #f3d27a;
    --pb-danger: #ef8f73;
  }

  .pb-shell {
    position: absolute;
    inset: 0;
    pointer-events: none;
    color: var(--pb-ink);
    font-family: "Trebuchet MS", "Segoe UI", sans-serif;
  }

  .pb-top {
    position: absolute;
    top: 18px;
    left: 18px;
    right: 18px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 12px;
    opacity: 0;
    transform: translateY(-10px);
    transition: opacity 160ms ease, transform 160ms ease;
  }

  .pb-top.is-visible {
    opacity: 1;
    transform: translateY(0);
  }

  .pb-side {
    display: flex;
  }

  .pb-side.is-right {
    justify-content: flex-end;
  }

  .pb-capsule {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    min-width: 108px;
    padding: 10px 16px;
    border-radius: 999px;
    border: 1px solid var(--pb-edge);
    background: var(--pb-panel);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.22);
    backdrop-filter: blur(10px);
  }

  .pb-capsule.is-wave {
    display: grid;
    gap: 4px;
    min-width: 150px;
    justify-items: center;
    padding-inline: 20px;
  }

  .pb-icon {
    display: inline-block;
    font-size: 26px;
    line-height: 1;
  }

  .pb-value {
    display: inline-block;
    font-size: 28px;
    line-height: 1;
    font-weight: 700;
  }

  .pb-wave-label {
    font-size: 18px;
    line-height: 1;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .pb-wave-phase {
    font-size: 11px;
    line-height: 1;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--pb-ink-muted);
  }

  .pb-wave-meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pb-strikes {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .pb-strike {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: rgba(247, 241, 220, 0.12);
    box-shadow: inset 0 0 0 1px rgba(247, 241, 220, 0.18);
  }

  .pb-strike.is-active {
    background: var(--pb-accent);
    box-shadow: inset 0 0 0 1px rgba(255, 244, 215, 0.34);
  }

  .pb-selection {
    position: absolute;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transform: translateX(-50%) scale(0.96);
    transform-origin: center bottom;
    transition: opacity 140ms ease, visibility 140ms ease, transform 140ms ease;
  }

  .pb-selection.is-visible {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) scale(1);
  }

  .pb-selection.is-below {
    transform-origin: center top;
  }

  .pb-action-panel {
    pointer-events: auto;
    display: grid;
    gap: 5px;
    min-width: 188px;
    padding: 6px;
    border-radius: 16px;
    border: 1px solid var(--pb-edge);
    background: rgba(13, 21, 18, 0.92);
    box-shadow: 0 24px 50px rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(10px);
  }

  .pb-action-panel[hidden] {
    display: none !important;
  }

  .pb-action-panel.is-build {
    grid-template-columns: repeat(2, minmax(84px, 1fr));
  }

  .pb-panel-head {
    grid-column: 1 / -1;
    padding: 2px 3px 1px;
    font-size: 9px;
    line-height: 1;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--pb-ink-muted);
  }

  .pb-action-button {
    appearance: none;
    border: 1px solid rgba(255, 244, 215, 0.08);
    border-radius: 12px;
    padding: 8px 8px 7px;
    display: grid;
    gap: 2px;
    text-align: left;
    color: var(--pb-ink);
    background: rgba(255, 255, 255, 0.04);
    font: inherit;
    cursor: pointer;
    transition: transform 140ms ease, filter 140ms ease, opacity 140ms ease, border-color 140ms ease;
    touch-action: manipulation;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .pb-action-button:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(1.05);
    border-color: rgba(243, 210, 122, 0.32);
  }

  .pb-action-button:disabled {
    opacity: 0.52;
    cursor: default;
  }

  .pb-action-title {
    font-size: 14px;
    line-height: 1;
    font-weight: 800;
  }

  .pb-action-meta {
    font-size: 10px;
    line-height: 1.2;
    color: var(--pb-ink-muted);
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .pb-overlay,
  .pb-modal {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    transition: opacity 180ms ease, visibility 180ms ease;
  }

  .pb-overlay {
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
  }

  .pb-overlay.is-visible {
    opacity: 1;
    visibility: visible;
  }

  .pb-modal {
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    background: rgba(7, 12, 10, 0.44);
  }

  .pb-modal.is-visible {
    opacity: 1;
    visibility: visible;
  }

  .pb-panel {
    pointer-events: auto;
    display: grid;
    justify-items: center;
    gap: 12px;
    min-width: min(320px, calc(100vw - 48px));
    padding: 22px 24px;
    border-radius: 26px;
    border: 1px solid var(--pb-edge);
    background: var(--pb-panel-strong);
    box-shadow: 0 28px 70px rgba(0, 0, 0, 0.35);
  }

  .pb-overlay .pb-panel {
    min-width: auto;
    padding: 0;
    background: transparent;
    border: 0;
    box-shadow: none;
  }

  .pb-title {
    margin: 0;
    font-size: 28px;
    line-height: 1;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .pb-score {
    font-size: 56px;
    line-height: 1;
    font-weight: 800;
    color: var(--pb-accent);
  }

  .pb-subtitle {
    font-size: 14px;
    line-height: 1;
    color: var(--pb-ink-muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }

  .pb-subtitle.is-highlight {
    color: var(--pb-accent);
  }

  .pb-meta-stack {
    display: grid;
    gap: 6px;
    justify-items: center;
  }

  .pb-button-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
  }

  .pb-button {
    pointer-events: auto;
    border: 0;
    border-radius: 999px;
    padding: 14px 28px;
    font: inherit;
    font-size: 20px;
    font-weight: 700;
    color: #183227;
    background: linear-gradient(180deg, #f3d27a 0%, #dfba5d 100%);
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.24);
    cursor: pointer;
    transition: transform 140ms ease, filter 140ms ease, opacity 140ms ease;
    touch-action: manipulation;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
  }

  .pb-button.is-secondary {
    color: var(--pb-ink);
    background: rgba(255, 255, 255, 0.08);
    box-shadow: none;
  }

  .pb-button:hover:not(:disabled) {
    transform: translateY(-1px);
    filter: brightness(1.04);
  }

  .pb-button:disabled {
    opacity: 0.48;
    cursor: default;
  }

  @media (max-width: 640px) {
    .pb-top {
      top: 12px;
      left: 12px;
      right: 12px;
      gap: 8px;
    }

    .pb-capsule {
      min-width: 0;
      padding: 9px 13px;
    }

    .pb-capsule.is-wave {
      min-width: 110px;
      padding-inline: 14px;
    }

    .pb-value {
      font-size: 24px;
    }

    .pb-wave-label {
      font-size: 15px;
    }

    .pb-action-panel {
      min-width: 172px;
      padding: 5px;
    }

    .pb-action-panel.is-build {
      grid-template-columns: repeat(2, minmax(78px, 1fr));
    }
  }
`;

function ensureHudStyles() {
  if (document.getElementById(HUD_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = HUD_STYLE_ID;
  style.textContent = HUD_STYLE;
  document.head.append(style);
}

export class HudController {
  private api?: GameApi;
  private readonly topBar: HTMLElement;
  private readonly goldValue: HTMLElement;
  private readonly scoreValue: HTMLElement;
  private readonly waveValue: HTMLElement;
  private readonly wavePhaseValue: HTMLElement;
  private readonly strikesValue: HTMLElement;
  private readonly selectionFloat: HTMLElement;
  private readonly buildPanel: HTMLElement;
  private readonly buildBlasterButton: HTMLButtonElement;
  private readonly buildRocketButton: HTMLButtonElement;
  private readonly upgradePanel: HTMLElement;
  private readonly upgradeButton: HTMLButtonElement;
  private readonly startOverlay: HTMLElement;
  private readonly playButton: HTMLButtonElement;
  private readonly modal: HTMLElement;
  private readonly modalScore: HTMLElement;
  private readonly modalWave: HTMLElement;
  private readonly modalStatus: HTMLElement;
  private readonly modalLeaderboard: HTMLElement;
  private readonly modalButton: HTMLButtonElement;
  private readonly modalMetaButton: HTMLButtonElement;
  private pendingSelectionPosition = 0;

  constructor(private readonly root: HTMLElement) {
    ensureHudStyles();
    this.root.innerHTML = `
      <div class="pb-shell">
        <div class="pb-top">
          <div class="pb-side">
            <div class="pb-capsule">
              <span class="pb-icon" aria-hidden="true">💰</span>
              <span class="pb-value" data-gold>0</span>
            </div>
          </div>
          <div class="pb-capsule is-wave">
            <span class="pb-wave-label" data-wave>Wave 0</span>
            <div class="pb-wave-meta">
              <span class="pb-wave-phase" data-wave-phase>Prep</span>
              <div class="pb-strikes" data-strikes></div>
            </div>
          </div>
          <div class="pb-side is-right">
            <div class="pb-capsule">
              <span class="pb-icon" aria-hidden="true">💀</span>
              <span class="pb-value" data-score>0</span>
            </div>
          </div>
        </div>
        <div class="pb-selection" data-selection>
          <div class="pb-action-panel is-build" data-build-panel>
            <div class="pb-panel-head">Build</div>
            <button class="pb-action-button" type="button" data-build-blaster></button>
            <button class="pb-action-button" type="button" data-build-rocket></button>
          </div>
          <div class="pb-action-panel" data-upgrade-panel hidden>
            <div class="pb-panel-head">Upgrade</div>
            <button class="pb-action-button" type="button" data-upgrade-button></button>
          </div>
        </div>
        <div class="pb-overlay" data-start-overlay>
          <div class="pb-panel">
            <button class="pb-button" type="button" data-play>Play</button>
          </div>
        </div>
        <div class="pb-modal" data-modal>
          <div class="pb-panel">
            <h2 class="pb-title">Game Over</h2>
            <div class="pb-score" data-modal-score>0</div>
            <div class="pb-meta-stack">
              <div class="pb-subtitle" data-modal-wave>Reached Wave 0</div>
              <div class="pb-subtitle is-highlight" data-modal-status hidden>New High Score</div>
              <div class="pb-subtitle" data-modal-leaderboard hidden>Rank #0 · Best Wave 0</div>
            </div>
            <div class="pb-button-row">
              <button class="pb-button" type="button" data-restart>Play Again</button>
              <button class="pb-button is-secondary" type="button" data-meta hidden>Leaderboard</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.topBar = this.require(".pb-top");
    this.goldValue = this.require("[data-gold]");
    this.scoreValue = this.require("[data-score]");
    this.waveValue = this.require("[data-wave]");
    this.wavePhaseValue = this.require("[data-wave-phase]");
    this.strikesValue = this.require("[data-strikes]");
    this.selectionFloat = this.require("[data-selection]");
    this.buildPanel = this.require("[data-build-panel]");
    this.buildBlasterButton = this.require("[data-build-blaster]") as HTMLButtonElement;
    this.buildRocketButton = this.require("[data-build-rocket]") as HTMLButtonElement;
    this.upgradePanel = this.require("[data-upgrade-panel]");
    this.upgradeButton = this.require("[data-upgrade-button]") as HTMLButtonElement;
    this.startOverlay = this.require("[data-start-overlay]");
    this.playButton = this.require("[data-play]") as HTMLButtonElement;
    this.modal = this.require("[data-modal]");
    this.modalScore = this.require("[data-modal-score]");
    this.modalWave = this.require("[data-modal-wave]");
    this.modalStatus = this.require("[data-modal-status]");
    this.modalLeaderboard = this.require("[data-modal-leaderboard]");
    this.modalButton = this.require("[data-restart]") as HTMLButtonElement;
    this.modalMetaButton = this.require("[data-meta]") as HTMLButtonElement;

    this.bindPress(this.playButton, () => {
      this.api?.startGame();
    });

    this.bindPress(this.buildBlasterButton, () => {
      this.api?.buildSelectedTower("blaster");
    });

    this.bindPress(this.buildRocketButton, () => {
      this.api?.buildSelectedTower("rocket");
    });

    this.bindPress(this.upgradeButton, () => {
      this.api?.upgradeSelectedTower();
    });

    this.bindPress(this.modalButton, () => {
      this.api?.restart();
    });

    this.bindPress(this.modalMetaButton, () => {
      this.api?.openMeta();
    });
  }

  bind(api: GameApi): void {
    this.api = api;
  }

  render(snapshot: GameSnapshot): void {
    this.goldValue.textContent = `${snapshot.gold}`;
    this.scoreValue.textContent = `${snapshot.score}`;
    this.modalScore.textContent = `${snapshot.score}`;
    this.modalWave.textContent = `Reached Wave ${snapshot.highestWave}`;
    this.waveValue.textContent = `Wave ${Math.max(1, snapshot.waveNumber)}`;
    this.wavePhaseValue.textContent = snapshot.wavePhase === "intermission" ? "Prep" : "Live";
    this.renderStrikes(snapshot.baseHealth, snapshot.maxBaseHealth);
    this.renderModalMeta(snapshot);

    const isPlaying = snapshot.phase === "playing";
    const isReady = snapshot.phase === "ready";
    const isLost = snapshot.phase === "lost";

    this.topBar.classList.toggle("is-visible", isPlaying);
    this.startOverlay.classList.toggle("is-visible", isReady);
    this.modal.classList.toggle("is-visible", isLost);

    this.renderSelection(snapshot, isPlaying);
    this.renderMetaButton(snapshot, isLost);
  }

  private renderMetaButton(snapshot: GameSnapshot, isLost: boolean): void {
    const shouldShow = isLost && snapshot.platform.available && (snapshot.platform.isLoggedIn || snapshot.platform.authOptional);
    this.modalMetaButton.hidden = !shouldShow;

    if (!shouldShow) {
      return;
    }

    if (snapshot.platform.busy) {
      this.modalMetaButton.textContent = "Working...";
      this.modalMetaButton.disabled = true;
      return;
    }

    this.modalMetaButton.disabled = false;
    this.modalMetaButton.textContent = snapshot.platform.pendingMeta && !snapshot.platform.isLoggedIn ? "Log In To Save" : "Leaderboard";
  }

  private renderSelection(snapshot: GameSnapshot, isPlaying: boolean): void {
    const shouldShow = isPlaying && snapshot.selectedPadMode !== null && snapshot.selectedPadAnchor !== null;
    this.selectionFloat.classList.toggle("is-visible", shouldShow);

    if (!shouldShow || !snapshot.selectedPadAnchor) {
      return;
    }

    const buildMode = snapshot.selectedPadMode === "build";
    this.buildPanel.hidden = !buildMode;
    this.upgradePanel.hidden = buildMode;

    if (buildMode) {
      const blaster = snapshot.buildOptions.find((option) => option.kind === "blaster");
      const rocket = snapshot.buildOptions.find((option) => option.kind === "rocket");
      this.renderActionButton(this.buildBlasterButton, blaster, "Build");
      this.renderActionButton(this.buildRocketButton, rocket, "Build");
    } else {
      const upgrade = snapshot.upgradeOptions[0];
      this.renderUpgradeButton(upgrade);
    }

    this.pendingSelectionPosition += 1;
    const positionToken = this.pendingSelectionPosition;
    const anchorX = snapshot.selectedPadAnchor.normalizedX;
    const anchorY = snapshot.selectedPadAnchor.normalizedY;
    requestAnimationFrame(() => {
      if (positionToken !== this.pendingSelectionPosition) {
        return;
      }
      this.positionSelection(anchorX, anchorY);
    });
  }

  private renderActionButton(
    button: HTMLButtonElement,
    option: GameSnapshot["buildOptions"][number] | undefined,
    prefix: string,
  ): void {
    if (!option) {
      button.disabled = true;
      button.innerHTML = `<span class="pb-action-title">${prefix}</span><span class="pb-action-meta">Unavailable</span>`;
      return;
    }

    button.disabled = !option.affordable;
    button.innerHTML = `
      <span class="pb-action-title">${option.label}</span>
      <span class="pb-action-meta">💰${option.cost} · ${option.blurb}</span>
    `;
  }

  private renderUpgradeButton(option: GameSnapshot["upgradeOptions"][number] | undefined): void {
    if (!option) {
      this.upgradeButton.disabled = true;
      this.upgradeButton.innerHTML = `
        <span class="pb-action-title">No Tower</span>
        <span class="pb-action-meta">Select an occupied slot.</span>
      `;
      return;
    }

    if (option.maxed) {
      this.upgradeButton.disabled = true;
      this.upgradeButton.innerHTML = `
        <span class="pb-action-title">${option.label} Lv.${option.currentLevel}</span>
        <span class="pb-action-meta">Max Level</span>
      `;
      return;
    }

    this.upgradeButton.disabled = !option.affordable;
    this.upgradeButton.innerHTML = `
      <span class="pb-action-title">${option.label} Lv.${option.currentLevel} → Lv.${option.nextLevel}</span>
      <span class="pb-action-meta">💰${option.cost ?? 0} · ${option.blurb}</span>
    `;
  }

  private renderStrikes(baseHealth: number, maxBaseHealth: number): void {
    const hearts = Array.from({ length: maxBaseHealth }, (_unused, index) => {
      const active = index < baseHealth;
      return `<span class="pb-strike${active ? " is-active" : ""}" aria-hidden="true"></span>`;
    }).join("");
    this.strikesValue.innerHTML = hearts;
  }

  private renderModalMeta(snapshot: GameSnapshot): void {
    if (!snapshot.platform.available) {
      this.modalStatus.hidden = true;
      this.modalLeaderboard.hidden = true;
      return;
    }

    if (snapshot.platform.busy) {
      this.modalStatus.hidden = false;
      this.modalStatus.textContent = "Saving Leaderboard…";
      this.modalLeaderboard.hidden = true;
      return;
    }

    if (!snapshot.platform.isLoggedIn) {
      this.modalStatus.hidden = !snapshot.platform.pendingMeta;
      this.modalStatus.textContent = "Log In To Save Your Wave";
      this.modalLeaderboard.hidden = true;
      return;
    }

    if (snapshot.platform.newHighScore) {
      this.modalStatus.hidden = false;
      this.modalStatus.textContent = "New High Score";
    } else {
      this.modalStatus.hidden = true;
    }

    if (!snapshot.platform.leaderboardLoaded) {
      this.modalLeaderboard.hidden = true;
      return;
    }

    const rank = snapshot.platform.leaderboardRank;
    const best = snapshot.platform.leaderboardBestDisplay ?? (snapshot.platform.leaderboardBestScore !== null ? `Wave ${snapshot.platform.leaderboardBestScore}` : null);
    const parts = [rank !== null ? `Rank #${rank}` : null, best ? `Best ${best}` : null].filter(Boolean);

    if (parts.length === 0) {
      this.modalLeaderboard.hidden = true;
      return;
    }

    this.modalLeaderboard.hidden = false;
    this.modalLeaderboard.textContent = parts.join(" · ");
  }

  private positionSelection(normalizedX: number, normalizedY: number): void {
    const rootRect = this.root.getBoundingClientRect();
    const canvas = this.root.ownerDocument.querySelector("#game-canvas canvas");
    const canvasRect = canvas instanceof HTMLCanvasElement ? canvas.getBoundingClientRect() : rootRect;
    const floatRect = this.selectionFloat.getBoundingClientRect();
    const padX = canvasRect.left - rootRect.left + normalizedX * canvasRect.width;
    const padY = canvasRect.top - rootRect.top + normalizedY * canvasRect.height;
    const halfWidth = floatRect.width > 0 ? floatRect.width / 2 : 108;
    const floatHeight = floatRect.height > 0 ? floatRect.height : 72;
    const clampedX = Math.min(Math.max(padX, halfWidth + 12), rootRect.width - halfWidth - 12);
    const preferBelow = padY < floatHeight + 90;
    const clampedY = preferBelow
      ? Math.min(padY + 14, rootRect.height - floatHeight - 18)
      : Math.max(padY - floatHeight - 14, 18);
    this.selectionFloat.classList.toggle("is-below", preferBelow);
    this.selectionFloat.style.left = `${clampedX}px`;
    this.selectionFloat.style.top = `${clampedY}px`;
  }

  private bindPress(button: HTMLButtonElement, handler: () => void): void {
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handler();
    });

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  }

  private require(selector: string): HTMLElement {
    const element = this.root.querySelector(selector);
    if (!(element instanceof HTMLElement)) {
      throw new Error(`[pocket-bastion] Missing HUD element: ${selector}`);
    }
    return element;
  }
}
