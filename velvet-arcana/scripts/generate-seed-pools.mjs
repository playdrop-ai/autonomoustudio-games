import { mkdirSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, resolve } from "node:path";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

import {
  analyzeSpread,
  createSpreadFromAcceptedSeed,
  drawFromStock,
  getPlayableIndices,
} from "../src/game/state.ts";

const DEFAULT_COUNT = 1000;
const DEFAULT_OUTPUT_DIR = resolve(process.cwd(), "assets/seed-pools");
const DEFAULT_WORKERS = Math.max(1, Math.min(availableParallelism(), 12));
const SPECS = [
  { difficulty: "easy", label: "Past", targetDifficulty: "easy", startSeed: 10_000 },
  { difficulty: "medium", label: "Present", targetDifficulty: "medium", startSeed: 2_000_000 },
  { difficulty: "hard", label: "Future", targetDifficulty: "hard", startSeed: 4_000_000 },
];

const count = readIntFlag("--count", DEFAULT_COUNT);
const outputDir = readStringFlag("--output-dir", DEFAULT_OUTPUT_DIR);
const workerCount = readIntFlag("--workers", DEFAULT_WORKERS);

if (!isMainThread) {
  const { spec, count, workerIndex, workerCount } = workerData;
  const seeds = generatePoolChunk(spec, count, workerIndex, workerCount);
  parentPort?.postMessage({ type: "done", seeds });
} else {
  for (const spec of SPECS) {
    const startedAt = Date.now();
    const values = await generatePool(spec, count, workerCount);
    const outputPath = resolve(outputDir, `${spec.difficulty}.uint32`);

    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, encodeUint32LE(values));

    console.log(
      `[seed-pools] wrote ${spec.difficulty} (${spec.label}/${spec.targetDifficulty}) ${values.length} seeds to ${outputPath} in ${formatDuration(Date.now() - startedAt)}`,
    );
  }
}

async function generatePool(spec, count, workerCount) {
  const parallelWorkers = Math.max(1, Math.min(workerCount, count));
  const targetPerWorker = Math.ceil(count / parallelWorkers);
  const workerRuns = Array.from({ length: parallelWorkers }, (_, workerIndex) =>
    runPoolWorker(spec, targetPerWorker, workerIndex, parallelWorkers),
  );
  const results = (await Promise.all(workerRuns)).flat();
  const seeds = Uint32Array.from(results.sort((left, right) => left - right).slice(0, count));

  if (seeds.length !== count) {
    throw new Error(`[seed-pools] expected ${count} ${spec.difficulty} seeds, got ${seeds.length}`);
  }

  console.log(`[seed-pools] ${spec.difficulty} progress ${seeds.length}/${count}`);
  return seeds;
}

function runPoolWorker(spec, count, workerIndex, workerCount) {
  return new Promise((resolvePromise, rejectPromise) => {
    const worker = new Worker(new URL(import.meta.url), {
      workerData: { spec, count, workerIndex, workerCount },
    });

    worker.once("message", (message) => {
      if (message?.type !== "done" || !Array.isArray(message.seeds)) {
        rejectPromise(new Error(`[seed-pools] invalid worker payload for ${spec.difficulty}`));
        return;
      }

      console.log(
        `[seed-pools] ${spec.difficulty} worker ${workerIndex + 1}/${workerCount} accepted ${message.seeds.length} seeds`,
      );
      resolvePromise(message.seeds);
    });
    worker.once("error", rejectPromise);
    worker.once("exit", (code) => {
      if (code !== 0) {
        rejectPromise(new Error(`[seed-pools] worker exited with code ${code} for ${spec.difficulty}`));
      }
    });
  });
}

function generatePoolChunk(spec, count, workerIndex, workerCount) {
  const acceptedSeeds = [];
  let candidateSeed = spec.startSeed + workerIndex;

  while (acceptedSeeds.length < count) {
    const acceptedSeed = candidateSeed >>> 0;
    candidateSeed += workerCount;

    const spread = createSpreadFromAcceptedSeed(acceptedSeed, spec.label);
    if (getPlayableIndices(drawFromStock(spread)).length === 0) continue;

    const analysis = analyzeSpread(spread);
    if (analysis.difficultyBand !== spec.targetDifficulty) continue;

    acceptedSeeds.push(acceptedSeed);
  }

  return acceptedSeeds;
}

function readIntFlag(flag, fallback) {
  const raw = readStringFlag(flag, null);
  if (raw === null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`[seed-pools] invalid numeric value for ${flag}: ${raw}`);
  }
  return parsed;
}

function readStringFlag(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`[seed-pools] missing value for ${flag}`);
  }
  return value;
}

function formatDuration(durationMs) {
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function encodeUint32LE(values) {
  const buffer = Buffer.allocUnsafe(values.length * 4);
  for (let index = 0; index < values.length; index += 1) {
    buffer.writeUInt32LE(values[index] ?? 0, index * 4);
  }
  return buffer;
}
