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
const outputDir = path.join(rootDir, "output", "song-videos");
const listingVideoDir = path.join(rootDir, "listing", "videos");

const FPS = 24;
const FRAME_COUNT = 192;
const FRAME_MS = 1000 / FPS;
const LEAD_IN_MS = 180;

const clips = [
  {
    slug: "piano",
    songId: "piano",
    difficulty: "medium",
    songOffsetMs: 6000,
    audioPath: path.join(rootDir, "assets", "audio", "piano-etude.mp3"),
  },
  {
    slug: "rock",
    songId: "rock",
    difficulty: "medium",
    songOffsetMs: 6000,
    audioPath: path.join(rootDir, "assets", "audio", "rock-drive.mp3"),
  },
];

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(listingVideoDir, { recursive: true });

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  const outputs = [];

  for (const clip of clips) {
    const frameDir = path.join(outputDir, clip.slug, "frames");
    fs.mkdirSync(frameDir, { recursive: true });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    await page.goto(`${server.url}?debug_clock=manual`, { waitUntil: "load" });
    await waitForGameReady(page);
    await page.evaluate((selection) => {
      window.__keyfallControl?.selectSong(selection.songId);
      window.__keyfallControl?.selectDifficulty(selection.difficulty);
      window.__keyfallControl?.setAutoplay(true);
      window.__keyfallControl?.setMuted(true);
      window.__keyfallControl?.startRun();
    }, clip);
    await page.evaluate((ms) => window.advanceTime?.(ms), LEAD_IN_MS + clip.songOffsetMs);

    for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
      const framePath = path.join(frameDir, `frame-${String(frame).padStart(4, "0")}.png`);
      await page.screenshot({ path: framePath });
      await page.evaluate((ms) => window.advanceTime?.(ms), FRAME_MS);
    }

    await page.close();
    await context.close();

    const outputPath = path.join(listingVideoDir, `keyfall-${clip.slug}-gameplay.mp4`);
    await execFileAsync("ffmpeg", [
      "-y",
      "-framerate",
      String(FPS),
      "-i",
      path.join(frameDir, "frame-%04d.png"),
      "-ss",
      String(clip.songOffsetMs / 1000),
      "-t",
      String((FRAME_COUNT / FPS).toFixed(3)),
      "-i",
      clip.audioPath,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      "-movflags",
      "+faststart",
      outputPath,
    ]);

    const probe = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_type,codec_name",
      "-of",
      "json",
      outputPath,
    ]);

    outputs.push({
      songId: clip.songId,
      difficulty: clip.difficulty,
      outputPath,
      probe: JSON.parse(probe.stdout),
    });
  }

  console.log(JSON.stringify({ ok: true, outputs }, null, 2));
} finally {
  await browser.close();
  await server.close();
}

async function waitForGameReady(page) {
  await page.waitForFunction(() => typeof window.__keyfallControl?.getState === "function", undefined, {
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
  if (filePath.endsWith(".mp3")) return "audio/mpeg";
  if (filePath.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}
