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
const screenshotsDir = path.join(listingDir, "screenshots");
const videosDir = path.join(listingDir, "videos");
const outputDir = path.join(rootDir, "output", "media-capture");
const rawVideoDir = path.join(outputDir, "raw-video");
const rootShotsDir = path.join(outputDir, "shots");

const landscapeVideoPath = path.join(listingDir, "drifthook-gameplay.mp4");

const PORTRAIT = { width: 768, height: 1280 };
const LANDSCAPE = { width: 1280, height: 720 };
const SHOWCASE_SEED = 17012026;
const LOSS_SEED = 381;

fs.mkdirSync(listingDir, { recursive: true });
fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(videosDir, { recursive: true });
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(rawVideoDir, { recursive: true });
fs.mkdirSync(rootShotsDir, { recursive: true });

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  await capturePortraitSet(browser, server.url);
  await captureLandscapeSet(browser, server.url);
  await captureLandscapeVideo(browser, server.url);

  console.log(
    JSON.stringify(
      {
        ok: true,
        screenshotsDir,
        videosDir,
        landscapeVideoPath,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
  await server.close();
}

async function capturePortraitSet(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: PORTRAIT,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${serverUrl}/index.html?debug_clock=manual&seed=${SHOWCASE_SEED}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.screenshot({ path: path.join(rootShotsDir, "portrait-start.png") });

    await page.goto(`${serverUrl}/index.html?debug_clock=manual&autoplay=casual&seed=${SHOWCASE_SEED}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.evaluate(() => window.__drifthookControls?.setMuted(true));
    await page.evaluate(async () => window.advanceTime?.(17000));
    await page.screenshot({ path: path.join(rootShotsDir, "portrait-gameplay.png") });
    await page.screenshot({ path: path.join(screenshotsDir, "portrait-gameplay.png") });

    await page.goto(`${serverUrl}/index.html?debug_clock=manual&autoplay=casual&seed=${LOSS_SEED}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.evaluate(() => window.__drifthookControls?.setMuted(true));
    await page.evaluate(async () => {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        if (window.__drifthookDebug?.screen === "gameover") return;
        await window.advanceTime?.(8000);
      }
      throw new Error("Failed to reach game-over screen for portrait capture");
    });
    await page.screenshot({ path: path.join(rootShotsDir, "portrait-gameover.png") });
    await page.screenshot({ path: path.join(screenshotsDir, "portrait-gameover.png") });
  } finally {
    await context.close();
  }
}

async function captureLandscapeSet(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: LANDSCAPE,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${serverUrl}/index.html?debug_clock=manual&seed=${SHOWCASE_SEED}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.screenshot({ path: path.join(rootShotsDir, "landscape-start.png") });

    await page.goto(`${serverUrl}/index.html?debug_clock=manual&autoplay=expert&seed=${SHOWCASE_SEED}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.evaluate(() => window.__drifthookControls?.setMuted(true));
    await page.evaluate(async () => window.advanceTime?.(20000));
    await page.screenshot({ path: path.join(rootShotsDir, "landscape-gameplay.png") });
    await page.screenshot({ path: path.join(screenshotsDir, "landscape-gameplay.png") });

    await page.goto(`${serverUrl}/index.html?debug_clock=manual&autoplay=casual&seed=${LOSS_SEED}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.evaluate(() => window.__drifthookControls?.setMuted(true));
    await page.evaluate(async () => {
      for (let attempt = 0; attempt < 60; attempt += 1) {
        if (window.__drifthookDebug?.screen === "gameover") return;
        await window.advanceTime?.(9000);
      }
      throw new Error("Failed to reach game-over screen for landscape capture");
    });
    await page.screenshot({ path: path.join(rootShotsDir, "landscape-gameover.png") });
    await page.screenshot({ path: path.join(screenshotsDir, "landscape-gameover.png") });
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
    await page.goto(`${serverUrl}/index.html?autoplay=expert&seed=${SHOWCASE_SEED}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.evaluate(() => {
      window.__drifthookControls?.setMuted(true);
    });
    await page.waitForTimeout(12000);

    const video = page.video();
    if (!video) throw new Error("Playwright video recording did not start");

    await page.screenshot({ path: path.join(rootShotsDir, "landscape-video-frame.png") });
    await page.close();
    await context.close();

    const savedVideoPath = await video.path();
    const rawVideoPath = path.join(rawVideoDir, "drifthook-gameplay.webm");
    fs.copyFileSync(savedVideoPath, rawVideoPath);

    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      rawVideoPath,
      "-t",
      "12",
      "-vf",
      "fade=t=out:st=11.2:d=0.8",
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
  await page.waitForFunction(() => typeof window.__drifthookControls?.getState === "function", undefined, {
    timeout: 30000,
  });
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
