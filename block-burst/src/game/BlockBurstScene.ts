import Phaser from "phaser";
import backgroundDesktopUrl from "../../assets/generated/background-desktop.png";
import backgroundMobilePortraitUrl from "../../assets/generated/background-mobile-portrait.png";
import hammerUrl from "../../assets/generated/hammer.png";
import previewHandUrl from "../../assets/ui/preview-hand.png";
import {
  COLOR_KEYS,
  COLS,
  DANGER_FILL,
  HAMMER_START,
  HINT_IDLE,
  PALETTE,
  PIECES,
  PIECES_BY_SIZE,
  PIECES_BY_TIER,
  REVIVES_PER_GAME,
  ROWS,
  TEX,
  TRAY_SCALE,
  type ColorKey,
  type PieceDef,
} from "./constants";
import { clamp01, hexStr, lerp, mix, mul } from "./color";
import { calculatePreviewGestureFrame, PREVIEW_GESTURE_TOTAL_MS } from "./preview";
import { Sfx } from "./sfx";

type SpecialType = "bomb" | "cross" | "laser";
type Cell = ColorKey | null;

export interface BlockBurstCallbacks {
  initialHammers: number;
  tutorialEnabled: boolean;
  saveHammers: (hammers: number) => Promise<void>;
  prepareRewarded: () => Promise<boolean>;
  showRewarded: () => Promise<boolean>;
  showInterstitial: () => Promise<void>;
  submitScore: (score: number) => Promise<void>;
}

export interface PreviewPayload {
  active?: boolean;
  sceneId?: string;
  surface?: string;
  seed?: string;
  audioPolicy?: "music-and-sfx" | "sfx-only" | "silent";
}

interface Layout {
  landscapeBackground: boolean;
  dw: number;
  dh: number;
  cell: number;
  gap: number;
  board: number;
  boardLeft: number;
  boardTop: number;
  slotPos: Array<{ x: number; y: number }>;
  scorePos: { x: number; y: number };
  bestPos: { x: number; y: number };
  lift: number;
  grabSlop: number;
  fScore: number;
  fBest: number;
  fHud: number;
  fHint: number;
  pad: number;
  safeTop: number;
  safeBottom: number;
  hammer: { x: number; y: number; r: number };
}

interface PieceData extends PieceDef {
  key: ColorKey;
  previewTarget?: { c0: number; r0: number };
}

type PieceContainer = Phaser.GameObjects.Container & {
  getData(key: "cells"): Array<[number, number]>;
  getData(key: "cols" | "rows" | "slot"): number;
  getData(key: "key"): ColorKey;
  getData(key: "home"): { x: number; y: number };
};

interface PreviewGesture {
  obj: PieceContainer;
  move: { slot: number; cells: Array<[number, number]>; c0: number; r0: number };
  startedAt: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  lift: number;
  committed: boolean;
}

interface BackgroundSquareSpec {
  x: number;
  y: number;
  color: number;
  size: number;
  minAlpha: number;
  maxAlpha: number;
  duration: number;
  delay: number;
}

const GRID_STROKE_COLOR = 0x0a0e1a;
const GRID_EMPTY_CELL_COLOR = 0x181c2f;
const GRID_EMPTY_CELL_TOP_COLOR = 0x181f33;
const BACKGROUND_LIFT_TOP_COLOR = 0x4b4148;
const BACKGROUND_LIFT_BOTTOM_COLOR = 0x4a5060;
const TUTORIAL_STORAGE_KEY = "block_burst_tutorial_complete";
const TUTORIAL_TARGET = { c0: 2, r0: 3 };
const TUTORIAL_PIECE: PieceData = {
  cells: [[0, 0], [1, 0], [2, 0], [3, 0]],
  cols: 4,
  rows: 1,
  n: 4,
  tier: 1,
  key: "yellow",
};
const TUTORIAL_GUIDE_PAUSE_MS = 700;

function formatScore(score: number): string {
  return Math.max(0, Math.floor(score)).toLocaleString("en-US");
}

const BACKGROUND_SQUARES: BackgroundSquareSpec[] = [
  {
    x: 0.06,
    y: 0.06,
    color: 0x74445f,
    size: 1.05,
    minAlpha: 0.015,
    maxAlpha: 0.075,
    duration: 5200,
    delay: 400,
  },
  {
    x: 0.38,
    y: 0.1,
    color: 0x76506c,
    size: 0.85,
    minAlpha: 0.012,
    maxAlpha: 0.065,
    duration: 6100,
    delay: 1700,
  },
  {
    x: 0.72,
    y: 0.055,
    color: 0x6e3d54,
    size: 1.08,
    minAlpha: 0.018,
    maxAlpha: 0.08,
    duration: 4600,
    delay: 800,
  },
  {
    x: 0.91,
    y: 0.16,
    color: 0x59617a,
    size: 0.72,
    minAlpha: 0.01,
    maxAlpha: 0.055,
    duration: 6800,
    delay: 2500,
  },
  {
    x: 0.15,
    y: 0.25,
    color: 0x69425d,
    size: 0.78,
    minAlpha: 0.012,
    maxAlpha: 0.06,
    duration: 5700,
    delay: 3200,
  },
  {
    x: 0.63,
    y: 0.31,
    color: 0x75435f,
    size: 1.12,
    minAlpha: 0.018,
    maxAlpha: 0.085,
    duration: 6500,
    delay: 1100,
  },
  {
    x: 0.84,
    y: 0.4,
    color: 0x50677a,
    size: 0.65,
    minAlpha: 0.008,
    maxAlpha: 0.05,
    duration: 7200,
    delay: 2100,
  },
  {
    x: 0.32,
    y: 0.46,
    color: 0x80506d,
    size: 0.92,
    minAlpha: 0.015,
    maxAlpha: 0.07,
    duration: 4900,
    delay: 600,
  },
  {
    x: 0.73,
    y: 0.56,
    color: 0x74445f,
    size: 0.78,
    minAlpha: 0.012,
    maxAlpha: 0.068,
    duration: 6200,
    delay: 2900,
  },
  {
    x: 0.11,
    y: 0.61,
    color: 0x66405a,
    size: 1.05,
    minAlpha: 0.016,
    maxAlpha: 0.075,
    duration: 5500,
    delay: 1400,
  },
  {
    x: 0.42,
    y: 0.69,
    color: 0x566b79,
    size: 0.68,
    minAlpha: 0.008,
    maxAlpha: 0.05,
    duration: 7400,
    delay: 3600,
  },
  {
    x: 0.92,
    y: 0.72,
    color: 0x76435c,
    size: 0.95,
    minAlpha: 0.014,
    maxAlpha: 0.072,
    duration: 5800,
    delay: 300,
  },
  {
    x: 0.22,
    y: 0.79,
    color: 0x7b4b68,
    size: 0.82,
    minAlpha: 0.012,
    maxAlpha: 0.062,
    duration: 6600,
    delay: 2300,
  },
  {
    x: 0.67,
    y: 0.84,
    color: 0x754057,
    size: 1.1,
    minAlpha: 0.018,
    maxAlpha: 0.08,
    duration: 5100,
    delay: 1200,
  },
  {
    x: 0.08,
    y: 0.92,
    color: 0x536879,
    size: 0.72,
    minAlpha: 0.008,
    maxAlpha: 0.048,
    duration: 7000,
    delay: 3300,
  },
  {
    x: 0.82,
    y: 0.95,
    color: 0x71425d,
    size: 0.88,
    minAlpha: 0.012,
    maxAlpha: 0.065,
    duration: 6000,
    delay: 1900,
  },
];

const PORTRAIT_LINE_OFFSETS = [
  -0.12, 0.02, 0.16, 0.3, 0.44, 0.58, 0.72, 0.86, 1,
];
const LANDSCAPE_LINE_OFFSETS = [
  -0.3, -0.14, 0.02, 0.18, 0.34, 0.5, 0.66, 0.82, 0.98,
];
const BACKGROUND_TRACERS = [
  {
    line: 0,
    color: 0xf06b61,
    period: 21000,
    phase: 0.08,
    length: 0.16,
    alpha: 0.24,
  },
  {
    line: 2,
    color: 0x78d9e6,
    period: 26000,
    phase: 0.64,
    length: 0.13,
    alpha: 0.2,
  },
  {
    line: 4,
    color: 0xef6666,
    period: 24000,
    phase: 0.35,
    length: 0.17,
    alpha: 0.22,
  },
  {
    line: 6,
    color: 0x73cfdb,
    period: 28000,
    phase: 0.82,
    length: 0.14,
    alpha: 0.18,
  },
  {
    line: 8,
    color: 0xf27a61,
    period: 23000,
    phase: 0.5,
    length: 0.15,
    alpha: 0.2,
  },
];

export class BlockBurstScene extends Phaser.Scene {
  private readonly callbacks: BlockBurstCallbacks;
  private readonly sfx = new Sfx();

  private score = 0;
  private shownScore = 0;
  private combo = 0;
  private comboGrace = 0;
  private revivesUsed = 0;
  private best = 0;
  private runStartingBest = 0;
  private hammers = HAMMER_START;
  private hammerMode = false;
  private linesRun = 0;
  private bestComboRun = 0;
  private danger = false;
  private previewMode = false;
  private previewPresentation = false;
  private lastPreviewPayload: PreviewPayload | null = null;
  private autoplayTimer = 0;
  private previewMoveActive = false;
  private previewAdvancePending = false;
  private previewStep = 0;
  private previewGesture: PreviewGesture | null = null;
  private tutorialActive = false;
  private tutorialGuideStartedAt = 0;
  private interstitialPending = false;
  private rewardedRevivePending = false;

  private grid: Cell[][] = [];
  private sprites: Array<Array<Phaser.GameObjects.Image | null>> = [];
  private special: Array<Array<SpecialType | null>> = [];
  private iconSprites: Array<Array<Phaser.GameObjects.Container | null>> = [];
  private slots: Array<PieceContainer | null> = [null, null, null];
  private pieceData: Array<PieceData | null> = [null, null, null];

  private L!: Layout;
  private bg!: Phaser.GameObjects.Image;
  private backgroundLift!: Phaser.GameObjects.Graphics;
  private backgroundMotionGfx!: Phaser.GameObjects.Graphics;
  private backgroundSquares: Array<{ object: Phaser.GameObjects.Rectangle; spec: BackgroundSquareSpec }> = [];
  private boardGfx!: Phaser.GameObjects.Graphics;
  private vignette!: Phaser.GameObjects.Image;
  private ghost!: Phaser.GameObjects.Graphics;
  private hintGfx!: Phaser.GameObjects.Graphics;
  private hammerGfx!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private hammerIcon!: Phaser.GameObjects.Image;
  private hammerCount!: Phaser.GameObjects.Text;
  private hammerHint!: Phaser.GameObjects.Text;
  private tutorialText!: Phaser.GameObjects.Text;
  private previewBadge!: Phaser.GameObjects.Text;
  private previewGuide!: HTMLDivElement;
  private previewGuideHand!: HTMLImageElement;
  private previewGuideRing!: HTMLDivElement;
  private dragging: PieceContainer | null = null;
  private dragPointerId = -1;
  private dropTarget: { c0: number; r0: number; valid: boolean } | null = null;
  private hintTimer: Phaser.Time.TimerEvent | null = null;
  private heartTimer: Phaser.Time.TimerEvent | null = null;
  private gameOverActive = false;
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];
  private goButtons: Array<{ cx: number; cy: number; hw: number; hh: number; enabled: boolean; action: () => void }> = [];
  private readonly reduceBackgroundMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  private ready = false;
  private readyResolve!: () => void;
  private readyReject!: (error: Error) => void;
  private readonly readyPromise = new Promise<void>((resolve, reject) => {
    this.readyResolve = resolve;
    this.readyReject = reject;
  });

  constructor(callbacks: BlockBurstCallbacks) {
    super("block-burst");
    this.callbacks = callbacks;
    this.hammers = callbacks.initialHammers;
  }

  preload(): void {
    this.load.image("background-mobile-portrait", backgroundMobilePortraitUrl);
    this.load.image("background-desktop", backgroundDesktopUrl);
    this.load.image("hammer", hammerUrl);
  }

  create(): void {
    this.best = Number(localStorage.getItem("block_burst_best") ?? 0);
    this.runStartingBest = this.best;
    this.resetBoard();
    this.layout();
    this.makeTextures();

    this.bg = this.add.image(0, 0, this.L.landscapeBackground ? "background-desktop" : "background-mobile-portrait").setOrigin(0.5).setDepth(0);
    this.backgroundLift = this.add.graphics().setDepth(0.05);
    this.createBackgroundMotion();
    this.boardGfx = this.add.graphics().setDepth(1);
    this.vignette = this.add.image(0, 0, "vignette").setOrigin(0, 0).setDepth(3).setAlpha(0);
    this.ghost = this.add.graphics().setDepth(4);
    this.hintGfx = this.add.graphics().setDepth(4);
    this.hammerGfx = this.add.graphics().setDepth(20);
    const previewGuide = document.querySelector<HTMLDivElement>("#preview-guide");
    const previewGuideHand = document.querySelector<HTMLImageElement>("#preview-guide-hand");
    const previewGuideRing = document.querySelector<HTMLDivElement>("#preview-guide-ring");
    if (!previewGuide || !previewGuideHand || !previewGuideRing) {
      throw new Error("Block Burst preview guide markup is missing");
    }
    this.previewGuide = previewGuide;
    this.previewGuideHand = previewGuideHand;
    this.previewGuideRing = previewGuideRing;
    this.previewGuideHand.src = previewHandUrl;
    this.buildHUD();
    this.applyLayout();

    this.input.addPointer(2);
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onPointerDown(p));
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (this.dragging && p.id === this.dragPointerId) this.moveDrag(p);
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (this.dragging && p.id === this.dragPointerId) this.endDrag();
    });
    window.addEventListener("resize", this.onResize);
    this.events.once("shutdown", () => window.removeEventListener("resize", this.onResize));

    if (this.callbacks.tutorialEnabled && localStorage.getItem(TUTORIAL_STORAGE_KEY) !== "1") {
      this.startTutorial();
    } else {
      this.dealNewSet();
    }
    this.resetHint();
    void this.previewGuideHand.decode().then(() => {
      this.ready = true;
      this.readyResolve();
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.readyReject(new Error(`Block Burst preview hand failed to decode: ${message}`));
    });
  }

  override update(time: number, delta: number): void {
    this.drawBackgroundMotion(time);
    if (this.tutorialActive) this.updateTutorialGuide(time);
    if (!this.previewMode) return;
    if (this.previewGesture) {
      this.updatePreviewGesture(time);
      return;
    }
    if (this.gameOverActive || this.previewMoveActive || this.previewAdvancePending) return;
    this.autoplayTimer -= delta / 1000;
    if (this.autoplayTimer <= 0) {
      this.autoplayMove(time);
      this.autoplayTimer = 0.76;
    }
  }

  async whenReady(): Promise<void> {
    if (!this.ready) await this.readyPromise;
  }

  async preparePreview(payload?: PreviewPayload): Promise<void> {
    if (!this.ready) await this.readyPromise;
    if (payload?.active === false) {
      if (!this.previewMode) return;
      this.stopPreviewGesture();
      this.previewMode = false;
      this.previewPresentation = false;
      this.lastPreviewPayload = null;
      this.setPreviewHud(false);
      this.scene.restart();
      return;
    }
    this.stopTutorial(false);
    this.stopPreviewGesture();
    this.previewMode = true;
    this.previewPresentation = this.isPreviewPresentationScene(payload?.sceneId);
    this.lastPreviewPayload = { ...payload, active: true };
    this.previewAdvancePending = false;
    this.previewStep = 0;
    this.sfx.muted = payload?.audioPolicy === "silent";
    this.clearOverlay();
    this.cameras.main.resetFX();
    this.layout();
    this.applyLayout();
    this.setupPreviewMoment();
    this.setPreviewHud(this.previewPresentation);
    if (payload?.sceneId === "state-gameplay") {
      this.autoplayTimer = 3600;
    }
    if (payload?.sceneId === "state-hammer-selected") {
      this.autoplayTimer = 3600;
      this.hammerMode = true;
      this.drawHammer();
      this.hammerHint.setVisible(true);
    }
    if (payload?.sceneId === "state-combo") {
      this.combo = 2;
      this.comboGrace = 1;
      this.bestComboRun = 2;
      this.autoplayTimer = 0;
    }
    if (payload?.sceneId?.startsWith("result-overlay")) {
      this.linesRun = 18;
      this.bestComboRun = 4;
      if (payload.sceneId === "result-overlay-used") this.revivesUsed = REVIVES_PER_GAME;
      if (payload.sceneId === "result-overlay-new-best") {
        this.runStartingBest = 10000;
        this.best = this.score;
      } else {
        this.runStartingBest = 18950;
        this.best = 18950;
      }
      this.syncBestText();
      this.showGameOver(true);
    }
  }

  startAudioCapture(): void {
    if (this.previewPresentation) {
      this.stopPreviewGesture();
      this.previewStep = 0;
      this.setupPreviewMoment();
    }
    this.sfx.startCapture();
  }

  async stopAudioCapture(): Promise<{ mimeType: string; base64: string }> {
    return this.sfx.stopCapture();
  }

  getPreviewDebugState(): Record<string, unknown> {
    const gestureFrame = this.previewGesture
      ? calculatePreviewGestureFrame(this.time.now - this.previewGesture.startedAt)
      : null;
    return {
      previewMode: this.previewMode,
      previewPresentation: this.previewPresentation,
      previewStep: this.previewStep,
      gesturePhase: gestureFrame?.phase ?? null,
      gestureDragProgress: gestureFrame?.dragProgress ?? null,
      gestureReleaseProgress: gestureFrame?.releaseProgress ?? null,
      gestureActive: Boolean(this.previewGesture),
      handVisible: this.previewGuide?.classList.contains("on") ?? false,
      tutorialActive: this.tutorialActive,
      boardOccupied: this.filledCount(),
      trayPieceCount: this.slots.filter(Boolean).length,
      draggingSlot: this.dragging?.getData("slot") ?? null,
      dropTarget: this.dropTarget,
      score: this.score,
      revivesUsed: this.revivesUsed,
      revivePending: this.rewardedRevivePending,
      hudVisible: Boolean(
        this.scoreText?.visible
        || this.bestText?.visible
        || this.hammerIcon?.visible
        || this.hammerCount?.visible
      ),
      overlayVisible: this.gameOverActive,
    };
  }

  private readonly onResize = (): void => {
    this.layout();
    this.applyLayout();
  };

  private resetBoard(): void {
    this.grid = [];
    this.sprites = [];
    this.special = [];
    this.iconSprites = [];
    for (let r = 0; r < ROWS; r++) {
      this.grid[r] = [];
      this.sprites[r] = [];
      this.special[r] = [];
      this.iconSprites[r] = [];
      for (let c = 0; c < COLS; c++) {
        this.grid[r]![c] = null;
        this.sprites[r]![c] = null;
        this.special[r]![c] = null;
        this.iconSprites[r]![c] = null;
      }
    }
  }

  private resetRun(): void {
    for (const slot of this.slots) slot?.destroy();
    this.slots = [null, null, null];
    this.pieceData = [null, null, null];
    for (const row of this.sprites) for (const sprite of row) sprite?.destroy();
    for (const row of this.iconSprites) for (const icon of row) icon?.destroy();
    this.resetBoard();
    this.score = 0;
    this.shownScore = 0;
    this.combo = 0;
    this.comboGrace = 0;
    this.revivesUsed = 0;
    this.linesRun = 0;
    this.bestComboRun = 0;
    this.runStartingBest = this.best;
    this.scoreText?.setText(formatScore(0));
    this.syncBestText();
    this.drawHammer();
    this.gameOverActive = false;
    this.interstitialPending = false;
    this.rewardedRevivePending = false;
  }

  private startTutorial(): void {
    this.tutorialActive = true;
    this.tutorialGuideStartedAt = this.time.now;
    this.resetRun();
    this.layout();
    this.applyLayout();
    this.seedTutorialBoard();
    this.dealTutorialPiece();
    this.tutorialText.setVisible(true);
    this.bestText.setVisible(false);
    this.drawHammer();
    this.clearHint();
  }

  private seedTutorialBoard(): void {
    for (const c of [0, 1, 6, 7]) {
      this.addPreviewBlock(c, TUTORIAL_TARGET.r0, "yellow");
    }
  }

  private dealTutorialPiece(): void {
    for (const slot of this.slots) slot?.destroy();
    this.slots = [null, null, null];
    this.pieceData = [null, TUTORIAL_PIECE, null];
    this.buildTrayPiece(1, TUTORIAL_PIECE, true);
  }

  private completeTutorial(): void {
    if (!this.tutorialActive) return;
    this.tutorialActive = false;
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
    this.tutorialText.setVisible(false);
    this.hidePreviewGuide();
    this.drawHammer();
    this.syncBestText();
    this.resetHint();
  }

  private stopTutorial(persist: boolean): void {
    if (!this.tutorialActive) return;
    this.tutorialActive = false;
    if (persist) localStorage.setItem(TUTORIAL_STORAGE_KEY, "1");
    this.tutorialText?.setVisible(false);
    this.hidePreviewGuide();
    this.drawHammer();
    this.syncBestText();
  }

  private updateTutorialGuide(time: number): void {
    const piece = this.slots[1];
    if (!piece || this.dragging || this.previewMode) {
      this.hidePreviewGuide();
      return;
    }
    const cycleDuration = PREVIEW_GESTURE_TOTAL_MS + TUTORIAL_GUIDE_PAUSE_MS;
    const elapsed = (time - this.tutorialGuideStartedAt + cycleDuration) % cycleDuration;
    if (elapsed >= PREVIEW_GESTURE_TOTAL_MS) {
      this.hidePreviewGuide();
      return;
    }
    const frame = calculatePreviewGestureFrame(elapsed);
    const targetX = this.L.boardLeft + (TUTORIAL_TARGET.c0 + piece.getData("cols") / 2) * this.L.cell;
    const targetY = this.L.boardTop + (TUTORIAL_TARGET.r0 + piece.getData("rows") / 2) * this.L.cell;
    const pointerLift = this.L.landscapeBackground && this.L.dw >= 900 ? 6 : this.L.lift;
    const handX = lerp(piece.x, targetX, frame.dragProgress);
    const handY = lerp(piece.y, targetY + pointerLift, frame.dragProgress);
    this.updatePreviewGuide(
      handX,
      handY,
      this.L.cell * 1.55,
      this.L.cell * 0.32,
      frame.handScale,
      1 + frame.releaseProgress * 1.35,
      frame.handOpacity,
    );
  }

  private pulseTutorialPiece(): void {
    const piece = this.slots[1];
    if (!piece) return;
    this.tweens.killTweensOf(piece);
    this.tweens.add({
      targets: piece,
      scale: TRAY_SCALE * 1.12,
      duration: 120,
      yoyo: true,
      ease: "Sine.easeInOut",
      onComplete: () => piece.active && piece.setScale(TRAY_SCALE),
    });
    this.tutorialGuideStartedAt = this.time.now;
  }

  private layout(): void {
    const dw = this.scale.width;
    const dh = this.scale.height;
    const landscapeBackground = dw > dh * 1.15;
    const pad = Math.round(Math.min(dw, dh) * 0.035);
    const safeTop = Math.max(pad, Math.round(dh * (landscapeBackground ? 0.05 : 0.075)));
    const safeBottom = Math.max(pad, Math.round(dh * (landscapeBackground ? 0.06 : 0.08)));
    let cell: number;
    let boardLeft: number;
    let boardTop: number;
    let slotPos: Array<{ x: number; y: number }>;
    let scorePos: { x: number; y: number };
    let bestPos: { x: number; y: number };

    if (!landscapeBackground) {
      const topBand = Math.max(dh * 0.13, safeTop + dh * 0.02);
      const trayReserve = dh * 0.22;
      const availH = dh - topBand - safeBottom - trayReserve;
      const availW = dw * 0.88;
      cell = Math.floor(Math.min(availW, availH) / 8);
      const board = cell * 8;
      boardLeft = Math.round((dw - board) / 2);
      boardTop = Math.round(topBand + Math.max(0, (availH - board) * 0.43));
      const below = Math.max(0, dh - safeBottom - (boardTop + board));
      const trayY = Math.min(dh - safeBottom - cell * 1.25, boardTop + board + below * 0.56);
      const spread = Math.min(board * 0.72, dw * 0.84);
      slotPos = [{ x: dw / 2 - spread / 2, y: trayY }, { x: dw / 2, y: trayY }, { x: dw / 2 + spread / 2, y: trayY }];
      scorePos = { x: dw / 2, y: safeTop + cell * 0.42 };
      bestPos = { x: dw / 2, y: safeTop + cell * 1.34 };
    } else {
      const topBand = Math.max(dh * 0.14, safeTop + dh * 0.05);
      const availH = dh - topBand - safeBottom;
      cell = Math.floor(Math.min(availH * 0.76, dw * 0.38) / 8);
      const board = cell * 8;
      boardTop = Math.round(topBand + Math.max(0, (availH - board) * 0.38));
      boardLeft = Math.round((dw * 0.64 - board) / 2 + dw * 0.02);
      const rightCx = Math.round(boardLeft + board + (dw - (boardLeft + board)) * 0.5);
      const spread = Math.min(board * 0.65, (dh - safeTop - safeBottom) * 0.62);
      slotPos = [{ x: rightCx, y: boardTop + board / 2 - spread / 2 }, { x: rightCx, y: boardTop + board / 2 }, { x: rightCx, y: boardTop + board / 2 + spread / 2 }];
      scorePos = { x: boardLeft + board / 2, y: safeTop + cell * 0.42 };
      bestPos = { x: boardLeft + board / 2, y: safeTop + cell * 1.2 };
    }

    const board = cell * 8;
    const hammer = landscapeBackground
      ? { x: slotPos[0]!.x, y: safeTop + cell * 0.62, r: cell * 0.62 }
      : { x: dw - pad - cell * 0.62, y: safeTop + cell * 0.62, r: cell * 0.62 };

    this.L = {
      landscapeBackground,
      dw,
      dh,
      cell,
      gap: Math.max(4, Math.round(cell * 0.06)),
      board,
      boardLeft,
      boardTop,
      slotPos,
      scorePos,
      bestPos,
      lift: cell * 1.35,
      grabSlop: cell * 0.95,
      fScore: Math.round(cell * 1.05),
      fBest: Math.round(cell * 0.34),
      fHud: Math.round(cell * 0.5),
      fHint: Math.round(cell * 0.42),
      pad,
      safeTop,
      safeBottom,
      hammer,
    };
  }

  private cellXY(c: number, r: number): [number, number] {
    return [this.L.boardLeft + c * this.L.cell + this.L.cell / 2, this.L.boardTop + r * this.L.cell + this.L.cell / 2];
  }

  private createBackgroundMotion(): void {
    this.backgroundMotionGfx = this.add.graphics().setDepth(0.2);
    this.backgroundSquares = BACKGROUND_SQUARES.map((spec) => {
      const minAlpha = Math.min(0.16, spec.minAlpha * 1.8);
      const object = this.add
        .rectangle(0, 0, 10, 10, spec.color, 1)
        .setAlpha(minAlpha)
        .setDepth(0.1);
      return { object, spec };
    });
  }

  private layoutBackground(): void {
    const L = this.L;
    this.bg.setTexture(
      L.landscapeBackground ? "background-desktop" : "background-mobile-portrait",
    );
    const scale = Math.max(L.dw / this.bg.width, L.dh / this.bg.height);
    this.bg.setPosition(L.dw / 2, L.dh / 2).setScale(scale);
    this.backgroundLift.clear();
    this.backgroundLift.fillGradientStyle(
      BACKGROUND_LIFT_TOP_COLOR,
      BACKGROUND_LIFT_TOP_COLOR,
      BACKGROUND_LIFT_BOTTOM_COLOR,
      BACKGROUND_LIFT_BOTTOM_COLOR,
      0.35,
      0.35,
      0.16,
      0.16,
    );
    this.backgroundLift.fillRect(0, 0, L.dw, L.dh);
    const baseSize = Math.max(7, Math.min(L.dw, L.dh) * 0.016);
    for (const { object, spec } of this.backgroundSquares) {
      object
        .setPosition(spec.x * L.dw, spec.y * L.dh)
        .setDisplaySize(baseSize * spec.size, baseSize * spec.size);
    }
  }

  private drawBackgroundMotion(time: number): void {
    const g = this.backgroundMotionGfx;
    if (!g) return;
    g.clear();

    for (const { object, spec } of this.backgroundSquares) {
      const minAlpha = Math.min(0.16, spec.minAlpha * 1.8);
      const maxAlpha = Math.min(0.18, spec.maxAlpha * 1.8);
      const phase = ((time + spec.delay) % spec.duration) / spec.duration;
      const pulse = this.reduceBackgroundMotion ? 0 : 0.5 - Math.cos(phase * Math.PI * 2) * 0.5;
      object.setAlpha(lerp(minAlpha, maxAlpha, pulse));
    }

    if (this.reduceBackgroundMotion) return;

    const L = this.L;
    const offsets = L.landscapeBackground
      ? LANDSCAPE_LINE_OFFSETS
      : PORTRAIT_LINE_OFFSETS;
    const rise = L.landscapeBackground ? 0.45 : 0.185;
    const haloWidth = Math.max(4, Math.min(L.dw, L.dh) * 0.008);
    const coreWidth = Math.max(1, Math.min(L.dw, L.dh) * 0.002);
    const steps = 12;

    for (const tracer of BACKGROUND_TRACERS) {
      const offset = offsets[tracer.line];
      if (offset === undefined) continue;
      const progress = (time / tracer.period + tracer.phase) % 1;
      const start = progress - tracer.length / 2;
      for (let step = 0; step < steps; step++) {
        const t0 = start + (tracer.length * step) / steps;
        const t1 = start + (tracer.length * (step + 1)) / steps;
        if (t0 < 0 || t1 > 1) continue;
        const intensity = Math.sin((Math.PI * (step + 0.5)) / steps);
        const x0n = -0.2 + t0 * 1.4;
        const x1n = -0.2 + t1 * 1.4;
        const x0 = x0n * L.dw;
        const x1 = x1n * L.dw;
        const y0 = (offset + rise * x0n) * L.dh;
        const y1 = (offset + rise * x1n) * L.dh;
        g.lineStyle(
          haloWidth,
          tracer.color,
          tracer.alpha * intensity * 0.24,
        ).lineBetween(x0, y0, x1, y1);
        g.lineStyle(
          coreWidth,
          tracer.color,
          tracer.alpha * intensity,
        ).lineBetween(x0, y0, x1, y1);
      }
    }
  }

  private applyLayout(): void {
    const L = this.L;
    this.layoutBackground();
    this.vignette?.setDisplaySize(L.dw, L.dh);
    this.drawBoard();
    this.scoreText?.setPosition(L.scorePos.x, L.scorePos.y).setFontSize(L.fScore);
    this.bestText?.setPosition(L.bestPos.x, L.bestPos.y).setFontSize(L.fBest);
    this.hammerHint
      ?.setPosition(
        L.boardLeft + L.board / 2,
        L.boardTop + L.board + (L.dh - (L.boardTop + L.board)) * (L.landscapeBackground ? 0.26 : 0.16),
      )
      .setFontSize(L.fHint);
    this.tutorialText
      ?.setPosition(L.bestPos.x, L.bestPos.y)
      .setFontSize(Math.max(16, Math.round(L.fBest * 0.9)));
    this.previewBadge?.setPosition(L.dw / 2, L.pad + L.cell * 0.3).setFontSize(Math.round(L.cell * 0.28));
    this.drawHammer();

    const blockScale = (L.cell - L.gap) / TEX;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const sprite = this.sprites[r]?.[c];
        if (sprite) {
          const [x, y] = this.cellXY(c, r);
          sprite.setPosition(x, y).setScale(blockScale);
        }
        const type = this.special[r]?.[c];
        if (type) {
          this.iconSprites[r]?.[c]?.destroy();
          this.placeIcon(r, c, type);
        }
      }
    }
    for (let i = 0; i < 3; i++) {
      this.slots[i]?.destroy();
      this.slots[i] = null;
      const data = this.pieceData[i];
      if (data) this.buildTrayPiece(i, data, false);
    }
    this.ghost?.clear();
    this.clearHint();
  }

  private drawBoard(): void {
    const L = this.L;
    const g = this.boardGfx;
    const inset = L.gap / 2;
    const frame = L.gap * 0.85;
    g.clear();
    g.fillStyle(GRID_STROKE_COLOR, 1);
    g.fillRoundedRect(L.boardLeft - frame, L.boardTop - frame, L.board + frame * 2, L.board + frame * 2, Math.max(8, L.cell * 0.08));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = L.boardLeft + c * L.cell + inset;
        const y = L.boardTop + r * L.cell + inset;
        const size = L.cell - L.gap;
        const radius = Math.max(3, L.cell * 0.06);
        g.fillStyle(GRID_EMPTY_CELL_COLOR, 1);
        g.fillRoundedRect(x, y, size, size, radius);
        g.lineStyle(Math.max(1, L.cell * 0.016), GRID_EMPTY_CELL_TOP_COLOR, 0.95);
        g.lineBetween(x + radius, y + 1, x + size - radius, y + 1);
      }
    }
  }

  private drawHammer(): void {
    if (!this.hammerGfx || !this.hammerIcon || !this.hammerCount) return;
    const visible = !this.previewPresentation && !this.tutorialActive;
    this.hammerGfx.setVisible(visible);
    this.hammerIcon.setVisible(visible);
    this.hammerCount.setVisible(visible);
    if (!visible) return;
    const h = this.L.hammer;
    this.hammerGfx.clear();
    this.hammerGfx.fillStyle(0x171424, 0.96);
    this.hammerGfx.fillCircle(h.x, h.y, h.r);
    this.hammerGfx.lineStyle(
      Math.max(3, h.r * 0.09),
      this.hammerMode ? 0xffd24d : 0x59365f,
      1,
    );
    this.hammerGfx.strokeCircle(h.x, h.y, h.r);
    this.hammerIcon
      .setPosition(h.x - h.r * 0.08, h.y - h.r * 0.08)
      .setDisplaySize(h.r * 1.72, h.r * 1.72);
    this.hammerCount
      .setPosition(h.x + h.r * 0.48, h.y + h.r * 0.46)
      .setFontSize(Math.round(h.r * 0.62))
      .setText(String(this.hammers));
  }

  private makeTextures(): void {
    for (const key of COLOR_KEYS) this.makeBlockTexture(key);
    const mk = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): void => {
      if (this.textures.exists(key)) return;
      const texture = this.textures.createCanvas(key, w, h);
      if (!texture) throw new Error(`[block-burst] Could not create texture ${key}`);
      draw(texture.getContext());
      texture.refresh();
    };
    mk("spark", 20, 20, (ctx) => { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(2, 2, 16, 16, 5); ctx.fill(); });
    mk("glow", 320, 320, (ctx) => {
      const g = ctx.createRadialGradient(160, 160, 0, 160, 160, 160);
      g.addColorStop(0, "rgba(255,224,138,0.95)");
      g.addColorStop(0.4, "rgba(255,200,90,0.45)");
      g.addColorStop(1, "rgba(255,200,90,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 320, 320);
    });
    mk("ring", 128, 128, (ctx) => { ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(64, 64, 52, 0, Math.PI * 2); ctx.stroke(); });
    mk("pop", 96, 96, (ctx) => {
      const g = ctx.createRadialGradient(48, 48, 0, 48, 48, 48);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.5, "rgba(255,255,255,0.35)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 96, 96);
    });
    mk("vignette", 360, 640, (ctx) => {
      const g = ctx.createRadialGradient(180, 320, 150, 180, 320, 420);
      g.addColorStop(0, "rgba(255,40,40,0)");
      g.addColorStop(1, "rgba(255,30,30,0.5)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 360, 640);
    });
    this.makeSpecialGlyph("sp_bomb", (ctx) => { ctx.beginPath(); ctx.arc(32, 38, 16, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(32, 22); ctx.lineTo(42, 8); ctx.stroke(); });
    this.makeSpecialGlyph("sp_cross", (ctx) => { ctx.fillRect(27, 8, 10, 48); ctx.fillRect(8, 27, 48, 10); });
    this.makeSpecialGlyph("sp_laser", (ctx) => { ctx.beginPath(); ctx.moveTo(38, 6); ctx.lineTo(16, 36); ctx.lineTo(30, 36); ctx.lineTo(26, 58); ctx.lineTo(48, 24); ctx.lineTo(34, 24); ctx.closePath(); ctx.fill(); });
  }

  private makeSpecialGlyph(key: string, draw: (ctx: CanvasRenderingContext2D) => void): void {
    if (this.textures.exists(key)) return;
    const texture = this.textures.createCanvas(key, 64, 64);
    if (!texture) throw new Error(`[block-burst] Could not create glyph ${key}`);
    const ctx = texture.getContext();
    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.strokeStyle = "rgba(255,255,255,0.96)";
    ctx.lineCap = "round";
    draw(ctx);
    texture.refresh();
  }

  private makeBlockTexture(key: ColorKey): void {
    const texKey = `blk_${key}`;
    if (this.textures.exists(texKey)) return;
    const palette = PALETTE[key];
    const face = palette.face;
    const S = TEX;
    const margin = S * 0.008;
    const rad = S * 0.075;
    const bev = S * 0.17;
    const texture = this.textures.createCanvas(texKey, S, S);
    if (!texture) throw new Error(`[block-burst] Could not create block texture ${key}`);
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(margin, margin, S - margin * 2, S - margin * 2, rad);
    ctx.clip();
    const O = [[margin, margin], [S - margin, margin], [S - margin, S - margin], [margin, S - margin]];
    const I = [[bev, bev], [S - bev, bev], [S - bev, S - bev], [bev, S - bev]];
    const quad = (a: number[], b: number[], c: number[], d: number[], col: string): void => {
      ctx.beginPath();
      ctx.moveTo(a[0]!, a[1]!);
      ctx.lineTo(b[0]!, b[1]!);
      ctx.lineTo(c[0]!, c[1]!);
      ctx.lineTo(d[0]!, d[1]!);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    };
    quad(O[0]!, O[1]!, I[1]!, I[0]!, hexStr(palette.top));
    quad(O[0]!, I[0]!, I[3]!, O[3]!, hexStr(palette.left));
    quad(O[1]!, O[2]!, I[2]!, I[1]!, hexStr(palette.right));
    quad(O[3]!, I[3]!, I[2]!, O[2]!, hexStr(palette.bottom));

    const faceGradient = ctx.createLinearGradient(0, bev, 0, S - bev);
    faceGradient.addColorStop(0, hexStr(mix(face, 0xffffff, 0.08)));
    faceGradient.addColorStop(0.4, hexStr(face));
    faceGradient.addColorStop(1, hexStr(mul(face, 0.9)));
    ctx.fillStyle = faceGradient;
    ctx.fillRect(bev, bev, S - 2 * bev, S - 2 * bev);

    const sheen = ctx.createLinearGradient(0, bev, 0, S * 0.55);
    sheen.addColorStop(0, "rgba(255,255,255,0.14)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(bev, bev, S - 2 * bev, S * 0.55 - bev);

    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = S * 0.012;
    ctx.strokeRect(bev + ctx.lineWidth / 2, bev + ctx.lineWidth / 2, S - 2 * bev - ctx.lineWidth, S - 2 * bev - ctx.lineWidth);
    ctx.restore();

    ctx.beginPath();
    ctx.roundRect(margin, margin, S - margin * 2, S - margin * 2, rad);
    ctx.lineWidth = S * 0.018;
    ctx.strokeStyle = hexStr(mix(palette.bottom, GRID_STROKE_COLOR, 0.34));
    ctx.stroke();
    texture.refresh();
  }

  private buildHUD(): void {
    const t = (x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text => this.add.text(x, y, text, style).setDepth(20);
    const roundedFont = 'ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif';
    this.scoreText = t(0, 0, "0", { fontFamily: roundedFont, fontStyle: "700", color: "#ffffff" }).setOrigin(0.5);
    this.scoreText.setShadow(0, 5, "rgba(10,16,50,0.45)", 7, false, true);
    this.bestText = t(0, 0, `BEST ${formatScore(this.best)}`, { fontFamily: roundedFont, fontStyle: "700", color: "#e7e5ea" }).setOrigin(0.5).setAlpha(0.92);
    this.hammerIcon = this.add.image(0, 0, "hammer").setOrigin(0.5).setDepth(21);
    this.hammerCount = t(0, 0, String(this.hammers), { fontFamily: roundedFont, fontStyle: "700", color: "#fff" }).setOrigin(0.5).setDepth(21);
    this.hammerHint = t(0, 0, "Tap a block to burst it", { fontFamily: roundedFont, fontStyle: "700", color: "#ffd24d" }).setOrigin(0.5).setVisible(false);
    this.tutorialText = t(0, 0, "DRAG TO COMPLETE THE LINE", { fontFamily: roundedFont, fontStyle: "700", color: "#ffd24d" }).setOrigin(0.5).setVisible(false);
    this.previewBadge = t(0, 0, "PREVIEW", { fontFamily: roundedFont, fontStyle: "700", color: "#ffffff" }).setOrigin(0.5).setAlpha(0.6).setVisible(false);
    this.syncBestText();
  }

  private setPreviewHud(active: boolean): void {
    const visible = !active;
    this.previewBadge?.setVisible(false);
    this.scoreText?.setVisible(visible);
    this.bestText?.setVisible(visible && !this.tutorialActive && this.best > 0);
    this.tutorialText?.setVisible(visible && this.tutorialActive);
    this.drawHammer();
    this.hammerHint?.setVisible(false);
  }

  private syncBestText(): void {
    if (!this.bestText) return;
    this.bestText.setText(this.best > 0 ? `BEST ${formatScore(this.best)}` : "");
    this.bestText.setVisible(!this.previewPresentation && !this.tutorialActive && this.best > 0);
  }

  private dealNewSet(): void {
    const difficulty = clamp01(this.score / 3500);
    const fill = this.filledCount() / 64;
    const picks = [this.pickPiece(difficulty, fill), this.pickPiece(difficulty, fill), this.pickPiece(difficulty, fill)];
    if (!picks.some((piece) => this.pieceFitsAnywhere(piece.cells))) {
      const fit = PIECES_BY_SIZE.find((piece) => this.pieceFitsAnywhere(piece.cells));
      if (fit) picks[Phaser.Math.Between(0, 2)] = fit;
    }
    for (let i = 0; i < 3; i++) {
      const pick = picks[i];
      if (!pick) throw new Error("[block-burst] Missing piece pick");
      const data = { ...pick, key: Phaser.Utils.Array.GetRandom(COLOR_KEYS) };
      this.pieceData[i] = data;
      this.buildTrayPiece(i, data, true);
    }
    this.resetHint();
    this.checkGameOver();
  }

  private filledCount(): number {
    let n = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (this.grid[r]?.[c]) n++;
    return n;
  }

  private pickPiece(difficulty: number, fill: number): PieceDef {
    let wE = lerp(70, 15, difficulty);
    const wM = lerp(28, 50, difficulty);
    let wH = lerp(2, 35, difficulty);
    if (fill > 0.55) {
      const k = (fill - 0.55) / 0.45;
      wE *= 1 + 2.5 * k;
      wH *= Math.max(0, 1 - 1.4 * k);
    }
    const roll = Math.random() * (wE + wM + wH);
    const tier = roll < wE ? 0 : roll < wE + wM ? 1 : 2;
    const pool = PIECES_BY_TIER[tier] ?? PIECES;
    return pool[Math.floor(Math.random() * pool.length)] ?? PIECES[0]!;
  }

  private buildTrayPiece(slot: number, data: PieceData, animate: boolean): void {
    const L = this.L;
    const pos = L.slotPos[slot];
    if (!pos) throw new Error(`[block-burst] Missing slot ${slot}`);
    const cont = this.add.container(pos.x, pos.y).setDepth(10) as PieceContainer;
    for (const [dx, dy] of data.cells) {
      const bx = (dx - (data.cols - 1) / 2) * L.cell;
      const by = (dy - (data.rows - 1) / 2) * L.cell;
      cont.add(this.add.image(bx, by, `blk_${data.key}`).setScale((L.cell - L.gap) / TEX));
    }
    cont.setData("cells", data.cells);
    cont.setData("cols", data.cols);
    cont.setData("rows", data.rows);
    cont.setData("key", data.key);
    cont.setData("slot", slot);
    cont.setData("home", { x: pos.x, y: pos.y });
    const trayScale = TRAY_SCALE;
    if (animate) {
      cont.setScale(trayScale * 0.2).setAlpha(0);
      this.tweens.add({ targets: cont, scale: trayScale, alpha: 1, duration: 240, ease: "Back.easeOut", delay: slot * 40 });
    } else {
      cont.setScale(trayScale);
    }
    this.slots[slot] = cont;
  }

  private onPointerDown(p: Phaser.Input.Pointer): void {
    this.sfx.init();
    if (this.gameOverActive) {
      this.handleGameOverTap(p);
      return;
    }
    if (!this.previewMode && !this.tutorialActive && this.overHammer(p)) {
      void this.toggleHammer();
      return;
    }
    if (this.hammerMode) {
      void this.useHammer(p);
      return;
    }
    if (this.dragging || this.previewMode) return;
    let best: PieceContainer | null = null;
    let bestD = Infinity;
    for (const candidate of this.slots) {
      if (!candidate) continue;
      const d = this.pointerDistToPiece(p, candidate);
      if (d < bestD) {
        bestD = d;
        best = candidate;
      }
    }
    if (best && bestD <= this.L.grabSlop) {
      if (this.tutorialActive && best.getData("slot") !== 1) {
        this.pulseTutorialPiece();
        return;
      }
      this.beginDrag(best, p);
    }
  }

  private pointerDistToPiece(p: Phaser.Input.Pointer, c: PieceContainer): number {
    const cols = c.getData("cols");
    const rows = c.getData("rows");
    const hw = (cols * this.L.cell * TRAY_SCALE) / 2;
    const hh = (rows * this.L.cell * TRAY_SCALE) / 2;
    const dx = Math.max(Math.abs(p.x - c.x) - hw, 0);
    const dy = Math.max(Math.abs(p.y - c.y) - hh, 0);
    return Math.hypot(dx, dy);
  }

  private beginDrag(obj: PieceContainer, p: Phaser.Input.Pointer): void {
    this.dragging = obj;
    this.dragPointerId = p.id;
    this.tweens.killTweensOf(obj);
    obj.setDepth(50);
    this.tweens.add({ targets: obj, scale: 1, duration: 120, ease: "Back.easeOut" });
    this.sfx.pick();
    this.clearHint();
    if (this.tutorialActive) this.hidePreviewGuide();
    this.moveDrag(p);
  }

  private moveDrag(p: Phaser.Input.Pointer): void {
    if (!this.dragging) return;
    const lift = p.wasTouch ? this.L.lift : 6;
    this.dragging.x = p.x;
    this.dragging.y = p.y - lift;
    this.updateGhost(this.dragging);
  }

  private endDrag(): void {
    if (!this.dragging) return;
    const obj = this.dragging;
    this.dragging = null;
    this.ghost.clear();
    const t = this.dropTarget;
    this.dropTarget = null;
    const tutorialTargetX = this.L.boardLeft + (TUTORIAL_TARGET.c0 + obj.getData("cols") / 2) * this.L.cell;
    const tutorialTargetY = this.L.boardTop + (TUTORIAL_TARGET.r0 + obj.getData("rows") / 2) * this.L.cell;
    const completesTutorial = this.tutorialActive
      && obj.getData("slot") === 1
      && this.canPlace(obj.getData("cells"), TUTORIAL_TARGET.c0, TUTORIAL_TARGET.r0)
      && Math.hypot(obj.x - tutorialTargetX, obj.y - tutorialTargetY) <= this.L.cell * 1.1;
    if (completesTutorial) {
      this.placePiece(obj, TUTORIAL_TARGET.c0, TUTORIAL_TARGET.r0);
      this.completeTutorial();
      return;
    }
    if (t?.valid && !this.tutorialActive) {
      this.placePiece(obj, t.c0, t.r0);
      return;
    }
    if (this.tutorialActive) this.tutorialGuideStartedAt = this.time.now;
    this.sfx.invalid();
    const home = obj.getData("home");
    this.tweens.add({
      targets: obj,
      x: obj.x + 14,
      duration: 48,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.tweens.add({ targets: obj, x: home.x, y: home.y, scale: TRAY_SCALE, duration: 240, ease: "Back.easeOut", onComplete: () => obj.setDepth(10) }),
    });
  }

  private pieceOrigin(obj: PieceContainer): { c0: number; r0: number } {
    const tlx = obj.x - ((obj.getData("cols") - 1) / 2) * this.L.cell;
    const tly = obj.y - ((obj.getData("rows") - 1) / 2) * this.L.cell;
    return {
      c0: Math.round((tlx - (this.L.boardLeft + this.L.cell / 2)) / this.L.cell),
      r0: Math.round((tly - (this.L.boardTop + this.L.cell / 2)) / this.L.cell),
    };
  }

  private computeValid(obj: PieceContainer): { c0: number; r0: number; valid: boolean } {
    const { c0, r0 } = this.pieceOrigin(obj);
    for (const [dx, dy] of obj.getData("cells")) {
      const c = c0 + dx;
      const r = r0 + dy;
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS || this.grid[r]?.[c]) return { c0, r0, valid: false };
    }
    return { c0, r0, valid: true };
  }

  private updateGhost(obj: PieceContainer): void {
    this.ghost.clear();
    const t = this.computeValid(obj);
    this.dropTarget = t;
    if (!t.valid) return;
    const occ = this.grid.map((row) => row.map(Boolean));
    for (const [dx, dy] of obj.getData("cells")) occ[t.r0 + dy]![t.c0 + dx] = true;
    const fullRows = [];
    const fullCols = [];
    for (let r = 0; r < ROWS; r++) if (occ[r]?.every(Boolean)) fullRows.push(r);
    for (let c = 0; c < COLS; c++) {
      let full = true;
      for (let r = 0; r < ROWS; r++) if (!occ[r]?.[c]) full = false;
      if (full) fullCols.push(c);
    }
    const willClear = fullRows.length + fullCols.length > 0;
    if (willClear) {
      const pulse = 0.2 + 0.16 * Math.abs(Math.sin(this.time.now / 170));
      this.ghost.fillStyle(0xffe27a, pulse);
      for (const r of fullRows) this.ghost.fillRoundedRect(this.L.boardLeft + 1, this.L.boardTop + r * this.L.cell + 1, this.L.board - 2, this.L.cell - 2, 6);
      for (const c of fullCols) this.ghost.fillRoundedRect(this.L.boardLeft + c * this.L.cell + 1, this.L.boardTop + 1, this.L.cell - 2, this.L.board - 2, 6);
    }
    this.ghost.fillStyle(willClear ? 0xffffff : PALETTE[obj.getData("key")].face, willClear ? 0.85 : 0.5);
    for (const [dx, dy] of obj.getData("cells")) {
      const x = this.L.boardLeft + (t.c0 + dx) * this.L.cell;
      const y = this.L.boardTop + (t.r0 + dy) * this.L.cell;
      this.ghost.fillRoundedRect(x + 3, y + 3, this.L.cell - 6, this.L.cell - 6, 6);
    }
  }

  private placePiece(obj: PieceContainer, c0: number, r0: number): void {
    const cells = obj.getData("cells");
    const key = obj.getData("key");
    const blockScale = (this.L.cell - this.L.gap) / TEX;
    let i = 0;
    for (const [dx, dy] of cells) {
      const c = c0 + dx;
      const r = r0 + dy;
      this.grid[r]![c] = key;
      const [x, y] = this.cellXY(c, r);
      const sprite = this.add.image(x, y, `blk_${key}`).setDepth(5).setScale(blockScale * 0.55);
      this.sprites[r]![c] = sprite;
      this.tweens.add({ targets: sprite, scale: blockScale, duration: 170, ease: "Back.easeOut", delay: i * 18 });
      i++;
    }
    this.sfx.place();
    this.addScore(cells.length);
    const slot = obj.getData("slot");
    this.slots[slot] = null;
    this.pieceData[slot] = null;
    obj.destroy();
    this.resolveClears();
    this.resetHint();
    if (this.previewMode) {
      this.previewAdvancePending = true;
      this.autoplayTimer = 10;
      this.time.delayedCall(this.previewPresentation ? 1600 : 1200, () => this.advancePreviewMoment());
      return;
    }
    if (this.slots.every((slotItem) => slotItem === null)) {
      this.dealNewSet();
    }
    else this.checkGameOver();
  }

  private resolveClears(): void {
    const fullRows: number[] = [];
    const fullCols: number[] = [];
    for (let r = 0; r < ROWS; r++) if (this.grid[r]?.every(Boolean)) fullRows.push(r);
    for (let c = 0; c < COLS; c++) {
      let full = true;
      for (let r = 0; r < ROWS; r++) if (!this.grid[r]?.[c]) full = false;
      if (full) fullCols.push(c);
    }
    const lines = fullRows.length + fullCols.length;
    if (lines === 0) {
      if (this.combo > 0 && --this.comboGrace < 0) this.combo = 0;
      this.updateDanger();
      return;
    }
    this.combo++;
    this.comboGrace = 1;
    this.bestComboRun = Math.max(this.bestComboRun, this.combo);
    this.linesRun += lines;
    const set = new Set<number>();
    for (const r of fullRows) for (let c = 0; c < COLS; c++) set.add(r * COLS + c);
    for (const c of fullCols) for (let r = 0; r < ROWS; r++) set.add(r * COLS + c);
    const base = set.size;
    const detonated = this.expandWithSpecials(set);
    this.clearCells([...set].map((idx) => [Math.floor(idx / COLS), idx % COLS] as [number, number]));
    const magnitude = lines + detonated;
    this.cameras.main.shake(150 + magnitude * 80, Math.min(0.014, 0.0035 + magnitude * 0.0026));
    this.sfx.clear(lines + this.combo - 1 + detonated);
    const extra = set.size - base;
    const points = (lines * 10 + (lines - 1) * 10 + extra * 5) * Math.max(1, this.combo);
    this.addScore(points);
    this.celebrate(lines, this.combo, detonated);
    if (!this.previewMode && lines >= 2) this.spawnSpecialAfterClear(lines);
    this.updateDanger();
  }

  private clearCells(list: Array<[number, number]>): void {
    const blockScale = (this.L.cell - this.L.gap) / TEX;
    const shards = list.length > 18 ? 6 : 10;
    for (const [r, c] of list) {
      const sprite = this.sprites[r]?.[c];
      const key = this.grid[r]?.[c];
      this.grid[r]![c] = null;
      this.sprites[r]![c] = null;
      this.special[r]![c] = null;
      const icon = this.iconSprites[r]?.[c];
      this.iconSprites[r]![c] = null;
      if (icon) this.tweens.add({ targets: icon, scale: 0, alpha: 0, duration: 150, onComplete: () => icon.destroy() });
      if (!sprite || !key) continue;
      const cx = sprite.x;
      const cy = sprite.y;
      this.time.delayedCall((c + r) * 16, () => {
        sprite.setTintFill(0xffffff);
        this.tweens.add({
          targets: sprite,
          scaleX: blockScale * 1.3,
          scaleY: blockScale * 1.3,
          duration: 90,
          ease: "Quad.easeOut",
          onComplete: () => {
            sprite.clearTint();
            this.tweens.add({ targets: sprite, scale: 0, alpha: 0, angle: Phaser.Math.Between(-70, 70), duration: 230, ease: "Back.easeIn", onComplete: () => sprite.destroy() });
          },
        });
        this.burst(cx, cy, PALETTE[key].face, shards);
        this.popFlash(cx, cy);
      });
    }
  }

  private specialCells(r: number, c: number, type: SpecialType): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    if (type === "bomb") {
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) out.push([r + dr, c + dc]);
    } else if (type === "cross") {
      for (let i = 0; i < COLS; i++) out.push([r, i]);
      for (let i = 0; i < ROWS; i++) out.push([i, c]);
    } else {
      for (let dr = -1; dr <= 1; dr++) for (let i = 0; i < COLS; i++) out.push([r + dr, i]);
      for (let dc = -1; dc <= 1; dc++) for (let i = 0; i < ROWS; i++) out.push([i, c + dc]);
    }
    return out;
  }

  private expandWithSpecials(set: Set<number>): number {
    let detonated = 0;
    const queue = [...set];
    while (queue.length) {
      const idx = queue.pop()!;
      const r = Math.floor(idx / COLS);
      const c = idx % COLS;
      const type = this.special[r]?.[c];
      if (!type) continue;
      this.special[r]![c] = null;
      detonated++;
      this.detonateFX(r, c, type);
      for (const [rr, cc] of this.specialCells(r, c, type)) {
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
        const next = rr * COLS + cc;
        if (!set.has(next)) {
          set.add(next);
          queue.push(next);
        }
      }
    }
    return detonated;
  }

  private detonateFX(r: number, c: number, type: SpecialType): void {
    const [x, y] = this.cellXY(c, r);
    this.popFlash(x, y);
    this.shockwave(x, y);
    this.burst(x, y, 0xffffff, 16);
    if (type === "cross" || type === "laser") {
      this.lineFlash(this.L.boardLeft, this.L.boardTop + r * this.L.cell, this.L.board, this.L.cell);
      this.lineFlash(this.L.boardLeft + c * this.L.cell, this.L.boardTop, this.L.cell, this.L.board);
    }
    this.sfx.special();
  }

  private placeIcon(r: number, c: number, type: SpecialType): void {
    const [x, y] = this.cellXY(c, r);
    const cont = this.add.container(x, y).setDepth(6);
    cont.add(this.add.image(0, 0, "ring").setScale((this.L.cell * 0.82) / 128).setAlpha(0.55));
    cont.add(this.add.circle(0, 0, this.L.cell * 0.34, 0x0e1f47, 0.6));
    cont.add(this.add.image(0, 0, `sp_${type}`).setScale((this.L.cell * 0.62) / 64));
    this.iconSprites[r]![c] = cont;
    this.tweens.add({ targets: cont, scale: 1.08, duration: 680, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  private makeSpecial(r: number, c: number, type: SpecialType): void {
    this.special[r]![c] = type;
    this.placeIcon(r, c, type);
    const [x, y] = this.cellXY(c, r);
    this.popFlash(x, y);
  }

  private spawnSpecialAfterClear(lines: number): void {
    const survivors: Array<[number, number]> = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (this.grid[r]?.[c] && !this.special[r]?.[c]) survivors.push([r, c]);
    const chosen = survivors[Math.floor(Math.random() * survivors.length)];
    if (!chosen) return;
    this.makeSpecial(chosen[0], chosen[1], lines >= 4 ? "laser" : lines >= 3 ? "cross" : "bomb");
  }

  private overHammer(p: Phaser.Input.Pointer): boolean {
    const h = this.L.hammer;
    return Math.hypot(p.x - h.x, p.y - h.y) <= h.r + 8;
  }

  private async toggleHammer(): Promise<void> {
    if (!this.hammerMode && this.hammers <= 0) {
      const ok = await this.callbacks.showRewarded();
      if (!ok) return;
      this.hammers = 1;
      await this.callbacks.saveHammers(this.hammers);
    }
    this.hammerMode = !this.hammerMode;
    this.drawHammer();
    this.hammerHint.setVisible(this.hammerMode);
  }

  private async useHammer(p: Phaser.Input.Pointer): Promise<void> {
    const c = Math.floor((p.x - this.L.boardLeft) / this.L.cell);
    const r = Math.floor((p.y - this.L.boardTop) / this.L.cell);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || !this.grid[r]?.[c]) return;
    if (this.hammers <= 0) {
      const ok = await this.callbacks.showRewarded();
      if (!ok) return;
      this.hammers = 1;
    }
    this.hammers--;
    this.sfx.hammer();
    const set = new Set([r * COLS + c]);
    this.expandWithSpecials(set);
    this.clearCells([...set].map((i) => [Math.floor(i / COLS), i % COLS] as [number, number]));
    this.cameras.main.shake(140, 0.006);
    this.hammerMode = false;
    this.drawHammer();
    this.updateDanger();
    this.checkGameOver();
    await this.callbacks.saveHammers(this.hammers);
  }

  private updateDanger(): void {
    const danger = this.filledCount() / 64 >= DANGER_FILL;
    if (danger === this.danger) return;
    this.danger = danger;
    this.tweens.killTweensOf(this.vignette);
    if (danger) {
      this.tweens.add({ targets: this.vignette, alpha: 0.8, duration: 420, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.heartTimer = this.time.addEvent({ delay: 900, loop: true, callback: () => this.sfx.heartbeat() });
    } else {
      this.tweens.add({ targets: this.vignette, alpha: 0, duration: 300 });
      this.heartTimer?.remove();
      this.heartTimer = null;
    }
  }

  private resetHint(): void {
    this.clearHint();
    this.hintTimer?.remove();
    if (!this.previewMode && !this.tutorialActive) this.hintTimer = this.time.delayedCall(HINT_IDLE, () => this.showHint());
  }

  private clearHint(): void {
    this.tweens.killTweensOf(this.hintGfx);
    this.hintGfx?.clear();
  }

  private showHint(): void {
    if (this.dragging || this.gameOverActive || this.previewMode || this.tutorialActive) return;
    const move = this.findMove();
    if (move) this.drawHint(move.cells, move.c0, move.r0);
  }

  private drawHint(cells: Array<[number, number]>, c0: number, r0: number): void {
    const g = this.hintGfx;
    g.clear();
    g.fillStyle(0xbfd8ff, 1);
    for (const [dx, dy] of cells) {
      const x = this.L.boardLeft + (c0 + dx) * this.L.cell;
      const y = this.L.boardTop + (r0 + dy) * this.L.cell;
      g.fillRoundedRect(x + 10, y + 10, this.L.cell - 20, this.L.cell - 20, 8);
    }
    g.setAlpha(0);
    this.tweens.add({ targets: g, alpha: 0.3, duration: 950, yoyo: true, repeat: 3, ease: "Sine.easeInOut", onComplete: () => g.clear() });
  }

  private burst(x: number, y: number, color: number, count: number): void {
    const particles = this.add.particles(x, y, "spark", {
      speed: { min: this.L.cell, max: this.L.cell * 3.4 },
      angle: { min: 0, max: 360 },
      scale: { start: this.L.cell / 110, end: 0 },
      alpha: { start: 1, end: 0 },
      rotate: { min: 0, max: 360 },
      lifespan: { min: 350, max: 680 },
      gravityY: this.L.cell * 10,
      tint: color,
      quantity: count,
      emitting: false,
    }).setDepth(60);
    particles.explode(count);
    this.time.delayedCall(820, () => particles.destroy());
  }

  private popFlash(x: number, y: number): void {
    const f = this.add.image(x, y, "pop").setDepth(62).setScale(this.L.cell / 300).setAlpha(0.9).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: f, scale: this.L.cell / 68, alpha: 0, duration: 300, ease: "Quad.easeOut", onComplete: () => f.destroy() });
  }

  private shockwave(x: number, y: number): void {
    const r = this.add.image(x, y, "ring").setDepth(61).setScale(this.L.cell / 320).setAlpha(0.55);
    this.tweens.add({ targets: r, scale: this.L.cell / 40, alpha: 0, duration: 400, ease: "Quad.easeOut", onComplete: () => r.destroy() });
  }

  private lineFlash(x: number, y: number, w: number, h: number): void {
    const fl = this.add.rectangle(x + w / 2, y + h / 2, w - 4, h - 4, 0xfff0a0, 0.58).setDepth(58);
    this.tweens.add({ targets: fl, alpha: 0, duration: 260, ease: "Quad.easeOut", onComplete: () => fl.destroy() });
  }

  private celebrate(lines: number, combo: number, detonated: number, forceLabel = false): void {
    if (lines < 2 && combo < 2 && detonated === 0) return;
    const intensity = (lines >= 2 ? lines - 1 : 0) + (combo >= 2 ? combo - 1 : 0) + detonated;
    const k = Math.min(intensity, 6);
    this.sfx.fanfare();
    const cx = this.L.boardLeft + this.L.board / 2;
    const cy = this.L.boardTop + this.L.board / 2;
    const glow = this.add.image(cx, cy, "glow").setDepth(95).setScale(this.L.cell / 200).setAlpha(0);
    this.tweens.add({ targets: glow, scale: (this.L.cell / 72) * (1 + k * 0.17), alpha: 0.92, duration: 240, ease: "Quad.easeOut", yoyo: true, hold: 360, onComplete: () => glow.destroy() });
    const captureCombo = this.previewMode
      && (this.previewPresentation || this.lastPreviewPayload?.sceneId === "state-combo");
    if ((!this.previewMode || forceLabel || captureCombo) && combo >= 2) {
      const label = `COMBO x${combo}`;
      const txt = this.add.text(cx, cy, label, {
        fontFamily: "ui-rounded, system-ui, sans-serif",
        fontSize: `${Math.round(this.L.cell * (0.72 + k * 0.035))}px`,
        fontStyle: "700",
        color: "#ffe9a8",
        stroke: "#17306f",
        strokeThickness: Math.max(4, this.L.cell * 0.075),
      }).setOrigin(0.5).setScale(0).setDepth(96);
      this.tweens.add({
        targets: txt,
        scale: 1.05 + k * 0.02,
        duration: 240,
        ease: "Back.easeOut",
        onComplete: () => this.time.delayedCall(520, () => this.tweens.add({ targets: txt, scale: 1.5, alpha: 0, duration: 240, ease: "Quad.easeIn", onComplete: () => txt.destroy() })),
      });
    }
    this.burst(cx, cy, 0xffe08a, Math.round(28 + k * 20));
  }

  private addScore(points: number): void {
    this.score += points;
    this.tweens.killTweensOf(this);
    this.tweens.add({
      targets: this,
      shownScore: this.score,
      duration: 300,
      ease: "Quad.easeOut",
      onUpdate: () => this.scoreText.setText(formatScore(this.shownScore)),
    });
    if (points > 0) this.tweens.add({ targets: this.scoreText, scale: 1.16, duration: 130, yoyo: true, ease: "Quad.easeOut" });
    if (this.score > this.best) {
      this.best = this.score;
      this.syncBestText();
      if (!this.previewMode) localStorage.setItem("block_burst_best", String(this.best));
    }
  }

  private pieceFitsAnywhere(cells: Array<[number, number]>): boolean {
    for (let r0 = 0; r0 < ROWS; r0++) {
      for (let c0 = 0; c0 < COLS; c0++) {
        if (this.canPlace(cells, c0, r0)) return true;
      }
    }
    return false;
  }

  private canPlace(cells: Array<[number, number]>, c0: number, r0: number): boolean {
    for (const [dx, dy] of cells) {
      const c = c0 + dx;
      const r = r0 + dy;
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS || this.grid[r]?.[c]) return false;
    }
    return true;
  }

  private findMove(): { slot: number; cells: Array<[number, number]>; c0: number; r0: number } | null {
    for (let slot = 0; slot < this.slots.length; slot++) {
      const data = this.pieceData[slot];
      if (!data) continue;
      for (let r0 = 0; r0 < ROWS; r0++) for (let c0 = 0; c0 < COLS; c0++) if (this.canPlace(data.cells, c0, r0)) return { slot, cells: data.cells, c0, r0 };
    }
    return null;
  }

  private checkGameOver(): void {
    if (this.slots.some((slot) => slot && this.pieceFitsAnywhere(slot.getData("cells")))) return;
    if (!this.previewMode && this.best > 0) localStorage.setItem("block_burst_best", String(this.best));
    if (!this.previewMode) void this.callbacks.submitScore(this.score);
    this.clearHint();
    this.hintTimer?.remove();
    this.sfx.gameover();
    this.showGameOver();
  }

  private showGameOver(forcePreview = false): void {
    this.gameOverActive = true;
    if (this.previewMode && !forcePreview) {
      this.time.delayedCall(260, () => this.restartAfterInterstitial());
      return;
    }
    this.goButtons = [];
    const u = this.L.cell;
    const panelWidth = Math.min(this.L.dw - this.L.pad * 2, u * 6.7);
    const panelHeight = u * 8.2;
    const panelCenterY = this.L.dh / 2 + u * 0.14;
    const buttonWidth = panelWidth - u * 0.78;
    const buttonHeight = u * 1.18;
    const overlay = this.add.rectangle(this.L.dw / 2, this.L.dh / 2, this.L.dw, this.L.dh, 0x070711, 0).setDepth(200);
    this.overlayObjects.push(overlay);
    this.tweens.add({ targets: overlay, fillAlpha: 0.78, duration: 300 });
    const panel = this.add.container(this.L.dw / 2, panelCenterY).setDepth(201).setScale(0.6).setAlpha(0);
    this.overlayObjects.push(panel);

    const chrome = this.add.graphics();
    const panelRadius = u * 0.28;
    chrome.fillStyle(0x000000, 0.48);
    chrome.fillRoundedRect(-panelWidth / 2 + u * 0.08, -panelHeight / 2 + u * 0.14, panelWidth, panelHeight, panelRadius);
    chrome.fillStyle(0x121018, 0.98);
    chrome.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, panelRadius);
    chrome.lineStyle(Math.max(4, u * 0.09), 0x06070d, 1);
    chrome.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, panelRadius);
    chrome.lineStyle(Math.max(1, u * 0.035), 0xc8cad5, 0.72);
    chrome.strokeRoundedRect(-panelWidth / 2 + u * 0.06, -panelHeight / 2 + u * 0.06, panelWidth - u * 0.12, panelHeight - u * 0.12, panelRadius * 0.78);
    chrome.lineStyle(Math.max(1, u * 0.035), 0xf08b75, 0.88);
    chrome.lineBetween(-panelWidth / 2 + panelRadius, -panelHeight / 2 + u * 0.06, -panelWidth * 0.12, -panelHeight / 2 + u * 0.06);
    chrome.lineStyle(Math.max(1, u * 0.035), 0x8b79df, 0.82);
    chrome.lineBetween(-panelWidth * 0.12, -panelHeight / 2 + u * 0.06, panelWidth * 0.22, -panelHeight / 2 + u * 0.06);
    chrome.lineStyle(Math.max(1, u * 0.035), 0x62d6de, 0.9);
    chrome.lineBetween(panelWidth * 0.22, -panelHeight / 2 + u * 0.06, panelWidth / 2 - panelRadius, -panelHeight / 2 + u * 0.06);
    panel.add(chrome);

    const roundedFont = 'ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif';
    const title = this.add.text(0, -u * 2.7, "NO MORE MOVES", {
      fontFamily: roundedFont,
      fontSize: `${Math.round(u * 0.62)}px`,
      fontStyle: "700",
      color: "#ffffff",
    }).setOrigin(0.5).setShadow(0, u * 0.07, "#000000", u * 0.1, false, true);
    const score = this.add.text(0, -u * 1.68, formatScore(this.score), {
      fontFamily: roundedFont,
      fontSize: `${Math.round(u * 1.34)}px`,
      fontStyle: "700",
      color: "#ffffff",
    }).setOrigin(0.5).setShadow(0, u * 0.1, "#000000", u * 0.14, false, true);
    const isNewBest = this.score > this.runStartingBest;
    const best = this.add.text(0, -u * 0.55, `${isNewBest ? "NEW BEST" : "BEST"}  ${formatScore(this.best)}`, {
      fontFamily: roundedFont,
      fontSize: `${Math.round(u * 0.37)}px`,
      fontStyle: "700",
      color: isNewBest ? "#ffd24d" : "#bfc0c6",
    }).setOrigin(0.5);
    panel.add([title, score, best]);

    const addDivider = (y: number): void => {
      const divider = this.add.graphics();
      const half = buttonWidth / 2;
      divider.lineStyle(Math.max(1, u * 0.025), 0x777480, 0.62);
      divider.lineBetween(-half, y, half, y);
      divider.lineStyle(Math.max(1, u * 0.025), 0xf07468, 0.9);
      divider.lineBetween(-u * 0.72, y, -u * 0.18, y);
      divider.lineStyle(Math.max(1, u * 0.025), 0xf3c148, 0.95);
      divider.lineBetween(-u * 0.18, y, u * 0.16, y);
      divider.lineStyle(Math.max(1, u * 0.025), 0x67d7d9, 0.9);
      divider.lineBetween(u * 0.16, y, u * 0.72, y);
      panel.add(divider);
    };
    addDivider(-u * 0.12);

    const statY = u * 0.48;
    const statStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: roundedFont,
      fontSize: `${Math.round(u * 0.306)}px`,
      fontStyle: "700",
      color: "#d7d7dc",
    };
    const linesStat = this.add.text(-buttonWidth / 4, statY, `${this.linesRun} LINES`, statStyle).setOrigin(0.5);
    const comboStat = this.add.text(buttonWidth / 4, statY, `TOP COMBO x${this.bestComboRun}`, statStyle).setOrigin(0.5);
    const statRule = this.add.graphics();
    statRule.lineStyle(Math.max(1, u * 0.025), 0x777480, 0.62);
    statRule.lineBetween(0, statY - u * 0.42, 0, statY + u * 0.42);
    panel.add([linesStat, comboStat, statRule]);
    addDivider(u * 1.08);

    const addBtn = (
      ly: number,
      label: string,
      fillColor: number,
      borderColor: number,
      labelColor: string,
      action: () => void,
      rewardedIcon = false,
      initiallyEnabled = true,
    ): { setEnabled: (enabled: boolean) => void } => {
      const labelText = this.add.text(0, 0, label, {
        fontFamily: roundedFont,
        fontSize: `${Math.round(u * 0.48)}px`,
        fontStyle: "700",
        color: labelColor,
      }).setOrigin(0.5);
      const iconWidth = rewardedIcon ? u * 0.62 : 0;
      const iconGap = rewardedIcon ? u * 0.22 : 0;
      const contentWidth = labelText.width + iconGap + iconWidth;
      const btn = this.add.container(0, ly);
      const bg = this.add.graphics();
      const buttonRadius = u * 0.12;
      btn.add([bg, labelText]);
      let icon: Phaser.GameObjects.Graphics | null = null;
      if (rewardedIcon) {
        labelText.x = -(iconWidth + iconGap) / 2;
        icon = this.add.graphics();
        const iconX = contentWidth / 2 - iconWidth / 2;
        const iconHeight = iconWidth * 0.68;
        icon.lineStyle(Math.max(2, u * 0.055), 0xffffff, 0.94);
        icon.strokeRoundedRect(iconX - iconWidth / 2, -iconHeight / 2, iconWidth, iconHeight, iconHeight * 0.18);
        icon.fillStyle(0xffffff, 0.94);
        icon.fillTriangle(
          iconX - iconWidth * 0.1,
          -iconHeight * 0.24,
          iconX - iconWidth * 0.1,
          iconHeight * 0.24,
          iconX + iconWidth * 0.22,
          0,
        );
        btn.add(icon);
      }
      btn.setSize(buttonWidth, buttonHeight);
      panel.add(btn);
      const hit = { cx: this.L.dw / 2, cy: panelCenterY + ly, hw: buttonWidth / 2 + 8, hh: buttonHeight / 2 + 8, enabled: initiallyEnabled, action };
      this.goButtons.push(hit);
      const setEnabled = (enabled: boolean): void => {
        hit.enabled = enabled;
        bg.clear();
        bg.fillStyle(enabled ? fillColor : 0x343640, 1);
        bg.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
        bg.lineStyle(Math.max(1, u * 0.03), enabled ? borderColor : 0x50525d, 1);
        bg.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
        labelText.setColor(enabled ? labelColor : "#858792");
        icon?.setAlpha(enabled ? 1 : 0.38);
      };
      setEnabled(initiallyEnabled);
      return { setEnabled };
    };
    const reviveUnused = this.revivesUsed < REVIVES_PER_GAME;
    const previewReviveEnabled = this.previewMode && this.lastPreviewPayload?.sceneId !== "result-overlay-disabled";
    const reviveButton = addBtn(
      u * 1.88,
      "REVIVE",
      0x19b956,
      0x087d38,
      "#ffffff",
      () => void this.rewardedRevive(),
      true,
      reviveUnused && previewReviveEnabled,
    );
    if (reviveUnused && !this.previewMode) {
      void this.callbacks.prepareRewarded().then((available) => {
        if (this.gameOverActive && this.overlayObjects.includes(panel)) reviveButton.setEnabled(available);
      });
    }
    addBtn(u * 3.3, "PLAY AGAIN", 0xffc62e, 0xd79400, "#1b1710", () => void this.restartAfterInterstitial());
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 340, ease: "Back.easeOut" });
  }

  private handleGameOverTap(p: Phaser.Input.Pointer): void {
    for (const b of this.goButtons) {
      if (b.enabled && Math.abs(p.x - b.cx) <= b.hw && Math.abs(p.y - b.cy) <= b.hh) {
        b.action();
        return;
      }
    }
  }

  private clearOverlay(): void {
    for (const object of this.overlayObjects) object.destroy();
    this.overlayObjects = [];
    this.goButtons = [];
    this.gameOverActive = false;
  }

  private async rewardedRevive(): Promise<void> {
    if (this.rewardedRevivePending || !this.gameOverActive || this.revivesUsed >= REVIVES_PER_GAME) return;
    this.rewardedRevivePending = true;
    try {
      const ok = await this.callbacks.showRewarded();
      if (ok && this.gameOverActive) this.revive();
    } catch (error) {
      console.warn("[block-burst] rewarded revive failed", error);
    } finally {
      this.rewardedRevivePending = false;
    }
  }

  private revive(): void {
    this.clearOverlay();
    this.revivesUsed++;
    for (let i = 0; i < 3; i++) {
      this.slots[i]?.destroy();
      this.slots[i] = null;
      this.pieceData[i] = null;
    }
    const cleared = new Set<number>();
    while (this.filledCount() - cleared.size > 24) {
      let bestCount = 0;
      let bestKind: "r" | "c" = "r";
      let bestIndex = 0;
      for (let r = 0; r < ROWS; r++) {
        let count = 0;
        for (let c = 0; c < COLS; c++) if (this.grid[r]?.[c] && !cleared.has(r * COLS + c)) count++;
        if (count > bestCount) { bestCount = count; bestKind = "r"; bestIndex = r; }
      }
      for (let c = 0; c < COLS; c++) {
        let count = 0;
        for (let r = 0; r < ROWS; r++) if (this.grid[r]?.[c] && !cleared.has(r * COLS + c)) count++;
        if (count > bestCount) { bestCount = count; bestKind = "c"; bestIndex = c; }
      }
      if (bestCount === 0) break;
      if (bestKind === "r") for (let c = 0; c < COLS; c++) if (this.grid[bestIndex]?.[c]) cleared.add(bestIndex * COLS + c);
      else for (let r = 0; r < ROWS; r++) if (this.grid[r]?.[bestIndex]) cleared.add(r * COLS + bestIndex);
    }
    this.clearCells([...cleared].map((i) => [Math.floor(i / COLS), i % COLS] as [number, number]));
    this.cameras.main.shake(300, 0.01);
    this.sfx.fanfare();
    this.updateDanger();
    this.time.delayedCall(320, () => this.dealNewSet());
  }

  private async restartAfterInterstitial(): Promise<void> {
    if (this.interstitialPending) return;
    this.interstitialPending = true;
    if (this.previewMode) {
      this.interstitialPending = false;
      await this.preparePreview(this.lastPreviewPayload ?? { active: true, audioPolicy: "sfx-only", surface: "mobile-portrait" });
      return;
    }
    try {
      await this.callbacks.showInterstitial();
    } finally {
      this.scene.restart();
    }
  }

  private setupPreviewMoment(): void {
    this.resetRun();
    this.score = 12480 + this.previewStep * 1840;
    this.shownScore = this.score;
    this.scoreText.setText(formatScore(this.score));
    this.best = Math.max(this.best, 18950);
    this.syncBestText();
    if (this.previewPresentation) {
      this.combo = this.previewStep;
      this.comboGrace = 1;
      this.bestComboRun = this.previewStep;
    }
    this.layout();
    this.applyLayout();
    this.seedPreviewBoard(this.previewStep);
    this.dealPreviewSet(this.previewStep);
    this.previewAdvancePending = false;
    this.previewMoveActive = false;
    this.autoplayTimer = this.previewPresentation ? 0.72 : this.previewStep === 0 ? 0.36 : 0.28;
    this.setPreviewHud(this.previewPresentation);
  }

  private advancePreviewMoment(): void {
    if (!this.previewMode) return;
    this.previewStep = (this.previewStep + 1) % 3;
    if (!this.previewPresentation) {
      this.setupPreviewMoment();
      return;
    }
    this.cameras.main.fadeOut(180, 17, 14, 22);
    this.time.delayedCall(190, () => {
      this.setupPreviewMoment();
      this.cameras.main.fadeIn(240, 17, 14, 22);
    });
  }

  private seedPreviewBoard(step: number): void {
    const fillRow = (r: number, except: number[], offset: number): void => {
      for (let c = 0; c < COLS; c++) if (!except.includes(c)) this.addPreviewBlock(c, r, this.previewColor(c, r, offset));
    };
    const fillCol = (c: number, except: number[], offset: number): void => {
      for (let r = 0; r < ROWS; r++) if (!except.includes(r)) this.addPreviewBlock(c, r, this.previewColor(c, r, offset));
    };
    const sprinkle = (cells: Array<[number, number]>, offset: number): void => {
      for (const [c, r] of cells) this.addPreviewBlock(c, r, this.previewColor(c, r, offset));
    };

    if (step % 3 === 0) {
      fillRow(5, [3, 4], 0);
      fillRow(6, [3, 4], 1);
      fillCol(3, [5, 6], 2);
      fillCol(4, [5, 6], 3);
      sprinkle([[0, 0], [1, 0], [6, 0], [7, 0], [0, 2], [2, 2], [5, 2], [7, 2], [1, 7], [6, 7]], 4);
      sprinkle([[0, 1], [7, 1], [0, 4], [7, 4]], 5);
      return;
    }

    if (step % 3 === 1) {
      fillRow(3, [2, 3, 4, 5], 2);
      fillRow(4, [0, 1, 6, 7], 3);
      fillCol(1, [4, 5], 4);
      fillCol(6, [1, 2, 6], 5);
      sprinkle([[0, 0], [2, 0], [5, 0], [7, 0], [0, 6], [2, 6], [5, 6], [7, 6], [3, 7], [4, 7]], 6);
      return;
    }

    fillCol(6, [2, 3, 4, 5], 1);
    fillRow(1, [0, 2], 2);
    fillRow(6, [3, 4], 3);
    fillCol(2, [0, 1, 7], 4);
    sprinkle([[0, 0], [4, 0], [5, 0], [7, 0], [0, 3], [3, 3], [4, 3], [1, 5], [3, 5], [5, 5], [0, 7], [7, 7]], 5);
  }

  private dealPreviewSet(step: number): void {
    for (let i = 0; i < 3; i++) {
      this.slots[i]?.destroy();
      const active = i === 1;
      const data = active ? this.previewPieceForStep(step) : this.previewDecoyPiece(step, i);
      this.pieceData[i] = data;
      this.buildTrayPiece(i, data, true);
    }
  }

  private previewPieceForStep(step: number): PieceData {
    if (step % 3 === 0) {
      return { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], cols: 2, rows: 2, n: 4, tier: 1, key: "red", previewTarget: { c0: 3, r0: 5 } };
    }
    if (step % 3 === 1) {
      return { ...TUTORIAL_PIECE, previewTarget: TUTORIAL_TARGET };
    }
    return { cells: [[0, 0], [0, 1], [0, 2], [0, 3]], cols: 1, rows: 4, n: 4, tier: 1, key: "purple", previewTarget: { c0: 6, r0: 2 } };
  }

  private previewDecoyPiece(step: number, slot: number): PieceData {
    const colors: ColorKey[] = ["teal", "green", "orange", "blue"];
    const key = colors[(step + slot) % colors.length] ?? "teal";
    if ((step + slot) % 2 === 0) return { cells: [[0, 0], [1, 0], [0, 1]], cols: 2, rows: 2, n: 3, tier: 0, key };
    return { cells: [[0, 0], [1, 0], [2, 0]], cols: 3, rows: 1, n: 3, tier: 0, key };
  }

  private addPreviewBlock(c: number, r: number, key: ColorKey): void {
    this.sprites[r]?.[c]?.destroy();
    this.iconSprites[r]?.[c]?.destroy();
    this.special[r]![c] = null;
    this.iconSprites[r]![c] = null;
    this.grid[r]![c] = key;
    const [x, y] = this.cellXY(c, r);
    this.sprites[r]![c] = this.add.image(x, y, `blk_${key}`).setDepth(5).setScale((this.L.cell - this.L.gap) / TEX);
  }

  private previewColor(c: number, r: number, offset: number): ColorKey {
    const palette: ColorKey[] = ["green", "yellow", "orange", "red", "purple", "blue", "teal"];
    return palette[(c * 3 + r * 5 + offset) % palette.length] ?? "blue";
  }

  private autoplayMove(time = this.time.now): void {
    const move = this.previewMode ? this.findPreviewMove() : this.findMove();
    if (!move) {
      this.checkGameOver();
      return;
    }
    const obj = this.slots[move.slot];
    if (!obj) return;
    if (this.previewPresentation) {
      this.startPreviewGesture(obj, move, time);
      return;
    }
    this.previewMoveActive = true;
    if (this.previewMode) this.previewTargetFlash(move.cells, move.c0, move.r0);
    obj.setDepth(50);
    this.tweens.add({
      targets: obj,
      x: this.L.boardLeft + (move.c0 + obj.getData("cols") / 2) * this.L.cell,
      y: this.L.boardTop + (move.r0 + obj.getData("rows") / 2) * this.L.cell,
      scale: 1,
      duration: 260,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.placePiece(obj, move.c0, move.r0);
        this.previewMoveActive = false;
        this.autoplayTimer = 0.56;
      },
    });
  }

  private startPreviewGesture(
    obj: PieceContainer,
    move: { slot: number; cells: Array<[number, number]>; c0: number; r0: number },
    time: number,
  ): void {
    const targetX = this.L.boardLeft + (move.c0 + obj.getData("cols") / 2) * this.L.cell;
    const targetY = this.L.boardTop + (move.r0 + obj.getData("rows") / 2) * this.L.cell;
    this.previewMoveActive = true;
    this.previewGesture = {
      obj,
      move,
      startedAt: time,
      originX: obj.x,
      originY: obj.y,
      targetX,
      targetY,
      lift: this.L.cell * 0.42,
      committed: false,
    };
    obj.setDepth(50);
    this.previewTargetFlash(move.cells, move.c0, move.r0);
    this.sfx.pick();
    this.updatePreviewGesture(time);
  }

  private updatePreviewGesture(time: number): void {
    const gesture = this.previewGesture;
    if (!gesture) return;
    const frame = calculatePreviewGestureFrame(time - gesture.startedAt);
    const dragProgress = frame.dragProgress;
    const handX = lerp(gesture.originX, gesture.targetX, dragProgress);
    const handY = lerp(gesture.originY, gesture.targetY + gesture.lift, dragProgress);
    const ringSize = this.L.cell * 0.32;
    const ringScale = 1 + frame.releaseProgress * 1.35;
    this.updatePreviewGuide(
      handX,
      handY,
      this.L.cell * 1.55,
      ringSize,
      frame.handScale,
      ringScale,
      frame.handOpacity,
    );

    if (!gesture.committed && gesture.obj.active) {
      if (frame.phase === "drag" || frame.phase === "release" || frame.phase === "complete") {
        gesture.obj.setPosition(
          lerp(gesture.originX, gesture.targetX, dragProgress),
          lerp(gesture.originY - gesture.lift, gesture.targetY, dragProgress),
        );
      } else {
        gesture.obj.setPosition(gesture.originX, gesture.originY - gesture.lift * frame.liftProgress);
      }
      gesture.obj.setScale(lerp(TRAY_SCALE, 1, Math.max(frame.liftProgress, dragProgress)));
    }

    if (!gesture.committed && (frame.phase === "release" || frame.complete)) {
      gesture.committed = true;
      this.placePiece(gesture.obj, gesture.move.c0, gesture.move.r0);
    }

    if (frame.complete) this.stopPreviewGesture();
  }

  private updatePreviewGuide(
    x: number,
    y: number,
    handWidth: number,
    ringSize: number,
    handScale: number,
    ringScale: number,
    opacity: number,
  ): void {
    const canvasBounds = this.game.canvas.getBoundingClientRect();
    const scaleX = canvasBounds.width / this.L.dw;
    const scaleY = canvasBounds.height / this.L.dh;
    const visible = opacity > 0.001;
    this.previewGuide.classList.toggle("on", visible);
    this.previewGuide.style.opacity = String(opacity);
    this.previewGuide.style.left = `${canvasBounds.left + x * scaleX}px`;
    this.previewGuide.style.top = `${canvasBounds.top + y * scaleY}px`;
    const handWidthCss = handWidth * scaleX;
    this.previewGuide.style.width = `${handWidthCss}px`;
    this.previewGuide.style.height = `${handWidthCss}px`;
    this.previewGuideHand.style.width = `${handWidthCss}px`;
    this.previewGuideHand.style.transform = `translate(-37%, -10%) scale(${handScale})`;
    this.previewGuideRing.style.width = `${ringSize * scaleX}px`;
    this.previewGuideRing.style.height = `${ringSize * scaleY}px`;
    this.previewGuideRing.style.transform = `translate(-50%, -50%) scale(${ringScale})`;
  }

  private stopPreviewGesture(): void {
    this.previewGesture = null;
    this.previewMoveActive = false;
    this.hidePreviewGuide();
  }

  private hidePreviewGuide(): void {
    this.previewGuide?.classList.remove("on");
    if (this.previewGuide) this.previewGuide.style.opacity = "0";
  }

  private isPreviewPresentationScene(sceneId?: string): boolean {
    return !sceneId || sceneId === "sdk-preview" || sceneId === "preview" || sceneId.startsWith("listing-");
  }

  private findPreviewMove(): { slot: number; cells: Array<[number, number]>; c0: number; r0: number } | null {
    for (let slot = 0; slot < this.pieceData.length; slot++) {
      const data = this.pieceData[slot];
      const target = data?.previewTarget;
      if (!data || !target || !this.slots[slot]) continue;
      if (this.canPlace(data.cells, target.c0, target.r0)) return { slot, cells: data.cells, c0: target.c0, r0: target.r0 };
    }
    return null;
  }

  private previewTargetFlash(cells: Array<[number, number]>, c0: number, r0: number): void {
    const g = this.hintGfx;
    g.clear();
    g.fillStyle(0xfff0a0, 0.3);
    for (const [dx, dy] of cells) {
      const x = this.L.boardLeft + (c0 + dx) * this.L.cell;
      const y = this.L.boardTop + (r0 + dy) * this.L.cell;
      g.fillRoundedRect(x + 4, y + 4, this.L.cell - 8, this.L.cell - 8, Math.max(8, this.L.cell * 0.1));
    }
    g.setAlpha(0.25);
    this.tweens.add({
      targets: g,
      alpha: 0.66,
      duration: this.previewPresentation ? 450 : 180,
      yoyo: true,
      repeat: 1,
      ease: "Sine.easeInOut",
      onComplete: () => g.clear(),
    });
  }
}
