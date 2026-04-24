import { BOARD_COLS, BOARD_ROWS, type Board, type ClearStage, type CollapseStage, type GameOverReason, type Move, type Tile, type TileKind, type TurnStage } from "./logic";
import type { PlatformSnapshot } from "../platform";

type OverlayMode = "gameover" | null;

export interface Layout {
  width: number;
  height: number;
  dpr: number;
  portrait: boolean;
  boardX: number;
  boardY: number;
  cellSize: number;
  gap: number;
  boardWidth: number;
  boardHeight: number;
  frameX: number;
  frameY: number;
  frameWidth: number;
  frameHeight: number;
  hudX: number;
  hudY: number;
  hudWidth: number;
  hudHeight: number;
}

export interface RenderModel {
  board: Board;
  score: number;
  ashCount: number;
  bestScore: number;
  boardOpacity: number;
  showHud: boolean;
  gameOverReason: GameOverReason | null;
  idleHint: IdleHint | null;
  dragPreview: DragPreview | null;
  stage: ActiveStage | null;
  overlay: OverlayMode;
  comboLabel: ComboLabel | null;
  toastLabel: ToastLabel | null;
  platform: PlatformSnapshot;
  interaction: TileInteractionState | null;
}

export interface ActiveStage {
  stage: TurnStage;
  progress: number;
}

export interface ComboLabel {
  text: string;
  opacity: number;
}

export interface ToastLabel {
  title: string;
  detail: string;
  opacity: number;
}

export interface TileInteractionState {
  hovered: { row: number; col: number } | null;
  pressed: { row: number; col: number } | null;
}

export interface IdleHint {
  move: Move;
  progress: number;
}

export interface DragPreview {
  move: Move;
  offsetPx: number;
  settling: boolean;
}

export type OverlayAction = "restart";

interface OverlayButtonLayout {
  action: OverlayAction;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  primary: boolean;
}

interface RuntimeAssets {
  background: HTMLImageElement;
  frame: HTMLImageElement;
  tiles: Record<TileKind, HTMLImageElement>;
}

const ASSET_URLS = {
  background: "./assets/runtime/background-square.jpg",
  frame: "./assets/runtime/frame.png",
  tiles: {
    sun: "./assets/runtime/tiles/starfold-tile-sun-r1-tight.png",
    moon: "./assets/runtime/tiles/starfold-tile-moon-r1-tight.png",
    wave: "./assets/runtime/tiles/starfold-tile-wave-r1-tight.png",
    leaf: "./assets/runtime/tiles/starfold-tile-leaf-r1-tight.png",
    ember: "./assets/runtime/tiles/starfold-tile-ember-r1-tight.png",
    ash3: "./assets/runtime/tiles/starfold-tile-ash3-r1-tight.png",
    ash2: "./assets/runtime/tiles/starfold-tile-ash2-r1-tight.png",
    ash1: "./assets/runtime/tiles/starfold-tile-ash1-r2-tight.png",
  } satisfies Record<TileKind, string>,
} as const;

const FRAME_METRICS = {
  width: 686,
  height: 488,
  innerLeft: 135,
  innerTop: 41,
  innerRight: 549,
  innerBottom: 446,
};

const FRAME_ASPECT = FRAME_METRICS.width / FRAME_METRICS.height;
const FRAME_INNER_WIDTH = FRAME_METRICS.innerRight - FRAME_METRICS.innerLeft;
const FRAME_INNER_HEIGHT = FRAME_METRICS.innerBottom - FRAME_METRICS.innerTop;

export class CanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private layout: Layout;
  private overlayButtons: OverlayButtonLayout[] = [];
  private assets: RuntimeAssets | null = null;
  private boardOpacity = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.layout = this.computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    this.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  }

  async loadAssets(onProgress?: (progress: number, message: string) => void): Promise<void> {
    const tasks: Array<{ key: string; label: string; src: string }> = [
      { key: "background", label: "Loading shrine background", src: ASSET_URLS.background },
      { key: "frame", label: "Loading frame", src: ASSET_URLS.frame },
      { key: "sun", label: "Loading tile art", src: ASSET_URLS.tiles.sun },
      { key: "moon", label: "Loading tile art", src: ASSET_URLS.tiles.moon },
      { key: "wave", label: "Loading tile art", src: ASSET_URLS.tiles.wave },
      { key: "leaf", label: "Loading tile art", src: ASSET_URLS.tiles.leaf },
      { key: "ember", label: "Loading tile art", src: ASSET_URLS.tiles.ember },
      { key: "ash3", label: "Loading tile art", src: ASSET_URLS.tiles.ash3 },
      { key: "ash2", label: "Loading tile art", src: ASSET_URLS.tiles.ash2 },
      { key: "ash1", label: "Loading tile art", src: ASSET_URLS.tiles.ash1 },
    ];

    const loaded = new Map<string, HTMLImageElement>();
    for (let index = 0; index < tasks.length; index += 1) {
      const task = tasks[index]!;
      onProgress?.((index + 0.2) / tasks.length, task.label);
      loaded.set(task.key, await loadImage(task.src));
      onProgress?.((index + 1) / tasks.length, task.label);
    }

    this.assets = {
      background: loaded.get("background")!,
      frame: loaded.get("frame")!,
      tiles: {
        sun: loaded.get("sun")!,
        moon: loaded.get("moon")!,
        wave: loaded.get("wave")!,
        leaf: loaded.get("leaf")!,
        ember: loaded.get("ember")!,
        ash3: loaded.get("ash3")!,
        ash2: loaded.get("ash2")!,
        ash1: loaded.get("ash1")!,
      },
    };
  }

  resize(width: number, height: number, dpr: number): Layout {
    this.layout = this.computeLayout(width, height, dpr);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return this.layout;
  }

  getLayout(): Layout {
    return this.layout;
  }

  hitTestOverlayAction(clientX: number, clientY: number): OverlayAction | null {
    for (const button of this.overlayButtons) {
      if (
        clientX >= button.x &&
        clientX <= button.x + button.width &&
        clientY >= button.y &&
        clientY <= button.y + button.height
      ) {
        return button.action;
      }
    }
    return null;
  }

  render(model: RenderModel): void {
    const { ctx, layout } = this;
    ctx.clearRect(0, 0, layout.width, layout.height);

    if (!this.assets) {
      this.drawLoadingState();
      return;
    }

    this.drawBackground();
    this.boardOpacity = model.boardOpacity;

    if (model.stage?.stage.kind === "shift") {
      this.drawShiftStage(model.stage.stage, model.stage.progress);
    } else if (model.stage?.stage.kind === "clear") {
      this.drawBoard(model.stage.stage.board, {
        clearStage: model.stage.stage,
        clearProgress: model.stage.progress,
      });
    } else if (model.stage?.stage.kind === "collapse") {
      this.drawCollapseStage(model.stage.stage, model.stage.progress);
    } else if (model.stage?.stage.kind === "ash") {
      this.drawAshStage(model.stage.stage, model.stage.progress);
    } else if (model.dragPreview) {
      this.drawDragPreview(model.board, model.dragPreview);
    } else if (model.idleHint) {
      this.drawIdleHint(model.board, model.idleHint);
    } else {
      this.drawBoard(model.board, {
        interaction: model.interaction,
      });
    }

    this.drawFrameOverlay();
    this.drawHud(model);
  }

  private computeLayout(width: number, height: number, dpr: number): Layout {
    const portrait = height > width;

    if (portrait) {
      const horizontalPadding = clamp(width * 0.045, 8, 22);
      const targetBoardWidth = Math.max(48, width - horizontalPadding * 2);
      const maxFrameHeight = Math.max(96, height - clamp(height * 0.24, 96, 228));
      const maxFrameWidth = maxFrameHeight * FRAME_ASPECT;
      const frameWidth = this.fitPortraitFrameWidth(targetBoardWidth, maxFrameWidth);
      const frameHeight = frameWidth / FRAME_ASPECT;
      const frameX = Math.round((width - frameWidth) / 2);
      const frameY = Math.round((height - frameHeight) / 2);
      return this.finishLayout(width, height, dpr, portrait, frameX, frameY, frameWidth, frameHeight, 0, 0, width, height);
    }

    const outerPadding = clamp(Math.min(width, height) * 0.05, 12, 36);
    const frameAreaWidth = Math.max(96, width - outerPadding * 2);
    const frameAreaHeight = Math.max(96, height - outerPadding * 2);
    const frameWidth = Math.min(frameAreaWidth, frameAreaHeight * FRAME_ASPECT);
    const frameHeight = frameWidth / FRAME_ASPECT;
    const frameX = Math.round((width - frameWidth) / 2);
    const frameY = Math.round((height - frameHeight) / 2);
    const hudX = 40;
    const hudWidth = Math.max(120, frameX - hudX - 26);
    return this.finishLayout(width, height, dpr, portrait, frameX, frameY, frameWidth, frameHeight, hudX, 48, hudWidth, height - 96);
  }

  private finishLayout(
    width: number,
    height: number,
    dpr: number,
    portrait: boolean,
    frameX: number,
    frameY: number,
    frameWidth: number,
    frameHeight: number,
    hudX: number,
    hudY: number,
    hudWidth: number,
    hudHeight: number,
  ): Layout {
    const geometry = this.measureFrameGeometry(frameWidth, portrait);
    const openingX = frameX + FRAME_METRICS.innerLeft * geometry.scale;
    const openingY = frameY + FRAME_METRICS.innerTop * geometry.scale;
    const boardX = Math.round(openingX + (geometry.openingWidth - geometry.boardWidth) / 2);
    const boardY = Math.round(openingY + (geometry.openingHeight - geometry.boardHeight) / 2);

    return {
      width,
      height,
      dpr,
      portrait,
      boardX,
      boardY,
      cellSize: geometry.cellSize,
      gap: geometry.gap,
      boardWidth: geometry.boardWidth,
      boardHeight: geometry.boardHeight,
      frameX,
      frameY,
      frameWidth,
      frameHeight,
      hudX,
      hudY,
      hudWidth,
      hudHeight,
    };
  }

  private fitPortraitFrameWidth(targetBoardWidth: number, maxFrameWidth: number): number {
    const safeMaxFrameWidth = Math.max(96, maxFrameWidth);
    let low = Math.min(FRAME_METRICS.width, safeMaxFrameWidth);
    let high = safeMaxFrameWidth;
    let best = safeMaxFrameWidth;

    for (let index = 0; index < 24; index += 1) {
      const mid = (low + high) / 2;
      const geometry = this.measureFrameGeometry(mid, true);
      if (geometry.boardWidth >= targetBoardWidth) {
        best = mid;
        high = mid;
      } else {
        low = mid;
      }
    }

    return best;
  }

  private measureFrameGeometry(frameWidth: number, portrait: boolean): {
    scale: number;
    openingWidth: number;
    openingHeight: number;
    gap: number;
    cellSize: number;
    boardWidth: number;
    boardHeight: number;
  } {
    const safeFrameWidth = Math.max(96, frameWidth);
    const scale = safeFrameWidth / FRAME_METRICS.width;
    const openingWidth = FRAME_INNER_WIDTH * scale;
    const openingHeight = FRAME_INNER_HEIGHT * scale;
    const desiredGap = portrait ? Math.round(safeFrameWidth * 0.0075) : Math.round(safeFrameWidth * 0.0085);
    const maxGap = Math.max(
      1,
      Math.floor(
        Math.min(
          openingWidth / Math.max(BOARD_COLS + 1, 1),
          openingHeight / Math.max(BOARD_ROWS + 1, 1),
        ),
      ),
    );
    const gap = clamp(desiredGap, 1, maxGap);
    const cellSize = Math.floor(
      Math.min(
        (openingWidth - gap * (BOARD_COLS - 1)) / BOARD_COLS,
        (openingHeight - gap * (BOARD_ROWS - 1)) / BOARD_ROWS,
      ),
    );
    const safeCellSize = Math.max(1, cellSize);
    return {
      scale,
      openingWidth,
      openingHeight,
      gap,
      cellSize: safeCellSize,
      boardWidth: BOARD_COLS * safeCellSize + gap * (BOARD_COLS - 1),
      boardHeight: BOARD_ROWS * safeCellSize + gap * (BOARD_ROWS - 1),
    };
  }

  private drawLoadingState(): void {
    const { ctx, layout } = this;
    const gradient = ctx.createLinearGradient(0, 0, layout.width, layout.height);
    gradient.addColorStop(0, "#11111d");
    gradient.addColorStop(1, "#05060f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, layout.width, layout.height);
    ctx.fillStyle = "#fff6de";
    ctx.textAlign = "center";
    ctx.font = "700 22px 'Avenir Next', 'Trebuchet MS', sans-serif";
    ctx.fillText("Preparing the shrine", layout.width / 2, layout.height / 2);
  }

  private drawBackground(): void {
    const { ctx, layout } = this;
    drawImageCover(ctx, this.assets!.background, 0, 0, layout.width, layout.height);
  }

  private drawFrameOverlay(): void {
    if (this.layout.portrait) {
      return;
    }
    const { ctx, layout } = this;
    ctx.drawImage(this.assets!.frame, layout.frameX, layout.frameY, layout.frameWidth, layout.frameHeight);
  }

  private drawShiftStage(stage: Extract<TurnStage, { kind: "shift" }>, progress: number): void {
    const distance = this.layout.cellSize + this.layout.gap;
    const startOffset = stage.startOffsetPx ?? 0;
    const endOffset = distance * stage.move.direction;
    const offset = lerp(startOffset, endOffset, easeInOut(progress));
    this.drawMovingLine(stage.before, stage.move, offset);
  }

  private drawCollapseStage(stage: CollapseStage, progress: number): void {
    const positionMap = new Map<number, { row: number; col: number }>();
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        const tile = stage.before[row]![col];
        if (tile) positionMap.set(tile.id, { row, col });
      }
    }

    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        const tile = stage.after[row]![col]!;
        const before = positionMap.get(tile.id);
        const fromRow = before?.row ?? -1;
        const fromCol = before?.col ?? col;
        const x = lerp(
          this.layout.boardX + fromCol * (this.layout.cellSize + this.layout.gap),
          this.layout.boardX + col * (this.layout.cellSize + this.layout.gap),
          easeInOut(progress),
        );
        const y = lerp(
          this.layout.boardY + fromRow * (this.layout.cellSize + this.layout.gap),
          this.layout.boardY + row * (this.layout.cellSize + this.layout.gap),
          easeInOut(progress),
        );
        this.drawToken(tile, x, y, this.layout.cellSize, false, 1, null, true);
      }
    }
  }

  private drawAshStage(stage: Extract<TurnStage, { kind: "ash" }>, progress: number): void {
    this.drawBoard(stage.after);
    const x = this.layout.boardX + stage.position.col * (this.layout.cellSize + this.layout.gap);
    const y = this.layout.boardY + stage.position.row * (this.layout.cellSize + this.layout.gap);
    const pulse = 1 + Math.sin(progress * Math.PI) * 0.14;
    const tile = stage.after[stage.position.row]![stage.position.col]!;
    this.drawToken(tile, x, y, this.layout.cellSize * pulse, true, 0.96, null, true);
  }

  private drawDragPreview(board: Board, preview: DragPreview): void {
    this.drawMovingLine(board, preview.move, preview.offsetPx, {
      highlight: true,
      interaction: "pressed",
      alpha: preview.settling ? 0.94 : 1,
    });
  }

  private drawIdleHint(board: Board, hint: IdleHint): void {
    const distance = (this.layout.cellSize + this.layout.gap) * 0.16;
    const pulse = Math.sin(hint.progress * Math.PI);
    const offset = easeInOut(pulse) * distance * hint.move.direction;
    this.drawMovingLine(board, hint.move, offset, { highlight: true, alpha: 1 });
  }

  private drawMovingLine(
    board: Board,
    move: Move,
    offset: number,
    options: {
      highlight?: boolean;
      interaction?: "hover" | "pressed" | null;
      alpha?: number;
    } = {},
  ): void {
    this.drawBoard(board, { hiddenMove: move });

    const step = this.layout.cellSize + this.layout.gap;
    const alpha = options.alpha ?? 1;
    if (move.axis === "row") {
      const row = board[move.index]!;
      const y = this.layout.boardY + move.index * step;
      for (let col = 0; col < BOARD_COLS; col += 1) {
        const tile = row[col]!;
        const baseX = this.layout.boardX + col * step;
        this.drawToken(tile, baseX + offset, y, this.layout.cellSize, Boolean(options.highlight), alpha, options.interaction ?? null, true);
        if (move.direction === 1 && col === BOARD_COLS - 1) {
          this.drawToken(
            tile,
            baseX + offset - (this.layout.boardWidth + this.layout.gap),
            y,
            this.layout.cellSize,
            Boolean(options.highlight),
            alpha,
            options.interaction ?? null,
            true,
          );
        }
        if (move.direction === -1 && col === 0) {
          this.drawToken(
            tile,
            baseX + offset + this.layout.boardWidth + this.layout.gap,
            y,
            this.layout.cellSize,
            Boolean(options.highlight),
            alpha,
            options.interaction ?? null,
            true,
          );
        }
      }
      return;
    }

    for (let row = 0; row < BOARD_ROWS; row += 1) {
      const tile = board[row]![move.index]!;
      const x = this.layout.boardX + move.index * step;
      const baseY = this.layout.boardY + row * step;
      this.drawToken(tile, x, baseY + offset, this.layout.cellSize, Boolean(options.highlight), alpha, options.interaction ?? null, true);
      if (move.direction === 1 && row === BOARD_ROWS - 1) {
        this.drawToken(
          tile,
          x,
          baseY + offset - (this.layout.boardHeight + this.layout.gap),
          this.layout.cellSize,
          Boolean(options.highlight),
          alpha,
          options.interaction ?? null,
          true,
        );
      }
      if (move.direction === -1 && row === 0) {
        this.drawToken(
          tile,
          x,
          baseY + offset + this.layout.boardHeight + this.layout.gap,
          this.layout.cellSize,
          Boolean(options.highlight),
          alpha,
          options.interaction ?? null,
          true,
        );
      }
    }
  }

  private drawBoard(
    board: Board,
    options: {
      clearStage?: ClearStage;
      clearProgress?: number;
      interaction?: TileInteractionState | null;
      hiddenMove?: Move;
    } = {},
  ): void {
    const clearSet = options.clearStage
      ? new Set([...options.clearStage.matched, ...options.clearStage.cleansed].map((position) => `${position.row}:${position.col}`))
      : null;
    const clearProgress = options.clearProgress ?? 0;

    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        if (options.hiddenMove?.axis === "row" && row === options.hiddenMove.index) continue;
        if (options.hiddenMove?.axis === "col" && col === options.hiddenMove.index) continue;
        const tile = board[row]![col]!;
        const x = this.layout.boardX + col * (this.layout.cellSize + this.layout.gap);
        const y = this.layout.boardY + row * (this.layout.cellSize + this.layout.gap);
        const isClearing = clearSet?.has(`${row}:${col}`) ?? false;
        const interaction =
          options.interaction?.pressed?.row === row && options.interaction?.pressed?.col === col
            ? "pressed"
            : options.interaction?.hovered?.row === row && options.interaction?.hovered?.col === col
              ? "hover"
              : null;
        let scale = isClearing ? 1 + Math.sin(clearProgress * Math.PI) * 0.08 : 1;
        if (!isClearing && interaction === "hover") {
          scale *= 1.05;
        }
        if (!isClearing && interaction === "pressed") {
          scale *= 0.96;
        }
        const alpha = isClearing ? 1 - clearProgress * 0.84 : 1;
        this.drawToken(tile, x, y, this.layout.cellSize * scale, isClearing, alpha, interaction);
      }
    }
  }

  private drawToken(
    tile: Tile,
    x: number,
    y: number,
    size: number,
    highlight: boolean,
    alpha: number,
    interaction: "hover" | "pressed" | null = null,
    fadeAtBoardEdge = false,
  ): void {
    const image = this.assets!.tiles[tile.kind];
    const offset = (this.layout.cellSize - size) / 2;
    const drawX = x + offset;
    const drawY = y + offset;
    const effectiveAlpha = alpha * this.boardOpacity * (fadeAtBoardEdge ? this.edgeFadeAlpha(drawX, drawY, size) : 1);
    if (effectiveAlpha <= 0.01) {
      return;
    }
    const { ctx } = this;

    ctx.save();
    ctx.globalAlpha = effectiveAlpha;
    ctx.shadowColor =
      interaction === "pressed"
        ? "rgba(255, 236, 174, 0.82)"
        : interaction === "hover"
          ? "rgba(194, 236, 255, 0.58)"
          : highlight
            ? "rgba(249, 227, 156, 0.54)"
            : "rgba(12, 18, 36, 0.28)";
    ctx.shadowBlur =
      interaction === "pressed"
        ? size * 0.24
        : interaction === "hover"
          ? size * 0.18
          : highlight
            ? size * 0.2
            : size * 0.1;
    ctx.shadowOffsetY = interaction === "pressed" ? size * 0.02 : size * 0.05;
    ctx.drawImage(image, drawX, drawY, size, size);
    ctx.restore();

    if (!highlight && !interaction) {
      return;
    }

    const radius = size * 0.21;
    ctx.save();
    ctx.globalAlpha = 0.92 * effectiveAlpha;
    ctx.strokeStyle =
      interaction === "pressed"
        ? "rgba(255, 247, 219, 0.98)"
        : interaction === "hover"
          ? "rgba(189, 239, 255, 0.94)"
          : "rgba(255, 246, 214, 0.88)";
    ctx.lineWidth = interaction === "pressed" ? Math.max(3, size * 0.04) : Math.max(2, size * 0.03);
    strokeRoundedRect(ctx, drawX - 3, drawY - 3, size + 6, size + 6, radius * 1.06);
    ctx.restore();
  }

  private edgeFadeAlpha(x: number, y: number, size: number): number {
    const fadeBand = this.layout.cellSize * 0.32;
    const left = this.fadeAgainstEdge(x, this.layout.boardX, fadeBand, false);
    const right = this.fadeAgainstEdge(x + size, this.layout.boardX + this.layout.boardWidth, fadeBand, true);
    const top = this.fadeAgainstEdge(y, this.layout.boardY, fadeBand, false);
    const bottom = this.fadeAgainstEdge(y + size, this.layout.boardY + this.layout.boardHeight, fadeBand, true);
    return left * right * top * bottom;
  }

  private fadeAgainstEdge(edge: number, boundary: number, fadeBand: number, trailing: boolean): number {
    const overflow = trailing ? edge - boundary : boundary - edge;
    if (overflow <= 0) {
      return 1;
    }
    return clamp(1 - overflow / fadeBand, 0, 1);
  }

  private drawHud(model: RenderModel): void {
    this.overlayButtons = [];
    if (model.overlay === "gameover") {
      this.drawGameOverModal(model);
      return;
    }
    if (!model.showHud) {
      return;
    }

    if (this.layout.portrait) {
      this.drawPortraitPlaying(model);
    } else {
      this.drawLandscapePlaying(model);
    }

    if (model.comboLabel) {
      this.drawComboLabel(model.comboLabel, Boolean(model.toastLabel));
    }
    if (model.toastLabel) {
      this.drawToast(model.toastLabel, Boolean(model.comboLabel));
    }
  }

  private drawPortraitPlaying(model: RenderModel): void {
    if (model.score <= 0) {
      return;
    }
    const centerX = this.layout.width / 2;
    const fontSize = 48;
    const topBandHeight = Math.max(64, this.layout.boardY);
    const topY = Math.round(topBandHeight / 2 + fontSize * 0.34);
    drawText(this.ctx, formatScore(model.score), centerX, topY, {
      align: "center",
      font: `800 ${fontSize}px 'Avenir Next', 'Trebuchet MS', sans-serif`,
      fill: "#fff6de",
      shadow: "rgba(5, 8, 18, 0.44)",
    });
  }

  private drawLandscapePlaying(model: RenderModel): void {
    if (model.score <= 0) {
      return;
    }
    const x = this.layout.hudX;
    const y = this.layout.hudY + 46;
    drawText(this.ctx, formatScore(model.score), x, y, {
      align: "left",
      font: "800 54px 'Avenir Next', 'Trebuchet MS', sans-serif",
      fill: "#fff6de",
      shadow: "rgba(5, 8, 18, 0.44)",
    });
  }

  private drawGameOverModal(model: RenderModel): void {
    const margin = this.layout.portrait ? 24 : 32;
    const width = Math.min(this.layout.width - margin * 2, this.layout.portrait ? 360 : 432);
    const height = this.layout.portrait ? 282 : 296;
    const x = Math.round((this.layout.width - width) / 2);
    const y = Math.round((this.layout.height - height) / 2);
    const centerX = x + width / 2;
    const buttonWidth = Math.min(width - 56, this.layout.portrait ? 264 : 276);
    const buttonHeight = 52;
    const buttonX = x + (width - buttonWidth) / 2;
    const buttonY = y + height - buttonHeight - 28;
    const hasScore = model.score > 0;

    this.ctx.save();
    this.ctx.fillStyle = "rgba(6, 9, 18, 0.56)";
    this.ctx.fillRect(0, 0, this.layout.width, this.layout.height);
    this.ctx.restore();

    this.ctx.save();
    this.ctx.shadowColor = "rgba(4, 7, 16, 0.48)";
    this.ctx.shadowBlur = 32;
    fillRoundedRect(this.ctx, x, y, width, height, 28, "rgba(18, 22, 42, 0.9)");
    this.ctx.restore();
    strokeRoundedRect(this.ctx, x + 1.5, y + 1.5, width - 3, height - 3, 28, "rgba(255, 235, 184, 0.34)", 2);
    strokeRoundedRect(this.ctx, x + 10, y + 10, width - 20, height - 20, 22, "rgba(134, 168, 255, 0.12)", 1.5);

    drawText(this.ctx, "Game Over", centerX, y + 62, {
      align: "center",
      font: "800 34px 'Avenir Next', 'Trebuchet MS', sans-serif",
      fill: "#fff4de",
      shadow: "rgba(5, 8, 18, 0.38)",
    });
    drawText(this.ctx, gameOverSubtitle(model.gameOverReason), centerX, y + 96, {
      align: "center",
      font: "600 18px 'Avenir Next', 'Trebuchet MS', sans-serif",
      fill: "rgba(225, 232, 248, 0.92)",
      shadow: "rgba(5, 8, 18, 0.28)",
    });
    if (hasScore) {
      drawText(this.ctx, formatScore(model.score), centerX, y + 162, {
        align: "center",
        font: "800 62px 'Avenir Next', 'Trebuchet MS', sans-serif",
        fill: "#fff6de",
        shadow: "rgba(5, 8, 18, 0.42)",
      });
    }
    drawText(this.ctx, `Best ${formatScore(model.bestScore)}`, centerX, y + (hasScore ? 194 : 164), {
      align: "center",
      font: "600 18px 'Avenir Next', 'Trebuchet MS', sans-serif",
      fill: "rgba(228, 227, 241, 0.82)",
    });

    this.overlayButtons = [
      {
        action: "restart",
        label: "Play Again",
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
        primary: true,
      },
    ];
    for (const button of this.overlayButtons) {
      this.drawButton(button);
    }
  }

  private drawComboLabel(comboLabel: ComboLabel, hasToast: boolean): void {
    const layout = this.getHudMessageLayout(true, hasToast);
    drawText(this.ctx, comboLabel.text, layout.x, layout.comboY, {
      align: layout.align,
      font: "800 18px 'Avenir Next', 'Trebuchet MS', sans-serif",
      fill: `rgba(255, 234, 171, ${comboLabel.opacity})`,
      shadow: `rgba(5, 8, 18, ${comboLabel.opacity * 0.54})`,
    });
  }

  private drawToast(toastLabel: ToastLabel, hasCombo: boolean): void {
    const layout = this.getHudMessageLayout(hasCombo, true);
    drawText(this.ctx, toastLabel.title, layout.x, layout.toastTitleY, {
      align: layout.align,
      font: "700 16px 'Avenir Next', 'Trebuchet MS', sans-serif",
      fill: `rgba(255, 235, 184, ${toastLabel.opacity})`,
      shadow: `rgba(5, 8, 18, ${toastLabel.opacity * 0.54})`,
    });
    drawText(this.ctx, toastLabel.detail, layout.x, layout.toastDetailY, {
      align: layout.align,
      font: "500 13px 'Avenir Next', 'Trebuchet MS', sans-serif",
      fill: `rgba(239, 237, 246, ${toastLabel.opacity * 0.94})`,
      maxWidth: layout.maxWidth,
      lineHeight: 17,
    });
  }

  private getHudMessageLayout(hasCombo: boolean, hasToast: boolean): {
    x: number;
    comboY: number;
    toastTitleY: number;
    toastDetailY: number;
    maxWidth: number;
    align: CanvasTextAlign;
  } {
    if (this.layout.portrait) {
      const regionTop = this.layout.boardY + this.layout.boardHeight;
      const regionHeight = Math.max(96, this.layout.height - regionTop);
      const centerY = regionTop + regionHeight / 2;
      return {
        x: this.layout.width / 2,
        comboY: Math.round(centerY + (hasToast ? -26 : 4)),
        toastTitleY: Math.round(centerY + (hasCombo ? 2 : -4)),
        toastDetailY: Math.round(centerY + (hasCombo ? 24 : 18)),
        maxWidth: this.layout.width - 80,
        align: "center",
      };
    }

    const x = this.layout.hudX;
    const firstLineY = this.layout.hudY + 88;
    return {
      x,
      comboY: firstLineY,
      toastTitleY: firstLineY + (hasCombo ? 30 : 12),
      toastDetailY: firstLineY + (hasCombo ? 52 : 34),
      maxWidth: this.layout.hudWidth,
      align: "left",
    };
  }

  private drawButton(button: OverlayButtonLayout): void {
    const fill = button.primary ? "rgba(241, 205, 120, 0.96)" : "rgba(19, 24, 48, 0.74)";
    const stroke = button.primary ? "rgba(255, 249, 230, 0.72)" : "rgba(255, 243, 213, 0.2)";
    const text = button.primary ? "#22161a" : "#fff6de";
    fillRoundedRect(this.ctx, button.x, button.y, button.width, button.height, 18, fill);
    strokeRoundedRect(this.ctx, button.x + 1.5, button.y + 1.5, button.width - 3, button.height - 3, 18, stroke, 2);
    drawText(this.ctx, button.label, button.x + button.width / 2, button.y + 31, {
      align: "center",
      font: "800 18px 'Avenir Next', 'Trebuchet MS', sans-serif",
      fill: text,
    });
  }
}

function gameOverSubtitle(reason: GameOverReason | null): string {
  if (reason === "no_moves") {
    return "No move possible";
  }
  return "Run complete";
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    align: CanvasTextAlign;
    font: string;
    fill: string;
    shadow?: string;
    maxWidth?: number;
    lineHeight?: number;
    letterSpacing?: number;
  },
): void {
  ctx.save();
  ctx.textAlign = options.align;
  ctx.font = options.font;
  ctx.fillStyle = options.fill;
  if (options.shadow) {
    ctx.shadowColor = options.shadow;
    ctx.shadowBlur = 12;
  }

  const lines = options.maxWidth ? wrapText(ctx, text, options.maxWidth) : [text];
  const lineHeight = options.lineHeight ?? 18;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (options.letterSpacing) {
      fillTextWithSpacing(ctx, line, x, y + index * lineHeight, options.letterSpacing, options.align);
      continue;
    }
    ctx.fillText(line, x, y + index * lineHeight);
  }
  ctx.restore();
}

function fillTextWithSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number,
  align: CanvasTextAlign,
): void {
  if (text.length <= 1) {
    ctx.fillText(text, x, y);
    return;
  }

  const width = text.split("").reduce((total, char) => total + ctx.measureText(char).width, 0) + letterSpacing * (text.length - 1);
  let cursor = x;
  if (align === "center") {
    cursor -= width / 2;
  } else if (align === "right" || align === "end") {
    cursor -= width;
  }

  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + letterSpacing;
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }
  return lines;
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
): void {
  beginRoundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  stroke = "rgba(240, 200, 117, 0.6)",
  lineWidth = 4,
): void {
  beginRoundedRectPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function beginRoundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const safeRadius = clamp(radius, 0, Math.min(safeWidth, safeHeight) / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + safeWidth, y, x + safeWidth, y + safeHeight, safeRadius);
  ctx.arcTo(x + safeWidth, y + safeHeight, x, y + safeHeight, safeRadius);
  ctx.arcTo(x, y + safeHeight, x, y, safeRadius);
  ctx.arcTo(x, y, x + safeWidth, y, safeRadius);
  ctx.closePath();
}

function formatScore(score: number): string {
  return new Intl.NumberFormat("en-US").format(score);
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function easeInOut(value: number): number {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const sourceWidth = "naturalWidth" in image ? image.naturalWidth : (image as ImageBitmap).width;
  const sourceHeight = "naturalHeight" in image ? image.naturalHeight : (image as ImageBitmap).height;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = new URL(src, window.location.href).toString();
  });
}
