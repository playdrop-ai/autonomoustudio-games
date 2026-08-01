import Phaser from "phaser";
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
  PRAISE,
  REVIVE_FREE,
  ROWS,
  TEX,
  TRAY_SCALE,
  type ColorKey,
  type PieceDef,
} from "./constants";
import { clamp01, hexStr, lerp, mix, mul } from "./color";
import { Sfx } from "./sfx";

type SpecialType = "bomb" | "cross" | "laser";
type Cell = ColorKey | null;

export interface BlockBurstCallbacks {
  initialHammers: number;
  saveHammers: (hammers: number) => Promise<void>;
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
  landscape: boolean;
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

export class BlockBurstScene extends Phaser.Scene {
  private readonly callbacks: BlockBurstCallbacks;
  private readonly sfx = new Sfx();

  private score = 0;
  private shownScore = 0;
  private combo = 0;
  private comboGrace = 0;
  private revivesUsed = 0;
  private best = 0;
  private prevBest = 0;
  private newBestFired = false;
  private hammers = HAMMER_START;
  private hammerMode = false;
  private linesRun = 0;
  private bestComboRun = 0;
  private danger = false;
  private previewMode = false;
  private lastPreviewPayload: PreviewPayload | null = null;
  private autoplayTimer = 0;
  private previewMoveActive = false;
  private previewAdvancePending = false;
  private previewStep = 0;
  private interstitialPending = false;

  private grid: Cell[][] = [];
  private sprites: Array<Array<Phaser.GameObjects.Image | null>> = [];
  private special: Array<Array<SpecialType | null>> = [];
  private iconSprites: Array<Array<Phaser.GameObjects.Container | null>> = [];
  private slots: Array<PieceContainer | null> = [null, null, null];
  private pieceData: Array<PieceData | null> = [null, null, null];

  private L!: Layout;
  private bg!: Phaser.GameObjects.Image;
  private boardGfx!: Phaser.GameObjects.Graphics;
  private vignette!: Phaser.GameObjects.Image;
  private ghost!: Phaser.GameObjects.Graphics;
  private hintGfx!: Phaser.GameObjects.Graphics;
  private hammerGfx!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private hammerGlyph!: Phaser.GameObjects.Text;
  private hammerCount!: Phaser.GameObjects.Text;
  private hammerHint!: Phaser.GameObjects.Text;
  private previewBadge!: Phaser.GameObjects.Text;
  private dragging: PieceContainer | null = null;
  private dragPointerId = -1;
  private dropTarget: { c0: number; r0: number; valid: boolean } | null = null;
  private hintTimer: Phaser.Time.TimerEvent | null = null;
  private heartTimer: Phaser.Time.TimerEvent | null = null;
  private onboarding: Phaser.GameObjects.GameObject[] | null = null;
  private gameOverActive = false;
  private overlayObjects: Phaser.GameObjects.GameObject[] = [];
  private goButtons: Array<{ cx: number; cy: number; hw: number; hh: number; action: () => void }> = [];
  private ready = false;
  private readyResolve!: () => void;
  private readonly readyPromise = new Promise<void>((resolve) => {
    this.readyResolve = resolve;
  });

  constructor(callbacks: BlockBurstCallbacks) {
    super("block-burst");
    this.callbacks = callbacks;
    this.hammers = callbacks.initialHammers;
  }

  create(): void {
    this.best = Number(localStorage.getItem("block_burst_best") ?? 0);
    this.prevBest = this.best;
    this.resetBoard();
    this.layout();
    this.makeTextures();

    this.bg = this.add.image(0, 0, "bg").setOrigin(0, 0).setDepth(0);
    this.boardGfx = this.add.graphics().setDepth(1);
    this.vignette = this.add.image(0, 0, "vignette").setOrigin(0, 0).setDepth(3).setAlpha(0);
    this.ghost = this.add.graphics().setDepth(4);
    this.hintGfx = this.add.graphics().setDepth(4);
    this.hammerGfx = this.add.graphics().setDepth(20);
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

    this.dealNewSet();
    this.resetHint();
    this.showOnboarding();
    this.ready = true;
    this.readyResolve();
  }

  override update(_time: number, delta: number): void {
    if (!this.previewMode || this.gameOverActive || this.previewMoveActive || this.previewAdvancePending) return;
    this.autoplayTimer -= delta / 1000;
    if (this.autoplayTimer <= 0) {
      this.autoplayMove();
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
      this.previewMode = false;
      this.lastPreviewPayload = null;
      this.previewMoveActive = false;
      this.setPreviewHud(false);
      this.scene.restart();
      return;
    }
    this.previewMode = true;
    this.lastPreviewPayload = { ...payload, active: true };
    this.previewMoveActive = false;
    this.previewAdvancePending = false;
    this.previewStep = 0;
    this.setPreviewHud(true);
    this.sfx.muted = payload?.audioPolicy === "silent";
    this.dismissOnboarding();
    this.clearOverlay();
    this.layout();
    this.applyLayout();
    this.setupPreviewMoment();
  }

  startAudioCapture(): void {
    this.sfx.startCapture();
  }

  async stopAudioCapture(): Promise<{ mimeType: string; base64: string }> {
    return this.sfx.stopCapture();
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
    this.scoreText?.setText("0");
    this.syncBestText();
    this.drawHammer();
    this.gameOverActive = false;
    this.interstitialPending = false;
  }

  private layout(): void {
    const dw = this.scale.width;
    const dh = this.scale.height;
    const landscape = dw > dh * 1.15;
    const pad = Math.round(Math.min(dw, dh) * 0.035);
    const safeTop = Math.max(pad, Math.round(dh * (landscape ? 0.045 : 0.075)));
    const safeBottom = Math.max(pad, Math.round(dh * (landscape ? 0.055 : 0.08)));
    let cell: number;
    let boardLeft: number;
    let boardTop: number;
    let slotPos: Array<{ x: number; y: number }>;
    let scorePos: { x: number; y: number };
    let bestPos: { x: number; y: number };

    if (!landscape) {
      const topBand = Math.max(dh * (this.previewMode ? 0.075 : 0.13), safeTop + dh * 0.02);
      const trayReserve = dh * (this.previewMode ? 0.18 : 0.22);
      const availH = dh - topBand - safeBottom - trayReserve;
      const availW = dw * (this.previewMode ? 0.82 : 0.92);
      cell = Math.floor(Math.min(availW, availH) / 8);
      const board = cell * 8;
      boardLeft = Math.round((dw - board) / 2);
      boardTop = Math.round(topBand + Math.max(0, (availH - board) * (this.previewMode ? 0.18 : 0.5)));
      const below = Math.max(0, dh - safeBottom - (boardTop + board));
      const trayY = Math.min(dh - safeBottom - cell * 1.25, boardTop + board + below * (this.previewMode ? 0.48 : 0.56));
      const spread = Math.min(board * 0.72, dw * 0.84);
      slotPos = [{ x: dw / 2 - spread / 2, y: trayY }, { x: dw / 2, y: trayY }, { x: dw / 2 + spread / 2, y: trayY }];
      scorePos = { x: dw / 2, y: safeTop + cell * 0.48 };
      bestPos = { x: pad, y: safeTop + cell * 0.46 };
    } else if (this.previewMode) {
      const availH = dh - safeTop - safeBottom;
      const availW = dw - pad * 2;
      cell = Math.floor(Math.min(availH * 0.76, availW * 0.58) / 8);
      const board = cell * 8;
      boardTop = Math.round(safeTop + availH * 0.04);
      boardLeft = Math.round(pad + Math.max(0, (availW * 0.62 - board) / 2));
      const rightCx = Math.round(boardLeft + board + (dw - (boardLeft + board)) * 0.5);
      const spread = Math.min(board * 0.62, availH * 0.64);
      slotPos = [{ x: rightCx, y: boardTop + board / 2 - spread / 2 }, { x: rightCx, y: boardTop + board / 2 }, { x: rightCx, y: boardTop + board / 2 + spread / 2 }];
      scorePos = { x: boardLeft + board / 2, y: safeTop + cell * 0.52 };
      bestPos = { x: pad, y: safeTop + cell * 0.5 };
    } else {
      const topBand = Math.max(dh * 0.12, safeTop + dh * 0.04);
      const availH = dh - topBand - safeBottom;
      cell = Math.floor(Math.min(availH * 0.62, dw * 0.3) / 8);
      const board = cell * 8;
      boardTop = Math.round(topBand + Math.max(0, (availH - board) * 0.25));
      boardLeft = Math.round((dw * 0.66 - board) / 2 + dw * 0.02);
      const rightCx = (boardLeft + board + dw) / 2;
      const spread = Math.min(board * 0.72, (dh - safeTop - safeBottom) * 0.7);
      slotPos = [{ x: rightCx, y: boardTop + board / 2 - spread / 2 }, { x: rightCx, y: boardTop + board / 2 }, { x: rightCx, y: boardTop + board / 2 + spread / 2 }];
      scorePos = { x: boardLeft + board / 2, y: safeTop + cell * 0.52 };
      bestPos = { x: pad, y: safeTop + cell * 0.5 };
    }

    const board = cell * 8;
    this.L = {
      landscape,
      dw,
      dh,
      cell,
      gap: Math.max(2, Math.round(cell * 0.05)),
      board,
      boardLeft,
      boardTop,
      slotPos,
      scorePos,
      bestPos,
      lift: cell * 1.35,
      grabSlop: cell * 0.95,
      fScore: Math.round(cell * 1.2),
      fBest: Math.round(cell * 0.4),
      fHud: Math.round(cell * 0.5),
      fHint: Math.round(cell * 0.42),
      pad,
      safeTop,
      safeBottom,
      hammer: { x: dw - pad - cell * 0.55, y: safeTop + cell * 0.55, r: cell * 0.55 },
    };
  }

  private cellXY(c: number, r: number): [number, number] {
    return [this.L.boardLeft + c * this.L.cell + this.L.cell / 2, this.L.boardTop + r * this.L.cell + this.L.cell / 2];
  }

  private applyLayout(): void {
    const L = this.L;
    this.bg?.setDisplaySize(L.dw, L.dh);
    this.vignette?.setDisplaySize(L.dw, L.dh);
    this.drawBoard();
    this.scoreText?.setPosition(L.scorePos.x, L.scorePos.y).setFontSize(L.fScore);
    this.bestText?.setPosition(L.bestPos.x, L.bestPos.y).setFontSize(L.fBest);
    this.hammerHint?.setPosition(L.boardLeft + L.board / 2, L.boardTop + L.board + (L.dh - (L.boardTop + L.board)) * 0.16).setFontSize(L.fHint);
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
    g.clear();
    g.fillStyle(0x0a1538, 1);
    g.fillRoundedRect(L.boardLeft - 5, L.boardTop - 5, L.board + 10, L.board + 10, 10);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        g.fillStyle(0x172657, 1);
        g.fillRoundedRect(L.boardLeft + c * L.cell + 2, L.boardTop + r * L.cell + 2, L.cell - 4, L.cell - 4, Math.max(3, L.cell * 0.06));
      }
    }
  }

  private drawHammer(): void {
    if (!this.hammerGfx || !this.hammerGlyph || !this.hammerCount) return;
    const h = this.L.hammer;
    this.hammerGfx.clear();
    if (this.previewMode) {
      this.hammerGfx.setVisible(false);
      this.hammerGlyph.setVisible(false);
      this.hammerCount.setVisible(false);
      this.hammerHint.setVisible(false);
      return;
    }
    this.hammerGfx.setVisible(true);
    this.hammerGlyph.setVisible(true);
    this.hammerCount.setVisible(true);
    this.hammerGfx.fillStyle(0x1b2c5e, 1);
    this.hammerGfx.fillCircle(h.x, h.y, h.r);
    this.hammerGfx.lineStyle(Math.max(3, h.r * 0.09), this.hammerMode ? 0xffd24d : 0x33457f, 1);
    this.hammerGfx.strokeCircle(h.x, h.y, h.r);
    this.hammerGlyph
      .setVisible(true)
      .setText("🔨")
      .setPosition(h.x, h.y - h.r * 0.08)
      .setFontSize(Math.round(h.r * 1.32));
    this.hammerCount.setPosition(h.x + h.r * 0.64, h.y + h.r * 0.5).setFontSize(Math.round(h.r * 0.62)).setText(String(this.hammers));
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
    mk("bg", 360, 640, (ctx) => {
      const lin = ctx.createLinearGradient(0, 0, 0, 640);
      lin.addColorStop(0, "#5575df");
      lin.addColorStop(0.55, "#3554bf");
      lin.addColorStop(1, "#233993");
      ctx.fillStyle = lin;
      ctx.fillRect(0, 0, 360, 640);
      const glow = ctx.createRadialGradient(180, 120, 20, 180, 120, 340);
      glow.addColorStop(0, "rgba(255,255,255,0.18)");
      glow.addColorStop(0.42, "rgba(91,130,255,0.08)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 360, 640);
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = "#d7e4ff";
      ctx.lineWidth = 2;
      for (let y = -180; y < 720; y += 82) {
        ctx.beginPath();
        ctx.moveTo(-40, y);
        ctx.lineTo(420, y + 180);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.09;
      ctx.fillStyle = "#ffffff";
      for (let y = 28; y < 640; y += 118) {
        for (let x = 18; x < 360; x += 126) {
          ctx.fillRect(x, y, 10, 10);
        }
      }
      ctx.restore();
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
    const face = PALETTE[key].face;
    const S = TEX;
    const rad = S * 0.07;
    const bev = S * 0.17;
    const topC = mix(mul(face, 1.2), 0xffffff, 0.1);
    const leftC = mix(mul(face, 1.1), 0xffffff, 0.04);
    const rightC = mul(face, 0.8);
    const botC = mul(face, 0.62);
    const texture = this.textures.createCanvas(texKey, S, S);
    if (!texture) throw new Error(`[block-burst] Could not create block texture ${key}`);
    const ctx = texture.getContext();
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, S - 1, S - 1, rad);
    ctx.clip();
    const O = [[0, 0], [S, 0], [S, S], [0, S]];
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
    quad(O[0]!, O[1]!, I[1]!, I[0]!, hexStr(topC));
    quad(O[0]!, I[0]!, I[3]!, O[3]!, hexStr(leftC));
    quad(O[1]!, O[2]!, I[2]!, I[1]!, hexStr(rightC));
    quad(O[3]!, I[3]!, I[2]!, O[2]!, hexStr(botC));
    ctx.fillStyle = hexStr(face);
    ctx.fillRect(bev, bev, S - 2 * bev, S - 2 * bev);
    const sh = ctx.createLinearGradient(0, bev, 0, S * 0.52);
    sh.addColorStop(0, "rgba(255,255,255,0.15)");
    sh.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sh;
    ctx.fillRect(bev, bev, S - 2 * bev, S * 0.52 - bev);
    ctx.restore();
    ctx.beginPath();
    ctx.roundRect(1, 1, S - 2, S - 2, rad);
    ctx.lineWidth = 2;
    ctx.strokeStyle = hexStr(mul(face, 0.4));
    ctx.stroke();
    texture.refresh();
  }

  private buildHUD(): void {
    const t = (x: number, y: number, text: string, style: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text => this.add.text(x, y, text, style).setDepth(20);
    this.scoreText = t(0, 0, "0", { fontFamily: "ui-rounded, system-ui, sans-serif", fontStyle: "700", color: "#ffffff" }).setOrigin(0.5);
    this.scoreText.setShadow(0, 5, "rgba(10,16,50,0.45)", 7, false, true);
    this.bestText = t(0, 0, `BEST ${this.best}`, { fontFamily: "ui-rounded, system-ui, sans-serif", fontStyle: "700", color: "#ffe08a" }).setOrigin(0, 0.5).setAlpha(0.92);
    this.hammerGlyph = t(0, 0, "🔨", { fontFamily: "Apple Color Emoji, ui-rounded, system-ui, sans-serif", fontStyle: "700", color: "#ffe08a" }).setOrigin(0.5).setDepth(21);
    this.hammerCount = t(0, 0, String(this.hammers), { fontFamily: "ui-rounded, system-ui, sans-serif", fontStyle: "700", color: "#fff" }).setOrigin(0.5).setDepth(21);
    this.hammerHint = t(0, 0, "Tap a block to burst it", { fontFamily: "ui-rounded, system-ui, sans-serif", fontStyle: "700", color: "#ffd24d" }).setOrigin(0.5).setVisible(false);
    this.previewBadge = t(0, 0, "PREVIEW", { fontFamily: "ui-rounded, system-ui, sans-serif", fontStyle: "700", color: "#ffffff" }).setOrigin(0.5).setAlpha(0.6).setVisible(false);
    this.syncBestText();
  }

  private setPreviewHud(active: boolean): void {
    this.previewBadge?.setVisible(false);
    this.scoreText?.setVisible(!active);
    this.bestText?.setVisible(!active && this.best > 0);
    this.hammerGfx?.setVisible(!active);
    this.hammerGlyph?.setVisible(!active);
    this.hammerCount?.setVisible(!active);
    this.hammerHint?.setVisible(false);
  }

  private syncBestText(): void {
    if (!this.bestText) return;
    this.bestText.setText(this.best > 0 ? `BEST ${this.best}` : "");
    this.bestText.setVisible(!this.previewMode && this.best > 0);
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
    const trayScale = this.previewMode ? (L.landscape ? 0.82 : 0.66) : TRAY_SCALE;
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
    if (!this.previewMode && this.overHammer(p)) {
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
    if (best && bestD <= this.L.grabSlop) this.beginDrag(best, p);
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
    this.dismissOnboarding();
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
    if (t?.valid) {
      this.placePiece(obj, t.c0, t.r0);
      return;
    }
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
    this.dismissOnboarding();
    const slot = obj.getData("slot");
    this.slots[slot] = null;
    this.pieceData[slot] = null;
    obj.destroy();
    this.resolveClears();
    this.resetHint();
    if (this.previewMode) {
      this.previewAdvancePending = true;
      this.autoplayTimer = 10;
      this.time.delayedCall(1200, () => this.advancePreviewMoment());
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
    this.floatScore(points);
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
      if (!ok) {
        this.toast("Watch a rewarded ad to refill a burst");
        return;
      }
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
    if (!this.previewMode) this.hintTimer = this.time.delayedCall(HINT_IDLE, () => this.showHint());
  }

  private clearHint(): void {
    this.tweens.killTweensOf(this.hintGfx);
    this.hintGfx?.clear();
  }

  private showHint(): void {
    if (this.dragging || this.gameOverActive || this.previewMode) return;
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

  private showOnboarding(): void {
    if (this.previewMode || localStorage.getItem("block_burst_played")) return;
    const [bx, by] = this.cellXY(3.5, 5);
    const cap = this.add.text(this.L.boardLeft + this.L.board / 2, this.L.boardTop + this.L.board + (this.L.dh - (this.L.boardTop + this.L.board)) * 0.18, "Drag a piece onto the board", {
      fontFamily: "ui-rounded, system-ui, sans-serif",
      fontSize: `${this.L.fHint}px`,
      fontStyle: "700",
      color: "#fff",
    }).setOrigin(0.5).setDepth(30).setAlpha(0.95);
    const hand = this.add.text(this.L.slotPos[1]!.x, this.L.slotPos[1]!.y, "●", { fontSize: `${Math.round(this.L.cell * 0.55)}px`, color: "#ffe08a" }).setOrigin(0.5).setDepth(31);
    this.onboarding = [cap, hand];
    this.tweens.add({ targets: hand, x: bx, y: by, duration: 1100, ease: "Sine.easeInOut", yoyo: true, repeat: -1 });
  }

  private dismissOnboarding(): void {
    if (!this.onboarding) return;
    for (const object of this.onboarding) {
      this.tweens.killTweensOf(object);
      object.destroy();
    }
    this.onboarding = null;
    localStorage.setItem("block_burst_played", "1");
  }

  private toast(text: string): void {
    if (this.previewMode) return;
    const y = this.L.landscape ? this.L.dh * 0.9 : this.L.boardTop + this.L.board + (this.L.dh - (this.L.boardTop + this.L.board)) * 0.5;
    const t = this.add.text(this.L.dw / 2, y, text, {
      fontFamily: "ui-rounded, system-ui, sans-serif",
      fontSize: `${Math.round(this.L.cell * 0.4)}px`,
      fontStyle: "700",
      color: "#15224d",
      backgroundColor: "#ffe9a8",
      padding: { x: 22, y: 14 },
      align: "center",
      wordWrap: { width: this.L.dw * 0.82 },
    }).setOrigin(0.5).setDepth(120).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, y: y - 10, duration: 240, ease: "Back.easeOut" });
    this.time.delayedCall(2800, () => this.tweens.add({ targets: t, alpha: 0, duration: 320, onComplete: () => t.destroy() }));
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

  private celebrate(lines: number, combo: number, detonated: number): void {
    if (lines < 2 && combo < 2 && detonated === 0) return;
    const intensity = (lines >= 2 ? lines - 1 : 0) + (combo >= 2 ? combo - 1 : 0) + detonated;
    const k = Math.min(intensity, 6);
    this.sfx.fanfare();
    const cx = this.L.boardLeft + this.L.board / 2;
    const cy = this.L.boardTop + this.L.board / 2;
    const glow = this.add.image(cx, cy, "glow").setDepth(95).setScale(this.L.cell / 200).setAlpha(0);
    this.tweens.add({ targets: glow, scale: (this.L.cell / 72) * (1 + k * 0.17), alpha: 0.92, duration: 240, ease: "Quad.easeOut", yoyo: true, hold: 360, onComplete: () => glow.destroy() });
    if (!this.previewMode) {
      const label = `${PRAISE[Math.min(intensity, PRAISE.length - 1)]}${combo >= 2 ? `  x${combo}` : ""}`;
      const txt = this.add.text(cx, cy, label, {
        fontFamily: "ui-rounded, system-ui, sans-serif",
        fontSize: `${Math.round(this.L.cell * (1 + k * 0.13))}px`,
        fontStyle: "700",
        color: "#ffe9a8",
        stroke: "#17306f",
        strokeThickness: Math.max(6, this.L.cell * 0.1),
      }).setOrigin(0.5).setScale(0).setDepth(96);
      this.tweens.add({
        targets: txt,
        scale: 1.12 + k * 0.05,
        duration: 240,
        ease: "Back.easeOut",
        onComplete: () => this.time.delayedCall(520, () => this.tweens.add({ targets: txt, scale: 1.5, alpha: 0, duration: 240, ease: "Quad.easeIn", onComplete: () => txt.destroy() })),
      });
    }
    this.burst(cx, cy, 0xffe08a, Math.round(28 + k * 20));
  }

  private floatScore(pts: number): void {
    if (this.previewMode) return;
    const t = this.add.text(this.L.boardLeft + this.L.board / 2, this.L.boardTop + this.L.board / 2 + this.L.cell * 0.4, `+${pts}`, {
      fontFamily: "ui-rounded, system-ui, sans-serif",
      fontSize: `${Math.round(this.L.cell * 0.66)}px`,
      fontStyle: "700",
      color: "#ffffff",
      stroke: "#1d2a5e",
      strokeThickness: Math.max(5, this.L.cell * 0.08),
    }).setOrigin(0.5).setDepth(70);
    this.tweens.add({ targets: t, y: t.y - this.L.cell * 1.5, alpha: 0, duration: 780, ease: "Quad.easeOut", onComplete: () => t.destroy() });
  }

  private addScore(points: number): void {
    this.score += points;
    this.tweens.killTweensOf(this);
    this.tweens.add({
      targets: this,
      shownScore: this.score,
      duration: 300,
      ease: "Quad.easeOut",
      onUpdate: () => this.scoreText.setText(Math.round(this.shownScore).toString()),
    });
    if (points > 0) this.tweens.add({ targets: this.scoreText, scale: 1.16, duration: 130, yoyo: true, ease: "Quad.easeOut" });
    if (this.score > this.best) {
      this.best = this.score;
      this.syncBestText();
      localStorage.setItem("block_burst_best", String(this.best));
      if (!this.newBestFired && this.prevBest > 0 && this.score > this.prevBest) {
        this.newBestFired = true;
        this.toast("New best!");
      }
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
    if (this.best > 0) localStorage.setItem("block_burst_best", String(this.best));
    if (!this.previewMode) void this.callbacks.submitScore(this.score);
    this.clearHint();
    this.hintTimer?.remove();
    this.sfx.gameover();
    this.showGameOver();
  }

  private showGameOver(): void {
    this.gameOverActive = true;
    if (this.previewMode) {
      this.time.delayedCall(260, () => this.restartAfterInterstitial());
      return;
    }
    this.goButtons = [];
    const u = this.L.cell;
    const overlay = this.add.rectangle(this.L.dw / 2, this.L.dh / 2, this.L.dw, this.L.dh, 0x0b1233, 0).setDepth(200);
    this.overlayObjects.push(overlay);
    this.tweens.add({ targets: overlay, fillAlpha: 0.74, duration: 300 });
    const panel = this.add.container(this.L.dw / 2, this.L.dh / 2).setDepth(201).setScale(0.6).setAlpha(0);
    this.overlayObjects.push(panel);
    panel.add(this.add.text(0, -u * 2.2, "No more moves", { fontFamily: "ui-rounded, system-ui, sans-serif", fontSize: `${Math.round(u * 0.75)}px`, fontStyle: "700", color: "#fff" }).setOrigin(0.5));
    panel.add(this.add.text(0, -u * 1.2, `Score  ${this.score}`, { fontFamily: "ui-rounded, system-ui, sans-serif", fontSize: `${Math.round(u * 0.66)}px`, color: "#ffe08a" }).setOrigin(0.5));
    panel.add(this.add.text(0, -u * 0.45, `Lines ${this.linesRun} · Best combo x${this.bestComboRun}`, { fontFamily: "ui-rounded, system-ui, sans-serif", fontSize: `${Math.round(u * 0.38)}px`, color: "#cdd6f5" }).setOrigin(0.5));
    const addBtn = (ly: number, label: string, color: string, action: () => void): void => {
      const labelText = this.add.text(0, 0, label, {
        fontFamily: "ui-rounded, system-ui, sans-serif",
        fontSize: `${Math.round(u * 0.48)}px`,
        fontStyle: "700",
        color: "#0f1635",
      }).setOrigin(0.5);
      const bw = labelText.width + u * 1.05;
      const bh = labelText.height + u * 0.62;
      const btn = this.add.container(0, ly);
      const bg = this.add.graphics();
      bg.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1);
      bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, Math.max(12, u * 0.18));
      btn.add([bg, labelText]);
      btn.setSize(bw, bh);
      btn.setInteractive({ useHandCursor: true });
      btn.on("pointerup", action);
      panel.add(btn);
      this.goButtons.push({ cx: this.L.dw / 2, cy: this.L.dh / 2 + ly, hw: bw / 2 + 16, hh: bh / 2 + 16, action });
    };
    if (this.revivesUsed < REVIVE_FREE) {
      addBtn(u * 0.65, "Continue · free", "#7ce08a", () => this.revive());
    } else {
      addBtn(u * 0.65, "Continue · ad", "#7ce08a", () => void this.rewardedRevive());
    }
    addBtn(u * 1.75, "Play again", "#ffd24d", () => void this.restartAfterInterstitial());
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 340, ease: "Back.easeOut" });
    if (this.previewMode) {
      this.time.delayedCall(900, () => this.restartAfterInterstitial());
    }
  }

  private handleGameOverTap(p: Phaser.Input.Pointer): void {
    for (const b of this.goButtons) {
      if (Math.abs(p.x - b.cx) <= b.hw && Math.abs(p.y - b.cy) <= b.hh) {
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
    const ok = await this.callbacks.showRewarded();
    if (ok) this.revive();
    else this.toast("Rewarded ad unavailable");
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
      await this.preparePreview(this.lastPreviewPayload ?? { active: true, audioPolicy: "sfx-only", surface: this.L.landscape ? "mobile-landscape" : "mobile-portrait" });
      return;
    }
    await this.callbacks.showInterstitial();
    this.scene.restart();
  }

  private setupPreviewMoment(): void {
    this.resetRun();
    this.layout();
    this.applyLayout();
    const surface = this.lastPreviewPayload?.surface ?? "desktop";
    this.seedPreviewBoard(surface, this.previewStep);
    this.dealPreviewSet(this.previewStep);
    this.previewAdvancePending = false;
    this.previewMoveActive = false;
    this.autoplayTimer = this.previewStep === 0 ? 0.36 : 0.28;
  }

  private advancePreviewMoment(): void {
    if (!this.previewMode) return;
    this.previewStep = (this.previewStep + 1) % 3;
    this.setupPreviewMoment();
  }

  private seedPreviewBoard(surface: string, step: number): void {
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
      if (surface.includes("portrait")) sprinkle([[0, 1], [7, 1], [0, 4], [7, 4]], 5);
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
      return { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], cols: 4, rows: 1, n: 4, tier: 1, key: "yellow", previewTarget: { c0: 2, r0: 3 } };
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

  private autoplayMove(): void {
    const move = this.previewMode ? this.findPreviewMove() : this.findMove();
    if (!move) {
      this.checkGameOver();
      return;
    }
    const obj = this.slots[move.slot];
    if (!obj) return;
    this.previewMoveActive = true;
    if (this.previewMode) this.previewTargetFlash(move.cells, move.c0, move.r0);
    obj.setDepth(50);
    this.tweens.add({
      targets: obj,
      x: this.L.boardLeft + (move.c0 + obj.getData("cols") / 2 - 0.5) * this.L.cell,
      y: this.L.boardTop + (move.r0 + obj.getData("rows") / 2 - 0.5) * this.L.cell,
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
    this.tweens.add({ targets: g, alpha: 0.66, duration: 180, yoyo: true, repeat: 1, ease: "Sine.easeInOut", onComplete: () => g.clear() });
  }
}
