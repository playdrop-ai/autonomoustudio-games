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
const listingDir = path.join(rootDir, "listing");
const outputDir = path.join(rootDir, "output", "media-capture");
const rawVideoDir = path.join(outputDir, "raw-video");

const seed = readIntFlag("--seed", 1001);
const portraitHookSteps = readIntFlag("--portrait-hook-steps", 7);
const portraitPressureSteps = readIntFlag("--portrait-pressure-steps", 33);
const landscapeHookSteps = readIntFlag("--landscape-hook-steps", 7);
const videoSeconds = readIntFlag("--video-seconds", 12);
const videoStepMs = readIntFlag("--video-step-ms", 180);
const videoLeadTrimSeconds = readFloatFlag("--video-trim-seconds", 0.6);

const PORTRAIT = { width: 720, height: 1280 };
const LANDSCAPE = { width: 1280, height: 720 };

const portraitShotPath = path.join(listingDir, "velvet-arcana_720x1280-screenshot-1.png");
const portraitPressurePath = path.join(listingDir, "velvet-arcana_720x1280-screenshot-2.png");
const landscapeShotPath = path.join(listingDir, "velvet-arcana_1280x720-screenshot-1.png");
const landscapeVideoPath = path.join(listingDir, "velvet-arcana_1280x720-recording.mp4");
const rawVideoPath = path.join(rawVideoDir, "velvet-arcana-recording.webm");

fs.mkdirSync(listingDir, { recursive: true });
fs.mkdirSync(rawVideoDir, { recursive: true });

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  await capturePortraitScreenshot(browser, server.url, portraitHookSteps, portraitShotPath);
  await capturePortraitScreenshot(browser, server.url, portraitPressureSteps, portraitPressurePath);
  await captureLandscapeScreenshot(browser, server.url, landscapeHookSteps, landscapeShotPath);
  await captureLandscapeVideo(browser, server.url);

  process.stdout.write(
    `${JSON.stringify(
      {
        seed,
        portraitShotPath,
        portraitPressurePath,
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

async function capturePortraitScreenshot(browser, serverUrl, steps, targetPath) {
  const context = await browser.newContext({
    viewport: PORTRAIT,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${serverUrl}/index.html?seed=${seed}`, { waitUntil: "load" });
    await waitForReady(page);
    await startRun(page);
    await advanceSteps(page, steps);
    await page.screenshot({ path: targetPath });
  } finally {
    await context.close();
  }
}

async function captureLandscapeScreenshot(browser, serverUrl, steps, targetPath) {
  const context = await browser.newContext({
    viewport: LANDSCAPE,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${serverUrl}/index.html?seed=${seed}`, { waitUntil: "load" });
    await waitForReady(page);
    await startRun(page);
    await advanceSteps(page, steps);
    await page.screenshot({ path: targetPath });
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
    await page.goto(`${serverUrl}/index.html?seed=${seed}`, { waitUntil: "load" });
    await waitForReady(page);
    await startRun(page);

    const steps = Math.ceil((videoSeconds * 1000) / videoStepMs);
    for (let step = 0; step < steps; step += 1) {
      await page.evaluate(() => window.velvetArcanaDebug?.autoStep());
      await page.waitForTimeout(videoStepMs);
    }

    const video = page.video();
    if (!video) throw new Error("[velvet-arcana] Playwright video recording did not start");

    await page.close();
    await context.close();

    fs.copyFileSync(await video.path(), rawVideoPath);
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
  await page.waitForFunction(() => typeof window.velvetArcanaDebug?.getState === "function", undefined, {
    timeout: 30000,
  });
}

async function startRun(page) {
  await page.evaluate((runSeed) => window.velvetArcanaDebug?.startRun(runSeed), seed);
}

async function advanceSteps(page, steps) {
  await page.evaluate((count) => {
    for (let step = 0; step < count; step += 1) {
      window.velvetArcanaDebug?.autoStep();
    }
  }, steps);
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
  if (!address || typeof address === "string") throw new Error("[velvet-arcana] failed to bind static server");
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
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}
