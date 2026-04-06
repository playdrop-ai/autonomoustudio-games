import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const outputDir = path.join(rootDir, "output", "playwright", "future-motion");
const rawVideoDir = path.join(outputDir, "raw-video");

const LANDSCAPE = { width: 1280, height: 720 };
const seed = readIntFlag("--seed", 1001);
const stageStepMs = readIntFlag("--stage-step-ms", 180);
const showcaseWaitMs = readIntFlag("--showcase-wait-ms", 760);
const outputVideoPath = path.join(outputDir, "velvet-arcana-future-motion.mp4");
const posterPath = path.join(outputDir, "velvet-arcana-future-motion-poster.png");
const rawVideoPath = path.join(rawVideoDir, "velvet-arcana-future-motion.webm");

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(rawVideoDir, { recursive: true });

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  const capture = await captureFutureMotion(browser, server.url, seed);
  process.stdout.write(`${JSON.stringify(capture, null, 2)}\n`);
} finally {
  await browser.close();
  await server.close();
}

async function captureFutureMotion(browser, serverUrl, seed) {
  const context = await browser.newContext({
    viewport: LANDSCAPE,
    recordVideo: {
      dir: rawVideoDir,
      size: LANDSCAPE,
    },
  });
  const page = await context.newPage();
  let elapsedMs = 0;
  let showcaseStartMs = 0;

  try {
    await page.goto(`${serverUrl}/index.html?seed=${seed}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.evaluate((runSeed) => {
      window.velvetArcanaDebug?.startSpread(2, runSeed);
    }, seed);
    await wait(page, 500);
    elapsedMs += 500;
    showcaseStartMs = elapsedMs;

    await wait(page, 360);
    elapsedMs += 360;

    elapsedMs += await performFutureShowcase(page);

    const video = page.video();
    if (!video) throw new Error("[velvet-arcana] Playwright video recording did not start");

    await page.close();
    await context.close();

    fs.copyFileSync(await video.path(), rawVideoPath);

    const trimmedDuration = Math.max(6.8, (elapsedMs - showcaseStartMs) / 1000);
    await execFileAsync("ffmpeg", [
      "-y",
      "-ss",
      (showcaseStartMs / 1000).toFixed(2),
      "-i",
      rawVideoPath,
      "-t",
      trimmedDuration.toFixed(2),
      "-vf",
      `fade=t=out:st=${Math.max(0, trimmedDuration - 0.8).toFixed(2)}:d=0.8`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      outputVideoPath,
    ]);

    await execFileAsync("ffmpeg", [
      "-y",
      "-ss",
      "1.80",
      "-i",
      outputVideoPath,
      "-frames:v",
      "1",
      posterPath,
    ]);

    return {
      seed,
      outputVideoPath,
      posterPath,
      rawVideoPath,
      showcaseStartSeconds: Number((showcaseStartMs / 1000).toFixed(2)),
      durationSeconds: Number(trimmedDuration.toFixed(2)),
    };
  } finally {
    try {
      await context.close();
    } catch {}
  }
}

async function performFutureShowcase(page) {
  let elapsedMs = 0;
  const revealColumn = await waitForRevealColumn(page);
  await page.evaluate((columnIndex) => {
    window.velvetArcanaDebug?.playColumn(columnIndex);
  }, revealColumn - 1);
  await wait(page, showcaseWaitMs);
  elapsedMs += showcaseWaitMs;

  for (let step = 0; step < 4; step += 1) {
    await page.evaluate(() => {
      window.velvetArcanaDebug?.autoStep("planner");
    });
    await wait(page, showcaseWaitMs);
    elapsedMs += showcaseWaitMs;
  }

  return elapsedMs;
}

async function waitForRevealColumn(page) {
  for (let step = 0; step < 80; step += 1) {
    const state = await readState(page);
    const revealColumn = state.playableColumns.find((columnIndex) => {
      const column = state.columns[columnIndex - 1];
      if (!column) return false;
      return column.cards.length >= 2 && column.cards[column.cards.length - 2] === "back";
    });
    if (revealColumn) return revealColumn;

    await page.evaluate(() => {
      window.velvetArcanaDebug?.autoStep("planner");
    });
    await wait(page, stageStepMs);
  }

  throw new Error("[velvet-arcana] Failed to find a Future reveal column");
}

async function readState(page) {
  const state = await page.evaluate(() => window.velvetArcanaDebug?.getState());
  if (!state) throw new Error("[velvet-arcana] Debug state unavailable");
  return state;
}

async function waitForReady(page) {
  await page.waitForFunction(() => typeof window.velvetArcanaDebug?.getState === "function", undefined, {
    timeout: 30000,
  });
}

async function wait(page, ms) {
  await page.waitForTimeout(ms);
}

function readIntFlag(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = Number.parseInt(process.argv[index + 1] ?? "", 10);
  return Number.isFinite(value) ? value : fallback;
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
  if (!address || typeof address === "string") throw new Error("[velvet-arcana] failed to bind static server");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}
