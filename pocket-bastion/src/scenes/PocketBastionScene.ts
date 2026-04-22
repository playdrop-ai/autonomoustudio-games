import Phaser from "phaser";

import tilesheetUrl from "../assets/tower-defense-tilesheet@2.png";
import {
  ENEMY_DEFINITIONS,
  FX_FRAMES,
  PAD_TILE_FRAMES,
  TERRAIN_GRASS_FRAME,
  TERRAIN_PATH_FRAMES,
  TILE_SIZE,
  TEXTURE_SCALE,
  TEXTURE_TILE_SIZE,
  TOWER_DEFINITIONS,
  frame,
} from "../game/config";
import {
  BASE_CELL,
  DECORATIONS,
  PATH_LOOKUP,
  PATH_OUTFLOWS,
  PADS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  cellKey,
  cellToWorld,
} from "../game/level";
import {
  advanceGame,
  createGameSnapshot,
  createInitialState,
  drainMetaEvents,
  drainVisualEvents,
  getBuildOptions,
  getPadSelectionAnchor,
  getTowerDefinition,
  getTowerLevel,
  getTowerOnPad,
  getUpgradeOptions,
  isPadEmpty,
  placeTowerOnPad,
  startGame,
  upgradeTowerOnPad,
} from "../game/simulation";
import type {
  GameSnapshot,
  MetaEvent,
  PlacementResult,
  PlatformUiSnapshot,
  SelectionState,
  Tower,
  VisualEvent,
} from "../game/types";
import type { GameApi } from "../ui/hud";

interface SceneDeps {
  onSceneReady(api: GameApi): void;
  onStateChange(snapshot: GameSnapshot): void;
  onMetaEvents(events: MetaEvent[]): void | Promise<void>;
  onMetaAction(): void | Promise<void>;
}

interface EnemyView {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  healthBg: Phaser.GameObjects.Rectangle;
  healthFill: Phaser.GameObjects.Rectangle;
}

const DEFAULT_PLATFORM_SNAPSHOT: PlatformUiSnapshot = {
  available: false,
  authOptional: false,
  isLoggedIn: false,
  pendingMeta: false,
  busy: false,
  leaderboardLoaded: false,
  leaderboardRank: null,
  leaderboardBestScore: null,
  leaderboardBestDisplay: null,
  newHighScore: false,
};

export class PocketBastionScene extends Phaser.Scene implements GameApi {
  private state = createInitialState();
  private selection: SelectionState | null = null;
  private platformSnapshot: PlatformUiSnapshot = { ...DEFAULT_PLATFORM_SNAPSHOT };
  private readonly towerHeadSprites = new Map<number, Phaser.GameObjects.Image>();
  private readonly rocketReadySprites = new Map<number, Phaser.GameObjects.Image>();
  private readonly enemyViews = new Map<number, EnemyView>();
  private readonly projectileSprites = new Map<number, Phaser.GameObjects.Image>();
  private readonly padSprites = new Map<string, Phaser.GameObjects.Image>();
  private rangeIndicator?: Phaser.GameObjects.Graphics;

  constructor(private readonly deps: SceneDeps) {
    super("PocketBastion");
  }

  preload(): void {
    this.load.spritesheet("tiles", tilesheetUrl, {
      frameWidth: TEXTURE_TILE_SIZE,
      frameHeight: TEXTURE_TILE_SIZE,
    });
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#41d96a");
    this.input.setDefaultCursor("pointer");
    this.buildBoard();
    this.rangeIndicator = this.add.graphics().setDepth(4);
    this.bindKeyboard();
    this.syncDynamicViews();
    this.emitHud();
    this.deps.onSceneReady(this);
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.05);
    advanceGame(this.state, dt);
    this.flushSideEffects();
    this.syncDynamicViews();
    this.emitHud();
  }

  buildSelectedTower(kind: "blaster" | "rocket"): PlacementResult {
    if (!this.selection || this.selection.mode !== "build") {
      return { ok: false, message: "No tower slot selected." };
    }

    const result = placeTowerOnPad(this.state, this.selection.padId, kind);
    if (result.ok) {
      this.selection = null;
    }

    this.flushSideEffects();
    this.syncDynamicViews();
    this.emitHud();
    return result;
  }

  clearSelection(): void {
    if (!this.selection) {
      return;
    }

    this.selection = null;
    this.syncDynamicViews();
    this.emitHud();
  }

  getSnapshot(): GameSnapshot {
    return this.createSceneSnapshot();
  }

  openMeta(): void {
    void this.deps.onMetaAction();
  }

  restart(): void {
    this.state = createInitialState();
    this.selection = null;
    this.flushSideEffects();
    this.syncDynamicViews();
    this.emitHud();
  }

  selectPad(padId: string): void {
    if (this.state.phase !== "playing") {
      return;
    }

    const empty = isPadEmpty(this.state, padId);
    this.selection = {
      padId,
      mode: empty ? "build" : "upgrade",
    };
    this.syncDynamicViews();
    this.emitHud();
  }

  setPlatformSnapshot(nextSnapshot: Partial<PlatformUiSnapshot>): void {
    this.platformSnapshot = {
      ...this.platformSnapshot,
      ...nextSnapshot,
    };
    this.emitHud();
  }

  startGame(): boolean {
    const started = startGame(this.state);
    this.flushSideEffects();
    this.emitHud();
    return started;
  }

  upgradeSelectedTower(): PlacementResult {
    if (!this.selection || this.selection.mode !== "upgrade") {
      return { ok: false, message: "No tower selected." };
    }

    const result = upgradeTowerOnPad(this.state, this.selection.padId);
    this.flushSideEffects();
    this.syncDynamicViews();
    this.emitHud();
    return result;
  }

  private bindKeyboard(): void {
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        this.startGame();
      } else if (event.code === "Escape") {
        this.clearSelection();
      } else if (event.code === "KeyR" && this.state.phase === "lost") {
        this.restart();
      }
    });

    this.input.on("pointerdown", (_pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      const hitPad = currentlyOver.some((gameObject) => Array.from(this.padSprites.values()).includes(gameObject as Phaser.GameObjects.Image));
      if (!hitPad) {
        this.clearSelection();
      }
    });
  }

  private buildBoard(): void {
    const gridWidth = WORLD_WIDTH / TILE_SIZE;
    const gridHeight = WORLD_HEIGHT / TILE_SIZE;

    for (let y = 0; y < gridHeight; y += 1) {
      for (let x = 0; x < gridWidth; x += 1) {
        const isPath = PATH_LOOKUP.has(cellKey({ x, y }));
        const centerX = x * TILE_SIZE + TILE_SIZE / 2;
        const centerY = y * TILE_SIZE + TILE_SIZE / 2;

        this.add.image(centerX, centerY, "tiles", TERRAIN_GRASS_FRAME).setScale(TEXTURE_SCALE).setDepth(0);

        if (isPath) {
          const tile = this.resolvePathTile(x, y);
          this.add
            .image(centerX, centerY, "tiles", tile.frame)
            .setScale(TEXTURE_SCALE)
            .setRotation(tile.rotation)
            .setDepth(1);
        }
      }
    }

    for (const outflow of PATH_OUTFLOWS) {
      for (const cell of outflow.cells) {
        const x = outflow.direction === "west" ? -TILE_SIZE / 2 : WORLD_WIDTH + TILE_SIZE / 2;
        const y = cell.y * TILE_SIZE + TILE_SIZE / 2;
        const tile = this.resolveVirtualPathTile(cell, outflow.direction);
        this.add.image(x, y, "tiles", tile.frame).setScale(TEXTURE_SCALE).setRotation(tile.rotation).setDepth(1);
      }
    }

    for (const decoration of DECORATIONS) {
      const point = cellToWorld(decoration.cell);
      this.add
        .image(point.x, point.y, "tiles", frame(decoration.tileNumber))
        .setScale(decoration.scale * TEXTURE_SCALE)
        .setDepth(2)
        .setAlpha(0.98);
    }

    for (const pad of PADS) {
      const point = cellToWorld(pad.cell);
      const sprite = this.add
        .image(point.x, point.y, "tiles", PAD_TILE_FRAMES.available)
        .setScale(TEXTURE_SCALE)
        .setDepth(3)
        .setAlpha(0.96)
        .setInteractive({ useHandCursor: true });

      sprite.on("pointerdown", () => {
        this.selectPad(pad.id);
      });

      sprite.on("pointerover", () => {
        if (isPadEmpty(this.state, pad.id)) {
          sprite.setScale(TEXTURE_SCALE * 1.04);
        }
      });

      sprite.on("pointerout", () => {
        sprite.setScale(TEXTURE_SCALE);
      });

      this.padSprites.set(pad.id, sprite);
    }
  }

  private hasPathAt(x: number, y: number): boolean {
    return PATH_LOOKUP.has(cellKey({ x, y }));
  }

  private hasOutflow(cell: { x: number; y: number }, direction: "north" | "east" | "south" | "west"): boolean {
    return PATH_OUTFLOWS.some(
      (outflow) =>
        outflow.direction === direction &&
        outflow.cells.some((candidate) => candidate.x === cell.x && candidate.y === cell.y),
    );
  }

  private hasPathNeighbor(x: number, y: number, direction: "north" | "east" | "south" | "west"): boolean {
    if (direction === "north") {
      return y === 0 ? this.hasOutflow({ x, y }, "north") : this.hasPathAt(x, y - 1);
    }

    if (direction === "east") {
      return x === WORLD_WIDTH / TILE_SIZE - 1 ? this.hasOutflow({ x, y }, "east") : this.hasPathAt(x + 1, y);
    }

    if (direction === "south") {
      return y === WORLD_HEIGHT / TILE_SIZE - 1 ? this.hasOutflow({ x, y }, "south") : this.hasPathAt(x, y + 1);
    }

    return x === 0 ? this.hasOutflow({ x, y }, "west") : this.hasPathAt(x - 1, y);
  }

  private hasVirtualPathAt(x: number, y: number): boolean {
    const gridWidth = WORLD_WIDTH / TILE_SIZE;
    const gridHeight = WORLD_HEIGHT / TILE_SIZE;

    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
      return this.hasPathAt(x, y);
    }

    if (x === -1 && y >= 0 && y < gridHeight) {
      return this.hasOutflow({ x: 0, y }, "west");
    }

    if (x === gridWidth && y >= 0 && y < gridHeight) {
      return this.hasOutflow({ x: gridWidth - 1, y }, "east");
    }

    if (y === -1 && x >= 0 && x < gridWidth) {
      return this.hasOutflow({ x, y: 0 }, "north");
    }

    if (y === gridHeight && x >= 0 && x < gridWidth) {
      return this.hasOutflow({ x, y: gridHeight - 1 }, "south");
    }

    return false;
  }

  private resolvePathTile(x: number, y: number): { frame: number; rotation: number } {
    const north = this.hasPathNeighbor(x, y, "north");
    const east = this.hasPathNeighbor(x, y, "east");
    const south = this.hasPathNeighbor(x, y, "south");
    const west = this.hasPathNeighbor(x, y, "west");

    const northEast = north && east && this.hasVirtualPathAt(x + 1, y - 1);
    const southEast = south && east && this.hasVirtualPathAt(x + 1, y + 1);
    const southWest = south && west && this.hasVirtualPathAt(x - 1, y + 1);
    const northWest = north && west && this.hasVirtualPathAt(x - 1, y - 1);

    if (north && east && south && west) {
      if (!northEast) {
        return { frame: TERRAIN_PATH_FRAMES.innerCornerNE, rotation: 0 };
      }

      if (!southEast) {
        return { frame: TERRAIN_PATH_FRAMES.innerCornerSE, rotation: 0 };
      }

      if (!southWest) {
        return { frame: TERRAIN_PATH_FRAMES.innerCornerSW, rotation: 0 };
      }

      if (!northWest) {
        return { frame: TERRAIN_PATH_FRAMES.innerCornerNW, rotation: 0 };
      }
    }

    return this.resolvePathTileFromNeighbors({ north, east, south, west });
  }

  private resolveVirtualPathTile(cell: { x: number; y: number }, direction: "west" | "east"): { frame: number; rotation: number } {
    const north = this.hasOutflow({ x: cell.x, y: cell.y - 1 }, direction);
    const south = this.hasOutflow({ x: cell.x, y: cell.y + 1 }, direction);

    if (direction === "east") {
      if (!north && south) {
        return { frame: TERRAIN_PATH_FRAMES.innerCornerSE, rotation: 0 };
      }

      if (north && !south) {
        return { frame: TERRAIN_PATH_FRAMES.edgeS, rotation: 0 };
      }
    }

    if (direction === "west") {
      if (!north && south) {
        return { frame: TERRAIN_PATH_FRAMES.innerCornerSW, rotation: 0 };
      }

      if (north && !south) {
        return { frame: TERRAIN_PATH_FRAMES.edgeS, rotation: 0 };
      }
    }

    return this.resolvePathTileFromNeighbors({
      north,
      east: true,
      south,
      west: true,
    });
  }

  private resolvePathTileFromNeighbors(neighbors: {
    north: boolean;
    east: boolean;
    south: boolean;
    west: boolean;
  }): { frame: number; rotation: number } {
    const { north, east, south, west } = neighbors;

    if (north && east && south && west) {
      return { frame: TERRAIN_PATH_FRAMES.fill, rotation: 0 };
    }

    if (!north && east && south && west) {
      return { frame: TERRAIN_PATH_FRAMES.edgeN, rotation: 0 };
    }

    if (north && !east && south && west) {
      return { frame: TERRAIN_PATH_FRAMES.edgeE, rotation: 0 };
    }

    if (north && east && !south && west) {
      return { frame: TERRAIN_PATH_FRAMES.edgeS, rotation: 0 };
    }

    if (north && east && south && !west) {
      return { frame: TERRAIN_PATH_FRAMES.edgeW, rotation: 0 };
    }

    if (north && east && !south && !west) {
      return { frame: TERRAIN_PATH_FRAMES.turnNE, rotation: 0 };
    }

    if (north && !east && !south && west) {
      return { frame: TERRAIN_PATH_FRAMES.turnNW, rotation: 0 };
    }

    if (!north && east && south && !west) {
      return { frame: TERRAIN_PATH_FRAMES.turnSE, rotation: 0 };
    }

    if (!north && !east && south && west) {
      return { frame: TERRAIN_PATH_FRAMES.turnSW, rotation: 0 };
    }

    if (north && south && !east && !west) {
      return { frame: TERRAIN_PATH_FRAMES.fill, rotation: Math.PI / 2 };
    }

    return { frame: TERRAIN_PATH_FRAMES.fill, rotation: 0 };
  }

  private createEnemyHealthView(x: number, y: number): Pick<EnemyView, "healthBg" | "healthFill"> {
    const healthBg = this.add.rectangle(x, y - 28, 34, 6, 0x1b1916, 0.88).setDepth(9);
    const healthFill = this.add.rectangle(x, y - 28, 30, 3, 0x7de26a, 1).setDepth(10);
    return { healthBg, healthFill };
  }

  private flushSideEffects(): void {
    const visualEvents = drainVisualEvents(this.state);
    if (visualEvents.length > 0) {
      this.spawnVisualEvents(visualEvents);
    }

    const metaEvents = drainMetaEvents(this.state);
    if (metaEvents.length > 0) {
      void this.deps.onMetaEvents(metaEvents);
    }
  }

  private spawnVisualEvents(events: VisualEvent[]): void {
    for (const event of events) {
      if (event.type === "shot") {
        this.spawnFxSprite(event.frame ?? FX_FRAMES.muzzle, event.x, event.y, {
          depth: 11,
          scale: event.scale ?? 0.46,
          alpha: 0.94,
          tint: event.tint ?? 0xfff2cf,
          rotation: event.rotation ?? 0,
          duration: event.projectileKind === "rocket" ? 160 : 120,
          scaleTo: (event.scale ?? 0.46) + 0.18,
        });
        continue;
      }

      if (event.type === "impact") {
        this.spawnFxSprite(event.frame ?? FX_FRAMES.hit, event.x, event.y, {
          depth: 11,
          scale: event.scale ?? 0.54,
          alpha: 0.96,
          tint: event.tint ?? 0xffbe74,
          duration: event.projectileKind === "rocket" ? 220 : 150,
          scaleTo: (event.scale ?? 0.54) + ((event.radius ?? 18) > 30 ? 0.44 : 0.24),
        });

        if (event.projectileKind === "rocket") {
          this.spawnFxSprite(FX_FRAMES.muzzle, event.x, event.y, {
            depth: 10,
            scale: 0.74,
            alpha: 0.55,
            tint: 0xfff0cb,
            duration: 190,
            scaleTo: 1.06,
          });
          this.cameras.main.shake(70, 0.0018);
        }
        continue;
      }

      if (event.type === "enemy-killed") {
        this.spawnFxSprite(event.frame ?? FX_FRAMES.death, event.x, event.y - 4, {
          depth: 11,
          scale: event.scale ?? 0.58,
          alpha: 0.9,
          tint: event.tint ?? 0xfff0cb,
          duration: 200,
          scaleTo: (event.scale ?? 0.58) + 0.22,
        });
      }
    }
  }

  private spawnFxSprite(
    frameNumber: number,
    x: number,
    y: number,
    options: {
      depth: number;
      scale: number;
      alpha: number;
      tint: number;
      duration: number;
      scaleTo: number;
      rotation?: number;
    },
  ): void {
    const sprite = this.add
      .image(x, y, "tiles", frameNumber)
      .setDepth(options.depth)
      .setScale(options.scale * TEXTURE_SCALE)
      .setAlpha(options.alpha)
      .setTint(options.tint)
      .setRotation(options.rotation ?? 0);

    this.tweens.add({
      targets: sprite,
      alpha: 0,
      scaleX: options.scaleTo * TEXTURE_SCALE,
      scaleY: options.scaleTo * TEXTURE_SCALE,
      duration: options.duration,
      ease: "Cubic.easeOut",
      onComplete: () => sprite.destroy(),
    });
  }

  private getLoadedRocketAnchor(tower: Tower) {
    const definition = getTowerDefinition(tower.kind);
    const stats = getTowerLevel(definition, tower.level);
    const offsets = stats.muzzleOffsets.length > 0 ? stats.muzzleOffsets : [{ x: 0, y: 16 }];
    const offset = offsets[tower.nextMuzzleIndex % offsets.length] ?? { x: 0, y: 16 };
    const lateral = offset.x ?? 0;
    const readyRocketScale = definition.projectileScale * 0.94;
    const readyRocketLength = TEXTURE_TILE_SIZE * readyRocketScale * TEXTURE_SCALE;
    const visibleOverhang = readyRocketLength * 0.1;
    const forward = Math.max(5, (offset.y ?? 16) - 10) + visibleOverhang;
    const centerY = tower.y + definition.topYOffset + 2;
    const cos = Math.cos(tower.rotation);
    const sin = Math.sin(tower.rotation);
    const rightCos = Math.cos(tower.rotation + Math.PI / 2);
    const rightSin = Math.sin(tower.rotation + Math.PI / 2);

    return {
      x: tower.x + cos * forward + rightCos * lateral,
      y: centerY + sin * forward + rightSin * lateral,
    };
  }

  private rocketTowerHasProjectile(towerId: number): boolean {
    return this.state.projectiles.some((projectile) => projectile.sourceTowerId === towerId);
  }

  private getProjectileDepth(projectile: { sourceTowerId: number; x: number; y: number }): number {
    const sourceTower = this.state.towers.find((tower) => tower.id === projectile.sourceTowerId);
    if (!sourceTower) {
      return 8;
    }

    const definition = getTowerDefinition(sourceTower.kind);
    const sourceTopY = sourceTower.y + definition.topYOffset;
    const distanceFromTower = Math.hypot(projectile.x - sourceTower.x, projectile.y - sourceTopY);
    return distanceFromTower <= 30 ? 5.8 : 8;
  }

  private syncDynamicViews(): void {
    if (this.state.phase !== "playing") {
      this.selection = null;
    }

    const seenTowers = new Set<number>();
    const seenEnemies = new Set<number>();
    const seenProjectiles = new Set<number>();
    const cheapestBuild = Math.min(...getBuildOptions(this.state).map((option) => option.cost));

    for (const tower of this.state.towers) {
      let sprite = this.towerHeadSprites.get(tower.id);
      let readyRocketSprite = this.rocketReadySprites.get(tower.id);
      const definition = TOWER_DEFINITIONS[tower.kind];
      const levelStats = getTowerLevel(definition, tower.level);

      if (!sprite) {
        sprite = this.add
          .image(tower.x, tower.y, "tiles", levelStats.topFrame)
          .setScale(definition.topScale * TEXTURE_SCALE)
          .setTint(definition.topTint)
          .setDepth(6);
        this.towerHeadSprites.set(tower.id, sprite);
      }

      if (tower.kind === "rocket" && !readyRocketSprite) {
        readyRocketSprite = this.add
          .image(tower.x, tower.y, "tiles", definition.projectileFrame)
          .setScale(definition.projectileScale * TEXTURE_SCALE * 0.94)
          .setTint(definition.projectileTint)
          .setDepth(5.6);
        this.rocketReadySprites.set(tower.id, readyRocketSprite);
      }

      sprite.setFrame(levelStats.topFrame);
      sprite.setScale(definition.topScale * TEXTURE_SCALE);
      sprite.setTint(definition.topTint);
      sprite.setPosition(tower.x, tower.y + definition.topYOffset);
      sprite.setRotation(tower.rotation + definition.topRotationOffset);

      if (tower.kind === "rocket" && readyRocketSprite) {
        const ready = tower.cooldown <= 0 && !this.rocketTowerHasProjectile(tower.id);
        const anchor = this.getLoadedRocketAnchor(tower);
        readyRocketSprite
          .setFrame(definition.projectileFrame)
          .setScale(definition.projectileScale * TEXTURE_SCALE * 0.94)
          .setTint(definition.projectileTint)
          .setPosition(anchor.x, anchor.y)
          .setRotation(tower.rotation + definition.projectileRotationOffset)
          .setVisible(ready);
      }

      seenTowers.add(tower.id);
    }

    for (const enemy of this.state.enemies) {
      let view = this.enemyViews.get(enemy.id);
      if (!view) {
        const definition = ENEMY_DEFINITIONS[enemy.kind];
        const sprite = this.add
          .image(enemy.x, enemy.y, "tiles", definition.frame)
          .setScale(definition.scale * TEXTURE_SCALE)
          .setTint(definition.tint)
          .setDepth(7);
        const shadow = this.add.ellipse(enemy.x, enemy.y + 12, 24, 10, 0x000000, 0.22).setDepth(6);
        const { healthBg, healthFill } = this.createEnemyHealthView(enemy.x, enemy.y);
        view = { sprite, shadow, healthBg, healthFill };
        this.enemyViews.set(enemy.id, view);
      }

      view.sprite.setPosition(enemy.x, enemy.y);
      view.sprite.setRotation(enemy.rotation);
      view.shadow.setPosition(enemy.x, enemy.y + 12);
      view.shadow.setRotation(enemy.rotation);
      this.syncHealthBar(view, enemy.x, enemy.y, enemy.health, enemy.maxHealth);
      seenEnemies.add(enemy.id);
    }

    for (const projectile of this.state.projectiles) {
      let sprite = this.projectileSprites.get(projectile.id);
      if (!sprite) {
        sprite = this.add
          .image(projectile.x, projectile.y, "tiles", projectile.frame)
          .setScale(projectile.scale * TEXTURE_SCALE)
          .setTint(projectile.tint)
          .setDepth(this.getProjectileDepth(projectile));
        this.projectileSprites.set(projectile.id, sprite);
      }

      sprite.setPosition(projectile.x, projectile.y);
      sprite.setRotation(projectile.rotation + projectile.rotationOffset);
      sprite.setDepth(this.getProjectileDepth(projectile));
      seenProjectiles.add(projectile.id);
    }

    for (const [id, sprite] of this.towerHeadSprites) {
      if (!seenTowers.has(id)) {
        sprite.destroy();
        this.towerHeadSprites.delete(id);
      }
    }

    for (const [id, sprite] of this.rocketReadySprites) {
      if (!seenTowers.has(id)) {
        sprite.destroy();
        this.rocketReadySprites.delete(id);
      }
    }

    for (const [id, view] of this.enemyViews) {
      if (!seenEnemies.has(id)) {
        view.shadow.destroy();
        view.sprite.destroy();
        view.healthBg.destroy();
        view.healthFill.destroy();
        this.enemyViews.delete(id);
      }
    }

    for (const [id, sprite] of this.projectileSprites) {
      if (!seenProjectiles.has(id)) {
        sprite.destroy();
        this.projectileSprites.delete(id);
      }
    }

    for (const pad of this.state.pads) {
      const sprite = this.padSprites.get(pad.id);
      if (!sprite) {
        continue;
      }

      const pulse = 0.04 * Math.sin(this.state.now * 4 + sprite.x * 0.01);
      const isSelected = this.selection?.padId === pad.id;
      const tower = pad.towerId === null ? null : getTowerOnPad(this.state, pad.id);

      if (!tower) {
        sprite.setFrame(isSelected ? PAD_TILE_FRAMES.selected : PAD_TILE_FRAMES.available);
        sprite.setTint(this.state.gold >= cheapestBuild ? 0xffffff : 0xa8b1b0);
        sprite.setAlpha((isSelected ? 1 : this.state.gold >= cheapestBuild ? 0.92 : 0.62) + pulse * (isSelected ? 0.14 : 0.08));
        sprite.setScale(TEXTURE_SCALE * (isSelected ? 1.02 : 1));
      } else {
        const definition = getTowerDefinition(tower.kind);
        const levelStats = getTowerLevel(definition, tower.level);
        sprite.setFrame(levelStats.baseFrame);
        sprite.setTint(isSelected ? 0xfff0bf : definition.baseTint);
        sprite.setAlpha(isSelected ? 1 : 0.98);
        sprite.setScale(TEXTURE_SCALE * (isSelected ? definition.baseScale * 1.04 : definition.baseScale));
      }
    }

    this.syncRangeIndicator();
  }

  private syncHealthBar(view: EnemyView, x: number, y: number, health: number, maxHealth: number): void {
    const ratio = Phaser.Math.Clamp(health / maxHealth, 0, 1);
    const visible = ratio > 0 && ratio < 1;
    const width = 30;

    view.healthBg.setVisible(visible);
    view.healthFill.setVisible(visible);

    if (!visible) {
      return;
    }

    view.healthBg.setPosition(x, y - 28);
    view.healthFill.setPosition(x - width / 2 + (width * ratio) / 2, y - 28);
    view.healthFill.displayWidth = width * ratio;
    view.healthFill.fillColor = ratio < 0.35 ? 0xe36b5d : ratio < 0.65 ? 0xf0be5a : 0x7de26a;
  }

  private emitHud(): void {
    this.deps.onStateChange(this.createSceneSnapshot());
  }

  private syncRangeIndicator(): void {
    const graphics = this.rangeIndicator;
    if (!graphics) {
      return;
    }

    graphics.clear();

    if (!this.selection || this.selection.mode !== "upgrade") {
      return;
    }

    const tower = getTowerOnPad(this.state, this.selection.padId);
    if (!tower) {
      return;
    }

    const definition = getTowerDefinition(tower.kind);
    const levelStats = getTowerLevel(definition, tower.level);
    const centerX = tower.x;
    const centerY = tower.y + definition.topYOffset;

    graphics.fillStyle(0xf7f1dc, 0.055);
    graphics.lineStyle(2, 0xf7f1dc, 0.18);
    graphics.fillCircle(centerX, centerY, levelStats.range);
    graphics.strokeCircle(centerX, centerY, levelStats.range);
  }

  private createSceneSnapshot(): GameSnapshot {
    if (!this.selection || this.state.phase !== "playing") {
      return createGameSnapshot(this.state, null, this.platformSnapshot);
    }

    const anchor = getPadSelectionAnchor(this.selection.padId);
    if (!anchor) {
      this.selection = null;
      return createGameSnapshot(this.state, null, this.platformSnapshot);
    }

    if (this.selection.mode === "build" && !isPadEmpty(this.state, this.selection.padId)) {
      this.selection.mode = "upgrade";
    }

    if (this.selection.mode === "upgrade" && !getTowerOnPad(this.state, this.selection.padId)) {
      this.selection.mode = "build";
    }

    return createGameSnapshot(
      this.state,
      {
        mode: this.selection.mode,
        anchor,
        buildOptions: this.selection.mode === "build" ? getBuildOptions(this.state) : [],
        upgradeOptions: this.selection.mode === "upgrade" ? getUpgradeOptions(this.state, this.selection.padId) : [],
      },
      this.platformSnapshot,
    );
  }
}
