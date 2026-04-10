import {
  BATTERY_RADIUS,
  BEACON_CENTER,
  BEACON_DEPOSIT_RADIUS,
  BEACON_RING_RADIUS,
  DEBRIS_PATCHES,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./constants";
import type { Enemy, GameState, Particle, SpawnWarning, Vec2 } from "./types";

type Layout = {
  width: number;
  height: number;
  dpr: number;
  scale: number;
  stageX: number;
  stageY: number;
};

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;

  private readonly context: CanvasRenderingContext2D;

  private layout: Layout = {
    width: 0,
    height: 0,
    dpr: 1,
    scale: 1,
    stageX: 0,
    stageY: 0,
  };

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("canvas_context_unavailable");
    }
    this.canvas = canvas;
    this.context = context;
  }

  resize(width: number, height: number, dpr: number): void {
    this.layout.width = width;
    this.layout.height = height;
    this.layout.dpr = dpr;
    this.layout.scale = Math.min(width / WORLD_WIDTH, height / WORLD_HEIGHT);
    this.layout.stageX = (width - WORLD_WIDTH * this.layout.scale) * 0.5;
    this.layout.stageY = (height - WORLD_HEIGHT * this.layout.scale) * 0.5;

    this.canvas.width = Math.max(1, Math.round(width * dpr));
    this.canvas.height = Math.max(1, Math.round(height * dpr));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  clientToWorld(clientX: number, clientY: number): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return {
      x: clamp((x - this.layout.stageX) / this.layout.scale, 0, WORLD_WIDTH),
      y: clamp((y - this.layout.stageY) / this.layout.scale, 0, WORLD_HEIGHT),
    };
  }

  render(state: GameState): void {
    const ctx = this.context;
    const { width, height, dpr, scale, stageX, stageY } = this.layout;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const outerGradient = ctx.createLinearGradient(0, 0, 0, height);
    outerGradient.addColorStop(0, "#071015");
    outerGradient.addColorStop(1, "#020608");
    ctx.fillStyle = outerGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(stageX, stageY);
    ctx.scale(scale, scale);

    drawWorldBackground(ctx);
    drawBeacon(ctx, state);
    for (const warning of state.spawnWarnings) {
      drawSpawnWarning(ctx, warning);
    }
    for (const battery of state.batteries) {
      drawBattery(ctx, battery.position, false);
    }
    for (const enemy of state.enemies) {
      drawEnemy(ctx, enemy);
    }
    for (const projectile of state.projectiles) {
      drawProjectile(ctx, projectile.position, projectile.velocity);
    }
    drawPlayer(ctx, state);
    for (const particle of state.particles) {
      drawParticle(ctx, particle);
    }

    ctx.restore();
  }
}

function drawWorldBackground(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  const backdrop = ctx.createRadialGradient(
    BEACON_CENTER.x,
    BEACON_CENTER.y,
    80,
    BEACON_CENTER.x,
    BEACON_CENTER.y,
    620,
  );
  backdrop.addColorStop(0, "rgba(25, 83, 105, 0.68)");
  backdrop.addColorStop(0.46, "rgba(12, 43, 56, 0.84)");
  backdrop.addColorStop(1, "rgba(5, 18, 25, 1)");
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= WORLD_WIDTH; x += 58) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, WORLD_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += 58) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WORLD_WIDTH, y);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(190, 232, 245, 0.08)";
  ctx.beginPath();
  ctx.arc(BEACON_CENTER.x, BEACON_CENTER.y, BEACON_RING_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  for (const patch of DEBRIS_PATCHES) {
    ctx.save();
    ctx.translate(patch.x, patch.y);
    ctx.rotate(patch.angle);
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.beginPath();
    ctx.ellipse(0, 0, patch.rx, patch.ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const vignette = ctx.createRadialGradient(
    BEACON_CENTER.x,
    BEACON_CENTER.y,
    210,
    BEACON_CENTER.x,
    BEACON_CENTER.y,
    710,
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  ctx.restore();
}

function drawBeacon(ctx: CanvasRenderingContext2D, state: GameState): void {
  const health = state.beaconIntegrity / state.beaconMaxIntegrity;
  const pulseBoost = state.beaconPulseMs > 0 ? state.beaconPulseMs / 520 : 0;
  const hitFlash = state.beaconHitFlashMs > 0 ? state.beaconHitFlashMs / 240 : 0;

  ctx.save();
  ctx.translate(BEACON_CENTER.x, BEACON_CENTER.y);

  const outerGlow = ctx.createRadialGradient(0, 0, 20, 0, 0, 220);
  outerGlow.addColorStop(0, `rgba(159, 230, 247, ${0.22 + pulseBoost * 0.16})`);
  outerGlow.addColorStop(0.68, "rgba(91, 183, 212, 0.08)");
  outerGlow.addColorStop(1, "rgba(91, 183, 212, 0)");
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 220, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 2.8;
  ctx.strokeStyle = `rgba(197, 239, 249, ${0.22 + pulseBoost * 0.28})`;
  ctx.beginPath();
  ctx.arc(0, 0, BEACON_DEPOSIT_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(197, 239, 249, 0.18)";
  ctx.beginPath();
  ctx.arc(0, 0, BEACON_DEPOSIT_RADIUS + 36, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const coreGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 68);
  coreGlow.addColorStop(0, `rgba(246, 253, 255, ${0.95 + pulseBoost * 0.05})`);
  coreGlow.addColorStop(0.28, `rgba(200, 246, 255, ${0.92 + pulseBoost * 0.08})`);
  coreGlow.addColorStop(0.62, `rgba(99, 209, 239, ${0.82 - hitFlash * 0.18})`);
  coreGlow.addColorStop(1, "rgba(14, 92, 118, 0)");
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 74, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#173847";
  ctx.beginPath();
  ctx.roundRect(-32, -18, 64, 72, 20);
  ctx.fill();

  const tower = ctx.createLinearGradient(0, -42, 0, 54);
  tower.addColorStop(0, "rgba(255,255,255,0.94)");
  tower.addColorStop(0.32, "rgba(206,224,230,0.86)");
  tower.addColorStop(1, "rgba(83,113,123,0.96)");
  ctx.fillStyle = tower;
  ctx.beginPath();
  ctx.roundRect(-34, -18, 68, 76, 22);
  ctx.fill();

  ctx.fillStyle = hitFlash > 0 ? "#ffd3cf" : "#b6f2ff";
  ctx.beginPath();
  ctx.arc(0, -8, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f5fdff";
  ctx.beginPath();
  ctx.roundRect(-8, -64, 16, 42, 9);
  ctx.fill();

  ctx.fillStyle = health > 0.45 ? "#9fe6f7" : health > 0.2 ? "#f1b55d" : "#f0695d";
  ctx.beginPath();
  ctx.arc(0, -8, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState): void {
  const player = state.player;
  const angle = Math.atan2(player.aim.y - player.position.y, player.aim.x - player.position.x);

  ctx.save();
  ctx.translate(player.position.x, player.position.y);
  ctx.rotate(angle);

  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(-14, 18, 30, 11, 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.ellipse(-42, 0, 48, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.lineTo(-14, -18);
  ctx.lineTo(20, -18);
  ctx.lineTo(34, 0);
  ctx.lineTo(20, 18);
  ctx.lineTo(-14, 18);
  ctx.closePath();
  const hull = ctx.createLinearGradient(-30, -18, 34, 18);
  hull.addColorStop(0, "#f8fbff");
  hull.addColorStop(0.32, "#cee0e6");
  hull.addColorStop(1, "#53717b");
  ctx.fillStyle = hull;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-16, 0);
  ctx.lineTo(-8, -12);
  ctx.lineTo(18, -12);
  ctx.lineTo(28, 0);
  ctx.lineTo(18, 12);
  ctx.lineTo(-8, 12);
  ctx.closePath();
  const deck = ctx.createLinearGradient(0, -12, 0, 12);
  deck.addColorStop(0, "rgba(24,80,100,0.88)");
  deck.addColorStop(1, "rgba(10,21,28,0.96)");
  ctx.fillStyle = deck;
  ctx.fill();

  ctx.fillStyle = "#d7f6ff";
  ctx.beginPath();
  ctx.roundRect(-4, -9, 14, 18, 8);
  ctx.fill();

  ctx.fillStyle = state.player.jamMs > 0 ? "#f0695d" : "#effbff";
  ctx.fillRect(24, -2, 20 + state.player.recoilMs * 0.04, 4);

  if (state.player.carryBattery) {
    drawBattery(ctx, { x: -18, y: 28 }, true);
  }

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy): void {
  ctx.save();
  ctx.translate(enemy.position.x, enemy.position.y);
  ctx.rotate(enemy.rotation);

  ctx.fillStyle = "rgba(0,0,0,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, enemy.radius + 12, enemy.radius * 1.08, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  if (enemy.type === "scrapper") {
    const gradient = ctx.createRadialGradient(-6, -8, 6, 0, 0, enemy.radius);
    gradient.addColorStop(0, "#ffc0b7");
    gradient.addColorStop(0.34, "#f0695d");
    gradient.addColorStop(1, "#3d100d");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius - 8, 0, Math.PI * 2);
    ctx.stroke();
  } else if (enemy.type === "rammer") {
    ctx.beginPath();
    ctx.moveTo(-30, 0);
    ctx.lineTo(-8, -18);
    ctx.lineTo(26, -18);
    ctx.lineTo(38, 0);
    ctx.lineTo(26, 18);
    ctx.lineTo(-8, 18);
    ctx.closePath();
    const body = ctx.createLinearGradient(-30, -18, 38, 18);
    body.addColorStop(0, "#ffcdc5");
    body.addColorStop(0.3, "#f0695d");
    body.addColorStop(1, "#370f0d");
    ctx.fillStyle = body;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-2, -12);
    ctx.lineTo(18, -12);
    ctx.lineTo(30, 0);
    ctx.lineTo(18, 12);
    ctx.lineTo(-2, 12);
    ctx.closePath();
    ctx.fillStyle = "rgba(57, 10, 11, 0.88)";
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.roundRect(-36, -28, 72, 56, 18);
    const body = ctx.createLinearGradient(-36, -28, 36, 28);
    body.addColorStop(0, "#ffc7be");
    body.addColorStop(0.32, "#d95b4a");
    body.addColorStop(1, "#2e0e0c");
    ctx.fillStyle = body;
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#f1b55d";
    ctx.beginPath();
    ctx.roundRect(-10, -18, 22, 36, 10);
    ctx.fill();
  }

  ctx.restore();
}

function drawBattery(ctx: CanvasRenderingContext2D, position: Vec2, carried: boolean): void {
  ctx.save();
  ctx.translate(position.x, position.y);
  if (carried) {
    ctx.scale(0.82, 0.82);
  }

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(0, 30, BATTERY_RADIUS * 1.1, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createLinearGradient(0, -BATTERY_RADIUS, 0, BATTERY_RADIUS * 1.7);
  body.addColorStop(0, "#ffe7be");
  body.addColorStop(0.28, "#f1b55d");
  body.addColorStop(1, "#9d5f1f");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(-BATTERY_RADIUS, -BATTERY_RADIUS, BATTERY_RADIUS * 2, BATTERY_RADIUS * 2.7, 10);
  ctx.fill();

  ctx.fillStyle = "#fff8ec";
  ctx.beginPath();
  ctx.roundRect(-10, -BATTERY_RADIUS - 6, 20, 10, 6);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.roundRect(-8, -4, 16, 20, 6);
  ctx.fill();

  ctx.restore();
}

function drawSpawnWarning(ctx: CanvasRenderingContext2D, warning: SpawnWarning): void {
  const progress = 1 - clamp(warning.ttlMs / warning.maxTtlMs, 0, 1);
  const color = warning.type === "carrier" ? "#f1b55d" : "#f0695d";
  const ringRadius = warning.type === "carrier" ? 44 : warning.type === "rammer" ? 40 : 34;
  const pulse = 1 + Math.sin(progress * Math.PI * 4) * 0.08;

  ctx.save();
  ctx.translate(warning.position.x, warning.position.y);

  ctx.globalAlpha = 0.24 + progress * 0.18;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius * pulse, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.14 + progress * 0.12;
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(0, 0, (ringRadius + 14) * (1.02 - progress * 0.08), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, ringRadius + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();

  ctx.globalAlpha = 0.52;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.fillStyle = "rgba(255,255,255,0.12)";

  if (warning.type === "scrapper") {
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.stroke();
  } else if (warning.type === "rammer") {
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.lineTo(-6, -14);
    ctx.lineTo(18, -14);
    ctx.lineTo(28, 0);
    ctx.lineTo(18, 14);
    ctx.lineTo(-6, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.roundRect(-24, -18, 48, 36, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(241,181,93,0.34)";
    ctx.beginPath();
    ctx.roundRect(-7, -11, 14, 22, 6);
    ctx.fill();
  }

  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, position: Vec2, velocity: Vec2): void {
  const direction = normalize(velocity);
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(position.x - direction.x * 22, position.y - direction.y * 22);
  ctx.lineTo(position.x + direction.x * 8, position.y + direction.y * 8);
  ctx.stroke();
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, particle: Particle): void {
  const alpha = clamp(particle.lifeMs / particle.maxLifeMs, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.position.x, particle.position.y, particle.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function normalize(vector: Vec2): Vec2 {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= 0.00001) return { x: 1, y: 0 };
  return { x: vector.x / length, y: vector.y / length };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
