export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

export function lerp(current: number, target: number, alpha: number) {
  return current + (target - current) * alpha;
}

export function lerpAngle(current: number, target: number, alpha: number) {
  let delta = target - current;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * alpha;
}

export function dbToGain(db: number) {
  return Math.pow(10, db / 20);
}
