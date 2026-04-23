import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { chromium, devices } from "playwright";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const listingDir = path.join(rootDir, "listing");
const outputDir = path.join(rootDir, "output", "media-capture");
const rawVideoDir = path.join(outputDir, "raw-video");
const reviewDir = path.join(outputDir, "review-shots");

const slug = "lunchline";
const showcaseSeed = 7;
const portraitVariantSeed = 11;
const videoSeconds = 12;
const portrait = { width: 720, height: 1280 };
const landscape = { width: 1280, height: 720 };

const landscapeScreenshotPath = path.join(listingDir, `${slug}_1280x720-screenshot-1.png`);
const portraitScreenshotPath = path.join(listingDir, `${slug}_720x1280-screenshot-1.png`);
const portraitVariantPath = path.join(listingDir, `${slug}_720x1280-screenshot-2.png`);
const landscapeVideoPath = path.join(listingDir, `${slug}_1280x720-recording.mp4`);

fs.mkdirSync(listingDir, { recursive: true });
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(rawVideoDir, { recursive: true });
fs.mkdirSync(reviewDir, { recursive: true });

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  await captureScreenshots(browser, server.url);
  await captureLandscapeVideo(browser, server.url);

  process.stdout.write(
    `${JSON.stringify(
      {
        landscapeScreenshotPath,
        portraitScreenshotPath,
        portraitVariantPath,
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

async function captureScreenshots(browser, serverUrl) {
  const landscapeContext = await browser.newContext({
    viewport: landscape,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  });
  const portraitContext = await browser.newContext({
    ...devices["iPhone 13"],
    viewport: portrait,
    deviceScaleFactor: 1,
  });

  try {
    const landscapePage = await landscapeContext.newPage();
    await landscapePage.goto(`${serverUrl}/index.html?autoplay=expert&seed=${showcaseSeed}`, { waitUntil: "load" });
    await waitForReady(landscapePage);
    await landscapePage.evaluate(async () => window.advanceTime?.(9000));
    await landscapePage.screenshot({ path: landscapeScreenshotPath });
    await landscapePage.screenshot({ path: path.join(reviewDir, "landscape-gameplay.png") });
    await landscapePage.close();

    const portraitPage = await portraitContext.newPage();
    await portraitPage.goto(`${serverUrl}/index.html?autoplay=expert&seed=${showcaseSeed}`, { waitUntil: "load" });
    await waitForReady(portraitPage);
    await portraitPage.evaluate(async () => window.advanceTime?.(7000));
    await portraitPage.screenshot({ path: portraitScreenshotPath });
    await portraitPage.screenshot({ path: path.join(reviewDir, "portrait-gameplay.png") });

    await portraitPage.goto(`${serverUrl}/index.html?autoplay=expert&seed=${portraitVariantSeed}`, { waitUntil: "load" });
    await waitForReady(portraitPage);
    await portraitPage.evaluate(async () => window.advanceTime?.(11000));
    await portraitPage.screenshot({ path: portraitVariantPath });
    await portraitPage.screenshot({ path: path.join(reviewDir, "portrait-variant.png") });
    await portraitPage.close();
  } finally {
    await landscapeContext.close();
    await portraitContext.close();
  }
}

async function captureLandscapeVideo(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: landscape,
    recordVideo: {
      dir: rawVideoDir,
      size: landscape,
    },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${serverUrl}/index.html?autoplay=expert&seed=${showcaseSeed}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.waitForTimeout(videoSeconds * 1000 + 500);

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
      typeof window.__lunchlineDebug?.getState === "function",
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
