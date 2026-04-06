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
const reviewDir = path.join(outputDir, "review-shots");

const slug = "powder-post";
const gameplaySeedA = readIntFlag("--seed-a", 17);
const gameplaySeedB = readIntFlag("--seed-b", 23);
const screenshotMsA = readIntFlag("--shot-a-ms", 5000);
const screenshotMsB = readIntFlag("--shot-b-ms", 4200);
const videoSeconds = readIntFlag("--video-seconds", 12);
const videoLeadTrimSeconds = readFloatFlag("--video-trim-seconds", 0.5);

const LANDSCAPE = { width: 1280, height: 720 };

const screenshotOnePath = path.join(listingDir, `${slug}_1280x720-screenshot-1.png`);
const screenshotTwoPath = path.join(listingDir, `${slug}_1280x720-screenshot-2.png`);
const landscapeVideoPath = path.join(listingDir, `${slug}_1280x720-recording.mp4`);

fs.mkdirSync(listingDir, { recursive: true });
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(rawVideoDir, { recursive: true });
fs.mkdirSync(reviewDir, { recursive: true });

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  await captureLandscapeScreenshots(browser, server.url);
  await captureLandscapeVideo(browser, server.url);

  process.stdout.write(
    `${JSON.stringify(
      {
        gameplaySeedA,
        gameplaySeedB,
        screenshotOnePath,
        screenshotTwoPath,
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

async function captureLandscapeScreenshots(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: LANDSCAPE,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${serverUrl}/index.html?autoplay=expert&seed=${gameplaySeedA}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.evaluate(async (ms) => window.advanceTime?.(ms), screenshotMsA);
    await page.screenshot({ path: screenshotOnePath });
    await page.screenshot({ path: path.join(reviewDir, "landscape-shot-1.png") });

    await page.goto(`${serverUrl}/index.html?seed=${gameplaySeedB}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.evaluate(async (ms) => window.advanceTime?.(800), 800);
    await page.mouse.move(640, 610);
    await page.mouse.down();
    await page.mouse.move(360, 560, { steps: 8 });
    await page.waitForTimeout(250);
    await page.mouse.move(760, 540, { steps: 11 });
    await page.waitForTimeout(250);
    await page.mouse.up();
    await page.evaluate(async (ms) => window.advanceTime?.(ms), screenshotMsB);
    await page.screenshot({ path: screenshotTwoPath });
    await page.screenshot({ path: path.join(reviewDir, "landscape-shot-2.png") });
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
    await page.goto(`${serverUrl}/index.html?autoplay=expert&seed=${gameplaySeedA}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.waitForTimeout((videoSeconds + videoLeadTrimSeconds) * 1000);

    const video = page.video();
    if (!video) throw new Error("Playwright video recording did not start");

    await page.screenshot({ path: path.join(reviewDir, "video-last-frame.png") });
    await page.close();
    await context.close();

    const savedVideoPath = await video.path();
    const rawVideoPath = path.join(rawVideoDir, `${slug}-gameplay.webm`);
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
  await page.waitForFunction(
    () =>
      typeof window.advanceTime === "function" &&
      typeof window.render_game_to_text === "function" &&
      typeof window.__powderPostDebug === "object",
    undefined,
    {
      timeout: 30000,
    },
  );
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
