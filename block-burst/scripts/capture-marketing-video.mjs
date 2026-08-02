import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appUrl = new URL("../dist/index.html", import.meta.url).href;
const campaignDir = resolve(appDir, "assets/marketing/video-campaign");
const workDir = resolve(campaignDir, "project/capture-work");

const requestedTarget = process.argv.find((arg) => arg.startsWith("--target="))?.split("=")[1];
const allTargets = [
  {
    name: "applovin-six-line",
    width: 1080,
    height: 1920,
    durationMs: 18_000,
    surface: "mobile-portrait",
    sceneId: "listing-applovin-six-line",
  },
  {
    name: "portrait",
    width: 1080,
    height: 1920,
    durationMs: 15_000,
    surface: "mobile-portrait",
    sceneId: "listing-portrait",
  },
  {
    name: "landscape",
    width: 1920,
    height: 1080,
    durationMs: 24_000,
    surface: "mobile-landscape",
    sceneId: "listing-landscape",
  },
  {
    name: "instagram-3x4",
    width: 1080,
    height: 1440,
    durationMs: 15_000,
    surface: "mobile-portrait",
    sceneId: "listing-instagram-3x4",
  },
  {
    name: "pinterest-2x3",
    width: 1000,
    height: 1500,
    durationMs: 15_000,
    surface: "mobile-portrait",
    sceneId: "listing-pinterest-2x3",
  },
];
const targets = requestedTarget ? allTargets.filter((target) => target.name === requestedTarget) : allTargets;
if (targets.length === 0) throw new Error(`[block-burst] Unknown marketing capture target: ${requestedTarget}`);

mkdirSync(workDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (const target of targets) {
    const rawDir = resolve(workDir, target.name);
    const outputDir = resolve(campaignDir, "source-captures", target.name);
    mkdirSync(rawDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });
    const recorderDir = mkdtempSync(resolve(rawDir, "recorder-"));

    const context = await browser.newContext({
      viewport: { width: target.width, height: target.height },
      deviceScaleFactor: 1,
      recordVideo: {
        dir: recorderDir,
        size: { width: target.width, height: target.height },
      },
    });
    const pageCreatedAt = Date.now();
    const page = await context.newPage();
    const video = page.video();
    if (!video) throw new Error(`[block-burst] Video recorder unavailable for ${target.name}`);

    await page.goto(appUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("canvas");
    await page.waitForFunction(() => Boolean(window.__listingCapture?.prepare));
    await page.evaluate(async (payload) => {
      await window.__listingCapture?.prepare?.({
        active: true,
        sceneId: payload.sceneId,
        surface: payload.surface,
        seed: "block-burst-marketing",
        audioPolicy: "sfx-only",
      });
    }, target);
    await page.waitForTimeout(180);

    const captureStartedAt = Date.now();
    await page.evaluate(async () => {
      await window.__listingCapture?.startAudioCapture?.();
    });
    const samples = [];
    for (let elapsedMs = 0; elapsedMs < target.durationMs; elapsedMs += 100) {
      await page.waitForTimeout(100);
      const state = JSON.parse(await page.evaluate(() => window.render_game_to_text?.() ?? "{}"));
      samples.push({
        elapsedMs: Date.now() - captureStartedAt,
        linesRun: state.linesRun,
        combo: state.combo,
        occupied: state.boardOccupied,
        bombsOnBoard: state.specials?.flat?.().filter((special) => special === "bomb").length ?? 0,
        trayPieceCount: state.trayPieceCount,
        gesturePhase: state.gesturePhase,
      });
    }
    const audio = await page.evaluate(async () => {
      return await window.__listingCapture?.stopAudioCapture?.();
    });
    if (!audio?.base64) throw new Error(`[block-burst] Audio capture unavailable for ${target.name}`);

    await page.close();
    await context.close();

    const recordedVideo = await video.path();
    const rawVideo = resolve(rawDir, `${target.name}-page.webm`);
    const rawAudio = resolve(rawDir, `${target.name}-audio.webm`);
    copyFileSync(recordedVideo, rawVideo);
    writeFileSync(rawAudio, Buffer.from(audio.base64, "base64"));
    rmSync(recorderDir, { recursive: true, force: true });

    const trimSeconds = Math.max(0, (captureStartedAt - pageCreatedAt) / 1000);
    const durationSeconds = target.durationMs / 1000;
    const output = resolve(outputDir, `${target.name}-gameplay.mp4`);
    execFileSync("ffmpeg", [
      "-loglevel", "error",
      "-y",
      "-ss", trimSeconds.toFixed(3),
      "-i", rawVideo,
      "-i", rawAudio,
      "-map", "0:v:0",
      "-map", "1:a:0",
      "-t", durationSeconds.toFixed(3),
      "-vf", `fps=30,scale=${target.width}:${target.height}:flags=lanczos,setsar=1`,
      "-af", "apad=pad_dur=30",
      "-c:v", "libx264",
      "-preset", "medium",
      "-crf", "18",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "192k",
      "-ar", "48000",
      "-ac", "2",
      "-movflags", "+faststart",
      output,
    ], { stdio: "inherit" });

    const payoff = samples.find((sample) => sample.linesRun >= 6);
    const report = {
      target: target.name,
      sceneId: target.sceneId,
      width: target.width,
      height: target.height,
      durationSeconds,
      payoffMs: payoff?.elapsedMs ?? null,
      maxLinesRun: Math.max(...samples.map((sample) => sample.linesRun ?? 0)),
      initialBombs: samples[0]?.bombsOnBoard ?? null,
      finalBombs: samples.at(-1)?.bombsOnBoard ?? null,
      samples,
      output,
    };
    writeFileSync(resolve(outputDir, `${target.name}-report.json`), `${JSON.stringify(report, null, 2)}\n`);

    console.log(`[block-burst] Captured ${basename(output)} (${target.width}x${target.height}, ${durationSeconds}s)`);
  }
} finally {
  await browser.close();
}
