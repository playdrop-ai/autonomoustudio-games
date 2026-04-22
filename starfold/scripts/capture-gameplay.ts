import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

import { applyMove, BOARD_COLS, BOARD_ROWS, createInitialState, type Move } from "../src/game/logic.ts";

interface Options {
  url: string;
  seed: number;
  width: number;
  height: number;
  moves: number;
  screenshot?: string;
  screenshotAfter: number;
  tailMs: number;
  videoDir: string;
}

interface DebugLayout {
  boardX: number;
  boardY: number;
  cellSize: number;
  gap: number;
}

const DEFAULTS: Options = {
  url: "http://127.0.0.1:4323/",
  seed: 20260326,
  width: 1280,
  height: 720,
  moves: 12,
  screenshotAfter: 0,
  tailMs: 700,
  videoDir: "output/playwright/videos",
};

const ALL_MOVES: Move[] = [
  ...Array.from({ length: BOARD_ROWS }, (_, index) => ({ axis: "row" as const, index, direction: -1 as const })),
  ...Array.from({ length: BOARD_ROWS }, (_, index) => ({ axis: "row" as const, index, direction: 1 as const })),
  ...Array.from({ length: BOARD_COLS }, (_, index) => ({ axis: "col" as const, index, direction: -1 as const })),
  ...Array.from({ length: BOARD_COLS }, (_, index) => ({ axis: "col" as const, index, direction: 1 as const })),
];

const options = parseArgs(process.argv.slice(2));
const moves = planMoves(options.seed, options.moves);

await mkdir(options.videoDir, { recursive: true });
if (options.screenshot) {
  await mkdir(path.dirname(options.screenshot), { recursive: true });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: options.width, height: options.height },
  deviceScaleFactor: 1,
  recordVideo: {
    dir: options.videoDir,
    size: { width: options.width, height: options.height },
  },
});
const page = await context.newPage();
const video = page.video();

await page.goto(withSeed(options.url, options.seed), { waitUntil: "networkidle" });
await page.waitForFunction(() => Boolean(window.__starfoldDebug));
await waitForIdle(page);

let screenshotTaken = false;
if (options.screenshot && options.screenshotAfter === 0) {
  await page.screenshot({ path: options.screenshot });
  screenshotTaken = true;
}

for (let index = 0; index < moves.length; index += 1) {
  await performMove(page, moves[index]!);
  if (options.screenshot && !screenshotTaken && index + 1 === options.screenshotAfter) {
    await page.screenshot({ path: options.screenshot });
    screenshotTaken = true;
  }
}

await page.waitForTimeout(options.tailMs);
const finalState = await readDebugState(page);
await context.close();
await browser.close();

const videoPath = video ? await video.path() : "";
process.stdout.write(
  JSON.stringify(
    {
      videoPath,
      moves,
      finalScore: finalState?.score ?? null,
      ashCount: finalState?.ashCount ?? null,
    },
    null,
    2,
  ) + "\n",
);

function parseArgs(argv: string[]): Options {
  const parsed = { ...DEFAULTS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    const next = argv[index + 1];
    switch (arg) {
      case "--url":
        if (!next) throw new Error("Missing value for --url");
        parsed.url = next;
        index += 1;
        break;
      case "--seed":
        parsed.seed = parseIntArg(next, "--seed");
        index += 1;
        break;
      case "--width":
        parsed.width = parseIntArg(next, "--width");
        index += 1;
        break;
      case "--height":
        parsed.height = parseIntArg(next, "--height");
        index += 1;
        break;
      case "--moves":
        parsed.moves = parseIntArg(next, "--moves");
        index += 1;
        break;
      case "--tail-ms":
        parsed.tailMs = parseIntArg(next, "--tail-ms");
        index += 1;
        break;
      case "--screenshot-after":
        parsed.screenshotAfter = parseIntArg(next, "--screenshot-after");
        index += 1;
        break;
      case "--screenshot":
        if (!next) throw new Error("Missing value for --screenshot");
        parsed.screenshot = next;
        index += 1;
        break;
      case "--video-dir":
        if (!next) throw new Error("Missing value for --video-dir");
        parsed.videoDir = next;
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function parseIntArg(value: string | undefined, flag: string): number {
  if (!value) throw new Error(`Missing value for ${flag}`);
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid integer for ${flag}: ${value}`);
  return parsed;
}

function withSeed(url: string, seed: number): string {
  const target = new URL(url);
  target.searchParams.set("seed", String(seed));
  return target.toString();
}

function planMoves(seed: number, moveCount: number): Move[] {
  let state = createInitialState(seed);
  let previousAxis: Move["axis"] | null = null;
  const planned: Move[] = [];

  for (let step = 0; step < moveCount && !state.gameOver; step += 1) {
    let best: { move: Move; heuristic: number; state: typeof state } | null = null;

    for (const move of ALL_MOVES) {
      const result = applyMove(state, move);
      const clears = result.stages.filter((stage) => stage.kind === "clear").length;
      const spawnedAsh = result.stages.some((stage) => stage.kind === "ash");
      const ashReduction = state.ashCount - result.state.ashCount;
      const heuristic =
        result.scoreGained * 14 +
        clears * 700 +
        result.maxCombo * 1500 +
        ashReduction * 2600 -
        result.state.ashCount * 220 -
        (result.state.gameOver ? 100000 : 0) +
        (move.axis !== previousAxis ? 80 : 0) -
        (spawnedAsh ? 120 : 0);

      if (!best || heuristic > best.heuristic) {
        best = {
          move,
          heuristic,
          state: result.state,
        };
      }
    }

    if (!best) break;
    planned.push(best.move);
    previousAxis = best.move.axis;
    state = best.state;
  }

  return planned;
}

async function performMove(page: import("playwright").Page, move: Move): Promise<void> {
  await waitForIdle(page);
  const point = await page.evaluate(
    ({ move }) => {
      const debug = window.__starfoldDebug;
      if (!debug) throw new Error("Debug state unavailable");
      const layout = debug.layout;
      const row = move.axis === "row" ? move.index : 2;
      const col = move.axis === "col" ? move.index : 2;
      return {
        x: layout.boardX + col * (layout.cellSize + layout.gap) + layout.cellSize / 2,
        y: layout.boardY + row * (layout.cellSize + layout.gap) + layout.cellSize / 2,
        delta: Math.max(34, layout.cellSize * 0.78),
      };
    },
    { move },
  );

  const dx = move.axis === "row" ? point.delta * move.direction : 0;
  const dy = move.axis === "col" ? point.delta * move.direction : 0;

  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + dx, point.y + dy, { steps: 12 });
  await page.mouse.up();

  await page.waitForFunction(() => Boolean(window.__starfoldDebug?.animating), undefined, { timeout: 3000 });
  await waitForIdle(page);
}

async function waitForIdle(page: import("playwright").Page): Promise<void> {
  await page.waitForFunction(() => window.__starfoldDebug?.animating === false, undefined, { timeout: 15000 });
}

async function readDebugState(page: import("playwright").Page): Promise<{ score: number; ashCount: number; layout: DebugLayout }> {
  return page.evaluate(() => {
    const debug = window.__starfoldDebug;
    if (!debug) throw new Error("Debug state unavailable");
    return {
      score: debug.score,
      ashCount: debug.ashCount,
      layout: debug.layout,
    };
  });
}
