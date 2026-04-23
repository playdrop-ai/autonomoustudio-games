import { chromium, webkit, type BrowserType, type Page } from "playwright";

import { createBoardFromSpecs, getPlayableMoves, type TileKind } from "../src/game/logic.ts";

interface Options {
  url: string;
  seed: number;
  width: number;
  height: number;
  browser: "chromium" | "webkit" | "all";
  moves: number;
}

interface DebugLayout {
  boardX: number;
  boardY: number;
  cellSize: number;
  gap: number;
}

const DEFAULTS: Options = {
  url: "http://127.0.0.1:4173/",
  seed: 20260326,
  width: 390,
  height: 844,
  browser: "all",
  moves: 6,
};

const options = parseArgs(process.argv.slice(2));
const browsers = resolveBrowsers(options.browser);
const results = [];

for (const browserType of browsers) {
  results.push(await runBenchmark(browserType, options));
}

process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);

async function runBenchmark(browserType: BrowserType, options: Options) {
  const browser = await browserType.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: options.width, height: options.height },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const navigationStart = Date.now();
    await page.goto(withSeed(options.url, options.seed), { waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.__starfoldDebug));
    await page.waitForFunction(() => window.__starfoldDebug?.startup.active === false);
    await page.waitForFunction(() => window.__starfoldDebug?.render.loopActive === false);
    const startupReadyMs = Date.now() - navigationStart;

    const firstMoveMetrics = await performMoveAndTrack(page, await chooseCenterMovePoint(page));
    const postUnlockSfxReadyMs = await waitForHotSfxReady(page);

    let maxGlobalVoices = firstMoveMetrics.maxGlobalVoices;
    let maxActiveOneShots = firstMoveMetrics.maxActiveOneShots;
    let musicStarted = firstMoveMetrics.musicStarted;
    let sfxReadyCount = firstMoveMetrics.sfxReadyCount;

    for (let index = 1; index < options.moves; index += 1) {
      const metrics = await performMoveAndTrack(page, await chooseCenterMovePoint(page));
      maxGlobalVoices = Math.max(maxGlobalVoices, metrics.maxGlobalVoices);
      maxActiveOneShots = Math.max(maxActiveOneShots, metrics.maxActiveOneShots);
      musicStarted ||= metrics.musicStarted;
      sfxReadyCount = Math.max(sfxReadyCount, metrics.sfxReadyCount);
    }

    const idleLoopStopped = await page.evaluate(() => window.__starfoldDebug?.render.loopActive === false);
    await context.close();

    return {
      browser: browserType.name(),
      startupReadyMs,
      postUnlockSfxReadyMs,
      musicStarted,
      sfxReadyCount,
      idleLoopStopped,
      maxGlobalVoices,
      maxActiveOneShots,
    };
  } finally {
    await browser.close();
  }
}

async function chooseCenterMovePoint(page: Page): Promise<{ x: number; y: number; delta: number }> {
  return page.evaluate(() => {
    const debug = window.__starfoldDebug;
    if (!debug) {
      throw new Error("Debug state unavailable");
    }
    const layout = debug.layout as DebugLayout;
    return {
      x: layout.boardX + 2 * (layout.cellSize + layout.gap) + layout.cellSize / 2,
      y: layout.boardY + 2 * (layout.cellSize + layout.gap) + layout.cellSize / 2,
      delta: Math.max(34, layout.cellSize * 0.78),
    };
  });
}

async function performMoveAndTrack(page: Page, point: { x: number; y: number; delta: number }) {
  const move = await determinePlayableMove(page);
  const dx = move.axis === "row" ? point.delta * move.direction : 0;
  const dy = move.axis === "col" ? point.delta * move.direction : 0;
  const movePoint = await page.evaluate(
    ({ move }) => {
      const debug = window.__starfoldDebug;
      if (!debug) {
        throw new Error("Debug state unavailable");
      }
      const layout = debug.layout as DebugLayout;
      const row = move.axis === "row" ? move.index : 2;
      const col = move.axis === "col" ? move.index : 2;
      return {
        x: layout.boardX + col * (layout.cellSize + layout.gap) + layout.cellSize / 2,
        y: layout.boardY + row * (layout.cellSize + layout.gap) + layout.cellSize / 2,
      };
    },
    { move },
  );

  await page.mouse.move(movePoint.x, movePoint.y);
  await page.mouse.down();
  await page.mouse.move(movePoint.x + dx, movePoint.y + dy, { steps: 12 });
  await page.mouse.up();

  await page.waitForFunction(() => window.__starfoldDebug?.animating === true, undefined, { timeout: 3000 });
  let maxGlobalVoices = 0;
  let maxActiveOneShots = 0;
  let musicStarted = false;
  let sfxReadyCount = 0;

  while (true) {
    const debug = await page.evaluate(() => {
      const snapshot = window.__starfoldDebug;
      if (!snapshot) {
        throw new Error("Debug state unavailable");
      }
      return {
        animating: snapshot.animating,
        audio: snapshot.audio,
        render: snapshot.render,
      };
    });
    maxGlobalVoices = Math.max(maxGlobalVoices, debug.audio.globalVoices);
    maxActiveOneShots = Math.max(maxActiveOneShots, debug.audio.activeOneShots);
    musicStarted ||= debug.audio.musicStarted;
    sfxReadyCount = Math.max(sfxReadyCount, debug.audio.sfxReadyCount);
    if (!debug.animating && debug.render.loopActive === false) {
      break;
    }
    await page.waitForTimeout(30);
  }

  return {
    maxGlobalVoices,
    maxActiveOneShots,
    musicStarted,
    sfxReadyCount,
  };
}

async function determinePlayableMove(page: Page) {
  const boardKinds = await page.evaluate(() => {
    const debug = window.__starfoldDebug;
    if (!debug) {
      throw new Error("Debug state unavailable");
    }
    return debug.board;
  });
  const board = createBoardFromSpecs(
    (boardKinds as string[][]).map((row) =>
      row.map((tile) => {
        const contaminated = tile.endsWith("*");
        return {
          kind: (contaminated ? tile.slice(0, -1) : tile) as TileKind,
          contaminated,
        };
      }),
    ),
  ).board;
  const moves = getPlayableMoves(board);
  const move = moves[0];
  if (!move) {
    throw new Error("No playable move available for benchmark");
  }
  return move;
}

async function waitForHotSfxReady(page: Page): Promise<number | null> {
  const start = Date.now();
  try {
    await page.waitForFunction(() => (window.__starfoldDebug?.audio.sfxReadyCount ?? 0) >= 7, undefined, {
      timeout: 5000,
    });
    return Date.now() - start;
  } catch {
    return null;
  }
}

function resolveBrowsers(target: Options["browser"]): BrowserType[] {
  if (target === "chromium") {
    return [chromium];
  }
  if (target === "webkit") {
    return [webkit];
  }
  return [chromium, webkit];
}

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
      case "--browser":
        if (!next || !["chromium", "webkit", "all"].includes(next)) {
          throw new Error("Missing or invalid value for --browser");
        }
        parsed.browser = next as Options["browser"];
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
