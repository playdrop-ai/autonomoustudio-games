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
const outputDir = path.join(rootDir, "output", "playwright");
const reviewDir = path.join(outputDir, "runtime-review");
const framesDir = path.join(outputDir, "video-frames-check");
const rawVideoDir = path.join(outputDir, "raw-video");

const slug = "scrap-signal";
const seed = 4242;
const landscape = { width: 1280, height: 720 };
const worldCenter = { x: 640, y: 360 };
const videoSeconds = 9;
const videoTrimSeconds = 1.2;

const reviewStartPath = path.join(reviewDir, "desktop-start.png");
const reviewPlayPath = path.join(reviewDir, "desktop-play.png");
const reviewGameoverPath = path.join(reviewDir, "desktop-gameover.png");

const listingScreenshotOnePath = path.join(listingDir, `${slug}_1280x720-screenshot-1.png`);
const listingScreenshotTwoPath = path.join(listingDir, `${slug}_1280x720-screenshot-2.png`);
const listingLandscapeVideoPath = path.join(listingDir, `${slug}_1280x720-recording.mp4`);

fs.mkdirSync(listingDir, { recursive: true });
fs.rmSync(reviewDir, { recursive: true, force: true });
fs.rmSync(framesDir, { recursive: true, force: true });
fs.rmSync(rawVideoDir, { recursive: true, force: true });
fs.mkdirSync(reviewDir, { recursive: true });
fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(rawVideoDir, { recursive: true });

if (!fs.existsSync(distDir)) {
  throw new Error("dist_missing: run the app build before capture");
}

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  await captureReviewScreens(browser, server.url);
  await captureListingVideo(browser, server.url);
  await captureListingScreens(browser, server.url);

  process.stdout.write(
    `${JSON.stringify(
      {
        seed,
        reviewStartPath,
        reviewPlayPath,
        reviewGameoverPath,
        listingScreenshotOnePath,
        listingScreenshotTwoPath,
        listingLandscapeVideoPath,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await browser.close();
  await server.close();
}

async function captureReviewScreens(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: landscape,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  });

  try {
    const startPage = await context.newPage();
    await loadGame(startPage, serverUrl, false);
    await startPage.evaluate(() => window.__scrapSignalDebug?.loadScene("start"));
    await startPage.screenshot({ path: reviewStartPath, scale: "css" });
    await startPage.close();

    const playPage = await context.newPage();
    await loadGame(playPage, serverUrl, true);
    await playPage.evaluate(() => window.__scrapSignalDebug?.loadScene("play"));
    await runCombatBot(playPage, 1200);
    await playPage.screenshot({ path: reviewPlayPath, scale: "css" });
    await playPage.close();

    const gameoverPage = await context.newPage();
    await loadGame(gameoverPage, serverUrl, true);
    await gameoverPage.evaluate(() => window.__scrapSignalDebug?.loadScene("won"));
    await gameoverPage.screenshot({ path: reviewGameoverPath, scale: "css" });
    await gameoverPage.close();
  } finally {
    await context.close();
  }
}

async function captureListingScreens(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: landscape,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  });

  try {
    const page = await context.newPage();
    await loadGame(page, serverUrl, true);
    await page.evaluate(() => window.__scrapSignalDebug?.loadScene("play"));
    await runCombatBot(page, 600);
    await page.screenshot({ path: listingScreenshotOnePath, scale: "css" });

    await loadGame(page, serverUrl, true);
    await page.evaluate(() => window.__scrapSignalDebug?.loadScene("play"));
    await runCombatBot(page, 2600);
    await page.screenshot({ path: listingScreenshotTwoPath, scale: "css" });
    await page.close();
  } finally {
    await context.close();
  }
}

async function captureListingVideo(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: landscape,
    deviceScaleFactor: 1,
    recordVideo: {
      dir: rawVideoDir,
      size: landscape,
    },
  });
  const page = await context.newPage();

  try {
    await loadGame(page, serverUrl, true);
    await page.evaluate(() => window.__scrapSignalDebug?.loadScene("play"));
    await runCombatBot(page, 14200);
    await page.screenshot({ path: path.join(framesDir, "frame-live-end.png"), scale: "css" });

    const video = page.video();
    if (!video) {
      throw new Error("playwright_video_missing");
    }

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

    await captureVideoFrame(listingLandscapeVideoPath, 0.2, path.join(framesDir, "frame-01.png"));
    await captureVideoFrame(listingLandscapeVideoPath, 3.4, path.join(framesDir, "frame-02.png"));
    await captureVideoFrame(listingLandscapeVideoPath, 6.8, path.join(framesDir, "frame-03.png"));
  } finally {
    try {
      await context.close();
    } catch {}
  }
}

async function loadGame(page, serverUrl, autostart) {
  const url = autostart
    ? `${serverUrl}/index.html?seed=${seed}&autostart=1`
    : `${serverUrl}/index.html?seed=${seed}`;
  await page.goto(url, { waitUntil: "load" });
  await page.setViewportSize(landscape);
  await page.waitForFunction(
    () => typeof window.advanceTime === "function" && typeof window.__scrapSignalDebug?.getState === "function",
    undefined,
    { timeout: 30000 },
  );
  await page.waitForTimeout(120);
}

async function runCombatBot(page, durationMs) {
  await page.mouse.move(920, 360);
  await page.mouse.down();

  const keysDown = new Set();
  const startedAt = Date.now();

  try {
    while (Date.now() - startedAt < durationMs) {
      const snapshot = await page.evaluate(() => window.__scrapSignalDebug?.getState());
      if (!snapshot || snapshot.runState !== "playing") {
        break;
      }

      const moveTarget = selectMoveTarget(snapshot);
      const aimTarget = selectAimTarget(snapshot);
      const nextKeys = computeMovementKeys(snapshot.player, moveTarget);

      await syncKeys(page, keysDown, nextKeys);
      await page.mouse.move(clamp(aimTarget.x, 10, landscape.width - 10), clamp(aimTarget.y, 10, landscape.height - 10), {
        steps: 2,
      });
      await page.waitForTimeout(120);
    }
  } finally {
    await syncKeys(page, keysDown, new Set());
    await page.mouse.up();
    await page.waitForTimeout(120);
  }
}

function selectMoveTarget(snapshot) {
  const player = snapshot.player;

  if (snapshot.carryBattery) {
    return worldCenter;
  }

  const nearestBattery = nearestPoint(player, snapshot.batteries);
  if (nearestBattery && distance(player, nearestBattery) < 320) {
    return nearestBattery;
  }

  const carrier = nearestEnemyOfType(snapshot, "carrier");
  if (carrier) {
    return {
      x: carrier.x - Math.sign(carrier.x - worldCenter.x) * 52,
      y: carrier.y - Math.sign(carrier.y - worldCenter.y) * 52,
    };
  }

  const nearestEnemy = nearestPoint(player, snapshot.enemies);
  if (nearestEnemy) {
    const offset = normalize({
      x: nearestEnemy.x - worldCenter.x,
      y: nearestEnemy.y - worldCenter.y,
    });
    return {
      x: worldCenter.x + offset.x * 214,
      y: worldCenter.y + offset.y * 214,
    };
  }

  return {
    x: worldCenter.x + 178,
    y: worldCenter.y + 40,
  };
}

function selectAimTarget(snapshot) {
  const player = snapshot.player;
  const batteryThreat = nearestPoint(player, snapshot.enemies.filter((enemy) => enemy.type === "carrier"));
  if (batteryThreat) {
    return batteryThreat;
  }

  const threat = nearestPoint(player, snapshot.enemies);
  if (threat) {
    return threat;
  }

  return snapshot.carryBattery ? worldCenter : { x: worldCenter.x + 200, y: worldCenter.y };
}

function computeMovementKeys(player, target) {
  const result = new Set();
  const dx = target.x - player.x;
  const dy = target.y - player.y;

  if (dx > 26) result.add("d");
  if (dx < -26) result.add("a");
  if (dy > 26) result.add("s");
  if (dy < -26) result.add("w");

  return result;
}

async function syncKeys(page, keysDown, nextKeys) {
  for (const key of [...keysDown]) {
    if (!nextKeys.has(key)) {
      await page.keyboard.up(key);
      keysDown.delete(key);
    }
  }

  for (const key of nextKeys) {
    if (!keysDown.has(key)) {
      await page.keyboard.down(key);
      keysDown.add(key);
    }
  }
}

function nearestEnemyOfType(snapshot, type) {
  return nearestPoint(snapshot.player, snapshot.enemies.filter((enemy) => enemy.type === type));
}

function nearestPoint(origin, points) {
  let best = null;
  let bestDistance = Infinity;

  for (const point of points) {
    const nextDistance = distance(origin, point);
    if (nextDistance < bestDistance) {
      best = point;
      bestDistance = nextDistance;
    }
  }

  return best;
}

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= 0.00001) {
    return { x: 1, y: 0 };
  }
  return { x: vector.x / length, y: vector.y / length };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function captureVideoFrame(videoPath, seconds, outputPath) {
  await execFileAsync("ffmpeg", [
    "-y",
    "-ss",
    String(seconds),
    "-i",
    videoPath,
    "-frames:v",
    "1",
    outputPath,
  ]);
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
    throw new Error("static_server_bind_failed");
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
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}
