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
const outputDir = path.join(rootDir, "output", "listing-refresh");
const rawVideoDir = path.join(outputDir, "raw-video");

const PORTRAIT = { width: 720, height: 1280 };

const portraitSeed = readIntFlag("--portrait-seed", 1004);
const videoActions = readIntFlag("--video-actions", 9);
const videoWaitMs = readIntFlag("--video-wait-ms", 760);
const videoLeadInMs = readIntFlag("--video-lead-in-ms", 500);
const videoTrimSeconds = readFloatFlag("--video-trim-seconds", 0.3);

const portraitVideoPath = path.join(listingDir, "velvet-arcana_720x1280-recording.mp4");
const portraitVideoWithAudioPath = path.join(outputDir, "velvet-arcana_720x1280-recording-with-audio.mp4");
const rawVideoPath = path.join(rawVideoDir, "velvet-arcana-listing-refresh-portrait.webm");
const posterPath = path.join(outputDir, "velvet-arcana-listing-refresh-portrait-poster.png");
const eventTimelinePath = path.join(outputDir, "present-video-events-portrait.json");

fs.mkdirSync(listingDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(rawVideoDir, { recursive: true });

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  const videoCapture = await capturePresentVideo(browser, server.url);
  fs.writeFileSync(eventTimelinePath, `${JSON.stringify(videoCapture, null, 2)}\n`, "utf8");
  await muxVideoAudio(videoCapture);

  process.stdout.write(
    `${JSON.stringify(
      {
        portraitVideoPath,
        portraitVideoWithAudioPath,
        posterPath,
        eventTimelinePath,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await browser.close();
  await server.close();
}

async function capturePresentVideo(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: PORTRAIT,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
    recordVideo: {
      dir: rawVideoDir,
      size: PORTRAIT,
    },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${serverUrl}/index.html?seed=${portraitSeed}`, { waitUntil: "load" });
    await waitForReady(page);
    await page.evaluate((seed) => window.velvetArcanaDebug?.startSpread(1, seed), portraitSeed);

    let elapsedMs = 0;
    await page.waitForTimeout(videoLeadInMs);
    elapsedMs += videoLeadInMs;

    const events = [];
    for (let step = 0; step < videoActions; step += 1) {
      const before = await readState(page);
      const hiddenBefore = totalHidden(before);
      await page.evaluate(() => window.velvetArcanaDebug?.autoStep("planner"));
      const after = await readState(page);
      const hiddenAfter = totalHidden(after);
      const action = after.stock < before.stock ? "draw" : "play";
      events.push({
        t: Number(Math.max(0, (elapsedMs / 1000) - videoTrimSeconds).toFixed(2)),
        action,
        revealed: hiddenAfter < hiddenBefore,
      });
      await page.waitForTimeout(videoWaitMs);
      elapsedMs += videoWaitMs;
    }

    const video = page.video();
    if (!video) throw new Error("[velvet-arcana] Playwright portrait video recording did not start");

    await page.close();
    await context.close();

    fs.copyFileSync(await video.path(), rawVideoPath);

    const rawDurationSeconds = Math.max(7.2, elapsedMs / 1000 - videoTrimSeconds);
    await execFileAsync("ffmpeg", [
      "-y",
      "-ss",
      videoTrimSeconds.toFixed(2),
      "-i",
      rawVideoPath,
      "-t",
      rawDurationSeconds.toFixed(2),
      "-vf",
      `fade=t=out:st=${Math.max(0, rawDurationSeconds - 0.8).toFixed(2)}:d=0.8`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      portraitVideoPath,
    ]);

    await execFileAsync("ffmpeg", [
      "-y",
      "-ss",
      "1.60",
      "-i",
      portraitVideoPath,
      "-frames:v",
      "1",
      posterPath,
    ]);

    return {
      seed: portraitSeed,
      durationSeconds: Number(rawDurationSeconds.toFixed(2)),
      events,
    };
  } finally {
    try {
      await context.close();
    } catch {}
  }
}

async function muxVideoAudio(capture) {
  const audioInputs = [
    "-i",
    path.join(rootDir, "assets", "audio", "music-present.mp3"),
  ];
  const filters = [
    `[1:a]atrim=0:${capture.durationSeconds.toFixed(2)},afade=t=out:st=${Math.max(0, capture.durationSeconds - 0.8).toFixed(
      2,
    )}:d=0.8,volume=0.24[music]`,
  ];
  const mixInputs = ["[music]"];

  let inputIndex = 2;
  let playCount = 0;
  let drawCount = 0;
  for (const event of capture.events) {
    const isDraw = event.action === "draw";
    const inputPath = path.join(rootDir, "assets", "audio", isDraw ? "sfx-draw.mp3" : "sfx-play.mp3");
    audioInputs.push("-i", inputPath);
    const nodeName = isDraw ? `draw${++drawCount}` : `play${++playCount}`;
    const volume = isDraw ? "0.92" : "0.80";
    const delayMs = Math.max(0, Math.round(event.t * 1000));
    filters.push(`[${inputIndex}:a]adelay=${delayMs}|${delayMs},volume=${volume}[${nodeName}]`);
    mixInputs.push(`[${nodeName}]`);
    inputIndex += 1;
  }

  const filterComplex = `${filters.join(";")};${mixInputs.join("")}amix=inputs=${mixInputs.length}:normalize=0:dropout_transition=0[aout]`;

  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    portraitVideoPath,
    ...audioInputs,
    "-filter_complex",
    filterComplex,
    "-map",
    "0:v:0",
    "-map",
    "[aout]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    portraitVideoWithAudioPath,
  ]);
}

async function waitForReady(page) {
  await page.waitForFunction(() => typeof window.velvetArcanaDebug?.getState === "function", undefined, {
    timeout: 30000,
  });
}

async function readState(page) {
  const state = await page.evaluate(() => window.velvetArcanaDebug?.getState());
  if (!state) throw new Error("[velvet-arcana] Debug state unavailable");
  return state;
}

function totalHidden(state) {
  return state.columns.reduce((sum, column) => sum + column.hiddenCount, 0);
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
  if (filePath.endsWith(".mp3")) return "audio/mpeg";
  if (filePath.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}
