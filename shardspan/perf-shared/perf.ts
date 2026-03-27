import type { QualityProfileName } from './quality';

export type PerfSampleSource = 'raf' | 'synthetic';
export type PerfSubsystemTimeMap = Record<string, number>;
export type PerfEventRecord = {
  name: string;
  detail: string | null;
  durationMs: number | null;
  frameId: number | null;
  atMs: number;
};
export type PerfSpikeRecord = {
  source: PerfSampleSource;
  frameId: number | null;
  frameTimeMs: number;
  updateTimeMs: number;
  renderTimeMs: number;
  drawCalls: number | null;
  triangles: number | null;
  subsystemTimeMs: PerfSubsystemTimeMap | null;
  recentEvents: PerfEventRecord[];
};
export type PerfFrameStats = {
  drawCalls?: number | null;
  triangles?: number | null;
  subsystemTimeMs?: PerfSubsystemTimeMap | null;
  frameId?: number | null;
};

type PerfSample = {
  source: PerfSampleSource;
  frameId: number | null;
  frameTimeMs: number;
  updateTimeMs: number;
  renderTimeMs: number;
  drawCalls: number | null;
  triangles: number | null;
  subsystemTimeMs: PerfSubsystemTimeMap | null;
};

export type PerfSnapshot = {
  qualityProfile: QualityProfileName;
  frameTimingSource: 'none' | 'raf' | 'synthetic';
  realSampleCount: number;
  syntheticSampleCount: number;
  dpr: number;
  canvasWidth: number;
  canvasHeight: number;
  sampleCount: number;
  averageFrameTimeMs: number;
  p95FrameTimeMs: number;
  averageUpdateTimeMs: number;
  averageRenderTimeMs: number;
  averageDrawCallsPerFrame: number;
  averageTrianglesPerFrame: number;
  estimatedFps: number;
  averageSubsystemTimeMs: PerfSubsystemTimeMap | null;
  worstFrameTimeMs: number;
  framesOver16Ms: number;
  framesOver33Ms: number;
  recentSpikes: PerfSpikeRecord[];
};

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function percentile95(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return sorted[index];
}

function averageSubsystemTimeMs(samples: readonly PerfSample[]): PerfSubsystemTimeMap | null {
  const totals = new Map<string, { total: number; count: number }>();
  for (const sample of samples) {
    if (!sample.subsystemTimeMs) {
      continue;
    }
    for (const [name, durationMs] of Object.entries(sample.subsystemTimeMs)) {
      const normalizedDurationMs = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
      const entry = totals.get(name);
      if (entry) {
        entry.total += normalizedDurationMs;
        entry.count += 1;
        continue;
      }
      totals.set(name, { total: normalizedDurationMs, count: 1 });
    }
  }

  if (totals.size === 0) {
    return null;
  }

  const snapshot: PerfSubsystemTimeMap = {};
  for (const [name, entry] of totals.entries()) {
    snapshot[name] = Number((entry.total / Math.max(1, entry.count)).toFixed(3));
  }
  return snapshot;
}

function normalizePerfEventRecord(event: PerfEventRecord): PerfEventRecord {
  return {
    name: event.name,
    detail: event.detail,
    durationMs: event.durationMs === null ? null : Number(event.durationMs.toFixed(3)),
    frameId: event.frameId,
    atMs: Number(event.atMs.toFixed(3)),
  };
}

function normalizePerfSpikeRecord(spike: PerfSpikeRecord): PerfSpikeRecord {
  return {
    source: spike.source,
    frameId: spike.frameId,
    frameTimeMs: Number(spike.frameTimeMs.toFixed(3)),
    updateTimeMs: Number(spike.updateTimeMs.toFixed(3)),
    renderTimeMs: Number(spike.renderTimeMs.toFixed(3)),
    drawCalls: spike.drawCalls === null ? null : Number(spike.drawCalls.toFixed(3)),
    triangles: spike.triangles === null ? null : Number(spike.triangles.toFixed(3)),
    subsystemTimeMs: spike.subsystemTimeMs,
    recentEvents: spike.recentEvents.map((event) => normalizePerfEventRecord(event)),
  };
}

export function createPerfSubsystemTimer(names: readonly string[]) {
  const orderedNames = [...new Set(names)];
  const totals = new Map<string, number>(orderedNames.map((name) => [name, 0]));

  return {
    reset(): void {
      for (const name of orderedNames) {
        totals.set(name, 0);
      }
    },

    add(name: string, durationMs: number): void {
      if (!totals.has(name)) {
        totals.set(name, 0);
        orderedNames.push(name);
      }
      const normalizedDurationMs = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
      totals.set(name, (totals.get(name) ?? 0) + normalizedDurationMs);
    },

    snapshot(): PerfSubsystemTimeMap | null {
      const snapshot: PerfSubsystemTimeMap = {};
      let hasEntries = false;
      for (const name of orderedNames) {
        const durationMs = totals.get(name) ?? 0;
        if (durationMs <= 0) {
          continue;
        }
        snapshot[name] = Number(durationMs.toFixed(3));
        hasEntries = true;
      }
      return hasEntries ? snapshot : null;
    },
  };
}

export function createPerfTracker(qualityProfile: QualityProfileName, capacity = 180) {
  const samples: PerfSample[] = [];
  const recentEvents: PerfEventRecord[] = [];
  const recentSpikes: PerfSpikeRecord[] = [];
  let canvasWidth = 0;
  let canvasHeight = 0;
  let dpr = 1;
  const spikeThresholdMs = 24;
  const spikeEventLookbackMs = 250;
  const eventCapacity = 96;
  const spikeCapacity = 12;

  const trimRecentEvents = (nowMs: number): void => {
    while (recentEvents.length > eventCapacity || (recentEvents[0] && nowMs - recentEvents[0].atMs > 2000)) {
      recentEvents.shift();
    }
  };

  return {
    setCanvasMetrics(nextWidth: number, nextHeight: number, nextDpr: number): void {
      canvasWidth = nextWidth;
      canvasHeight = nextHeight;
      dpr = nextDpr;
    },

    reset(): void {
      samples.length = 0;
      recentEvents.length = 0;
      recentSpikes.length = 0;
    },

    markEvent(
      name: string,
      detail: string | null = null,
      durationMs: number | null = null,
      frameId: number | null = null,
    ): void {
      const nowMs = performance.now();
      recentEvents.push({
        name,
        detail,
        durationMs:
          typeof durationMs === 'number' && Number.isFinite(durationMs) ? Math.max(0, durationMs) : null,
        frameId: typeof frameId === 'number' && Number.isFinite(frameId) ? frameId : null,
        atMs: nowMs,
      });
      trimRecentEvents(nowMs);
    },

    recordFrame(
      frameTimeMs: number,
      updateTimeMs: number,
      renderTimeMs: number,
      source: PerfSampleSource = 'raf',
      stats: PerfFrameStats = {},
    ): void {
      const normalizedSubsystemTimeMs = stats.subsystemTimeMs ?? null;
      samples.push({
        source,
        frameId:
          typeof stats.frameId === 'number' && Number.isFinite(stats.frameId) ? Math.max(0, stats.frameId) : null,
        frameTimeMs,
        updateTimeMs,
        renderTimeMs,
        drawCalls:
          typeof stats.drawCalls === 'number' && Number.isFinite(stats.drawCalls)
            ? Math.max(0, stats.drawCalls)
            : null,
        triangles:
          typeof stats.triangles === 'number' && Number.isFinite(stats.triangles)
            ? Math.max(0, stats.triangles)
            : null,
        subsystemTimeMs: normalizedSubsystemTimeMs,
      });
      if (samples.length > capacity) {
        samples.shift();
      }

      const nowMs = performance.now();
      trimRecentEvents(nowMs);

      if (source === 'raf' && frameTimeMs >= spikeThresholdMs) {
        recentSpikes.push(
          normalizePerfSpikeRecord({
            source,
            frameId:
              typeof stats.frameId === 'number' && Number.isFinite(stats.frameId)
                ? Math.max(0, stats.frameId)
                : null,
            frameTimeMs,
            updateTimeMs,
            renderTimeMs,
            drawCalls:
              typeof stats.drawCalls === 'number' && Number.isFinite(stats.drawCalls)
                ? Math.max(0, stats.drawCalls)
                : null,
            triangles:
              typeof stats.triangles === 'number' && Number.isFinite(stats.triangles)
                ? Math.max(0, stats.triangles)
                : null,
            subsystemTimeMs: normalizedSubsystemTimeMs,
            recentEvents: recentEvents
              .filter((event) => nowMs - event.atMs <= spikeEventLookbackMs)
              .map((event) => normalizePerfEventRecord(event)),
          }),
        );
        if (recentSpikes.length > spikeCapacity) {
          recentSpikes.shift();
        }
      }
    },

    snapshot(): PerfSnapshot {
      const realSamples = samples.filter((sample) => sample.source === 'raf');
      const selectedSamples = realSamples.length > 0 ? realSamples : samples;
      const frameTimes = selectedSamples.map((sample) => sample.frameTimeMs);
      const updateTimes = selectedSamples.map((sample) => sample.updateTimeMs);
      const renderTimes = selectedSamples.map((sample) => sample.renderTimeMs);
      const drawCalls = selectedSamples.flatMap((sample) => (sample.drawCalls === null ? [] : [sample.drawCalls]));
      const triangles = selectedSamples.flatMap((sample) =>
        sample.triangles === null ? [] : [sample.triangles],
      );
      const averageFrameTimeMs = average(frameTimes);
      const worstFrameTimeMs = frameTimes.reduce((worst, frameTime) => Math.max(worst, frameTime), 0);
      return {
        qualityProfile,
        frameTimingSource:
          realSamples.length > 0 ? 'raf' : selectedSamples.length > 0 ? 'synthetic' : 'none',
        realSampleCount: realSamples.length,
        syntheticSampleCount: samples.length - realSamples.length,
        dpr: Number(dpr.toFixed(3)),
        canvasWidth,
        canvasHeight,
        sampleCount: selectedSamples.length,
        averageFrameTimeMs: Number(averageFrameTimeMs.toFixed(3)),
        p95FrameTimeMs: Number(percentile95(frameTimes).toFixed(3)),
        averageUpdateTimeMs: Number(average(updateTimes).toFixed(3)),
        averageRenderTimeMs: Number(average(renderTimes).toFixed(3)),
        averageDrawCallsPerFrame: Number(average(drawCalls).toFixed(3)),
        averageTrianglesPerFrame: Number(average(triangles).toFixed(3)),
        estimatedFps: averageFrameTimeMs > 0 ? Number((1000 / averageFrameTimeMs).toFixed(3)) : 0,
        averageSubsystemTimeMs: averageSubsystemTimeMs(selectedSamples),
        worstFrameTimeMs: Number(worstFrameTimeMs.toFixed(3)),
        framesOver16Ms: frameTimes.filter((frameTime) => frameTime > 16.7).length,
        framesOver33Ms: frameTimes.filter((frameTime) => frameTime > 33.3).length,
        recentSpikes: [...recentSpikes],
      };
    },
  };
}

export function createPerfHud(title: string) {
  const root = document.createElement('pre');
  root.style.position = 'fixed';
  root.style.right = 'max(12px, env(safe-area-inset-right))';
  root.style.bottom = 'max(12px, env(safe-area-inset-bottom))';
  root.style.zIndex = '40';
  root.style.margin = '0';
  root.style.padding = '10px 12px';
  root.style.borderRadius = '14px';
  root.style.background = 'rgba(15, 23, 42, 0.88)';
  root.style.color = '#f8fafc';
  root.style.font = '600 12px/1.45 Menlo, Monaco, monospace';
  root.style.pointerEvents = 'none';
  root.style.whiteSpace = 'pre';
  root.hidden = true;
  root.dataset.role = 'perf-hud';

  return {
    root,
    setVisible(visible: boolean): void {
      root.hidden = !visible;
    },
    update(snapshot: PerfSnapshot): void {
      const subsystemLine = snapshot.averageSubsystemTimeMs
        ? Object.entries(snapshot.averageSubsystemTimeMs)
            .sort((left, right) => right[1] - left[1])
            .slice(0, 4)
            .map(([name, durationMs]) => `${name} ${durationMs.toFixed(2)}ms`)
            .join(' | ')
        : '';
      const frameTimingLabel =
        snapshot.frameTimingSource === 'raf'
          ? 'frame'
          : snapshot.frameTimingSource === 'synthetic'
            ? 'frame synthetic'
            : 'frame n/a';
      root.textContent = [
        title,
        `quality ${snapshot.qualityProfile} | ${frameTimingLabel} | fps ${snapshot.estimatedFps.toFixed(1)} | p95 ${snapshot.p95FrameTimeMs.toFixed(1)}ms`,
        `update ${snapshot.averageUpdateTimeMs.toFixed(2)}ms | render ${snapshot.averageRenderTimeMs.toFixed(2)}ms`,
        `worst ${snapshot.worstFrameTimeMs.toFixed(1)}ms | >16 ${snapshot.framesOver16Ms} | >33 ${snapshot.framesOver33Ms}`,
        `draw ${snapshot.averageDrawCallsPerFrame.toFixed(1)} | tris ${snapshot.averageTrianglesPerFrame.toFixed(0)}`,
        `canvas ${snapshot.canvasWidth}x${snapshot.canvasHeight} | dpr ${snapshot.dpr.toFixed(2)}`,
        subsystemLine.length > 0 ? `sys ${subsystemLine}` : '',
      ]
        .filter((line) => line.length > 0)
        .join('\n');
    },
  };
}
