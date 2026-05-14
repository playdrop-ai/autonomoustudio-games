import { clamp, lerp } from '../utils';
import { MAX_EXTRAPOLATION_MS, MAX_SNAPSHOT_BUFFER, SNAPSHOT_HISTORY_MS } from './config';
import type { MotionSnapshot } from './packets';

type SampledSnapshot =
  | { type: 'hold'; snapshot: MotionSnapshot }
  | { type: 'interpolate'; before: MotionSnapshot; after: MotionSnapshot; alpha: number }
  | { type: 'extrapolate'; snapshot: MotionSnapshot; previous: MotionSnapshot | null; age: number };

export function pushMotionSnapshot(snapshots: MotionSnapshot[], snapshot: MotionSnapshot) {
  const insertIndex = snapshots.findIndex((existing) => existing.timestamp > snapshot.timestamp);
  if (insertIndex === -1) {
    snapshots.push(snapshot);
  } else {
    snapshots.splice(insertIndex, 0, snapshot);
  }

  const newestTimestamp = snapshots[snapshots.length - 1]?.timestamp ?? snapshot.timestamp;
  const cutoff = newestTimestamp - SNAPSHOT_HISTORY_MS;
  while (snapshots.length > 0) {
    const oldest = snapshots[0];
    if (!oldest || oldest.timestamp >= cutoff) {
      break;
    }
    snapshots.shift();
  }
  if (snapshots.length > MAX_SNAPSHOT_BUFFER) {
    snapshots.splice(0, snapshots.length - MAX_SNAPSHOT_BUFFER);
  }
}

function sampleMotionSnapshot(snapshots: MotionSnapshot[], targetTime: number): SampledSnapshot | null {
  if (snapshots.length === 0) {
    return null;
  }

  let before: MotionSnapshot | null = null;
  let after: MotionSnapshot | null = null;

  for (const snapshot of snapshots) {
    if (snapshot.timestamp <= targetTime) {
      before = snapshot;
    }
    if (snapshot.timestamp >= targetTime) {
      after = snapshot;
      break;
    }
  }

  if (!before && after) {
    return { type: 'hold', snapshot: after };
  }

  if (!after && before) {
    const age = targetTime - before.timestamp;
    if (age <= MAX_EXTRAPOLATION_MS) {
      const previous = snapshots.length >= 2 ? snapshots[snapshots.length - 2] ?? null : null;
      return { type: 'extrapolate', snapshot: before, previous, age };
    }
    return { type: 'hold', snapshot: before };
  }

  if (!before || !after) {
    return { type: 'hold', snapshot: snapshots[snapshots.length - 1] };
  }

  if (before === after || before.resetSeq !== after.resetSeq) {
    return { type: 'hold', snapshot: after };
  }

  const span = Math.max(1, after.timestamp - before.timestamp);
  return {
    type: 'interpolate',
    before,
    after,
    alpha: clamp((targetTime - before.timestamp) / span, 0, 1),
  };
}

export function resolveMotionSnapshot(snapshots: MotionSnapshot[], targetTime: number) {
  const sampled = sampleMotionSnapshot(snapshots, targetTime);
  if (!sampled) {
    return null;
  }

  if (sampled.type === 'hold') {
    return {
      ...sampled.snapshot,
      spherePosition: sampled.snapshot.spherePosition.clone(),
      sphereVelocity: sampled.snapshot.sphereVelocity.clone(),
      quaternion: sampled.snapshot.quaternion.clone(),
    } satisfies MotionSnapshot;
  }

  if (sampled.type === 'extrapolate') {
    const { snapshot, age } = sampled;
    const spherePosition = snapshot.spherePosition
      .clone()
      .addScaledVector(snapshot.sphereVelocity, age / 1000);
    return {
      ...snapshot,
      spherePosition,
      sphereVelocity: snapshot.sphereVelocity.clone(),
      quaternion: snapshot.quaternion.clone(),
    } satisfies MotionSnapshot;
  }

  return {
    timestamp: lerp(sampled.before.timestamp, sampled.after.timestamp, sampled.alpha),
    spherePosition: sampled.before.spherePosition
      .clone()
      .lerp(sampled.after.spherePosition, sampled.alpha),
    sphereVelocity: sampled.before.sphereVelocity
      .clone()
      .lerp(sampled.after.sphereVelocity, sampled.alpha),
    quaternion: sampled.before.quaternion.clone().slerp(sampled.after.quaternion, sampled.alpha),
    speed: lerp(sampled.before.speed, sampled.after.speed, sampled.alpha),
    steer: lerp(sampled.before.steer, sampled.after.steer, sampled.alpha),
    throttle: lerp(sampled.before.throttle, sampled.after.throttle, sampled.alpha),
    vehicleIndex: sampled.after.vehicleIndex,
    resetSeq: sampled.after.resetSeq,
  } satisfies MotionSnapshot;
}
