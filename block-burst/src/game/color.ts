const WHITE = 0xffffff;

export function mix(c: number, c2: number, t: number): number {
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  const r2 = (c2 >> 16) & 255;
  const g2 = (c2 >> 8) & 255;
  const b2 = c2 & 255;
  return (clamp(r + (r2 - r) * t) << 16) | (clamp(g + (g2 - g) * t) << 8) | clamp(b + (b2 - b) * t);
}

export function mul(c: number, f: number): number {
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  return (clamp(r * f) << 16) | (clamp(g * f) << 8) | clamp(b * f);
}

export function hexStr(c: number): string {
  return `#${(c & WHITE).toString(16).padStart(6, "0")}`;
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}
