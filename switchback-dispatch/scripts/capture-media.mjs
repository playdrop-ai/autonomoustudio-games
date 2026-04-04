import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const listingDir = path.join(rootDir, "listing");
const outputDir = path.join(rootDir, "output", "media-capture");
const rawVideoDir = path.join(outputDir, "raw-video");
const frameCheckDir = path.join(outputDir, "video-frames-check");

const LANDSCAPE = { width: 1280, height: 720 };
const PORTRAIT = { width: 720, height: 1280 };

const landscapeShotPath = path.join(listingDir, "switchback-dispatch_1280x720-screenshot-1.png");
const landscapeVideoPath = path.join(listingDir, "switchback-dispatch_1280x720-recording.mp4");
const portraitShotPath = path.join(listingDir, "switchback-dispatch_720x1280-screenshot-1.png");

const videoSeconds = readFloatFlag("--video-seconds", 12);
const videoLeadTrimSeconds = readFloatFlag("--video-trim-seconds", 0.6);
const codexHome = process.env.CODEX_HOME ?? path.join(process.env.HOME ?? "", ".codex");
const playwrightEntry = path.join(codexHome, "skills", "develop-web-game", "scripts", "node_modules", "playwright", "index.mjs");
const { chromium } = await import(pathToFileURL(playwrightEntry).href);

fs.mkdirSync(listingDir, { recursive: true });
fs.mkdirSync(rawVideoDir, { recursive: true });
fs.mkdirSync(frameCheckDir, { recursive: true });

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  await captureLandscapeScreenshot(browser, server.url);
  await capturePortraitScreenshot(browser, server.url);
  await captureLandscapeVideo(browser, server.url);

  process.stdout.write(
    `${JSON.stringify(
      {
        landscapeShotPath,
        portraitShotPath,
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

async function captureLandscapeScreenshot(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: LANDSCAPE,
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await openGame(page, serverUrl, LANDSCAPE, { listingCapture: true });
    await stageOpeningLine(page, "hard-left");
    await page.screenshot({ path: landscapeShotPath });
  } finally {
    await context.close();
  }
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
    await openGame(page, serverUrl, PORTRAIT, { listingCapture: true });
    await stageOpeningLine(page, "straight");
    await page.screenshot({ path: portraitShotPath });
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
    await openGame(page, serverUrl, LANDSCAPE, { listingCapture: false });

    const capturePromise = captureDemoDrive(page);
    await page.waitForTimeout((videoSeconds + videoLeadTrimSeconds) * 1000);
    await capturePromise;

    const video = page.video();
    if (!video) {
      throw new Error("[switchback-dispatch] Playwright video recording did not start");
    }

    await page.close();
    await context.close();

    const savedVideoPath = await video.path();
    const rawVideoPath = path.join(rawVideoDir, "switchback-dispatch-gameplay.webm");
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

    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      landscapeVideoPath,
      "-vf",
      "fps=1",
      path.join(frameCheckDir, "frame-%02d.png"),
    ]);
  } finally {
    try {
      await context.close();
    } catch {}
  }
}

async function openGame(page, serverUrl, viewport, options) {
  const params = new URLSearchParams({
    viewport: viewport.width >= viewport.height ? "landscape" : "portrait",
  });
  if (options.listingCapture) {
    params.set("listingCapture", "1");
  }
  await page.goto(`${serverUrl}/test-host.html?${params.toString()}`, { waitUntil: "load" });
  await page.waitForFunction(() => typeof window.render_game_to_text === "function", null, { timeout: 30000 });
  await page.locator("#start-contract-button").click();
  if (options.listingCapture) {
    await page.evaluate((ms) => window.advanceTime?.(ms), 3100);
    return;
  }
  await page.waitForFunction(hasDrivingPhase, null, { timeout: 15000 });
}

async function stageOpeningLine(page, line) {
  const pattern =
    line === "hard-left"
      ? [
          { keys: ["KeyW", "KeyA"], ms: 2200 },
          { keys: ["KeyW"], ms: 450 },
        ]
      : [
          { keys: ["KeyW"], ms: 2550 },
        ];
  for (const step of pattern) {
    for (const key of step.keys) {
      await page.keyboard.down(key);
    }
    await page.waitForTimeout(step.ms);
    for (const key of [...step.keys].reverse()) {
      await page.keyboard.up(key);
    }
  }
  await page.waitForTimeout(120);
}

async function captureDemoDrive(page) {
  const sequence = [
    { keys: ["KeyW"], ms: 900 },
    { keys: ["KeyW", "KeyA"], ms: 2000 },
    { keys: ["KeyW"], ms: 700 },
    { keys: ["KeyW", "KeyD"], ms: 1100 },
    { keys: ["KeyW"], ms: 650 },
    { keys: ["KeyW", "KeyA"], ms: 1300 },
    { keys: ["KeyW"], ms: 1650 },
    { keys: ["KeyW", "KeyD"], ms: 900 },
    { keys: ["KeyW"], ms: 800 },
    { keys: ["KeyW", "KeyA"], ms: 950 },
  ];

  for (const step of sequence) {
    for (const key of step.keys) {
      await page.keyboard.down(key);
    }
    await page.waitForTimeout(step.ms);
    for (const key of [...step.keys].reverse()) {
      await page.keyboard.up(key);
    }
  }
}

function hasDrivingPhase() {
  const raw = window.render_game_to_text?.();
  if (typeof raw !== "string") return false;
  try {
    return JSON.parse(raw).phase === "driving";
  } catch {
    return false;
  }
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
  if (!address || typeof address === "string") {
    throw new Error("[switchback-dispatch] failed to bind static server");
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
