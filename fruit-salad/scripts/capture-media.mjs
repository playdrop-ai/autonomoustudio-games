import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

import { chromium } from "playwright";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const listingDir = path.join(rootDir, "listing");
const outputDir = path.join(rootDir, "output", "media-capture");
const rawVideoDir = path.join(outputDir, "raw-video");

const portraitSeed = readIntFlag("--portrait-seed", 33);
const landscapeSeed = readIntFlag("--landscape-seed", 34);
const portraitMs = readIntFlag("--portrait-ms", 12000);
const landscapeMs = readIntFlag("--landscape-ms", 10000);
const videoSeconds = readIntFlag("--video-seconds", 12);
const videoLeadTrimSeconds = readFloatFlag("--video-trim-seconds", 0.8);

const PORTRAIT = { width: 720, height: 1280 };
const LANDSCAPE = { width: 1280, height: 720 };

const portraitShotPath = path.join(listingDir, "fruit-salad_720x1280-screenshot-1.png");
const landscapeShotPath = path.join(listingDir, "fruit-salad_1280x720-screenshot-1.png");
const landscapeVideoPath = path.join(listingDir, "fruit-salad_1280x720-recording.mp4");

fs.mkdirSync(rawVideoDir, { recursive: true });

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  await capturePortraitScreenshot(browser, server.url);
  await captureLandscapeScreenshot(browser, server.url);
  await captureLandscapeVideo(browser, server.url);

  process.stdout.write(
    `${JSON.stringify(
      {
        portraitSeed,
        landscapeSeed,
        portraitShotPath,
        landscapeShotPath,
        landscapeVideoPath,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await browser.close();
  await server.close();
}

async function capturePortraitScreenshot(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: PORTRAIT,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${serverUrl}/index.html?debug_clock=manual&autoplay=expert&seed=${portraitSeed}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.evaluate(async (ms) => window.advanceTime?.(ms), portraitMs);
    await page.screenshot({ path: portraitShotPath });
  } finally {
    await context.close();
  }
}

async function captureLandscapeScreenshot(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: LANDSCAPE,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${serverUrl}/index.html?debug_clock=manual&autoplay=expert&seed=${landscapeSeed}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.evaluate(async (ms) => window.advanceTime?.(ms), landscapeMs);
    await page.screenshot({ path: landscapeShotPath });
  } finally {
    await context.close();
  }
}

async function captureLandscapeVideo(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: LANDSCAPE,
    recordVideo: {
      dir: rawVideoDir,
      size: LANDSCAPE,
    },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${serverUrl}/index.html?autoplay=expert&seed=${landscapeSeed}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.waitForTimeout(videoSeconds * 1000 + videoLeadTrimSeconds * 1000);

    const video = page.video();
    if (!video) throw new Error("Playwright video recording did not start");

    await page.close();
    await context.close();

    const savedVideoPath = await video.path();
    const rawVideoPath = path.join(rawVideoDir, "fruit-salad-gameplay.webm");
    fs.copyFileSync(savedVideoPath, rawVideoPath);

    await execFileAsync("ffmpeg", [
      "-y",
      "-ss",
      videoLeadTrimSeconds.toFixed(2),
      "-i",
      rawVideoPath,
      "-t",
      String(videoSeconds),
      "-vf",
      `fade=t=out:st=${Math.max(0, videoSeconds - 0.8).toFixed(2)}:d=0.8`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      landscapeVideoPath,
    ]);
  } finally {
    try {
      await context.close();
    } catch {}
  }
}

async function waitForReady(page) {
  await page.waitForFunction(() => typeof window.__fruitSaladControls?.getState === "function", undefined, {
    timeout: 30000,
  });
}

function readIntFlag(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = Number.parseInt(process.argv[index + 1] ?? "", 10);
  return Number.isFinite(value) ? value : fallback;
}

function readFloatFlag(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = Number.parseFloat(process.argv[index + 1] ?? "");
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
  if (!address || typeof address === "string") throw new Error("Failed to bind static server");
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
