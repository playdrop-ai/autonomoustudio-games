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
const outputDir = path.join(rootDir, "output", "marketing-video");
const rawDir = path.join(outputDir, "raw");
const shotDir = path.join(outputDir, "shots");
const rawVideoPath = path.join(rawDir, "keyfall-kickass.webm");
const mp4Path = path.join(rootDir, "listing", "keyfall-gameplay.mp4");
const startShotPath = path.join(shotDir, "start.png");
const actionShotPath = path.join(shotDir, "action.png");

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(rawDir, { recursive: true });
fs.mkdirSync(shotDir, { recursive: true });

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: rawDir,
      size: { width: 1280, height: 720 },
    },
  });
  const page = await context.newPage();

  await page.goto(server.url, { waitUntil: "load" });
  await waitForGameReady(page);
  await page.evaluate(() => {
    for (const button of Array.from(document.querySelectorAll("button"))) {
      const label = button.textContent?.trim().toLowerCase();
      if (label === "mute" || label === "sound") {
        button.style.opacity = "0";
        button.style.pointerEvents = "none";
      }
    }
  });
  await page.screenshot({ path: startShotPath });

  await page.waitForTimeout(1100);
  await page.evaluate(() => {
    window.__keyfallControl?.selectSong("rock");
    window.__keyfallControl?.selectDifficulty("medium");
    window.__keyfallControl?.setMuted(true);
    window.__keyfallControl?.setAutoplay(true);
    window.__keyfallControl?.startRun();
  });
  await page.waitForTimeout(7200);
  await page.screenshot({ path: actionShotPath });
  await page.waitForTimeout(2600);

  const video = page.video();
  await page.close();
  await context.close();

  if (!video) {
    throw new Error("Playwright video recording did not start");
  }

  const savedVideoPath = await video.path();
  fs.copyFileSync(savedVideoPath, rawVideoPath);

  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    rawVideoPath,
    "-t",
    "9.6",
    "-vf",
    "fade=t=out:st=9.0:d=0.6",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    mp4Path,
  ]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        mp4Path,
        rawVideoPath,
        startShotPath,
        actionShotPath,
      },
      null,
      2,
    ),
  );
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
