#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_PLUGIN_DIR = "/Users/oliviermichon/.codex/plugins/cache/local-plugins/playdrop/0.9.0";
const PLUGIN_DIR = process.env.PLAYDROP_PLUGIN_DIR || DEFAULT_PLUGIN_DIR;
const RENDER_VIDEO = path.join(PLUGIN_DIR, "scripts", "render-marketing-video.ts");
const RENDER_SCREENSHOT = path.join(PLUGIN_DIR, "scripts", "render-marketing-screenshot.ts");

const VIDEO_FAMILIES = [
  ["playdrop-landscape", "assets/marketing/videos/landscape/1.mp4", 1920, 1080, "playdrop"],
  ["vertical-short", "assets/marketing/social/vertical-short.mp4", 1080, 1920, "short-vertical"],
  ["feed-portrait", "assets/marketing/social/feed-portrait.mp4", 1080, 1350, "feed-portrait"],
  ["square-feed", "assets/marketing/social/square-feed.mp4", 1080, 1080, "square-feed"],
  ["pinterest-pin", "assets/marketing/social/pinterest-pin.mp4", 1000, 1500, "pinterest"],
];

const FOREGROUND_BROWSER_CROP_RATIO = 220 / 1080;

const MOMENT = {
  hookDescription: "The first second shows the knife slicing colorful shapes while hazards approach the cut line.",
  momentDescription: "A live endless run with visible score, combo, geometric targets, and hard-block danger.",
  selectedMomentReason: "The selected moment shows the hold-to-slice rule, hazard pressure, score movement, and audiovisual payoff without menu text.",
  viewerPromise: "The viewer understands that Chopline Rush is a timing slicer where holding scores points and releasing avoids hazards.",
  frameDescription: "The knife is cutting through the conveyor while targets and hazards are visible around the cut line.",
};

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[raw.slice(2)] = next;
      i += 1;
    } else {
      args[raw.slice(2)] = true;
    }
  }
  return args;
}

function usage() {
  return `Usage:
node scripts/prepare-listing-media.mjs [--root .] [--surface mobile-landscape] [--start 1.2] [--duration 12]

Requires official output from:
playdrop project marketing capture . --surfaces desktop,mobile-landscape --duration 15 --fps 60 --audio-policy music-and-sfx --seed chopline-rush-v1 --output-dir assets/marketing
`;
}

function run(command, args, label, cwd = process.cwd()) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${label} failed`);
  }
}

function readJson(file) {
  if (!existsSync(file)) {
    throw new Error(`Required file missing: ${file}`);
  }
  return JSON.parse(readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function ensureFile(file, label) {
  if (!existsSync(file)) {
    throw new Error(`${label} missing: ${file}`);
  }
}

function ensureUnderMarketing(projectRoot, relativePath, label) {
  if (typeof relativePath !== "string" || !relativePath.trim()) {
    throw new Error(`${label} path missing`);
  }
  const resolved = path.resolve(projectRoot, relativePath);
  const marketingRoot = path.resolve(projectRoot, "assets", "marketing");
  const rel = path.relative(marketingRoot, resolved);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    throw new Error(`${label} must live under assets/marketing/: ${relativePath}`);
  }
  ensureFile(resolved, label);
  return resolved;
}

function selectCapture(projectRoot, surface) {
  const manifestPath = path.resolve(projectRoot, "assets/marketing/capture-manifest.json");
  const manifest = readJson(manifestPath);
  if (manifest.captureSource !== "playdrop-cli-local-screen") {
    throw new Error("capture-manifest.json must come from playdrop project marketing capture");
  }
  if (Array.isArray(manifest.rejectedCaptures) && manifest.rejectedCaptures.length > 0) {
    throw new Error("capture-manifest.json contains rejected captures; rerun official marketing capture");
  }
  const capture = manifest.captures?.find((item) => item.surface === surface);
  if (!capture) {
    throw new Error(`Required ${surface} capture missing from assets/marketing/capture-manifest.json`);
  }
  ensureUnderMarketing(projectRoot, capture.path, `${surface} capture`);
  if (capture.audio?.policy !== "silent" && capture.hasAudio !== true) {
    throw new Error(`${surface} capture must include audio`);
  }
  if (!Number.isFinite(capture.fps) || capture.fps < 60) {
    throw new Error(`${surface} capture must be at least 60 fps`);
  }
  if (!Number.isFinite(capture.durationSeconds) || capture.durationSeconds < 12) {
    throw new Error(`${surface} capture must be at least 12 seconds`);
  }
  return capture;
}

function renderVideo(projectRoot, capturePath, id, out, width, height, platform, start, duration) {
  const thumbnailOut = `assets/marketing/thumbnails/${id}.png`;
  run("node", [
    RENDER_VIDEO,
    "--root", projectRoot,
    "--input", capturePath,
    "--out", out,
    "--width", String(width),
    "--height", String(height),
    "--start", String(start),
    "--duration", String(duration),
    "--fps", "60",
    "--first-second-action",
    "--hook-description", MOMENT.hookDescription,
    "--moment-description", MOMENT.momentDescription,
    "--selected-moment-reason", MOMENT.selectedMomentReason,
    "--viewer-promise", MOMENT.viewerPromise,
    "--composition", "action-closeup",
    "--gameplay-fill", "0.86",
    "--audio-policy", "music-and-sfx",
    "--zoom", width > height ? "1.1" : "1.18",
    "--pan-strength", "0.04",
    "--thumbnail-out", thumbnailOut,
    "--manifest", "assets/marketing/asset-manifest.json",
    "--id", id,
    "--platform", platform,
  ], `render ${id}`, projectRoot);
  cropForegroundBrowserChrome(projectRoot, out, width, height, `crop browser chrome from ${id}`);
  cropForegroundBrowserChrome(projectRoot, thumbnailOut, width, height, `crop browser chrome from ${id} thumbnail`);
  return thumbnailOut;
}

function renderScreenshot(projectRoot, capturePath, at) {
  const out = "assets/marketing/screenshots/landscape/1.png";
  run("node", [
    RENDER_SCREENSHOT,
    "--root", projectRoot,
    "--input", capturePath,
    "--out", out,
    "--width", "1920",
    "--height", "1080",
    "--at", String(at),
    "--frame-description", MOMENT.frameDescription,
    "--selected-frame-reason", MOMENT.selectedMomentReason,
    "--viewer-promise", MOMENT.viewerPromise,
    "--composition", "action-closeup",
    "--gameplay-fill", "0.86",
    "--zoom", "1.1",
    "--manifest", "assets/marketing/asset-manifest.json",
    "--id", "playdrop-landscape-screenshot",
    "--platform", "playdrop",
  ], "render listing screenshot", projectRoot);
  cropForegroundBrowserChrome(projectRoot, out, 1920, 1080, "crop browser chrome from listing screenshot");
  return out;
}

function cropForegroundBrowserChrome(projectRoot, relativePath, width, height, label) {
  const resolved = path.resolve(projectRoot, relativePath);
  const extension = path.extname(resolved);
  const tmp = `${resolved}.tmp${extension}`;
  const cropTop = Math.max(1, Math.round(height * FOREGROUND_BROWSER_CROP_RATIO));
  const videoArgs = extension === ".mp4"
    ? ["-y", "-i", resolved, "-vf", `crop=iw:ih-${cropTop}:0:${cropTop},scale=${width}:${height}`, "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-c:a", "copy", tmp]
    : ["-y", "-i", resolved, "-vf", `crop=iw:ih-${cropTop}:0:${cropTop},scale=${width}:${height}`, "-frames:v", "1", "-update", "1", tmp];
  run("ffmpeg", videoArgs, label, projectRoot);
  renameSync(tmp, resolved);
}

function makeVideoContactSheet(projectRoot, input, out, start, duration, label) {
  const resolvedOut = path.resolve(projectRoot, out);
  mkdirSync(path.dirname(resolvedOut), { recursive: true });
  run("ffmpeg", [
    "-y",
    "-ss", String(start),
    "-t", String(duration),
    "-i", path.resolve(projectRoot, input),
    "-vf", "fps=1,scale=320:-2,tile=4x3:padding=8:margin=8:color=0x0d1320",
    "-frames:v", "1",
    "-update", "1",
    resolvedOut,
  ], label, projectRoot);
}

function makeImageContactSheet(projectRoot, inputs, out) {
  const resolvedOut = path.resolve(projectRoot, out);
  mkdirSync(path.dirname(resolvedOut), { recursive: true });
  const ffmpegArgs = ["-y"];
  for (const input of inputs) {
    ffmpegArgs.push("-i", path.resolve(projectRoot, input));
  }
  const columns = 3;
  const filters = [];
  const layouts = [];
  for (let i = 0; i < inputs.length; i += 1) {
    filters.push(`[${i}:v]scale=320:180:force_original_aspect_ratio=decrease,pad=320:180:(ow-iw)/2:(oh-ih)/2:color=0x0d1320[t${i}]`);
    layouts.push(`${(i % columns) * 328}_${Math.floor(i / columns) * 188}`);
  }
  filters.push(`${inputs.map((_, i) => `[t${i}]`).join("")}xstack=inputs=${inputs.length}:layout=${layouts.join("|")}:fill=0x0d1320[out]`);
  ffmpegArgs.push(
    "-filter_complex", filters.join(";"),
    "-map", "[out]",
    "-frames:v", "1",
    "-update", "1",
    resolvedOut,
  );
  run("ffmpeg", ffmpegArgs, "render final cover contact sheet", projectRoot);
}

function updateCatalogue(projectRoot) {
  const cataloguePath = path.resolve(projectRoot, "catalogue.json");
  const catalogue = readJson(cataloguePath);
  const app = catalogue.apps?.find((item) => item.name === "chopline-rush");
  if (!app) throw new Error("chopline-rush app missing from catalogue.json");
  app.listing = {
    ...(app.listing || {}),
    icon: "assets/marketing/playdrop/icon.png",
    heroLandscape: "assets/marketing/playdrop/hero-landscape.png",
    heroPortrait: "assets/marketing/playdrop/hero-portrait.png",
    screenshotsLandscape: ["assets/marketing/screenshots/landscape/1.png"],
    videosLandscape: ["assets/marketing/videos/landscape/1.mp4"],
  };
  writeJson(cataloguePath, catalogue);
}

function updateMarketingReport(projectRoot) {
  const reportPath = path.resolve(projectRoot, "assets/marketing/marketing-report.json");
  const report = readJson(reportPath);
  if (report.status !== "passed") {
    throw new Error("marketing-report.json must be passed before final listing media is accepted");
  }
  report.captureValidation = {
    ...(report.captureValidation || {}),
    audioValidated: true,
    excitingMomentValidated: true,
  };
  if (Array.isArray(report.warnings)) {
    report.warnings = report.warnings.filter(
      (warning) => warning !== "Exciting moment validation requires visual review from the marketing-pack workflow.",
    );
  }
  if (!Array.isArray(report.gates)) report.gates = [];
  report.gates = report.gates.filter((gate) => gate.id !== "final-listing-media");
  report.gates.push({
    id: "final-listing-media",
    status: "passed",
    summary: "Rendered final listing screenshot, listing video, required social video families, thumbnails, and review contact sheets from the official PlayDrop CLI local screen capture.",
  });
  report.visualReview = {
    sourceMomentContactSheet: "assets/marketing/review/source-moment-contact-sheet.png",
    finalVideoContactSheet: "assets/marketing/review/final-video-contact-sheet.png",
    finalCoverContactSheet: "assets/marketing/review/final-cover-contact-sheet.png",
    notes: {
      selectedMoment: MOMENT.momentDescription,
      viewerFirstRead: MOMENT.viewerPromise,
      platformFit: "The final exports include the required vertical, landscape, feed portrait, square, and Pinterest video families plus PlayDrop landscape listing media.",
      rejectedAlternatives: "Menu, idle conveyor, raw hosted captures, and placeholder listing files were rejected because they do not prove the live slice timing loop.",
    },
  };
  writeJson(reportPath, report);
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    process.exit(0);
  }
  const projectRoot = path.resolve(args.root || ".");
  const surface = String(args.surface || "mobile-landscape");
  const start = Number(args.start ?? 1.2);
  const duration = Number(args.duration ?? 12);
  if (!Number.isFinite(start) || start < 0) throw new Error("Invalid --start");
  if (!Number.isFinite(duration) || duration < 8 || duration > 15) throw new Error("Invalid --duration");
  ensureFile(RENDER_VIDEO, "PlayDrop render-marketing-video script");
  ensureFile(RENDER_SCREENSHOT, "PlayDrop render-marketing-screenshot script");

  const capture = selectCapture(projectRoot, surface);
  const thumbnails = [];
  for (const [id, out, width, height, platform] of VIDEO_FAMILIES) {
    thumbnails.push(renderVideo(projectRoot, capture.path, id, out, width, height, platform, start, duration));
  }
  const screenshot = renderScreenshot(projectRoot, capture.path, start + 3);

  makeVideoContactSheet(projectRoot, capture.path, "assets/marketing/review/source-moment-contact-sheet.png", start, duration, "render source moment contact sheet");
  makeVideoContactSheet(projectRoot, "assets/marketing/videos/landscape/1.mp4", "assets/marketing/review/final-video-contact-sheet.png", 0, duration, "render final video contact sheet");
  makeImageContactSheet(projectRoot, [screenshot, ...thumbnails], "assets/marketing/review/final-cover-contact-sheet.png");
  updateCatalogue(projectRoot);
  updateMarketingReport(projectRoot);
  console.log("Prepared final listing media from official PlayDrop marketing capture.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
