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
const reviewDir = path.join(outputDir, "review-shots");
const rawVideoDir = path.join(outputDir, "raw-video");

const slug = "relayline";
const seed = 4242;
const videoSeconds = 12;
const videoTrimSeconds = 0.8;
const landscape = { width: 1280, height: 720 };
const portrait = { width: 720, height: 1280 };

const warmRoutePath = [
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

const warmFlagCell = [5, 0];
const liveRoutePath = [
  [0, 1],
  [1, 1],
  [1, 2],
  [2, 2],
  [3, 2],
  [4, 2],
  [5, 2],
  [5, 3],
  [6, 3],
  [7, 3],
  [7, 4],
  [7, 5],
  [8, 5],
  [8, 6],
  [8, 7],
  [8, 8],
  [8, 9],
  [8, 10],
  [8, 11],
  [8, 12],
];
const liveFlagCell = [1, 0];

const listingLandscapeScreenshotPath = path.join(listingDir, `${slug}_1280x720-screenshot-1.png`);
const listingPortraitScreenshotPath = path.join(listingDir, `${slug}_720x1280-screenshot-1.png`);
const listingPortraitWinScreenshotPath = path.join(listingDir, `${slug}_720x1280-screenshot-2.png`);
const listingLandscapeVideoPath = path.join(listingDir, `${slug}_1280x720-recording.mp4`);

fs.mkdirSync(listingDir, { recursive: true });
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(reviewDir, { recursive: true });
fs.mkdirSync(rawVideoDir, { recursive: true });

if (!fs.existsSync(distDir)) {
  throw new Error("dist_missing: run the app build before capture");
}

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  await captureScreenshots(browser, server.url);
  await captureLandscapeVideo(browser, server.url);

  process.stdout.write(
    `${JSON.stringify(
      {
        seed,
        listingLandscapeScreenshotPath,
        listingPortraitScreenshotPath,
        listingPortraitWinScreenshotPath,
        listingLandscapeVideoPath,
        reviewDir,
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
    viewport: portrait,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });

  try {
    const landscapePage = await landscapeContext.newPage();
    await prepareRun(landscapePage, serverUrl, landscape, "warm");
    const landscapeLayout = computeLayout(landscape.width, landscape.height, 8, 10);
    await playWarmSequence(landscapePage, landscapeLayout, 8, true);
    await landscapePage.screenshot({ path: listingLandscapeScreenshotPath });
    await landscapePage.screenshot({ path: path.join(reviewDir, "landscape-gameplay.png") });
    await landscapePage.close();

    const portraitPage = await portraitContext.newPage();
    await prepareRun(portraitPage, serverUrl, portrait, "warm");
    const portraitLayout = computeLayout(portrait.width, portrait.height, 8, 10);
    await playWarmSequence(portraitPage, portraitLayout, 10, true);
    await portraitPage.screenshot({ path: listingPortraitScreenshotPath });
    await portraitPage.screenshot({ path: path.join(reviewDir, "portrait-gameplay.png") });

    await prepareRun(portraitPage, serverUrl, portrait, "warm");
    await playWarmSequence(portraitPage, portraitLayout, warmRoutePath.length, false);
    await waitForVictoryFrame(portraitPage);
    await portraitPage.screenshot({ path: listingPortraitWinScreenshotPath });
    await portraitPage.screenshot({ path: path.join(reviewDir, "portrait-win.png") });
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
    await prepareRun(page, serverUrl, landscape, "live");
    const layout = computeLayout(landscape.width, landscape.height, 9, 13);
    await playPathSequence(page, layout, liveRoutePath.slice(0, 7), 420);
    await page.locator(".relayline-flag-chip").click();
    await clickCell(page, layout, liveFlagCell[0], liveFlagCell[1]);
    await page.locator(".relayline-flag-chip").click();
    await playPathSequence(page, layout, liveRoutePath.slice(7), 420);
    await waitForVictoryFrame(page);
    await page.screenshot({ path: path.join(reviewDir, "video-last-frame.png") });

    const video = page.video();
    if (!video) throw new Error("playwright_video_missing");

    await page.close();
    await context.close();

    const savedVideoPath = await video.path();
    const rawVideoPath = path.join(rawVideoDir, `${slug}-gameplay.webm`);
    fs.copyFileSync(savedVideoPath, rawVideoPath);

    await execFileAsync("ffmpeg", [
      "-y",
      "-ss",
      String(videoTrimSeconds),
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
      listingLandscapeVideoPath,
    ]);
  } finally {
    try {
      await context.close();
    } catch {}
  }
}

async function prepareRun(page, serverUrl, viewport, difficulty) {
  await page.goto(`${serverUrl}/index.html?seed=${seed}`, { waitUntil: "load" });
  await waitForRuntime(page);
  await page.setViewportSize(viewport);
  await page.locator('button:has-text("Warm")').click();
  await page.waitForTimeout(160);
  await page.evaluate((nextDifficulty) => window.__relaylineDebug?.startRun(nextDifficulty), difficulty);
  await page.waitForTimeout(160);
}

async function playWarmSequence(page, layout, revealCount, keepFlagArmed, pauseMs = 140) {
  for (let index = 0; index < revealCount && index < warmRoutePath.length; index += 1) {
    const [col, row] = warmRoutePath[index];
    await clickCell(page, layout, col, row);
    await page.waitForTimeout(pauseMs);
  }

  if (keepFlagArmed) {
    await page.locator(".relayline-flag-chip").click();
  }
}

async function playPathSequence(page, layout, pathPoints, pauseMs = 140) {
  for (const [col, row] of pathPoints) {
    await clickCell(page, layout, col, row);
    await page.waitForTimeout(pauseMs);
  }
}

async function clickCell(page, layout, col, row) {
  const x = layout.boardX + col * (layout.cellSize + layout.gap) + layout.cellSize / 2;
  const y = layout.boardY + row * (layout.cellSize + layout.gap) + layout.cellSize / 2;
  await page.mouse.click(x, y);
}

async function waitForVictoryFrame(page) {
  await page.waitForFunction(
    () => {
      const text = window.render_game_to_text?.();
      if (!text) return false;
      try {
        const snapshot = JSON.parse(text);
        return snapshot.runState === "won";
      } catch {
        return false;
      }
    },
    undefined,
    {
      timeout: 15000,
    },
  );
  await page.waitForTimeout(500);
}

async function waitForRuntime(page) {
  await page.waitForFunction(
    () =>
      typeof window.advanceTime === "function" &&
      typeof window.render_game_to_text === "function" &&
      typeof window.__relaylineDebug?.getState === "function",
    undefined,
    {
      timeout: 30000,
    },
  );
}

function computeLayout(viewportWidth, viewportHeight, boardCols, boardRows) {
  const outerPadding = 22;
  const panelPadding = 18;
  const hudReserve = 90;
  const flagReserve = 96;

  const stageWidthCap = viewportWidth > viewportHeight ? Math.min(460, viewportWidth * 0.38) : 520;
  const stageWidth = Math.min(viewportWidth - outerPadding * 2, stageWidthCap);
  const stageHeight = Math.min(viewportHeight - outerPadding * 2, 920);
  const stageX = (viewportWidth - stageWidth) / 2;
  const stageY = (viewportHeight - stageHeight) / 2;
  const boardAreaWidth = stageWidth - panelPadding * 2;
  const boardAreaHeight = stageHeight - hudReserve - flagReserve - panelPadding * 2;
  const gap = Math.max(4, Math.floor(Math.min(boardAreaWidth / 44, boardAreaHeight / 56)));
  const cellSize = Math.min(
    (boardAreaWidth - gap * (boardCols - 1)) / boardCols,
    (boardAreaHeight - gap * (boardRows - 1)) / boardRows,
  );
  const boardWidth = boardCols * cellSize + (boardCols - 1) * gap;
  const boardHeight = boardRows * cellSize + (boardRows - 1) * gap;
  const boardX = stageX + (stageWidth - boardWidth) / 2;
  const boardY = stageY + hudReserve;

  return {
    stageX,
    stageY,
    stageWidth,
    stageHeight,
    boardX,
    boardY,
    boardWidth,
    boardHeight,
    cellSize,
    gap,
  };
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
    throw new Error("server_bind_failed");
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
  if (filePath.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}
