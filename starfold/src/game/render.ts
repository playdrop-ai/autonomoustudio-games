import { BOARD_COLS, BOARD_ROWS, isAshKind, type Board, type ClearStage, type CollapseStage, type GameOverReason, type Move, type SigilKind, type Tile, type TileKind, type TurnStage } from "./logic";
import type { GameOverResult } from "./results";
import type { PlatformSnapshot } from "../platform";

type OverlayMode = "gameover" | null;
export type RenderQualityTier = "full" | "reduced" | "minimal";

export interface Layout {
  width: number;
  height: number;
  dpr: number;
  portrait: boolean;
  safeTop: number;
  safeRight: number;
  safeBottom: number;
  safeLeft: number;
  contentX: number;
  contentY: number;
  contentWidth: number;
  contentHeight: number;
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
  bestScore: number | null;
  rank: number | null;
  boardOpacity: number;
  boardReset: BoardResetTransition | null;
  showHud: boolean;
  intro: StartupIntroState;
  gameOverReason: GameOverReason | null;
  gameOverResult: GameOverResult;
  gameOverSubtitle: string;
  gameOverOverlayProgress: number;
  gameOverTileFadeProgress: number;
  gameOverCtaElapsedMs: number;
  overlayInteractive: boolean;
  hudLoginEnabled: boolean;
  idleHint: IdleHint | null;
  dragPreview: DragPreview | null;
  stage: ActiveStage | null;
  overlay: OverlayMode;
  edgeFlash: EdgeFlash | null;
  comboLabel: ComboLabel | null;
  platform: PlatformSnapshot;
  interaction: TileInteractionState | null;
  qualityTier: RenderQualityTier;
}

export interface ActiveStage {
  stage: TurnStage;
  progress: number;
}

export interface BoardResetTransition {
  outgoingBoard: Board;
  outgoingAshedAmount: number;
  outgoingProgress: number[][];
  incomingBoard: Board;
  incomingReveal: number[][];
}

export interface ComboLabel {
  title: string;
  detail: string;
  opacity: number;
  depth: number;
  kind: SigilKind;
  matchCount: number;
  decayMs: number;
  burstElapsedMs: number;
  burstMs: number;
}

export interface StartupIntroState {
  active: boolean;
  heroOnly: boolean;
  backgroundOpacity: number;
  heroOpacity: number;
  boardOpacity: number;
  hudOpacity: number;
  hudOffsetX: number;
  hudOffsetY: number;
  tileReveal: number[][] | null;
}

export interface EdgeFlash {
  tier: 4 | 5 | 6;
  progress: number;
  strength: number;
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
export type HudAction = "login-rank" | "login-best";

interface OverlayButtonLayout {
  action: OverlayAction;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  primary: boolean;
  iconOnly?: boolean;
}

interface HudButtonLayout {
  action: HudAction;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RuntimeAssets {
  backgroundLandscape: HTMLImageElement;
  backgroundPortrait: HTMLImageElement;
  heroLandscape: HTMLImageElement;
  heroPortrait: HTMLImageElement;
  tiles: Record<TileKind, HTMLImageElement>;
  sigilTilesAshed: Record<SigilKind, HTMLImageElement>;
  sigilTilesHighlight: Record<SigilKind, HTMLImageElement>;
}

interface BootAssets {
  heroLandscape: HTMLImageElement;
  heroPortrait: HTMLImageElement;
}

interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface HudMetric {
  label: string;
  value: string;
  mutedValue: boolean;
  action: HudAction | null;
  emphasis: number;
  tone?: "default" | "gold";
}

interface CanvasLayerCache {
  key: string;
  canvas: HTMLCanvasElement;
}

const ASSET_URLS = {
  backgroundLandscape: "./assets/runtime/starfold-background-landscape-v1.png",
  backgroundPortrait: "./assets/runtime/starfold-background-portrait-v1.png",
  heroLandscape: "./assets/runtime/starfold-hero-landscape-v1.png",
  heroPortrait: "./assets/runtime/starfold-hero-portrait-v1.png",
  sigilTilesNormal: {
    sun: "./assets/runtime/tiles/generated-v2/starfold-tile-sun-normal-r1.png",
    moon: "./assets/runtime/tiles/generated-v2/starfold-tile-moon-normal-r1.png",
    wave: "./assets/runtime/tiles/generated-v2/starfold-tile-wave-normal-r1.png",
    leaf: "./assets/runtime/tiles/generated-v2/starfold-tile-leaf-normal-r1.png",
    ember: "./assets/runtime/tiles/generated-v2/starfold-tile-ember-normal-r1.png",
  } satisfies Record<SigilKind, string>,
  sigilTilesAshed: {
    sun: "./assets/runtime/tiles/generated-v2/starfold-tile-sun-ashed-r1.png",
    moon: "./assets/runtime/tiles/generated-v2/starfold-tile-moon-ashed-r1.png",
    wave: "./assets/runtime/tiles/generated-v2/starfold-tile-wave-ashed-r1.png",
    leaf: "./assets/runtime/tiles/generated-v2/starfold-tile-leaf-ashed-r1.png",
    ember: "./assets/runtime/tiles/generated-v2/starfold-tile-ember-ashed-r1.png",
  } satisfies Record<SigilKind, string>,
  sigilTilesHighlight: {
    sun: "./assets/runtime/tiles/generated-v2/starfold-tile-sun-highlight-r1.png",
    moon: "./assets/runtime/tiles/generated-v2/starfold-tile-moon-highlight-r1.png",
    wave: "./assets/runtime/tiles/generated-v2/starfold-tile-wave-highlight-r1.png",
    leaf: "./assets/runtime/tiles/generated-v2/starfold-tile-leaf-highlight-r1.png",
    ember: "./assets/runtime/tiles/generated-v2/starfold-tile-ember-highlight-r1.png",
  } satisfies Record<SigilKind, string>,
  ashTiles: {
    ash3: "./assets/runtime/tiles/generated-v2/starfold-tile-ash3-r1.png",
    ash2: "./assets/runtime/tiles/generated-v2/starfold-tile-ash2-r1.png",
    ash1: "./assets/runtime/tiles/generated-v2/starfold-tile-ash1-r1.png",
  } satisfies Record<"ash3" | "ash2" | "ash1", string>,
} as const;

const FRAME_ASPECT = 1;
const FRAME_PADDING_IN_GAPS = 2;
const HUD_FONT_FAMILY = "'Avenir Next', 'Trebuchet MS', sans-serif";
const GLASS_PANEL_TINTS = {
  left: "rgba(177, 171, 255, 0.34)",
  center: "rgba(120, 100, 255, 0.18)",
  right: "rgba(137, 192, 255, 0.24)",
  bottom: "rgba(214, 140, 255, 0.18)",
  topLight: "rgba(255, 255, 255, 0.92)",
  divider: "rgba(255, 255, 255, 0.34)",
  outerStroke: "rgba(255, 255, 255, 0.42)",
  innerStroke: "rgba(255, 255, 255, 0.18)",
  coreTop: "rgba(255, 255, 255, 0.16)",
  coreBottom: "rgba(255, 255, 255, 0.05)",
} as const;
const SIGIL_ACCENTS: Record<SigilKind, { primary: string; secondary: string; glowRgb: string }> = {
  sun: {
    primary: "#ffd76f",
    secondary: "#fff4c4",
    glowRgb: "160, 111, 12",
  },
  moon: {
    primary: "#c6b8ff",
    secondary: "#f0eaff",
    glowRgb: "88, 71, 146",
  },
  wave: {
    primary: "#63e2ff",
    secondary: "#ddfbff",
    glowRgb: "13, 101, 128",
  },
  leaf: {
    primary: "#7ef0a1",
    secondary: "#e7ffe8",
    glowRgb: "25, 118, 61",
  },
  ember: {
    primary: "#ff9a6c",
    secondary: "#ffe1d1",
    glowRgb: "147, 66, 31",
  },
};

export class CanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly safeAreaProbe: HTMLDivElement;
  private layout: Layout;
  private overlayButtons: OverlayButtonLayout[] = [];
  private hudButtons: HudButtonLayout[] = [];
  private bootAssets: BootAssets | null = null;
  private assets: RuntimeAssets | null = null;
  private boardOpacity = 1;
  private tileAshedAmount = 0;
  private currentQualityTier: RenderQualityTier = "full";
  private backgroundCache: CanvasLayerCache | null = null;
  private frameBackdropCache: CanvasLayerCache | null = null;
  private frameOverlayCache: CanvasLayerCache | null = null;
  private portraitHudShellCache: CanvasLayerCache | null = null;
  private landscapeHudShellCache: CanvasLayerCache | null = null;
  private readonly hudValueFontCache = new Map<string, number>();
  private readonly textMetricCache = new Map<string, { ascent: number; height: number; width: number }>();

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.safeAreaProbe = this.createSafeAreaProbe();
    this.layout = this.computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    this.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  }

  async loadBootAssets(): Promise<void> {
    const [heroLandscape, heroPortrait] = await Promise.all([
      loadImage(ASSET_URLS.heroLandscape),
      loadImage(ASSET_URLS.heroPortrait),
    ]);
    this.bootAssets = {
      heroLandscape,
      heroPortrait,
    };
  }

  async loadAssets(): Promise<void> {
    const tasks: Array<{ key: string; src: string }> = [
      { key: "background-landscape", src: ASSET_URLS.backgroundLandscape },
      { key: "background-portrait", src: ASSET_URLS.backgroundPortrait },
      { key: "hero-landscape", src: ASSET_URLS.heroLandscape },
      { key: "hero-portrait", src: ASSET_URLS.heroPortrait },
      { key: "sun-normal", src: ASSET_URLS.sigilTilesNormal.sun },
      { key: "moon-normal", src: ASSET_URLS.sigilTilesNormal.moon },
      { key: "wave-normal", src: ASSET_URLS.sigilTilesNormal.wave },
      { key: "leaf-normal", src: ASSET_URLS.sigilTilesNormal.leaf },
      { key: "ember-normal", src: ASSET_URLS.sigilTilesNormal.ember },
      { key: "sun-ashed", src: ASSET_URLS.sigilTilesAshed.sun },
      { key: "moon-ashed", src: ASSET_URLS.sigilTilesAshed.moon },
      { key: "wave-ashed", src: ASSET_URLS.sigilTilesAshed.wave },
      { key: "leaf-ashed", src: ASSET_URLS.sigilTilesAshed.leaf },
      { key: "ember-ashed", src: ASSET_URLS.sigilTilesAshed.ember },
      { key: "sun-highlight", src: ASSET_URLS.sigilTilesHighlight.sun },
      { key: "moon-highlight", src: ASSET_URLS.sigilTilesHighlight.moon },
      { key: "wave-highlight", src: ASSET_URLS.sigilTilesHighlight.wave },
      { key: "leaf-highlight", src: ASSET_URLS.sigilTilesHighlight.leaf },
      { key: "ember-highlight", src: ASSET_URLS.sigilTilesHighlight.ember },
      { key: "ash3", src: ASSET_URLS.ashTiles.ash3 },
      { key: "ash2", src: ASSET_URLS.ashTiles.ash2 },
      { key: "ash1", src: ASSET_URLS.ashTiles.ash1 },
    ];

    const loaded = new Map<string, HTMLImageElement>();
    for (let index = 0; index < tasks.length; index += 1) {
      const task = tasks[index]!;
      loaded.set(task.key, await loadImage(task.src));
    }

    this.assets = {
      backgroundLandscape: loaded.get("background-landscape")!,
      backgroundPortrait: loaded.get("background-portrait")!,
      heroLandscape: loaded.get("hero-landscape")!,
      heroPortrait: loaded.get("hero-portrait")!,
      tiles: {
        sun: loaded.get("sun-normal")!,
        moon: loaded.get("moon-normal")!,
        wave: loaded.get("wave-normal")!,
        leaf: loaded.get("leaf-normal")!,
        ember: loaded.get("ember-normal")!,
        ash3: loaded.get("ash3")!,
        ash2: loaded.get("ash2")!,
        ash1: loaded.get("ash1")!,
      },
      sigilTilesAshed: {
        sun: loaded.get("sun-ashed")!,
        moon: loaded.get("moon-ashed")!,
        wave: loaded.get("wave-ashed")!,
        leaf: loaded.get("leaf-ashed")!,
        ember: loaded.get("ember-ashed")!,
      },
      sigilTilesHighlight: {
        sun: loaded.get("sun-highlight")!,
        moon: loaded.get("moon-highlight")!,
        wave: loaded.get("wave-highlight")!,
        leaf: loaded.get("leaf-highlight")!,
        ember: loaded.get("ember-highlight")!,
      },
    };
    this.invalidateStaticCaches();
  }

  resize(width: number, height: number, dpr: number): Layout {
    this.layout = this.computeLayout(width, height, dpr);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.invalidateStaticCaches();
    this.hudValueFontCache.clear();
    this.textMetricCache.clear();
    return this.layout;
  }

  getLayout(): Layout {
    return this.layout;
  }

  private invalidateStaticCaches(): void {
    this.backgroundCache = null;
    this.frameBackdropCache = null;
    this.frameOverlayCache = null;
    this.portraitHudShellCache = null;
    this.landscapeHudShellCache = null;
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

  hitTestHudAction(clientX: number, clientY: number): HudAction | null {
    for (const button of this.hudButtons) {
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
      this.drawLoadingState(model.intro);
      return;
    }

    this.drawBackground(model.intro.backgroundOpacity);
    this.boardOpacity = model.boardOpacity * model.intro.boardOpacity;
    this.tileAshedAmount = model.gameOverTileFadeProgress;
    this.currentQualityTier = model.qualityTier;
    if (this.boardOpacity > 0.001) {
      this.drawFrameBackdrop();
    }

    if (this.boardOpacity > 0.001 && model.boardReset) {
      this.drawBoardReset(model.boardReset);
    } else if (this.boardOpacity > 0.001 && model.stage?.stage.kind === "shift") {
      this.drawShiftStage(model.stage.stage, model.stage.progress);
    } else if (this.boardOpacity > 0.001 && model.stage?.stage.kind === "clear") {
      this.drawBoard(model.stage.stage.board, {
        clearStage: model.stage.stage,
        clearProgress: model.stage.progress,
        introTileReveal: model.intro.tileReveal,
      });
      this.drawClearPulse(model.stage.stage, model.stage.progress);
    } else if (this.boardOpacity > 0.001 && model.stage?.stage.kind === "collapse") {
      this.drawCollapseStage(model.stage.stage, model.stage.progress);
    } else if (this.boardOpacity > 0.001 && model.stage?.stage.kind === "ash") {
      this.drawAshStage(model.stage.stage, model.stage.progress);
    } else if (this.boardOpacity > 0.001 && model.dragPreview) {
      this.drawDragPreview(model.board, model.dragPreview);
    } else if (this.boardOpacity > 0.001 && model.idleHint) {
      this.drawIdleHint(model.board, model.idleHint);
    } else if (this.boardOpacity > 0.001) {
      this.drawBoard(model.board, {
        interaction: model.interaction,
        introTileReveal: model.intro.tileReveal,
      });
    }

    if (this.boardOpacity > 0.001) {
      this.drawFrameOverlay();
    }
    this.drawHud(model);
    if (model.intro.heroOpacity > 0.001) {
      this.drawStartupHero(model.intro.heroOpacity);
    }
    if (model.edgeFlash) {
      this.drawEdgeFlash(model.edgeFlash);
    }
  }

  private computeLayout(width: number, height: number, dpr: number): Layout {
    const safeArea = this.readSafeAreaInsets();
    const contentX = safeArea.left;
    const contentY = safeArea.top;
    const contentWidth = Math.max(96, width - safeArea.left - safeArea.right);
    const contentHeight = Math.max(96, height - safeArea.top - safeArea.bottom);
    const portrait = height > width;

    if (portrait) {
      const horizontalPadding = clamp(contentWidth * 0.045, 8, 22);
      const maxFrameHeight = Math.max(96, contentHeight - clamp(contentHeight * 0.24, 96, 228));
      const maxFrameWidth = maxFrameHeight * FRAME_ASPECT;
      const frameWidth = this.fitPortraitFrameWidth({
        maxFrameWidth,
        contentX,
        contentWidth,
        desiredPadding: horizontalPadding,
      });
      const frameHeight = frameWidth / FRAME_ASPECT;
      const frameX = Math.round(contentX + (contentWidth - frameWidth) / 2);
      const frameY = Math.round(contentY + (contentHeight - frameHeight) / 2);
      return this.finishLayout(
        width,
        height,
        dpr,
        portrait,
        frameX,
        frameY,
        frameWidth,
        frameHeight,
        0,
        0,
        width,
        height,
        safeArea,
      );
    }

    const outerPadding = clamp(Math.min(contentWidth, contentHeight) * 0.05, 12, 36);
    const frameAreaHeight = Math.max(96, contentHeight - outerPadding * 2);
    const hudGap = clamp(contentWidth * 0.022, 14, 28);
    const reservedHudWidth = clamp(contentWidth * 0.18, 128, 220);
    const sideReserve = Math.max(outerPadding, reservedHudWidth + hudGap);
    const frameAreaWidth = Math.max(96, contentWidth - sideReserve * 2);
    const frameWidth = Math.min(frameAreaWidth, frameAreaHeight * FRAME_ASPECT);
    const frameHeight = frameWidth / FRAME_ASPECT;
    const frameX = Math.round(contentX + (contentWidth - frameWidth) / 2);
    const frameY = Math.round(contentY + (contentHeight - frameHeight) / 2);
    const geometry = this.measureFrameGeometry(frameWidth, false);
    const boardX = frameX + (frameWidth - geometry.boardWidth) / 2;
    const frameRectX = Math.round(boardX - geometry.gap * 2);
    const desiredHudGap = geometry.cellSize;
    const baseHudX = Math.round(contentX + outerPadding);
    const baseHudWidth = Math.max(120, frameX - baseHudX - hudGap);
    const hudRight = frameRectX - desiredHudGap;
    const hudX = Math.max(baseHudX, Math.round(hudRight - baseHudWidth));
    const hudWidth = Math.max(120, hudRight - hudX);
    return this.finishLayout(
      width,
      height,
      dpr,
      portrait,
      frameX,
      frameY,
      frameWidth,
      frameHeight,
      hudX,
      Math.round(contentY + outerPadding),
      hudWidth,
      Math.max(96, contentHeight - outerPadding * 2),
      safeArea,
    );
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
    safeArea: SafeAreaInsets,
  ): Layout {
    const geometry = this.measureFrameGeometry(frameWidth, portrait);
    const boardX = Math.round(frameX + (frameWidth - geometry.boardWidth) / 2);
    const boardY = Math.round(frameY + (frameHeight - geometry.boardHeight) / 2);

    return {
      width,
      height,
      dpr,
      portrait,
      safeTop: safeArea.top,
      safeRight: safeArea.right,
      safeBottom: safeArea.bottom,
      safeLeft: safeArea.left,
      contentX: safeArea.left,
      contentY: safeArea.top,
      contentWidth: Math.max(96, width - safeArea.left - safeArea.right),
      contentHeight: Math.max(96, height - safeArea.top - safeArea.bottom),
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

  private fitPortraitFrameWidth(options: {
    maxFrameWidth: number;
    contentX: number;
    contentWidth: number;
    desiredPadding: number;
  }): number {
    const safeMaxFrameWidth = Math.max(96, options.maxFrameWidth);
    let low = 96;
    let high = safeMaxFrameWidth;
    let best = low;

    for (let index = 0; index < 24; index += 1) {
      const mid = (low + high) / 2;
      const metrics = this.measurePortraitBoardBounds(options.contentX, options.contentWidth, mid);
      const requiredPadding = Math.max(options.desiredPadding, metrics.gap);
      const fits =
        metrics.boardLeft >= options.contentX + requiredPadding &&
        metrics.boardRight <= options.contentX + options.contentWidth - requiredPadding;
      if (fits) {
        best = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    return best;
  }

  private measurePortraitBoardBounds(contentX: number, contentWidth: number, frameWidth: number): {
    gap: number;
    boardLeft: number;
    boardRight: number;
  } {
    const geometry = this.measureFrameGeometry(frameWidth, true);
    const frameX = contentX + (contentWidth - frameWidth) / 2;
    const boardLeft = frameX + (frameWidth - geometry.boardWidth) / 2;
    return {
      gap: geometry.gap,
      boardLeft,
      boardRight: boardLeft + geometry.boardWidth,
    };
  }

  private measureFrameGeometry(frameWidth: number, portrait: boolean): {
    gap: number;
    cellSize: number;
    boardWidth: number;
    boardHeight: number;
  } {
    const safeFrameWidth = Math.max(96, frameWidth);
    const desiredGap = portrait ? Math.round(safeFrameWidth * 0.0075) : Math.round(safeFrameWidth * 0.0085);
    const maxGap = Math.max(
      1,
      Math.floor(
        Math.min(
          safeFrameWidth / Math.max(BOARD_COLS + FRAME_PADDING_IN_GAPS * 2, 1),
          safeFrameWidth / Math.max(BOARD_ROWS + FRAME_PADDING_IN_GAPS * 2, 1),
        ),
      ),
    );
    const gap = clamp(desiredGap, 1, maxGap);
    const cellSize = Math.floor(
      Math.min(
        (safeFrameWidth - gap * ((BOARD_COLS - 1) + FRAME_PADDING_IN_GAPS * 2)) / BOARD_COLS,
        (safeFrameWidth - gap * ((BOARD_ROWS - 1) + FRAME_PADDING_IN_GAPS * 2)) / BOARD_ROWS,
      ),
    );
    const safeCellSize = Math.max(1, cellSize);
    return {
      gap,
      cellSize: safeCellSize,
      boardWidth: BOARD_COLS * safeCellSize + gap * (BOARD_COLS - 1),
      boardHeight: BOARD_ROWS * safeCellSize + gap * (BOARD_ROWS - 1),
    };
  }

  private drawLoadingState(intro: StartupIntroState): void {
    const { ctx, layout } = this;
    const gradient = ctx.createLinearGradient(0, 0, layout.width, layout.height);
    gradient.addColorStop(0, "#11111d");
    gradient.addColorStop(1, "#05060f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, layout.width, layout.height);
    if (intro.heroOpacity > 0.001) {
      this.drawStartupHero(intro.heroOpacity);
    }
  }

  private drawBackground(opacity = 1): void {
    if (opacity <= 0.001) {
      return;
    }
    const cacheKey = `background:${this.layout.width}:${this.layout.height}:${this.layout.dpr}:${this.layout.portrait ? "p" : "l"}`;
    this.backgroundCache = this.getOrCreateLayerCache(this.backgroundCache, cacheKey, (ctx) => {
      drawImageCover(ctx, this.getBackgroundImage(), 0, 0, this.layout.width, this.layout.height);
    });
    this.ctx.save();
    this.ctx.globalAlpha = clamp(opacity, 0, 1);
    this.ctx.drawImage(this.backgroundCache.canvas, 0, 0, this.layout.width, this.layout.height);
    this.ctx.restore();
  }

  private drawStartupHero(opacity: number): void {
    const image = this.getHeroImage();
    if (!image || opacity <= 0.001) {
      return;
    }
    this.ctx.save();
    this.ctx.globalAlpha = clamp(opacity, 0, 1);
    drawImageCover(this.ctx, image, 0, 0, this.layout.width, this.layout.height);
    this.ctx.restore();
  }

  private getBackgroundImage(): HTMLImageElement {
    if (!this.assets) {
      throw new Error("Runtime assets unavailable");
    }
    return this.layout.portrait ? this.assets.backgroundPortrait : this.assets.backgroundLandscape;
  }

  private getHeroImage(): HTMLImageElement | null {
    if (this.assets) {
      return this.layout.portrait ? this.assets.heroPortrait : this.assets.heroLandscape;
    }
    if (this.bootAssets) {
      return this.layout.portrait ? this.bootAssets.heroPortrait : this.bootAssets.heroLandscape;
    }
    return null;
  }

  private getOrCreateLayerCache(
    existing: CanvasLayerCache | null,
    key: string,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ): CanvasLayerCache {
    if (existing?.key === key) {
      return existing;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(this.layout.width * this.layout.dpr));
    canvas.height = Math.max(1, Math.floor(this.layout.height * this.layout.dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Layer cache 2D context unavailable");
    }
    ctx.setTransform(this.layout.dpr, 0, 0, this.layout.dpr, 0, 0);
    draw(ctx);
    return { key, canvas };
  }

  private getGlassFrameRect(): {
    x: number;
    y: number;
    width: number;
    height: number;
    radius: number;
    innerInsetX: number;
    innerInsetY: number;
  } {
    const padding = this.layout.gap * 2;
    const x = Math.round(this.layout.boardX - padding);
    const y = Math.round(this.layout.boardY - padding);
    const width = Math.round(this.layout.boardWidth + padding * 2);
    const height = Math.round(this.layout.boardHeight + padding * 2);
    return {
      x,
      y,
      width,
      height,
      radius: Math.round(clamp(this.layout.gap * 1.8, 12, 20)),
      innerInsetX: padding,
      innerInsetY: padding,
    };
  }

  private drawFrameBackdrop(): void {
    if (this.tileAshedAmount > 0.001) {
      const frame = this.getGlassFrameRect();
      this.drawGlassBoardBackdrop(frame.x, frame.y, frame.width, frame.height, frame.radius, this.tileAshedAmount);
      return;
    }
    const frame = this.getGlassFrameRect();
    const cacheKey = `frame-backdrop:${this.layout.width}:${this.layout.height}:${this.layout.dpr}:${frame.x}:${frame.y}:${frame.width}:${frame.height}:${frame.radius}`;
    this.frameBackdropCache = this.getOrCreateLayerCache(this.frameBackdropCache, cacheKey, (ctx) => {
      this.drawGlassBoardBackdropToContext(ctx, frame.x, frame.y, frame.width, frame.height, frame.radius, 0);
    });
    this.ctx.drawImage(this.frameBackdropCache.canvas, 0, 0, this.layout.width, this.layout.height);
  }

  private drawFrameOverlay(): void {
    if (this.tileAshedAmount > 0.001) {
      const frame = this.getGlassFrameRect();
      this.drawGlassFrame(frame.x, frame.y, frame.width, frame.height, frame.radius, this.tileAshedAmount);
      return;
    }
    const frame = this.getGlassFrameRect();
    const cacheKey = `frame-overlay:${this.layout.width}:${this.layout.height}:${this.layout.dpr}:${frame.x}:${frame.y}:${frame.width}:${frame.height}:${frame.radius}`;
    this.frameOverlayCache = this.getOrCreateLayerCache(this.frameOverlayCache, cacheKey, (ctx) => {
      this.drawGlassFrameToContext(ctx, frame.x, frame.y, frame.width, frame.height, frame.radius, 0);
    });
    this.ctx.drawImage(this.frameOverlayCache.canvas, 0, 0, this.layout.width, this.layout.height);
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

  private drawClearPulse(stage: ClearStage, progress: number): void {
    if (stage.pulseKind === "none") {
      return;
    }

    const eased = easeOutCubic(clamp(progress * (stage.pulseKind === "wipe" ? 1.14 : 1.06), 0, 1));
    const centerX = this.layout.boardX + this.layout.boardWidth / 2;
    const centerY = this.layout.boardY + this.layout.boardHeight / 2;
    const maxRadius = Math.hypot(this.layout.boardWidth, this.layout.boardHeight) * (stage.pulseKind === "wipe" ? 0.78 : 0.7);
    const radius = lerp(this.layout.cellSize * 0.62, maxRadius, eased);
    const boardRadius = this.layout.cellSize * 0.22;
    const waveAlpha = 1 - eased;

    if (this.currentQualityTier === "minimal") {
      this.ctx.save();
      this.ctx.globalCompositeOperation = "screen";
      this.ctx.strokeStyle = stage.pulseKind === "wipe" ? `rgba(255, 246, 210, ${0.42 + waveAlpha * 0.38})` : `rgba(255, 224, 168, ${0.28 + waveAlpha * 0.26})`;
      this.ctx.lineWidth = stage.pulseKind === "wipe" ? 8 : 6;
      this.ctx.shadowColor = "transparent";
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
      return;
    }

    if (this.currentQualityTier === "reduced") {
      this.ctx.save();
      this.ctx.globalCompositeOperation = "screen";
      fillRoundedRect(
        this.ctx,
        this.layout.boardX - 2,
        this.layout.boardY - 2,
        this.layout.boardWidth + 4,
        this.layout.boardHeight + 4,
        boardRadius + 4,
        stage.pulseKind === "wipe"
          ? `rgba(255, 236, 176, ${0.08 + waveAlpha * 0.14})`
          : `rgba(255, 216, 148, ${0.05 + waveAlpha * 0.1})`,
      );
      this.ctx.strokeStyle = stage.pulseKind === "wipe" ? `rgba(255, 248, 214, ${0.4 + waveAlpha * 0.28})` : `rgba(255, 226, 164, ${0.28 + waveAlpha * 0.2})`;
      this.ctx.lineWidth = stage.pulseKind === "wipe" ? 8 : 6;
      this.ctx.shadowColor = "transparent";
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
      return;
    }

    this.ctx.save();
    this.ctx.globalCompositeOperation = "screen";

    fillRoundedRect(
      this.ctx,
      this.layout.boardX - 2,
      this.layout.boardY - 2,
      this.layout.boardWidth + 4,
      this.layout.boardHeight + 4,
      boardRadius + 4,
      stage.pulseKind === "wipe"
        ? `rgba(255, 236, 176, ${0.12 + waveAlpha * 0.22})`
        : `rgba(255, 216, 148, ${0.08 + waveAlpha * 0.14})`,
    );

    const glowGradient = this.ctx.createRadialGradient(centerX, centerY, radius * 0.16, centerX, centerY, radius);
    glowGradient.addColorStop(0, stage.pulseKind === "wipe" ? `rgba(255, 245, 196, ${0.28 + waveAlpha * 0.24})` : `rgba(255, 231, 168, ${0.18 + waveAlpha * 0.16})`);
    glowGradient.addColorStop(0.62, stage.pulseKind === "wipe" ? `rgba(255, 212, 122, ${0.12 + waveAlpha * 0.2})` : `rgba(255, 194, 102, ${0.08 + waveAlpha * 0.14})`);
    glowGradient.addColorStop(1, "rgba(255, 184, 88, 0)");
    this.ctx.fillStyle = glowGradient;
    this.ctx.fillRect(
      this.layout.boardX - this.layout.cellSize * 0.8,
      this.layout.boardY - this.layout.cellSize * 0.8,
      this.layout.boardWidth + this.layout.cellSize * 1.6,
      this.layout.boardHeight + this.layout.cellSize * 1.6,
    );

    this.ctx.strokeStyle = stage.pulseKind === "wipe" ? `rgba(255, 248, 214, ${0.46 + waveAlpha * 0.4})` : `rgba(255, 226, 164, ${0.34 + waveAlpha * 0.3})`;
    this.ctx.lineWidth = stage.pulseKind === "wipe" ? 10 : 7;
    this.ctx.shadowColor = stage.pulseKind === "wipe" ? `rgba(255, 223, 132, ${0.4 + waveAlpha * 0.36})` : `rgba(255, 200, 102, ${0.3 + waveAlpha * 0.26})`;
    this.ctx.shadowBlur = stage.pulseKind === "wipe" ? this.layout.cellSize * 0.54 : this.layout.cellSize * 0.38;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.strokeStyle = stage.pulseKind === "wipe" ? `rgba(255, 255, 244, ${0.22 + waveAlpha * 0.26})` : `rgba(255, 240, 210, ${0.16 + waveAlpha * 0.18})`;
    this.ctx.lineWidth = stage.pulseKind === "wipe" ? 4 : 3;
    this.ctx.shadowColor = "transparent";
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius * (stage.pulseKind === "wipe" ? 0.78 : 0.82), 0, Math.PI * 2);
    this.ctx.stroke();

    if (stage.pulseKind === "wipe") {
      fillRoundedRect(
        this.ctx,
        this.layout.boardX - 6,
        this.layout.boardY - 6,
        this.layout.boardWidth + 12,
        this.layout.boardHeight + 12,
        boardRadius + 8,
        `rgba(255, 244, 214, ${0.08 + waveAlpha * 0.14})`,
      );
    }

    this.ctx.restore();
  }

  private drawEdgeFlash(edgeFlash: EdgeFlash): void {
    if (this.currentQualityTier === "minimal") {
      return;
    }
    const fade = 1 - easeOutCubic(clamp(edgeFlash.progress, 0, 1));
    if (fade <= 0.001) {
      return;
    }

    const strength = clamp(edgeFlash.strength, 0, 1);
    const minDimension = Math.min(this.layout.width, this.layout.height);
    const thickness = clamp(minDimension * (0.04 + strength * 0.07), 16, 74);
    const outerAlpha = clamp((0.1 + strength * 0.56) * fade, 0, 0.72);
    const innerAlpha = clamp((0.06 + strength * 0.22) * fade, 0, 0.4);
    const cornerRadius = thickness * 2.2;

    this.ctx.save();
    this.ctx.globalCompositeOperation = "screen";

    const topGradient = this.ctx.createLinearGradient(0, 0, 0, thickness);
    topGradient.addColorStop(0, `rgba(255, 255, 255, ${outerAlpha})`);
    topGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    this.ctx.fillStyle = topGradient;
    this.ctx.fillRect(0, 0, this.layout.width, thickness);

    const bottomGradient = this.ctx.createLinearGradient(0, this.layout.height, 0, this.layout.height - thickness);
    bottomGradient.addColorStop(0, `rgba(255, 255, 255, ${outerAlpha})`);
    bottomGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    this.ctx.fillStyle = bottomGradient;
    this.ctx.fillRect(0, this.layout.height - thickness, this.layout.width, thickness);

    const leftGradient = this.ctx.createLinearGradient(0, 0, thickness, 0);
    leftGradient.addColorStop(0, `rgba(255, 255, 255, ${outerAlpha})`);
    leftGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    this.ctx.fillStyle = leftGradient;
    this.ctx.fillRect(0, 0, thickness, this.layout.height);

    const rightGradient = this.ctx.createLinearGradient(this.layout.width, 0, this.layout.width - thickness, 0);
    rightGradient.addColorStop(0, `rgba(255, 255, 255, ${outerAlpha})`);
    rightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    this.ctx.fillStyle = rightGradient;
    this.ctx.fillRect(this.layout.width - thickness, 0, thickness, this.layout.height);

    if (this.currentQualityTier === "full") {
      this.drawEdgeFlashCorner(0, 0, cornerRadius, outerAlpha);
      this.drawEdgeFlashCorner(this.layout.width, 0, cornerRadius, outerAlpha);
      this.drawEdgeFlashCorner(0, this.layout.height, cornerRadius, outerAlpha);
      this.drawEdgeFlashCorner(this.layout.width, this.layout.height, cornerRadius, outerAlpha);

      strokeRoundedRect(
        this.ctx,
        1,
        1,
        this.layout.width - 2,
        this.layout.height - 2,
        Math.max(14, thickness * 0.72),
        `rgba(255, 255, 255, ${innerAlpha})`,
        Math.max(2, thickness * 0.08),
      );
    }
    this.ctx.restore();
  }

  private drawEdgeFlashCorner(x: number, y: number, radius: number, alpha: number): void {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    gradient.addColorStop(0.55, `rgba(255, 255, 255, ${alpha * 0.28})`);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  private drawBoardReset(transition: BoardResetTransition): void {
    const previousAshedAmount = this.tileAshedAmount;
    this.tileAshedAmount = transition.outgoingAshedAmount;

    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        const progress = transition.outgoingProgress[row]?.[col] ?? 1;
        if (progress >= 0.999) {
          continue;
        }
        const tile = transition.outgoingBoard[row]![col]!;
        const eased = easeOutCubic(clamp(progress, 0, 1));
        const x = this.layout.boardX + col * (this.layout.cellSize + this.layout.gap);
        const y = this.layout.boardY + row * (this.layout.cellSize + this.layout.gap);
        const driftDirection = ((row + col) & 1) === 0 ? -1 : 1;
        const driftX = this.layout.cellSize * 0.08 * driftDirection * eased;
        const liftY = this.layout.cellSize * 0.22 * eased;
        const popScale = 1 + Math.sin(clamp(progress * 1.1, 0, 1) * Math.PI) * 0.08;
        const scale = lerp(popScale, 0.42, eased);
        this.drawToken(tile, x + driftX, y - liftY, this.layout.cellSize * scale, false, 1 - eased, null, false);
      }
    }

    this.tileAshedAmount = 0;
    this.drawBoard(transition.incomingBoard, { introTileReveal: transition.incomingReveal });
    this.tileAshedAmount = previousAshedAmount;
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
      introTileReveal?: number[][] | null;
    } = {},
  ): void {
    const clearSet = options.clearStage
      ? new Set([...options.clearStage.matched, ...options.clearStage.cleansed].map((position) => `${position.row}:${position.col}`))
      : null;
    const pulseTargetSet = options.clearStage
      ? new Set(options.clearStage.pulseTargets.map((position) => `${position.row}:${position.col}`))
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
        const pulseTargeted = pulseTargetSet?.has(`${row}:${col}`) ?? false;
        const pulseIntensity = pulseTargeted ? this.getClearPulseTargetIntensity(options.clearStage!, clearProgress) : 0;
        const interaction =
          options.interaction?.pressed?.row === row && options.interaction?.pressed?.col === col
            ? "pressed"
            : options.interaction?.hovered?.row === row && options.interaction?.hovered?.col === col
              ? "hover"
              : null;
        let scale = isClearing ? 1 + Math.sin(clearProgress * Math.PI) * 0.08 : 1;
        if (!isClearing && pulseIntensity > 0) {
          scale *= 1 + pulseIntensity * (options.clearStage?.pulseKind === "wipe" ? 0.16 : 0.1);
        }
        if (!isClearing && interaction === "hover") {
          scale *= 1.05;
        }
        if (!isClearing && interaction === "pressed") {
          scale *= 0.96;
        }
        const revealProgress = options.introTileReveal?.[row]?.[col] ?? 1;
        if (revealProgress <= 0.001) {
          continue;
        }
        const revealed = easeOutCubic(clamp(revealProgress, 0, 1));
        scale *= lerp(0.78, 1, revealed);
        const alpha = (isClearing ? 1 - clearProgress * 0.84 : 1) * revealProgress;
        this.drawToken(tile, x, y, this.layout.cellSize * scale, isClearing || pulseIntensity > 0.45, alpha, interaction, false, isClearing);
        if (pulseIntensity > 0.001) {
          this.drawPulseTargetHalo(x, y, this.layout.cellSize * scale, pulseIntensity, options.clearStage!.pulseKind);
        }
      }
    }
  }

  private getClearPulseTargetIntensity(stage: ClearStage, progress: number): number {
    const wave = Math.sin(clamp(progress * (stage.pulseKind === "wipe" ? 1.2 : 1.06), 0, 1) * Math.PI);
    if (stage.pulseKind === "wipe") {
      return clamp(0.44 + wave * 0.56, 0, 1);
    }
    return clamp(wave * 0.92, 0, 1);
  }

  private drawPulseTargetHalo(x: number, y: number, size: number, intensity: number, pulseKind: ClearStage["pulseKind"]): void {
    const alpha = clamp(intensity, 0, 1);
    const drawX = x + (this.layout.cellSize - size) / 2;
    const drawY = y + (this.layout.cellSize - size) / 2;
    const radius = size * 0.22;
    this.ctx.save();
    this.ctx.globalCompositeOperation = "screen";
    this.ctx.globalAlpha = 0.42 + alpha * 0.44;
    fillRoundedRect(
      this.ctx,
      drawX - 4,
      drawY - 4,
      size + 8,
      size + 8,
      radius * 1.12,
      pulseKind === "wipe" ? `rgba(255, 241, 188, ${0.14 + alpha * 0.18})` : `rgba(255, 220, 154, ${0.12 + alpha * 0.14})`,
    );
    this.ctx.shadowColor = pulseKind === "wipe" ? `rgba(255, 242, 194, ${0.38 + alpha * 0.26})` : `rgba(255, 214, 132, ${0.28 + alpha * 0.22})`;
    this.ctx.shadowBlur = size * (pulseKind === "wipe" ? 0.34 : 0.24);
    strokeRoundedRect(
      this.ctx,
      drawX - 5,
      drawY - 5,
      size + 10,
      size + 10,
      radius * 1.12,
      pulseKind === "wipe" ? `rgba(255, 250, 226, ${0.32 + alpha * 0.42})` : `rgba(255, 232, 186, ${0.24 + alpha * 0.34})`,
      pulseKind === "wipe" ? 3.4 : 2.6,
    );
    this.ctx.restore();
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
    matchedState = false,
  ): void {
    const image = this.resolveTileImage(tile.kind, matchedState);
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
    if (this.currentQualityTier !== "full") {
      ctx.shadowBlur *= this.currentQualityTier === "minimal" ? 0.4 : 0.7;
    }
    ctx.shadowOffsetY = interaction === "pressed" ? size * 0.02 : size * 0.05;
    ctx.drawImage(image, drawX, drawY, size, size);
    if (!isAshKind(tile.kind) && this.tileAshedAmount > 0.001) {
      const grayAmount = clamp(this.tileAshedAmount, 0, 1);
      ctx.globalAlpha = effectiveAlpha * grayAmount;
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.drawImage(this.assets!.sigilTilesAshed[tile.kind], drawX, drawY, size, size);
    }
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

  private resolveTileImage(kind: TileKind, matchedState: boolean): HTMLImageElement {
    if (!isAshKind(kind) && matchedState) {
      return this.assets!.sigilTilesHighlight[kind];
    }
    return this.assets!.tiles[kind];
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
    this.hudButtons = [];
    if (model.overlay === "gameover" && model.gameOverOverlayProgress > 0) {
      this.drawGameOverModal(model);
    }
    if (!model.showHud || model.intro.hudOpacity <= 0.001) {
      return;
    }

    this.ctx.save();
    this.ctx.globalAlpha = clamp(model.intro.hudOpacity, 0, 1);
    if (this.layout.portrait) {
      this.drawPortraitPlaying(model, model.intro.hudOffsetX, model.intro.hudOffsetY);
    } else {
      this.drawLandscapePlaying(model, model.intro.hudOffsetX, model.intro.hudOffsetY);
    }
    this.ctx.restore();

    if (model.comboLabel) {
      this.drawComboLabel(model.comboLabel);
    }
  }

  private drawPortraitPlaying(model: RenderModel, offsetX: number, offsetY: number): void {
    const metrics = this.getHudMetrics(model);
    const portraitHud = this.getPortraitHudLayout();
    this.drawSegmentedHudPanel(
      this.layout.contentX + portraitHud.margin + offsetX,
      portraitHud.topY + offsetY,
      this.layout.contentWidth - portraitHud.margin * 2,
      portraitHud.cardHeight,
      metrics,
      "horizontal",
      model.hudLoginEnabled,
      { labelSize: 11, valueSize: 18 },
    );
  }

  private getPortraitHudLayout(): {
    margin: number;
    gap: number;
    cardHeight: number;
    cardWidth: number;
    topY: number;
  } {
    const margin = clamp(this.layout.width * 0.032, 12, 18);
    const gap = clamp(this.layout.width * 0.018, 6, 10);
    const cardHeight = 58;
    const availableWidth = this.layout.contentWidth - margin * 2 - gap * 2;
    const cardWidth = availableWidth / 3;
    const topY = Math.max(this.layout.safeTop + 8, Math.round((this.layout.boardY - cardHeight) / 2));
    return {
      margin,
      gap,
      cardHeight,
      cardWidth,
      topY,
    };
  }

  private drawLandscapePlaying(model: RenderModel, offsetX: number, offsetY: number): void {
    const metrics = this.getHudMetrics(model);
    const stackLayout = this.getLandscapeHudStackLayout(metrics.length);
    this.drawSegmentedHudPanel(
      stackLayout.x + offsetX,
      stackLayout.topY + offsetY,
      stackLayout.width,
      stackLayout.bottomY - stackLayout.topY,
      metrics,
      "vertical",
      model.hudLoginEnabled,
      { labelSize: 12, valueSize: 24 },
    );
  }

  private drawGameOverModal(model: RenderModel): void {
    const progress = clamp(model.gameOverOverlayProgress, 0, 1);
    if (progress <= 0.001) {
      return;
    }

    const eased = easeOutCubic(progress);
    const frame = this.getGlassFrameRect();
    const titleSize = this.layout.portrait ? 42 : this.layout.width < 1200 ? 48 : 30;
    const subtitleSize = this.layout.portrait ? 15 : 16;
    const textGap = this.layout.portrait ? 7 : 8;
    const titleMetrics = this.measureTextBlock("Game Over", `800 ${titleSize}px ${HUD_FONT_FAMILY}`);
    const subtitleMetrics = this.measureTextBlock(model.gameOverSubtitle, `700 ${subtitleSize}px ${HUD_FONT_FAMILY}`);
    const textBlockHeight = titleMetrics.height + textGap + subtitleMetrics.height;
    const textTop = Math.round(this.layout.boardY + (this.layout.boardHeight - textBlockHeight) / 2);
    const titleY = Math.round(textTop + titleMetrics.ascent + (1 - eased) * 10);
    const subtitleY = Math.round(textTop + titleMetrics.height + textGap + subtitleMetrics.ascent + (1 - eased) * 10);

    drawText(this.ctx, "Game Over", this.layout.boardX + this.layout.boardWidth / 2, titleY, {
      align: "center",
      font: `800 ${titleSize}px ${HUD_FONT_FAMILY}`,
      fill: `rgba(255, 248, 255, ${0.94 * eased})`,
      shadow: `rgba(8, 12, 32, ${0.38 * eased})`,
      maxWidth: this.layout.boardWidth - 20,
    });
    drawText(this.ctx, model.gameOverSubtitle, this.layout.boardX + this.layout.boardWidth / 2, subtitleY, {
      align: "center",
      font: `700 ${subtitleSize}px ${HUD_FONT_FAMILY}`,
      fill: `rgba(230, 231, 246, ${0.9 * eased})`,
      shadow: `rgba(8, 12, 32, ${0.22 * eased})`,
      maxWidth: this.layout.boardWidth - 28,
    });

    const ctaLayout = this.getGameOverButtonLayout();
    const button: OverlayButtonLayout = {
      action: "restart",
      label: "Play Again",
      x: ctaLayout.x,
      y: Math.round(lerp(ctaLayout.y + 18, ctaLayout.y, eased)),
      width: ctaLayout.width,
      height: ctaLayout.height,
      primary: true,
    };
    this.overlayButtons = model.overlayInteractive ? [button] : [];
    this.drawGlassButton(button, {
      fontSize: this.layout.portrait ? 17 : 20,
      opacity: eased,
      attentionElapsedMs: model.gameOverCtaElapsedMs,
    });
  }

  private getGameOverButtonLayout(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const frame = this.getGlassFrameRect();
    const portraitHud = this.layout.portrait ? this.getPortraitHudLayout() : null;
    const portraitGap = portraitHud ? Math.round(frame.y - (portraitHud.topY + portraitHud.cardHeight)) : 0;
    const width = clamp(frame.width * (this.layout.portrait ? 0.42 : 0.28), 176, this.layout.portrait ? 232 : 240);
    const height = this.layout.portrait ? portraitHud!.cardHeight : 64;
    const x = Math.round(this.layout.contentX + (this.layout.contentWidth - width) / 2);
    const targetBottom = Math.round(this.layout.contentY + this.layout.contentHeight - Math.max(18, this.layout.safeBottom + 14));
    const desiredY = this.layout.portrait
      ? frame.y + frame.height + portraitGap
      : frame.y + frame.height + clamp(this.layout.gap * 1.4, 10, 18);
    const y = Math.round(this.layout.portrait ? desiredY : Math.min(desiredY, targetBottom - height));
    return { x, y, width, height };
  }

  private drawSegmentedHudPanel(
    x: number,
    y: number,
    width: number,
    height: number,
    metrics: HudMetric[],
    orientation: "horizontal" | "vertical",
    hudLoginEnabled: boolean,
    typography: { labelSize: number; valueSize: number },
  ): void {
    const radius = Math.round(clamp(height * 0.32, 20, 30));
    this.drawHudShell(x, y, width, height, radius, metrics.length, orientation);
    const segmentSize = orientation === "horizontal" ? width / metrics.length : height / metrics.length;

    metrics.forEach((metric, index) => {
      const segmentX = orientation === "horizontal" ? x + index * segmentSize : x;
      const segmentY = orientation === "horizontal" ? y : y + index * segmentSize;
      const segmentWidth = orientation === "horizontal" ? segmentSize : width;
      const segmentHeight = orientation === "horizontal" ? height : segmentSize;

      if (metric.emphasis > 0.001) {
        this.drawGlassSegmentEmphasis(segmentX, segmentY, segmentWidth, segmentHeight, radius, metric.emphasis);
      }
      if (metric.action && hudLoginEnabled) {
        this.hudButtons.push({
          action: metric.action,
          x: segmentX,
          y: segmentY,
          width: segmentWidth,
          height: segmentHeight,
        });
      }

      this.drawSegmentMetric(metric, segmentX, segmentY, segmentWidth, segmentHeight, typography);
    });
  }

  private drawHudShell(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    metricCount: number,
    orientation: "horizontal" | "vertical",
  ): void {
    const cacheKey = `hud-shell:${orientation}:${this.layout.width}:${this.layout.height}:${this.layout.dpr}:${x}:${y}:${width}:${height}:${metricCount}`;
    const targetCache = orientation === "horizontal" ? this.portraitHudShellCache : this.landscapeHudShellCache;
    const nextCache = this.getOrCreateLayerCache(targetCache, cacheKey, (ctx) => {
      this.drawGlassPanelShellToContext(ctx, x, y, width, height, radius, 1);
      const segmentSize = orientation === "horizontal" ? width / metricCount : height / metricCount;
      for (let index = 0; index < metricCount - 1; index += 1) {
        if (orientation === "horizontal") {
          const dividerX = x + (index + 1) * segmentSize;
          this.drawGlassDivider(dividerX, y + height * 0.18, dividerX, y + height * 0.82, 0.86, ctx);
        } else {
          const dividerY = y + (index + 1) * segmentSize;
          this.drawGlassDivider(x + width * 0.14, dividerY, x + width * 0.86, dividerY, 0.86, ctx);
        }
      }
    });
    if (orientation === "horizontal") {
      this.portraitHudShellCache = nextCache;
    } else {
      this.landscapeHudShellCache = nextCache;
    }
    this.ctx.drawImage(nextCache.canvas, 0, 0, this.layout.width, this.layout.height);
  }

  private drawSegmentMetric(
    metric: HudMetric,
    x: number,
    y: number,
    width: number,
    height: number,
    typography: { labelSize: number; valueSize: number },
  ): void {
    const centerX = x + width / 2;
    const emphasis = clamp(metric.emphasis, 0, 1);
    const valueFontSize = this.fitHudValueFont(metric.value, width - 24, typography.valueSize + Math.round(emphasis * 2), 14);
    const labelFont = `800 ${typography.labelSize}px ${HUD_FONT_FAMILY}`;
    const valueFont = `${emphasis > 0.001 ? 900 : 800} ${valueFontSize}px ${HUD_FONT_FAMILY}`;
    const labelMetrics = this.measureTextBlock(metric.label, labelFont);
    const valueMetrics = this.measureTextBlock(metric.value, valueFont);
    const currentLabelY = y + Math.max(18, height * 0.29);
    const currentValueY = y + Math.max(48, height * 0.7);
    const currentGap = currentValueY - currentLabelY;
    const minSafeGap = Math.ceil(labelMetrics.height - labelMetrics.ascent + valueMetrics.ascent + 2);
    const gap = Math.max(Math.round(currentGap * 0.5), minSafeGap);
    const pairCenterY = (currentLabelY + currentValueY) / 2;
    const labelY = Math.round(pairCenterY - gap / 2);
    const valueY = Math.round(pairCenterY + gap / 2);
    const goldTone = metric.tone === "gold";
    const labelFill = goldTone
      ? `rgba(255, ${Math.round(232 + emphasis * 10)}, ${Math.round(128 + emphasis * 24)}, ${0.9 + emphasis * 0.08})`
      : emphasis > 0.001
        ? `rgba(255, 248, 255, ${0.84 + emphasis * 0.12})`
        : "rgba(242, 240, 252, 0.74)";
    const valueFill = metric.mutedValue
      ? "rgba(224, 226, 239, 0.74)"
      : goldTone
        ? `rgba(255, ${Math.round(220 + emphasis * 16)}, ${Math.round(94 + emphasis * 38)}, 1)`
        : emphasis > 0.001
          ? `rgba(255, 250, 255, ${0.95 + emphasis * 0.05})`
          : "rgba(255, 255, 255, 0.98)";
    const valueShadow = goldTone
      ? `rgba(118, 73, 6, ${0.24 + emphasis * 0.16})`
      : emphasis > 0.001
        ? `rgba(179, 160, 255, ${0.26 + emphasis * 0.2})`
        : "rgba(10, 12, 34, 0.2)";

    drawText(this.ctx, metric.label, centerX, labelY, {
      align: "center",
      font: labelFont,
      fill: labelFill,
      letterSpacing: 1.6,
    });
    drawText(this.ctx, metric.value, centerX, valueY, {
      align: "center",
      font: valueFont,
      fill: valueFill,
      shadow: valueShadow,
    });
  }

  private drawGlassPanelShell(x: number, y: number, width: number, height: number, radius: number, opacity: number): void {
    this.drawGlassPanelShellToContext(this.ctx, x, y, width, height, radius, opacity);
  }

  private drawGlassPanelShellToContext(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    opacity: number,
  ): void {
    const alpha = clamp(opacity, 0, 1);
    const glowY = y + height * 0.56;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(7, 10, 30, 0.3)";
    ctx.shadowBlur = 28;
    const baseGradient = ctx.createLinearGradient(x, y, x, y + height);
    baseGradient.addColorStop(0, "rgba(255, 255, 255, 0.15)");
    baseGradient.addColorStop(0.28, "rgba(255, 255, 255, 0.08)");
    baseGradient.addColorStop(0.7, "rgba(255, 255, 255, 0.045)");
    baseGradient.addColorStop(1, "rgba(255, 255, 255, 0.1)");
    fillRoundedRect(ctx, x, y, width, height, radius, baseGradient);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    const tintGradient = ctx.createLinearGradient(x, y, x + width, y + height);
    tintGradient.addColorStop(0, GLASS_PANEL_TINTS.left);
    tintGradient.addColorStop(0.5, GLASS_PANEL_TINTS.center);
    tintGradient.addColorStop(0.85, GLASS_PANEL_TINTS.right);
    tintGradient.addColorStop(1, GLASS_PANEL_TINTS.bottom);
    fillRoundedRect(ctx, x, y, width, height, radius, tintGradient);

    const shineGradient = ctx.createLinearGradient(x - width * 0.08, y - height * 0.24, x + width * 0.28, y + height * 1.1);
    shineGradient.addColorStop(0, "rgba(255, 255, 255, 0.24)");
    shineGradient.addColorStop(0.18, "rgba(255, 255, 255, 0.08)");
    shineGradient.addColorStop(0.46, "rgba(255, 255, 255, 0)");
    fillRoundedRect(ctx, x, y, width, height, radius, shineGradient);

    const innerInset = 6;
    const coreGradient = ctx.createLinearGradient(x, y + innerInset, x, y + height - innerInset);
    coreGradient.addColorStop(0, GLASS_PANEL_TINTS.coreTop);
    coreGradient.addColorStop(0.36, "rgba(255, 255, 255, 0.07)");
    coreGradient.addColorStop(1, GLASS_PANEL_TINTS.coreBottom);
    fillRoundedRect(ctx, x + innerInset, y + innerInset, width - innerInset * 2, height - innerInset * 2, Math.max(0, radius - 8), coreGradient);

    const bottomGlow = ctx.createRadialGradient(x + width * 0.5, glowY, width * 0.05, x + width * 0.5, glowY, width * 0.78);
    bottomGlow.addColorStop(0, "rgba(197, 149, 255, 0.18)");
    bottomGlow.addColorStop(0.6, "rgba(161, 145, 255, 0.08)");
    bottomGlow.addColorStop(1, "rgba(161, 145, 255, 0)");
    fillRoundedRect(ctx, x, y, width, height, radius, bottomGlow);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = alpha;
    strokeRoundedRect(ctx, x + 0.8, y + 0.8, width - 1.6, height - 1.6, radius, GLASS_PANEL_TINTS.outerStroke, 1.6);
    strokeRoundedRect(ctx, x + 6.4, y + 6.4, width - 12.8, height - 12.8, Math.max(0, radius - 8), GLASS_PANEL_TINTS.innerStroke, 1);
    this.drawGlassDivider(x + width * 0.04, y + 1.5, x + width * 0.96, y + 1.5, 0.96, ctx);
    ctx.restore();
  }

  private drawGlassSegmentEmphasis(x: number, y: number, width: number, height: number, radius: number, emphasis: number): void {
    const alpha = clamp(emphasis, 0, 1);
    const inset = 6;
    const innerX = x + inset;
    const innerY = y + inset;
    const innerWidth = width - inset * 2;
    const innerHeight = height - inset * 2;
    const innerRadius = Math.max(0, radius - 8);
    this.ctx.save();
    this.ctx.globalAlpha = 0.24 + alpha * 0.34;
    const emphasisGradient = this.ctx.createLinearGradient(innerX, innerY, innerX + innerWidth, innerY + innerHeight);
    emphasisGradient.addColorStop(0, "rgba(255, 255, 255, 0.22)");
    emphasisGradient.addColorStop(0.45, "rgba(212, 196, 255, 0.16)");
    emphasisGradient.addColorStop(1, "rgba(150, 205, 255, 0.12)");
    fillRoundedRect(this.ctx, innerX, innerY, innerWidth, innerHeight, innerRadius, emphasisGradient);
    strokeRoundedRect(this.ctx, innerX + 0.6, innerY + 0.6, innerWidth - 1.2, innerHeight - 1.2, innerRadius, `rgba(255, 255, 255, ${0.18 + alpha * 0.34})`, 1.15);
    this.ctx.restore();
  }

  private drawGlassDivider(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    opacity: number,
    ctx: CanvasRenderingContext2D = this.ctx,
  ): void {
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.02)");
    gradient.addColorStop(0.22, `rgba(255, 255, 255, ${0.2 * opacity})`);
    gradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.42 * opacity})`);
    gradient.addColorStop(0.78, `rgba(255, 255, 255, ${0.2 * opacity})`);
    gradient.addColorStop(1, "rgba(255, 255, 255, 0.02)");
    ctx.save();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.6;
    ctx.shadowColor = `rgba(255, 255, 255, ${0.1 * opacity})`;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  private drawGlassFrame(x: number, y: number, width: number, height: number, radius: number, ashedAmount: number): void {
    this.drawGlassFrameToContext(this.ctx, x, y, width, height, radius, ashedAmount);
  }

  private drawGlassFrameToContext(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    ashedAmount: number,
  ): void {
    const innerInset = clamp(this.layout.gap * 0.55, 4, 7);
    const innerX = x + innerInset;
    const innerY = y + innerInset;
    const innerWidth = width - innerInset * 2;
    const innerHeight = height - innerInset * 2;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.82;
    const outerGlow = ctx.createRadialGradient(x + width * 0.5, y + height * 0.52, width * 0.1, x + width * 0.5, y + height * 0.52, width * 0.74);
    outerGlow.addColorStop(0, "rgba(188, 170, 255, 0.16)");
    outerGlow.addColorStop(0.58, "rgba(162, 175, 255, 0.08)");
    outerGlow.addColorStop(1, "rgba(162, 175, 255, 0)");
    this.drawGlassRing(ctx, x, y, width, height, radius, innerX, innerY, innerWidth, innerHeight, Math.max(0, radius - innerInset), outerGlow);
    ctx.restore();

    const bandGradient = ctx.createLinearGradient(x, y, x, y + height);
    bandGradient.addColorStop(0, "rgba(255, 255, 255, 0.18)");
    bandGradient.addColorStop(0.28, "rgba(255, 255, 255, 0.08)");
    bandGradient.addColorStop(0.65, "rgba(255, 255, 255, 0.03)");
    bandGradient.addColorStop(1, "rgba(255, 255, 255, 0.12)");
    this.drawGlassRing(ctx, x, y, width, height, radius, innerX, innerY, innerWidth, innerHeight, Math.max(0, radius - innerInset), bandGradient, 0.98);

    const tintGradient = ctx.createLinearGradient(x, y, x + width, y + height);
    tintGradient.addColorStop(0, "rgba(179, 171, 255, 0.22)");
    tintGradient.addColorStop(0.5, "rgba(120, 100, 255, 0.1)");
    tintGradient.addColorStop(1, "rgba(148, 202, 255, 0.16)");
    this.drawGlassRing(ctx, x, y, width, height, radius, innerX, innerY, innerWidth, innerHeight, Math.max(0, radius - innerInset), tintGradient, 0.9);

    if (ashedAmount > 0.001) {
      const frostGradient = ctx.createLinearGradient(x, y, x, y + height);
      frostGradient.addColorStop(0, "rgba(236, 238, 248, 0.18)");
      frostGradient.addColorStop(0.45, "rgba(204, 209, 225, 0.08)");
      frostGradient.addColorStop(1, "rgba(180, 184, 198, 0.14)");
      this.drawGlassRing(ctx, x, y, width, height, radius, innerX, innerY, innerWidth, innerHeight, Math.max(0, radius - innerInset), frostGradient, clamp(ashedAmount, 0, 1));
    }

    ctx.save();
    ctx.globalAlpha = 0.96;
    strokeRoundedRect(ctx, x + 1, y + 1, width - 2, height - 2, radius, "rgba(255, 255, 255, 0.38)", 1.5);
    strokeRoundedRect(
      ctx,
      x + innerInset + 1.2,
      y + innerInset + 1.2,
      width - (innerInset + 1.2) * 2,
      height - (innerInset + 1.2) * 2,
      Math.max(0, radius - innerInset - 2),
      "rgba(255, 255, 255, 0.12)",
      1,
    );
    this.drawGlassDivider(x + width * 0.08, y + 2, x + width * 0.92, y + 2, 0.88, ctx);
    ctx.restore();
  }

  private drawGlassBoardBackdrop(x: number, y: number, width: number, height: number, radius: number, ashedAmount: number): void {
    this.drawGlassBoardBackdropToContext(this.ctx, x, y, width, height, radius, ashedAmount);
  }

  private drawGlassBoardBackdropToContext(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    ashedAmount: number,
  ): void {
    const innerInset = clamp(this.layout.gap * 0.52, 4, 7);
    const innerX = x + innerInset;
    const innerY = y + innerInset;
    const innerWidth = width - innerInset * 2;
    const innerHeight = height - innerInset * 2;
    const innerRadius = Math.max(0, radius - innerInset);

    ctx.save();
    beginRoundedRectPath(ctx, x, y, width, height, radius);
    ctx.clip();

    const baseGradient = ctx.createLinearGradient(x, y, x, y + height);
    baseGradient.addColorStop(0, "rgba(255, 255, 255, 0.16)");
    baseGradient.addColorStop(0.28, "rgba(255, 255, 255, 0.08)");
    baseGradient.addColorStop(0.7, "rgba(255, 255, 255, 0.045)");
    baseGradient.addColorStop(1, "rgba(255, 255, 255, 0.1)");
    fillRoundedRect(ctx, x, y, width, height, radius, baseGradient);

    const tintGradient = ctx.createLinearGradient(x, y, x + width, y + height);
    tintGradient.addColorStop(0, GLASS_PANEL_TINTS.left);
    tintGradient.addColorStop(0.5, GLASS_PANEL_TINTS.center);
    tintGradient.addColorStop(0.85, GLASS_PANEL_TINTS.right);
    tintGradient.addColorStop(1, GLASS_PANEL_TINTS.bottom);
    fillRoundedRect(ctx, x, y, width, height, radius, tintGradient);

    const auraGradient = ctx.createRadialGradient(x + width * 0.5, y + height * 0.54, width * 0.05, x + width * 0.5, y + height * 0.54, width * 0.74);
    auraGradient.addColorStop(0, "rgba(197, 149, 255, 0.18)");
    auraGradient.addColorStop(0.6, "rgba(161, 145, 255, 0.08)");
    auraGradient.addColorStop(1, "rgba(161, 145, 255, 0)");
    fillRoundedRect(ctx, x, y, width, height, radius, auraGradient);

    const topGlow = ctx.createLinearGradient(x, y, x, y + height * 0.34);
    topGlow.addColorStop(0, "rgba(255, 255, 255, 0.18)");
    topGlow.addColorStop(1, "rgba(255, 255, 255, 0)");
    fillRoundedRect(ctx, x, y, width, height * 0.38, radius, topGlow);

    const coreGradient = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerHeight);
    coreGradient.addColorStop(0, GLASS_PANEL_TINTS.coreTop);
    coreGradient.addColorStop(0.36, "rgba(255, 255, 255, 0.07)");
    coreGradient.addColorStop(1, GLASS_PANEL_TINTS.coreBottom);
    fillRoundedRect(ctx, innerX, innerY, innerWidth, innerHeight, innerRadius, coreGradient);

    const innerGradient = ctx.createLinearGradient(innerX, innerY, innerX + innerWidth, innerY + innerHeight);
    innerGradient.addColorStop(0, "rgba(212, 196, 255, 0.12)");
    innerGradient.addColorStop(0.48, "rgba(255, 255, 255, 0)");
    innerGradient.addColorStop(1, "rgba(150, 205, 255, 0.12)");
    fillRoundedRect(ctx, innerX, innerY, innerWidth, innerHeight, innerRadius, innerGradient);

    ctx.save();
    ctx.globalAlpha = 0.62;
    const sparkles = [
      [0.14, 0.16, 1.8, 0.48],
      [0.24, 0.33, 1.2, 0.34],
      [0.81, 0.2, 1.5, 0.4],
      [0.72, 0.4, 1.1, 0.28],
      [0.18, 0.72, 1.7, 0.42],
      [0.56, 0.78, 1.3, 0.3],
      [0.87, 0.7, 1.6, 0.36],
    ] as const;
    for (const [px, py, size, alpha] of sparkles) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.arc(x + width * px, y + height * py, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.globalCompositeOperation = "multiply";
    const vignette = ctx.createRadialGradient(x + width * 0.5, y + height * 0.5, width * 0.24, x + width * 0.5, y + height * 0.5, width * 0.72);
    vignette.addColorStop(0, "rgba(7, 10, 30, 0)");
    vignette.addColorStop(1, "rgba(7, 10, 30, 0.22)");
    fillRoundedRect(ctx, x, y, width, height, radius, vignette);
    ctx.globalCompositeOperation = "source-over";

    if (ashedAmount > 0.001) {
      const ashGradient = ctx.createLinearGradient(x, y, x, y + height);
      ashGradient.addColorStop(0, "rgba(220, 226, 238, 0.1)");
      ashGradient.addColorStop(0.5, "rgba(154, 164, 185, 0.2)");
      ashGradient.addColorStop(1, "rgba(86, 94, 116, 0.28)");
      ctx.globalAlpha = clamp(ashedAmount, 0, 1);
      fillRoundedRect(ctx, x, y, width, height, radius, ashGradient);
    }

    ctx.restore();
  }

  private drawGlassRing(
    ctx: CanvasRenderingContext2D,
    outerX: number,
    outerY: number,
    outerWidth: number,
    outerHeight: number,
    outerRadius: number,
    innerX: number,
    innerY: number,
    innerWidth: number,
    innerHeight: number,
    innerRadius: number,
    fill: CanvasFillStrokeStyles["fillStyle"],
    opacity = 1,
  ): void {
    ctx.save();
    ctx.globalAlpha = clamp(opacity, 0, 1);
    ctx.beginPath();
    beginRoundedRectPath(ctx, outerX, outerY, outerWidth, outerHeight, outerRadius);
    beginRoundedRectPathReversed(ctx, innerX, innerY, innerWidth, innerHeight, innerRadius);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }

  private drawGlassButton(
    button: OverlayButtonLayout,
    options: { fontSize: number; opacity: number; attentionElapsedMs?: number },
  ): void {
    const bounceElapsed = Math.max(0, (options.attentionElapsedMs ?? 0) - 2000);
    const activeBounceElapsed = bounceElapsed <= 1800 ? bounceElapsed : 0;
    const wave = activeBounceElapsed > 0 ? Math.max(0, Math.sin((activeBounceElapsed / 1200) * Math.PI * 2)) : 0;
    const lift = wave * 5;
    const scale = 1 + wave * 0.012;
    const x = button.x - (button.width * (scale - 1)) / 2;
    const y = button.y - lift - (button.height * (scale - 1)) / 2;
    const width = button.width * scale;
    const height = button.height * scale;
    const radius = Math.round(clamp(height * 0.36, 22, 30));

    this.drawGlassPanelShell(x, y, width, height, radius, options.opacity * 0.98);
    this.ctx.save();
    this.ctx.globalAlpha = Math.min(1, options.opacity * 0.98);
    const innerInset = 6;
    const innerGradient = this.ctx.createLinearGradient(x, y + innerInset, x, y + height - innerInset);
    innerGradient.addColorStop(0, "rgba(255, 255, 255, 0.28)");
    innerGradient.addColorStop(0.34, "rgba(255, 255, 255, 0.2)");
    innerGradient.addColorStop(1, "rgba(255, 255, 255, 0.12)");
    fillRoundedRect(this.ctx, x + innerInset, y + innerInset, width - innerInset * 2, height - innerInset * 2, Math.max(0, radius - 8), innerGradient);
    this.ctx.restore();

    drawText(this.ctx, button.label, x + width / 2, y + height * 0.58, {
      align: "center",
      font: `900 ${options.fontSize}px ${HUD_FONT_FAMILY}`,
      fill: `rgba(255, 255, 255, ${0.98 * options.opacity})`,
      shadow: `rgba(14, 16, 42, ${0.26 * options.opacity})`,
    });
  }

  private drawComboLabel(comboLabel: ComboLabel): void {
    const layout = this.getHudMessageLayout();
    const accent = SIGIL_ACCENTS[comboLabel.kind];
    const depthBoost = clamp((comboLabel.depth - 2) / 3, 0, 1);
    const burstProgress = clamp(comboLabel.burstElapsedMs / comboLabel.burstMs, 0, 1);
    const burstScale = 1 + (1 - easeOutCubic(burstProgress)) * (0.16 + depthBoost * 0.08);
    const titleSize = (this.layout.portrait ? 22 + depthBoost * 8 : 17 + depthBoost * 5) * burstScale;
    const detailSize = (this.layout.portrait ? 15 + depthBoost * 3 : 13 + depthBoost * 2) * (1 + (1 - easeOutCubic(burstProgress)) * 0.05);
    this.drawComboParticles(comboLabel, layout, titleSize);
    drawText(this.ctx, comboLabel.title, layout.x, layout.titleY, {
      align: layout.align,
      font: `900 ${titleSize}px 'Avenir Next', 'Trebuchet MS', sans-serif`,
      fill: applyAlpha(accent.primary, comboLabel.opacity),
      shadow: `rgba(${accent.glowRgb}, ${comboLabel.opacity * (0.34 + depthBoost * 0.22)})`,
    });
    drawText(this.ctx, comboLabel.detail, layout.x, layout.detailY, {
      align: layout.align,
      font: `800 ${detailSize}px 'Avenir Next', 'Trebuchet MS', sans-serif`,
      fill: applyAlpha(accent.secondary, comboLabel.opacity * 0.96),
      shadow: `rgba(5, 8, 18, ${comboLabel.opacity * 0.46})`,
    });
  }

  private getHudMessageLayout(): {
    x: number;
    titleY: number;
    detailY: number;
    align: CanvasTextAlign;
  } {
    if (this.layout.portrait) {
      const portraitHud = this.getPortraitHudLayout();
      const regionTop = portraitHud.topY + portraitHud.cardHeight + 8;
      const regionBottom = this.layout.boardY - 8;
      const centerY = regionTop + Math.max(40, regionBottom - regionTop) / 2;
      return {
        x: this.layout.contentX + this.layout.contentWidth / 2,
        titleY: Math.round(centerY - 4),
        detailY: Math.round(centerY + 22),
        align: "center",
      };
    }

    const stackLayout = this.getLandscapeHudStackLayout(3);
    const messageBlockHeight = 34;
    const firstLineY = Math.min(
      stackLayout.bottomY + 28,
      this.layout.hudY + this.layout.hudHeight - messageBlockHeight - 14,
    );
    return {
      x: stackLayout.x,
      titleY: firstLineY,
      detailY: firstLineY + 18,
      align: "left",
    };
  }

  private drawComboParticles(
    comboLabel: ComboLabel,
    layout: { x: number; titleY: number; detailY: number; align: CanvasTextAlign },
    titleSize: number,
  ): void {
    if (comboLabel.matchCount <= 0) {
      return;
    }
    const particleCap = this.currentQualityTier === "full" ? comboLabel.matchCount : this.currentQualityTier === "reduced" ? Math.min(comboLabel.matchCount, 4) : Math.min(comboLabel.matchCount, 2);
    if (particleCap <= 0) {
      return;
    }
    const progress = clamp((comboLabel.burstElapsedMs + comboLabel.burstMs * 0.14) / comboLabel.burstMs, 0, 1);
    const eased = easeOutCubic(progress);
    const alphaFade = Math.max(0, 1 - Math.pow(progress, 1.15));
    if (alphaFade <= 0.001) {
      return;
    }
    const particleSize = this.layout.cellSize * 0.25;
    const image = this.assets!.tiles[comboLabel.kind];
    const titleWidth = this.measureTextWidth(comboLabel.title, `900 ${titleSize}px 'Avenir Next', 'Trebuchet MS', sans-serif`);

    const centerY = layout.titleY - titleSize * 0.34;
    const baseInset = titleWidth / 2 + particleSize * 0.65;
    const maxTravel = this.layout.portrait ? this.layout.cellSize * 1.4 : this.layout.cellSize * 1.05;
    const leftCount = Math.ceil(particleCap / 2);
    const rightCount = Math.floor(particleCap / 2);

    for (let index = 0; index < particleCap; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const laneIndex = Math.floor(index / 2);
      const laneCount = side < 0 ? leftCount : rightCount;
      const normalizedLane = laneCount <= 1 ? 0 : laneIndex / (laneCount - 1) - 0.5;
      const laneSpread = normalizedLane * particleSize * (this.layout.portrait ? 3.2 : 2.4);
      const jitter = Math.sin((index + 1) * 1.73) * particleSize * 0.12;
      const x = layout.x + side * (baseInset + eased * maxTravel + laneIndex * particleSize * 0.14);
      const y = centerY + laneSpread + jitter - eased * particleSize * 0.18;
      const alpha = comboLabel.opacity * alphaFade * Math.max(0.32, 0.92 - laneIndex * 0.07);
      const scale = 0.74 + (1 - progress) * 0.38 - laneIndex * 0.02;
      const rotation = side * (0.2 + laneIndex * 0.04) * (1 - eased * 0.35);

      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(rotation);
      this.ctx.globalAlpha = clamp(alpha, 0, 1);
      this.ctx.shadowColor =
        this.currentQualityTier === "full" ? `rgba(${SIGIL_ACCENTS[comboLabel.kind].glowRgb}, ${0.42 * clamp(alpha, 0, 1)})` : "transparent";
      this.ctx.shadowBlur = this.currentQualityTier === "full" ? particleSize * 0.65 : 0;
      const size = particleSize * scale;
      this.ctx.drawImage(image, -size / 2, -size / 2, size, size);
      this.ctx.restore();
    }
  }

  private getLandscapeHudStackLayout(metricCount: number): {
    x: number;
    width: number;
    cardHeight: number;
    gap: number;
    topY: number;
    bottomY: number;
  } {
    const cardHeight = 66;
    const gap = 10;
    const totalHeight = metricCount * cardHeight + Math.max(0, metricCount - 1) * gap;
    const topY = Math.round(this.layout.hudY + Math.max(0, (this.layout.hudHeight - totalHeight) / 2));
    return {
      x: this.layout.hudX,
      width: this.layout.hudWidth,
      cardHeight,
      gap,
      topY,
      bottomY: topY + totalHeight,
    };
  }

  private getHudMetrics(model: RenderModel): HudMetric[] {
    const scoreSurpassedBest = model.overlay !== "gameover" && model.bestScore !== null && model.score > model.bestScore;
    const emphasizeAll = model.gameOverResult === "new_best" || model.gameOverResult === "first_recorded" ? 1 : 0;
    return [
      {
        label: "RANK",
        value: model.rank !== null ? `#${formatScore(model.rank)}` : "--",
        action: "login-rank" as const,
        emphasis: emphasizeAll,
        mutedValue: model.rank === null,
        tone: "default",
      },
      {
        label: "BEST",
        value: model.bestScore !== null ? formatScore(model.bestScore) : "--",
        action: "login-best" as const,
        emphasis: emphasizeAll,
        mutedValue: model.bestScore === null,
        tone: "default",
      },
      {
        label: "SCORE",
        value: formatScore(model.score),
        action: null,
        emphasis: emphasizeAll,
        mutedValue: false,
        tone: scoreSurpassedBest ? "gold" : "default",
      },
    ];
  }

  private createSafeAreaProbe(): HTMLDivElement {
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    Object.assign(probe.style, {
      position: "fixed",
      top: "0",
      left: "0",
      visibility: "hidden",
      pointerEvents: "none",
      paddingTop: "env(safe-area-inset-top, 0px)",
      paddingRight: "env(safe-area-inset-right, 0px)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
      paddingLeft: "env(safe-area-inset-left, 0px)",
    });
    document.body.appendChild(probe);
    return probe;
  }

  private readSafeAreaInsets(): SafeAreaInsets {
    const style = window.getComputedStyle(this.safeAreaProbe);
    return {
      top: parseCssPixels(style.paddingTop),
      right: parseCssPixels(style.paddingRight),
      bottom: parseCssPixels(style.paddingBottom),
      left: parseCssPixels(style.paddingLeft),
    };
  }

  private drawHudCard(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string,
    options: {
      align: CanvasTextAlign;
      action: HudAction | null;
      emphasis: number;
      mutedValue: boolean;
      labelSize: number;
      valueSize: number;
    },
  ): void {
    const emphasis = clamp(options.emphasis, 0, 1);
    const emphasized = emphasis > 0.001;
    this.ctx.save();
    this.ctx.shadowColor = emphasized ? `rgba(123, 88, 10, ${0.16 + emphasis * 0.18})` : "rgba(4, 7, 16, 0.24)";
    this.ctx.shadowBlur = emphasized ? 22 + emphasis * 8 : 22;
    fillRoundedRect(
      this.ctx,
      x,
      y,
      width,
      height,
      18,
      emphasized ? `rgba(${Math.round(18 + emphasis * 8)}, ${Math.round(22 + emphasis * 4)}, 42, ${0.6 + emphasis * 0.12})` : "rgba(18, 22, 42, 0.6)",
    );
    this.ctx.restore();
    strokeRoundedRect(
      this.ctx,
      x + 1,
      y + 1,
      width - 2,
      height - 2,
      18,
      emphasized ? `rgba(255, ${Math.round(214 + emphasis * 24)}, ${Math.round(98 + emphasis * 42)}, ${0.3 + emphasis * 0.58})` : "rgba(255, 235, 184, 0.18)",
      emphasized ? 1.8 + emphasis * 0.8 : 1.5,
    );
    if (options.action) {
      this.hudButtons.push({
        action: options.action,
        x,
        y,
        width,
        height,
      });
    }

    const textX = options.align === "left" ? x + 14 : x + width / 2;
    drawText(this.ctx, label, textX, y + 18, {
      align: options.align,
      font: `700 ${options.labelSize}px ${HUD_FONT_FAMILY}`,
      fill: emphasized ? `rgba(255, ${Math.round(232 + emphasis * 12)}, ${Math.round(188 + emphasis * 18)}, ${0.82 + emphasis * 0.1})` : "rgba(234, 224, 245, 0.82)",
      letterSpacing: 1.4,
    });
    drawText(this.ctx, value, textX, y + 48, {
      align: options.align,
      font: `${emphasized ? 900 : 800} ${this.fitHudValueFont(value, width - 28, options.valueSize + (emphasized ? Math.round(1 + emphasis * 2) : 0), 14)}px ${HUD_FONT_FAMILY}`,
      fill: options.mutedValue ? "rgba(214, 219, 234, 0.78)" : emphasized ? `rgba(255, ${Math.round(223 + emphasis * 20)}, ${Math.round(126 + emphasis * 34)}, 1)` : "#fff6de",
      shadow: emphasized ? `rgba(90, 58, 8, ${0.18 + emphasis * 0.18})` : "rgba(5, 8, 18, 0.36)",
    });
  }

  private fitHudValueFont(text: string, maxWidth: number, preferredSize: number, minSize: number): number {
    const cacheKey = `${text}|${maxWidth}|${preferredSize}|${minSize}`;
    const cached = this.hudValueFontCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }
    let size = preferredSize;
    while (size > minSize) {
      if (this.measureTextWidth(text, `800 ${size}px ${HUD_FONT_FAMILY}`) <= maxWidth) {
        this.hudValueFontCache.set(cacheKey, size);
        return size;
      }
      size -= 1;
    }
    this.hudValueFontCache.set(cacheKey, minSize);
    return minSize;
  }

  private measureTextBlock(text: string, font: string): { ascent: number; height: number } {
    const cacheKey = `${font}|${text}`;
    const cached = this.textMetricCache.get(cacheKey);
    if (cached) {
      return {
        ascent: cached.ascent,
        height: cached.height,
      };
    }
    this.ctx.save();
    this.ctx.font = font;
    const metrics = this.ctx.measureText(text);
    this.ctx.restore();
    const ascent = metrics.actualBoundingBoxAscent || 0;
    const descent = metrics.actualBoundingBoxDescent || 0;
    const height = Math.max(1, Math.ceil(ascent + descent));
    const measured = {
      ascent: ascent || height,
      height,
    };
    this.textMetricCache.set(cacheKey, {
      ...measured,
      width: metrics.width,
    });
    return measured;
  }

  private measureTextWidth(text: string, font: string): number {
    const cacheKey = `${font}|${text}`;
    const cached = this.textMetricCache.get(cacheKey);
    if (cached) {
      return cached.width;
    }
    this.ctx.save();
    this.ctx.font = font;
    const metrics = this.ctx.measureText(text);
    this.ctx.restore();
    const ascent = metrics.actualBoundingBoxAscent || 0;
    const descent = metrics.actualBoundingBoxDescent || 0;
    const height = Math.max(1, Math.ceil(ascent + descent));
    this.textMetricCache.set(cacheKey, {
      ascent: ascent || height,
      height,
      width: metrics.width,
    });
    return metrics.width;
  }

  private drawButton(button: OverlayButtonLayout, options?: { fontSize?: number; opacity?: number }): void {
    const opacity = options?.opacity ?? 1;
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    const fill = button.primary ? "rgba(241, 205, 120, 0.96)" : "rgba(17, 23, 42, 0.4)";
    const stroke = button.primary ? "rgba(255, 249, 230, 0.72)" : "rgba(255, 243, 213, 0.18)";
    const text = button.primary ? "#22161a" : "#fff6de";
    fillRoundedRect(this.ctx, button.x, button.y, button.width, button.height, 18, fill);
    strokeRoundedRect(this.ctx, button.x + 1.5, button.y + 1.5, button.width - 3, button.height - 3, 18, stroke, 2);
    if (button.iconOnly) {
      this.drawRestartIcon(button);
      this.ctx.restore();
      return;
    }
    const fontSize = options?.fontSize ?? 18;
    const centerY = button.y + button.height / 2 + fontSize * 0.32;
    drawText(this.ctx, button.label, button.x + button.width / 2, centerY, {
      align: "center",
      font: `800 ${fontSize}px ${HUD_FONT_FAMILY}`,
      fill: text,
    });
    this.ctx.restore();
  }

  private drawRestartIcon(button: OverlayButtonLayout): void {
    const { ctx } = this;
    const cx = button.x + button.width / 2;
    const cy = button.y + button.height / 2;
    const radius = Math.min(button.width, button.height) * 0.24;
    const arrowRadius = radius * 1.15;

    ctx.save();
    ctx.strokeStyle = "rgba(255, 246, 214, 0.92)";
    ctx.fillStyle = "rgba(255, 246, 214, 0.92)";
    ctx.lineWidth = 2.8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, arrowRadius, -0.65 * Math.PI, 1.08 * Math.PI, false);
    ctx.stroke();

    const tipX = cx + Math.cos(-0.65 * Math.PI) * arrowRadius;
    const tipY = cy + Math.sin(-0.65 * Math.PI) * arrowRadius;
    ctx.beginPath();
    ctx.moveTo(tipX + 1, tipY - 8);
    ctx.lineTo(tipX + 8, tipY - 1);
    ctx.lineTo(tipX - 2, tipY + 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function parseCssPixels(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
    baseline?: CanvasTextBaseline;
  },
): void {
  ctx.save();
  ctx.textAlign = options.align;
  ctx.textBaseline = options.baseline ?? "alphabetic";
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
  fill: string | CanvasGradient | CanvasPattern,
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

function beginRoundedRectPathReversed(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);
  const safeRadius = clamp(radius, 0, Math.min(safeWidth, safeHeight) / 2);
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x, y, x, y + safeHeight, safeRadius);
  ctx.arcTo(x, y + safeHeight, x + safeWidth, y + safeHeight, safeRadius);
  ctx.arcTo(x + safeWidth, y + safeHeight, x + safeWidth, y, safeRadius);
  ctx.arcTo(x + safeWidth, y, x, y, safeRadius);
  ctx.closePath();
}

function formatScore(score: number): string {
  return new Intl.NumberFormat("en-US").format(score);
}

function applyAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    throw new Error(`Invalid accent color: ${hex}`);
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
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

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
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
