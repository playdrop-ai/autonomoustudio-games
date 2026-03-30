import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { chromium } from "/opt/homebrew/lib/node_modules/playwright/index.mjs";
import { commitWord, createInitialState, findCandidateWords } from "../src/game/logic.ts";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const listingDir = path.join(rootDir, "listing");
const outputDir = path.join(rootDir, "output", "media-capture");
const reviewMediaDir = path.join(rootDir, "output", "review-media");
const screenshotsDir = path.join(reviewMediaDir, "screenshots");
const rawVideoDir = path.join(outputDir, "raw-video");
const rootShotsDir = path.join(outputDir, "shots");

const PORTRAIT = { width: 720, height: 1280 };
const LANDSCAPE = { width: 1280, height: 720 };
const SHOWCASE_SEED = 144;
const LOSS_SEED = 95;
const SHOWCASE_TURNS = 8;
const MAX_LOSS_TURNS = 16;
const SHOWCASE_PLAN = planRun(SHOWCASE_SEED, SHOWCASE_TURNS, "casual");
const LOSS_PLAN = planRun(LOSS_SEED, MAX_LOSS_TURNS, "casual");

if (!LOSS_PLAN.gameOver) {
  throw new Error("Loss capture seed does not reach game over");
}

const portraitGameplayPath = path.join(listingDir, "wordbraid_720x1280-screenshot-1.png");
const portraitGameoverPath = path.join(listingDir, "wordbraid_720x1280-screenshot-2.png");
const landscapeGameplayPath = path.join(listingDir, "wordbraid_1280x720-screenshot-1.png");
const landscapeRecordingPath = path.join(listingDir, "wordbraid_1280x720-recording.mp4");
const landscapeGameplayVideoPath = path.join(reviewMediaDir, "wordbraid-gameplay.mp4");

fs.mkdirSync(listingDir, { recursive: true });
fs.mkdirSync(reviewMediaDir, { recursive: true });
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(rawVideoDir, { recursive: true });
fs.mkdirSync(rootShotsDir, { recursive: true });

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  await capturePortraitGameplay(browser, server.url);
  await capturePortraitGameover(browser, server.url);
  await captureLandscapeGameplay(browser, server.url);
  await captureLandscapeVideo(browser, server.url);

  console.log(
    JSON.stringify(
      {
        ok: true,
        portraitGameplayPath,
        portraitGameoverPath,
        landscapeGameplayPath,
        landscapeRecordingPath,
        landscapeGameplayVideoPath,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await server.close();
}

async function capturePortraitGameplay(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: PORTRAIT,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await openRun(page, serverUrl, SHOWCASE_SEED);
    await playTurns(page, SHOWCASE_PLAN.pulls, {
      selectDelayMs: 80,
      settleDelayMs: 140,
    });
    await page.screenshot({ path: path.join(rootShotsDir, "portrait-gameplay.png") });
    await page.screenshot({ path: path.join(screenshotsDir, "portrait-gameplay.png") });
    await page.screenshot({ path: portraitGameplayPath });
  } finally {
    await context.close();
  }
}

async function capturePortraitGameover(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: PORTRAIT,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await openRun(page, serverUrl, LOSS_SEED);
    await playToGameover(page, LOSS_PLAN.pulls, {
      selectDelayMs: 80,
      settleDelayMs: 140,
    });
    await page.screenshot({ path: path.join(rootShotsDir, "portrait-gameover.png") });
    await page.screenshot({ path: path.join(screenshotsDir, "portrait-gameover.png") });
    await page.screenshot({ path: portraitGameoverPath });
  } finally {
    await context.close();
  }
}

async function captureLandscapeGameplay(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: LANDSCAPE,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await openRun(page, serverUrl, SHOWCASE_SEED);
    await playTurns(page, SHOWCASE_PLAN.pulls, {
      selectDelayMs: 80,
      settleDelayMs: 140,
    });
    await page.screenshot({ path: path.join(rootShotsDir, "landscape-gameplay.png") });
    await page.screenshot({ path: path.join(screenshotsDir, "landscape-gameplay.png") });
    await page.screenshot({ path: landscapeGameplayPath });
  } finally {
    await context.close();
  }
}

async function captureLandscapeVideo(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: LANDSCAPE,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
    recordVideo: {
      dir: rawVideoDir,
      size: LANDSCAPE,
    },
  });
  const page = await context.newPage();

  try {
    await openRun(page, serverUrl, LOSS_SEED);
    const video = page.video();
    if (!video) throw new Error("Playwright video recording did not start");

    await playToGameover(page, LOSS_PLAN.pulls, {
      selectDelayMs: 180,
      settleDelayMs: 520,
    });
    await page.waitForTimeout(850);

    await page.screenshot({ path: path.join(rootShotsDir, "landscape-video-end.png") });
    await page.close();
    await context.close();

    const savedVideoPath = await video.path();
    const rawVideoPath = path.join(rawVideoDir, "wordbraid-landscape.webm");
    fs.copyFileSync(savedVideoPath, rawVideoPath);

    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      rawVideoPath,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      landscapeRecordingPath,
    ]);
    fs.copyFileSync(landscapeRecordingPath, landscapeGameplayVideoPath);
  } finally {
    try {
      await context.close();
    } catch {}
  }
}

async function openRun(page, serverUrl, seed) {
  await page.goto(`${serverUrl}/index.html?seed=${seed}`, { waitUntil: "load" });
  await waitForReady(page);
  await page.evaluate(() => {
    window.localStorage.clear();
  });
  await page.reload({ waitUntil: "load" });
  await waitForReady(page);
  await page.evaluate(() => {
    window.__wordbraidControls?.start();
  });
  await page.waitForFunction(() => window.__wordbraidDebug?.screen === "playing");
  await page.waitForTimeout(140);
}

async function playTurns(page, pullSequence, options) {
  for (const pulls of pullSequence) {
    const debug = await readDebug(page);
    if (debug.screen === "gameover") break;
    await commitCandidate(page, pulls, options);
  }
}

async function playToGameover(page, pullSequence, options) {
  await playTurns(page, pullSequence, options);
  await page.waitForFunction(() => window.__wordbraidDebug?.screen === "gameover", undefined, { timeout: 3000 });
}

async function readDebug(page) {
  return page.evaluate(() => {
    const debug = window.__wordbraidDebug;
    if (!debug) {
      throw new Error("Wordbraid debug state unavailable");
    }
    return debug;
  });
}

async function commitCandidate(page, pulls, options) {
  for (const pull of pulls) {
    await page.evaluate((value) => {
      window.__wordbraidControls?.selectRibbon(value);
    }, pull);
    await page.waitForTimeout(options.selectDelayMs);
  }
  await page.evaluate(() => {
    window.__wordbraidControls?.submit();
  });
  await page.waitForTimeout(options.settleDelayMs);
}

async function waitForReady(page) {
  await page.waitForFunction(
    () => typeof window.__wordbraidDebug === "object" && typeof window.__wordbraidControls?.start === "function",
    undefined,
    {
      timeout: 30000,
    },
  );
}

async function createStaticServer(directory) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const filePath = path.join(directory, pathname);
    if (!filePath.startsWith(directory)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        response.writeHead(301, { Location: `${pathname}/index.html` }).end();
        return;
      }
      response.writeHead(200, { "Content-Type": contentType(filePath) });
      fs.createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind static server");
  }
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function planRun(seed, maxTurns, strategy) {
  let state = createInitialState(seed);
  const pulls = [];

  for (let turn = 0; turn < maxTurns && !state.gameOver; turn += 1) {
    const choice = choosePlannedCandidate(state, strategy);
    if (!choice) break;
    pulls.push(choice.candidate.pulls.slice());
    state = choice.result.state;
  }

  return {
    gameOver: state.gameOver,
    pulls,
  };
}

function choosePlannedCandidate(state, strategy) {
  const candidates = findSafeCandidates(state, 24);
  if (candidates.length === 0) return null;
  if (strategy === "casual") {
    return candidates.find((item) => item.candidate.word.length === 3) ?? candidates[0] ?? null;
  }
  return candidates[0] ?? null;
}

function findSafeCandidates(state, limit) {
  const candidates = findCandidateWords(state.ribbons, Math.max(limit * 3, 18));
  const safe = [];
  for (const candidate of candidates) {
    try {
      const result = commitWord(state, candidate.pulls);
      if (!result) continue;
      safe.push({ candidate, result });
      if (safe.length >= limit) break;
    } catch {
      // Skip dead-end braids during deterministic media planning.
    }
  }
  return safe;
}
