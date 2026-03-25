/// <reference types="playdrop-sdk-types" />

import { applyMove, BOARD_SIZE, createInitialState, type BoardState, type Direction, type Tile } from "./board";
import { attachInput } from "./input";

const ANIMATION_MS = 150;
const BEST_SCORE_KEY = "pocket-2048-best-score";
const HINT_DISMISSED_KEY = "pocket-2048-hint-dismissed";
const GAP_PX = 12;

type OverlayMode = "hidden" | "win" | "lost";

interface Elements {
  board: HTMLElement;
  tileLayer: HTMLElement;
  scoreValue: HTMLElement;
  hint: HTMLElement;
  overlay: HTMLElement;
  overlayKicker: HTMLElement;
  overlayTitle: HTMLElement;
  overlayCopy: HTMLElement;
  overlayScore: HTMLElement;
  overlayBest: HTMLElement;
  overlayPrimary: HTMLButtonElement;
  overlaySecondary: HTMLButtonElement;
  restartButton: HTMLButtonElement;
}

interface HostBridge {
  setLoadingState: (state: { status: "loading" | "ready" | "error"; progress?: number; message?: string }) => void;
}

class Pocket2048App {
  private readonly elements: Elements;
  private readonly tileElements = new Map<number, HTMLDivElement>();
  private readonly storage = window.localStorage;
  private boardState = createInitialState();
  private bestScore = 0;
  private overlayMode: OverlayMode = "hidden";
  private animationTimer: number | null = null;
  private overlayTimer: number | null = null;
  private inputLocked = false;
  private hintDismissed = false;

  constructor(elements: Elements) {
    this.elements = elements;
    this.bestScore = this.readNumber(BEST_SCORE_KEY);
    this.hintDismissed = this.readFlag(HINT_DISMISSED_KEY);

    this.render();
    this.bindUi();
    this.positionTiles();
    new ResizeObserver(() => this.positionTiles()).observe(this.elements.board);
  }

  move(direction: Direction): void {
    if (this.inputLocked) return;
    if (this.overlayMode === "win" || this.overlayMode === "lost") return;
    if (this.boardState.isGameOver) return;

    const outcome = applyMove(this.boardState, direction);
    if (!outcome.moved) return;

    this.boardState = outcome.state;
    if (this.boardState.score > this.bestScore) {
      this.bestScore = this.boardState.score;
      this.storage.setItem(BEST_SCORE_KEY, String(this.bestScore));
    }

    if (!this.hintDismissed) {
      this.hintDismissed = true;
      this.storage.setItem(HINT_DISMISSED_KEY, "1");
    }

    this.inputLocked = true;
    this.render();
    this.scheduleUnlock();

    if (outcome.reached2048) {
      this.scheduleOverlay("win");
      return;
    }

    if (this.boardState.isGameOver) {
      this.scheduleOverlay("lost");
    }
  }

  restart(): void {
    this.clearTimers();
    this.overlayMode = "hidden";
    this.inputLocked = false;
    this.boardState = createInitialState();
    this.render();
  }

  continueRun(): void {
    this.overlayMode = "hidden";
    this.renderOverlay();
  }

  private bindUi(): void {
    attachInput({
      board: this.elements.board,
      onMove: (direction) => this.move(direction),
    });

    this.elements.restartButton.addEventListener("click", () => {
      this.restart();
    });

    this.elements.overlayPrimary.addEventListener("click", () => {
      if (this.overlayMode === "win") {
        this.continueRun();
        return;
      }
      this.restart();
    });

    this.elements.overlaySecondary.addEventListener("click", () => {
      if (this.overlayMode === "win") {
        this.restart();
        return;
      }
      this.continueRun();
    });
  }

  private scheduleUnlock(): void {
    if (this.animationTimer) {
      window.clearTimeout(this.animationTimer);
    }
    this.animationTimer = window.setTimeout(() => {
      this.inputLocked = false;
      this.animationTimer = null;
    }, ANIMATION_MS);
  }

  private scheduleOverlay(mode: OverlayMode): void {
    if (this.overlayTimer) {
      window.clearTimeout(this.overlayTimer);
    }
    this.overlayTimer = window.setTimeout(() => {
      this.overlayMode = mode;
      this.renderOverlay();
      this.overlayTimer = null;
    }, ANIMATION_MS + 40);
  }

  private clearTimers(): void {
    if (this.animationTimer) {
      window.clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
    if (this.overlayTimer) {
      window.clearTimeout(this.overlayTimer);
      this.overlayTimer = null;
    }
  }

  private render(): void {
    this.elements.scoreValue.textContent = formatNumber(this.boardState.score);
    this.renderHint();
    this.renderTiles();
    this.renderOverlay();
  }

  private renderHint(): void {
    const shouldShowHint = !this.hintDismissed && this.overlayMode === "hidden";
    this.elements.hint.hidden = !shouldShowHint;
  }

  private renderOverlay(): void {
    if (this.overlayMode === "hidden") {
      this.elements.overlay.hidden = true;
      return;
    }

    this.elements.overlay.hidden = false;
    this.elements.overlayScore.textContent = formatNumber(this.boardState.score);
    this.elements.overlayBest.textContent = formatNumber(this.bestScore);

    if (this.overlayMode === "win") {
      this.elements.overlayKicker.textContent = "2048 reached";
      this.elements.overlayTitle.textContent = "Keep the run alive?";
      this.elements.overlayCopy.textContent =
        "You hit the target tile. Continue for a higher board or start a clean new run.";
      this.elements.overlayPrimary.textContent = "Continue";
      this.elements.overlaySecondary.textContent = "New run";
      this.elements.overlaySecondary.hidden = false;
      return;
    }

    this.elements.overlayKicker.textContent = "Run over";
    this.elements.overlayTitle.textContent = "Ready for another board?";
    this.elements.overlayCopy.textContent =
      "No more moves remain. Reset instantly and chase a cleaner line to 2048.";
    this.elements.overlayPrimary.textContent = "New run";
    this.elements.overlaySecondary.hidden = true;
  }

  private renderTiles(): void {
    const nextIds = new Set(this.boardState.tiles.map((tile) => tile.id));

    for (const tile of this.boardState.tiles) {
      const tileElement = this.getOrCreateTileElement(tile);
      tileElement.dataset.value = String(tile.value);
      tileElement.textContent = String(tile.value);
      tileElement.classList.toggle("tile--low", tile.value <= 4 || tile.value >= 2048);
      this.restartAnimationClass(tileElement, tile.isNew ? "tile--new" : tile.merged ? "tile--merged" : null);
      this.applyTilePosition(tileElement, tile);
    }

    for (const [id, element] of this.tileElements) {
      if (nextIds.has(id)) continue;
      element.remove();
      this.tileElements.delete(id);
    }

    this.positionTiles();
  }

  private getOrCreateTileElement(tile: Tile): HTMLDivElement {
    const existing = this.tileElements.get(tile.id);
    if (existing) {
      return existing;
    }

    const element = document.createElement("div");
    element.className = "tile";
    element.dataset.value = String(tile.value);
    this.elements.tileLayer.appendChild(element);
    this.tileElements.set(tile.id, element);
    return element;
  }

  private restartAnimationClass(element: HTMLDivElement, className: string | null): void {
    element.classList.remove("tile--new", "tile--merged");
    void element.offsetWidth;
    if (className) {
      element.classList.add(className);
    }
  }

  private positionTiles(): void {
    const boardWidth = this.elements.board.clientWidth;
    if (!boardWidth) return;
    const tileSize = (boardWidth - GAP_PX * (BOARD_SIZE - 1)) / BOARD_SIZE;
    this.elements.tileLayer.style.width = `${boardWidth}px`;
    this.elements.tileLayer.style.height = `${boardWidth}px`;

    for (const tile of this.boardState.tiles) {
      const element = this.tileElements.get(tile.id);
      if (!element) continue;
      element.style.width = `${tileSize}px`;
      element.style.height = `${tileSize}px`;
      this.applyTilePosition(element, tile);
    }
  }

  private applyTilePosition(element: HTMLDivElement, tile: Tile): void {
    const tileSize = element.offsetWidth || (this.elements.board.clientWidth - GAP_PX * (BOARD_SIZE - 1)) / BOARD_SIZE;
    const x = tile.col * (tileSize + GAP_PX);
    const y = tile.row * (tileSize + GAP_PX);
    element.style.transform = `translate(${x}px, ${y}px)`;
  }

  private readNumber(key: string): number {
    const rawValue = this.storage.getItem(key);
    if (!rawValue) return 0;
    const parsed = Number.parseInt(rawValue, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private readFlag(key: string): boolean {
    return this.storage.getItem(key) === "1";
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function requireElement<T extends HTMLElement>(id: string, type: { new (): T }): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) {
    throw new Error(`[pocket-2048] #${id} missing`);
  }
  return element;
}

async function main(): Promise<void> {
  const host = await createHostBridge();
  host.setLoadingState({
    status: "loading",
    progress: 0.35,
    message: "Rendering board",
  });

  const elements: Elements = {
    board: requireElement("board", HTMLDivElement),
    tileLayer: requireElement("tileLayer", HTMLDivElement),
    scoreValue: requireElement("scoreValue", HTMLSpanElement),
    hint: requireElement("hint", HTMLParagraphElement),
    overlay: requireElement("overlay", HTMLDivElement),
    overlayKicker: requireElement("overlayKicker", HTMLParagraphElement),
    overlayTitle: requireElement("overlayTitle", HTMLHeadingElement),
    overlayCopy: requireElement("overlayCopy", HTMLParagraphElement),
    overlayScore: requireElement("overlayScore", HTMLSpanElement),
    overlayBest: requireElement("overlayBest", HTMLSpanElement),
    overlayPrimary: requireElement("overlayPrimary", HTMLButtonElement),
    overlaySecondary: requireElement("overlaySecondary", HTMLButtonElement),
    restartButton: requireElement("restartButton", HTMLButtonElement),
  };

  new Pocket2048App(elements);
  host.setLoadingState({ status: "ready" });
}

void main().catch((error) => {
  const playdrop = window.playdrop;
  if (playdrop && hasHostedChannel()) {
    playdrop.host.setLoadingState({
      status: "error",
      message: String(error),
    });
  }
  throw error;
});

async function createHostBridge(): Promise<HostBridge> {
  if (!hasHostedChannel()) {
    return {
      setLoadingState: () => {},
    };
  }

  const playdrop = window.playdrop;
  if (!playdrop) {
    throw new Error("[pocket-2048] window.playdrop unavailable");
  }

  const sdk = await playdrop.init();
  return sdk.host;
}

function hasHostedChannel(): boolean {
  const search = new URLSearchParams(window.location.search);
  return search.has("playdrop_channel");
}
