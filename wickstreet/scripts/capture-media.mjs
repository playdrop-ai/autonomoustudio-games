import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { chromium } from 'playwright';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const previewDir = path.join(rootDir, 'tmp', 'preview');
const listingDir = path.join(rootDir, 'listing');
const screenshotsDir = path.join(listingDir, 'screenshots', 'landscape');
const videosDir = path.join(listingDir, 'videos', 'landscape');
const outputDir = path.join(rootDir, 'output', 'media-capture');
const rawVideoDir = path.join(outputDir, 'raw-video');
const shotsDir = path.join(outputDir, 'shots');
const cropsDir = path.join(rootDir, 'tmp', 'crops');

const viewport = { width: 1280, height: 720 };
const landscapeScreenshot1 = path.join(screenshotsDir, '1.png');
const landscapeScreenshot2 = path.join(screenshotsDir, '2.png');
const landscapeVideoPath = path.join(videosDir, '1.mp4');
const heroReferencePath = path.join(cropsDir, 'hero-reference.png');
const iconReferencePath = path.join(cropsDir, 'icon-reference.png');
const rawVideoPath = path.join(rawVideoDir, 'wickstreet-gameplay.webm');

if (!fs.existsSync(path.join(previewDir, 'index.html'))) {
  throw new Error('wickstreet_preview_missing: run npm run build && node scripts/build_preview_stub.mjs first');
}

fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(videosDir, { recursive: true });
fs.mkdirSync(cropsDir, { recursive: true });
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(rawVideoDir, { recursive: true });
fs.mkdirSync(shotsDir, { recursive: true });

const server = await createStaticServer(previewDir);
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport,
    recordVideo: {
      dir: rawVideoDir,
      size: viewport,
    },
  });
  const page = await context.newPage();

  await page.goto(`${server.url}/index.html?automation=1`, { waitUntil: 'load' });
  await waitForAutomation(page);
  await page.screenshot({ path: path.join(shotsDir, 'start.png') });

  await page.evaluate(() => window.__wickstreetAutomation.start());
  await page.waitForFunction(() => window.__wickstreetAutomation.snapshot().screen === 'playing');
  await followGuideRun(page);

  const video = page.video();
  if (!video) {
    throw new Error('wickstreet_playwright_video_missing');
  }

  await page.close();
  await context.close();

  const savedVideoPath = await video.path();
  fs.copyFileSync(savedVideoPath, rawVideoPath);

  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    rawVideoPath,
    '-t',
    '12',
    '-vf',
    'fade=t=out:st=11.2:d=0.8',
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    landscapeVideoPath,
  ]);

  console.log(JSON.stringify({
    ok: true,
    landscapeScreenshot1,
    landscapeScreenshot2,
    heroReferencePath,
    iconReferencePath,
    landscapeVideoPath,
  }, null, 2));
} finally {
  await browser.close();
  await server.close();
}

async function followGuideRun(page) {
  const appBounds = await page.locator('#app').boundingBox();
  if (!appBounds) {
    throw new Error('wickstreet_missing_app_bounds');
  }

  const holdPoint = {
    x: appBounds.x + appBounds.width / 2,
    y: appBounds.y + appBounds.height / 2,
  };
  await page.mouse.move(holdPoint.x, holdPoint.y);
  await page.mouse.down();

  const startTime = Date.now();
  let shot1Taken = false;
  let shot2Taken = false;

  while (Date.now() - startTime < 12000) {
    const elapsed = Date.now() - startTime;
    const snapshot = await getSnapshot(page);
    if (snapshot.screen !== 'playing') {
      break;
    }
    const nextTarget = pickNextGuideCell(snapshot.guidePath, snapshot.player);
    const targetCell = nextTarget ?? { x: 7, y: 5 };
    const screenTarget = cellCenter(targetCell, snapshot.metrics);
    await page.mouse.move(screenTarget.x, screenTarget.y, { steps: 4 });

    if (!shot1Taken && elapsed >= 2200) {
      await page.screenshot({ path: path.join(shotsDir, 'gameplay-1.png') });
      await page.screenshot({ path: landscapeScreenshot1 });
      shot1Taken = true;
    }

    if (!shot2Taken && elapsed >= 7600) {
      await page.screenshot({ path: path.join(shotsDir, 'gameplay-2.png') });
      await page.screenshot({ path: landscapeScreenshot2 });
      await page.screenshot({ path: heroReferencePath });
      await cropIconReference(heroReferencePath, snapshot);
      shot2Taken = true;
    }

    await page.waitForTimeout(120);
  }

  await page.mouse.up();
}

async function cropIconReference(sourcePath, snapshot) {
  const playerScreen = worldToScreen(snapshot.player, snapshot.metrics);
  const cropWidth = 720;
  const cropHeight = 720;
  const x = clamp(Math.round(playerScreen.x - cropWidth / 2), 0, viewport.width - cropWidth);
  const y = clamp(Math.round(playerScreen.y - cropHeight / 2), 0, viewport.height - cropHeight);
  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    sourcePath,
    '-vf',
    `crop=${cropWidth}:${cropHeight}:${x}:${y}`,
    iconReferencePath,
  ]);
}

async function waitForAutomation(page) {
  await page.waitForFunction(() => typeof window.__wickstreetAutomation?.snapshot === 'function', undefined, {
    timeout: 30000,
  });
}

async function getSnapshot(page) {
  return page.evaluate(() => window.__wickstreetAutomation.snapshot());
}

function pickNextGuideCell(guidePath, player) {
  if (!Array.isArray(guidePath) || guidePath.length === 0) {
    return null;
  }
  if (guidePath.length === 1) {
    return guidePath[0];
  }
  const currentCell = {
    x: Math.floor(player.x),
    y: Math.floor(player.y),
  };
  const candidate = guidePath[0].x === currentCell.x && guidePath[0].y === currentCell.y
    ? guidePath[1]
    : guidePath[0];
  return candidate ?? guidePath.at(-1) ?? null;
}

function worldToScreen(position, metrics) {
  return {
    x: metrics.offsetX + position.x * metrics.scale,
    y: metrics.offsetY + position.y * metrics.scale,
  };
}

function cellCenter(cell, metrics) {
  return worldToScreen({
    x: cell.x + 0.5,
    y: cell.y + 0.5,
  }, metrics);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function createStaticServer(directory) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const filePath = path.join(directory, pathname);
    if (!filePath.startsWith(directory)) {
      response.writeHead(403).end('Forbidden');
      return;
    }

    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        response.writeHead(301, { Location: `${pathname}/index.html` }).end();
        return;
      }
      response.writeHead(200, { 'Content-Type': contentType(filePath) });
      fs.createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end('Not found');
    }
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('wickstreet_static_server_failed');
  }
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close(error => (error ? reject(error) : resolve()))),
  };
}

function contentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  if (filePath.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}
