import type { PerfSnapshot } from './perf';

export type BenchmarkPayload = {
  app: string;
  ghostRun: string | null;
  qualityProfile: PerfSnapshot['qualityProfile'];
  fps: number;
  averageFrameTimeMs: number;
  p95FrameTimeMs: number;
  averageUpdateTimeMs: number;
  averageRenderTimeMs: number;
  averageDrawCallsPerFrame: number;
  averageTrianglesPerFrame: number;
  dpr: number;
  canvasWidth: number;
  canvasHeight: number;
  realSampleCount: number;
  worstFrameTimeMs: number;
  framesOver16Ms: number;
  framesOver33Ms: number;
  spikeCount: number;
};

export function createBenchmarkPayload(
  app: string,
  ghostRun: string | null,
  snapshot: PerfSnapshot,
): BenchmarkPayload {
  return {
    app,
    ghostRun,
    qualityProfile: snapshot.qualityProfile,
    fps: snapshot.estimatedFps,
    averageFrameTimeMs: snapshot.averageFrameTimeMs,
    p95FrameTimeMs: snapshot.p95FrameTimeMs,
    averageUpdateTimeMs: snapshot.averageUpdateTimeMs,
    averageRenderTimeMs: snapshot.averageRenderTimeMs,
    averageDrawCallsPerFrame: snapshot.averageDrawCallsPerFrame,
    averageTrianglesPerFrame: snapshot.averageTrianglesPerFrame,
    dpr: snapshot.dpr,
    canvasWidth: snapshot.canvasWidth,
    canvasHeight: snapshot.canvasHeight,
    realSampleCount: snapshot.realSampleCount,
    worstFrameTimeMs: snapshot.worstFrameTimeMs,
    framesOver16Ms: snapshot.framesOver16Ms,
    framesOver33Ms: snapshot.framesOver33Ms,
    spikeCount: snapshot.recentSpikes.length,
  };
}

export function formatBenchmarkTitle(payload: BenchmarkPayload): string {
  return `BENCHMARK ${JSON.stringify(payload)}`;
}

export function formatBenchmarkErrorTitle(app: string, message: string): string {
  return `BENCHMARK_ERROR ${JSON.stringify({
    app,
    message,
  })}`;
}
