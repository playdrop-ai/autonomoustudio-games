import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { chromium, devices } from "playwright";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const listingDir = path.join(rootDir, "listing");
const outputDir = path.join(rootDir, "output", "ai-art");
const reviewDir = path.join(outputDir, "review");
const videoDir = path.join(outputDir, "video");

const landscapeScreenshotPath = path.join(listingDir, "relayline_1280x720-screenshot-1.png");
const portraitScreenshotPath = path.join(listingDir, "relayline_720x1280-screenshot-1.png");
const portraitVariantPath = path.join(listingDir, "relayline_720x1280-screenshot-2.png");
const landscapeVideoPath = path.join(listingDir, "relayline_1280x720-recording.mp4");

const finalLandscapePath = path.join(listingDir, "hero-landscape.png");
const finalPortraitPath = path.join(listingDir, "hero-portrait.png");
const finalIconPath = path.join(listingDir, "icon.png");
const familyReviewPath = path.join(outputDir, "fallback-family-review.png");

const showcaseSeed = 4242;
const variantSeed = showcaseSeed;
const videoSeconds = 12;

fs.mkdirSync(listingDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(reviewDir, { recursive: true });
fs.mkdirSync(videoDir, { recursive: true });

const server = await createStaticServer(rootDir);
const browser = await chromium.launch({ headless: true });

try {
  assertSourceMedia();
  await exportFallbackArt(browser, server.url);

  process.stdout.write(
    `${JSON.stringify(
      {
        landscapeScreenshotPath,
        portraitScreenshotPath,
        portraitVariantPath,
        landscapeVideoPath,
        finalLandscapePath,
        finalPortraitPath,
        finalIconPath,
        familyReviewPath,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await browser.close();
  await server.close();
}

function assertSourceMedia() {
  for (const filePath of [landscapeScreenshotPath, portraitScreenshotPath, portraitVariantPath]) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`listing_media_missing:${filePath}`);
    }
  }
}

async function captureListingMedia(browser, serverUrl) {
  const landscapeContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    hasTouch: false,
  });
  const portraitContext = await browser.newContext({
    ...devices["iPhone 13"],
    viewport: { width: 720, height: 1280 },
    deviceScaleFactor: 1,
  });

  try {
    const landscapePage = await landscapeContext.newPage();
    await loadGame(landscapePage, `${serverUrl}/index.html?seed=${showcaseSeed}`);
    await setupLiveBoard(landscapePage, "live");
    await landscapePage.waitForTimeout(900);
    await landscapePage.screenshot({ path: landscapeScreenshotPath, scale: "css" });
    await landscapePage.screenshot({ path: path.join(reviewDir, "landscape-live.png"), scale: "css" });

    const portraitPage = await portraitContext.newPage();
    await loadGame(portraitPage, `${serverUrl}/index.html?seed=${showcaseSeed}`);
    await setupLiveBoard(portraitPage, "live");
    await portraitPage.waitForTimeout(900);
    await portraitPage.screenshot({ path: portraitScreenshotPath, scale: "css" });
    await portraitPage.screenshot({ path: path.join(reviewDir, "portrait-live.png"), scale: "css" });

    await loadGame(portraitPage, `${serverUrl}/index.html?seed=${variantSeed}`);
    await setupLiveBoard(portraitPage, "live");
    await completeRoute(portraitPage);
    await portraitPage.screenshot({ path: portraitVariantPath, scale: "css" });
    await portraitPage.screenshot({ path: path.join(reviewDir, "portrait-win.png"), scale: "css" });

    await landscapePage.close();
    await portraitPage.close();
  } finally {
    await landscapeContext.close();
    await portraitContext.close();
  }

  const videoContext = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: videoDir,
      size: { width: 1280, height: 720 },
    },
    deviceScaleFactor: 1,
    hasTouch: false,
  });

  try {
    const videoPage = await videoContext.newPage();
    await loadGame(videoPage, `${serverUrl}/index.html?seed=${showcaseSeed}`);
    await setupLiveBoard(videoPage, "live");
    await videoPage.waitForTimeout(2400);
    await videoPage.evaluate(() => window.__relaylineDebug?.flagCell(1, 0));
    await videoPage.waitForTimeout(videoSeconds * 1000 - 2600);

    const video = videoPage.video();
    if (!video) {
      throw new Error("video_recording_missing");
    }

    await videoPage.screenshot({ path: path.join(reviewDir, "video-last-frame.png"), scale: "css" });
    await videoPage.close();
    await videoContext.close();

    const webmPath = await video.path();
    const rawWebmPath = path.join(videoDir, "relayline-gameplay.webm");
    fs.copyFileSync(webmPath, rawWebmPath);

    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      rawWebmPath,
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
      await videoContext.close();
    } catch {}
  }
}

async function exportFallbackArt(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: { width: 5400, height: 3400 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await page.goto(`${serverUrl}/listing/marketing.html`, { waitUntil: "load" });
    await page.waitForLoadState("networkidle");

    await page.locator("#hero-landscape-a").screenshot({ path: path.join(outputDir, "hero-landscape-a.png"), scale: "css" });
    await page.locator("#hero-landscape-b").screenshot({ path: path.join(outputDir, "hero-landscape-b.png"), scale: "css" });
    await page.locator("#hero-landscape-c").screenshot({ path: path.join(outputDir, "hero-landscape-c.png"), scale: "css" });
    await page.locator("#hero-portrait-a").screenshot({ path: path.join(outputDir, "hero-portrait-a.png"), scale: "css" });
    await page.locator("#hero-portrait-b").screenshot({ path: path.join(outputDir, "hero-portrait-b.png"), scale: "css" });
    await page.locator("#hero-portrait-c").screenshot({ path: path.join(outputDir, "hero-portrait-c.png"), scale: "css" });
    await page.locator("#icon-a").screenshot({ path: path.join(outputDir, "icon-a.png"), scale: "css" });
    await page.locator("#icon-b").screenshot({ path: path.join(outputDir, "icon-b.png"), scale: "css" });
    await page.locator("#icon-c").screenshot({ path: path.join(outputDir, "icon-c.png"), scale: "css" });

    await page.locator("#hero-landscape-b").screenshot({ path: finalLandscapePath, scale: "css" });
    await page.locator("#hero-portrait-b").screenshot({ path: finalPortraitPath, scale: "css" });
    await page.locator("#icon-b").screenshot({ path: finalIconPath, scale: "css" });
    await page.screenshot({ path: familyReviewPath, fullPage: true, scale: "css" });

    optimizePng(finalIconPath, ["--quality=70-95"]);

    const maybePngquant = hasCommand("pngquant");
    if (maybePngquant && fs.existsSync(finalIconPath)) {
      optimizePng(finalIconPath, ["--quality=70-95"]);
    }
  } finally {
    await context.close();
  }
}

async function loadGame(page, url) {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(
    () =>
      typeof window.advanceTime === "function" &&
      typeof window.render_game_to_text === "function" &&
      typeof window.__relaylineDebug?.getState === "function",
    undefined,
    { timeout: 30000 },
  );
}

async function setupLiveBoard(page, difficulty) {
  await page.evaluate(
    (nextDifficulty) => {
      window.__relaylineDebug?.startRun(nextDifficulty);
      const moves = [[0, 1], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [5, 3], [6, 3], [7, 3], [7, 4], [7, 5], [8, 5]];
      for (const [col, row] of moves) {
        window.__relaylineDebug?.revealCell(col, row);
      }
      window.__relaylineDebug?.flagCell(1, 0);
    },
    difficulty,
  );
}

async function completeRoute(page) {
  await page.evaluate(() => {
    const path = [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 3],
      [3, 3],
      [4, 3],
      [5, 3],
      [5, 4],
      [5, 5],
      [5, 6],
      [5, 7],
      [6, 7],
      [7, 7],
      [7, 8],
      [7, 9],
    ];
    for (const [col, row] of path) {
      window.__relaylineDebug?.revealCell(col, row);
    }
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

function optimizePng(filePath, extraArgs = []) {
  const tempPath = `${filePath}.opt.png`;
  try {
    execFileSync("pngquant", ["--force", "--output", tempPath, ...extraArgs, filePath], {
      stdio: "ignore",
    });
    fs.renameSync(tempPath, filePath);
  } catch {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch {}
    // Leave the unoptimized PNG in place when pngquant is unavailable.
  }
}

function hasCommand(command) {
  try {
    execFileSync("bash", ["-lc", `command -v ${command} >/dev/null 2>&1`], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}
