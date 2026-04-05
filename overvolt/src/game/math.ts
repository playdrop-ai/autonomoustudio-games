export interface Vec2 {
  x: number;
  y: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function length(vec: Vec2): number {
  return Math.hypot(vec.x, vec.y);
}

export function normalize(vec: Vec2): Vec2 {
  const magnitude = length(vec);
  if (magnitude <= 1e-6) {
    return { x: 0, y: 0 };
  }
  return {
    x: vec.x / magnitude,
    y: vec.y / magnitude,
  };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(vec: Vec2, factor: number): Vec2 {
  return { x: vec.x * factor, y: vec.y * factor };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function angleToVector(angle: number): Vec2 {
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
}

export function vectorToAngle(vec: Vec2): number {
  return Math.atan2(vec.y, vec.x);
}

export function wrapAngle(angle: number): number {
  let next = angle;
  while (next <= -Math.PI) next += Math.PI * 2;
  while (next > Math.PI) next -= Math.PI * 2;
  return next;
}

export function turnToward(current: number, target: number, maxStep: number): number {
  const delta = wrapAngle(target - current);
  if (Math.abs(delta) <= maxStep) {
    return target;
  }
  return wrapAngle(current + Math.sign(delta) * maxStep);
}

export function smoothstep(min: number, max: number, value: number): number {
  const t = clamp01((value - min) / (max - min));
  return t * t * (3 - 2 * t);
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remain).padStart(2, "0")}`;
}
