#!/usr/bin/env node

import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const PROJECT_ROOT = '/Users/oliviermichon/Documents/autonomoustudio-games/shardspan';
const PLAYDROP_ROOT = '/Users/oliviermichon/Documents/playdrop';
const DIST_ROOT = join(PROJECT_ROOT, 'dist');
const LISTING_ROOT = join(PROJECT_ROOT, 'listing');
const OUTPUT_ROOT = join(PROJECT_ROOT, 'output', 'listing-capture');
const FRAME_RATE = 12;
const FRAME_STEP_MS = Math.round(1000 / FRAME_RATE);
const require = createRequire(join(PLAYDROP_ROOT, 'package.json'));
const { chromium } = require('playwright');

const LANDSCAPE_PREFIX = 'shardspan_1280x720';
const PORTRAIT_PREFIX = 'shardspan_720x1280';

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function resetDir(path) {
  rmSync(path, { recursive: true, force: true });
  ensureDir(path);
}

function mimeType(path) {
  switch (extname(path).toLowerCase()) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.svg':
      return 'image/svg+xml';
    case '.ogg':
      return 'audio/ogg';
    case '.mp3':
      return 'audio/mpeg';
    case '.glb':
      return 'model/gltf-binary';
    case '.bin':
      return 'application/octet-stream';
    default:
      return 'application/octet-stream';
  }
}

async function startStaticServer(root) {
  const server = createServer((request, response) => {
    try {
      const requestPath = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
      const normalizedPath = normalize(decodeURIComponent(requestPath))
        .replace(/^(\.\.[/\\])+/, '')
        .replace(/^[/\\]+/, '');
      const candidate =
        requestPath === '/' ? join(root, 'test-host.html') : join(root, normalizedPath);
      const resolvedCandidate = resolve(candidate);
      if (!resolvedCandidate.startsWith(resolve(root))) {
        response.statusCode = 403;
        response.end('forbidden');
        return;
      }
      if (!existsSync(resolvedCandidate) || statSync(resolvedCandidate).isDirectory()) {
        response.statusCode = 404;
        response.end('not_found');
        return;
      }
      const content = readFileSync(resolvedCandidate);
      response.statusCode = 200;
      response.setHeader('content-type', mimeType(resolvedCandidate));
      response.end(content);
    } catch (error) {
      response.statusCode = 500;
      response.end(error instanceof Error ? error.message : 'server_error');
    }
  });

  await new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(0, '127.0.0.1', () => resolvePromise());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('static_server_address_unavailable');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolvePromise, rejectPromise) => {
        server.close((error) => {
          if (error) {
            rejectPromise(error);
            return;
          }
          resolvePromise();
        });
      }),
  };
}

function viewportForOrientation(orientation) {
  if (orientation === 'portrait') {
    return {
      width: 720,
      height: 1280,
      isMobile: true,
      hasTouch: true,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    };
  }

  return {
    width: 1280,
    height: 720,
    isMobile: false,
    hasTouch: false,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  };
}

async function openDemoPage(browser, orientation) {
  const testHostPath = join(DIST_ROOT, 'test-host.html');
  if (!existsSync(testHostPath)) {
    throw new Error(`missing_test_host:${testHostPath}`);
  }

  const server = await startStaticServer(DIST_ROOT);
  const viewport = viewportForOrientation(orientation);
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    userAgent: viewport.userAgent,
  });
  const page = await context.newPage();
  await page.goto(`${server.baseUrl}/test-host.html`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () =>
      typeof window.render_game_to_text === 'function' &&
      typeof window.advanceTime === 'function' &&
      typeof window.__listingCapture?.prepare === 'function' &&
      typeof window.__starterKitDebug?.runGhost === 'function',
    undefined,
    { timeout: 30000 },
  );
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });
  return { page, context, server };
}

async function cleanupListingChrome(page) {
  await page.evaluate(() => {
    const selectors = [
      '#debug-panel',
      '#touch-controls',
      '#desktop-control-hints',
      '#rotate-overlay',
      '#unsupported-overlay',
    ];
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      if (node instanceof HTMLElement) {
        node.hidden = true;
        node.style.display = 'none';
      }
    }
  });
}

async function prepareScene(page, sceneId) {
  await page.evaluate(async (id) => {
    await window.__listingCapture?.prepare(id);
  }, sceneId);
}

async function advance(page, ms) {
  await page.evaluate((delta) => {
    window.advanceTime?.(delta);
  }, ms);
}

async function runGhost(page, name) {
  await page.evaluate((ghostName) => {
    window.__starterKitDebug?.runGhost(ghostName);
  }, name);
}

async function captureFrames(page, framesDir, totalFrames) {
  ensureDir(framesDir);
  for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
    await advance(page, FRAME_STEP_MS);
    const framePath = join(framesDir, `frame-${String(frameIndex).padStart(4, '0')}.png`);
    await page.screenshot({
      path: framePath,
      type: 'png',
      animations: 'disabled',
    });
  }
}

function encodeMp4(framesDir, outputPath) {
  const result = spawnSync('/opt/homebrew/bin/ffmpeg', [
    '-y',
    '-framerate',
    String(FRAME_RATE),
    '-i',
    join(framesDir, 'frame-%04d.png'),
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath,
  ], {
    stdio: 'pipe',
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`ffmpeg_failed:${result.stderr || result.stdout}`);
  }
}

function copyFrame(framesDir, frameIndex, outputPath) {
  copyFileSync(join(framesDir, `frame-${String(frameIndex).padStart(4, '0')}.png`), outputPath);
}

async function captureLandscape(browser) {
  const framesDir = join(OUTPUT_ROOT, 'landscape-frames');
  resetDir(framesDir);

  const { page, context, server } = await openDemoPage(browser, 'landscape');
  try {
    await cleanupListingChrome(page);
    await prepareScene(page, 'listing-landscape');
    await runGhost(page, 'smoke');
    await advance(page, 650);
    await captureFrames(page, framesDir, 60);
    copyFrame(framesDir, 2, join(LISTING_ROOT, `${LANDSCAPE_PREFIX}-screenshot-1.png`));
    copyFrame(framesDir, 6, join(LISTING_ROOT, `${LANDSCAPE_PREFIX}-screenshot-2.png`));
    encodeMp4(framesDir, join(LISTING_ROOT, `${LANDSCAPE_PREFIX}-recording.mp4`));
  } finally {
    await context.close();
    await server.close();
  }
}

async function capturePortrait(browser) {
  const framesDir = join(OUTPUT_ROOT, 'portrait-frames');
  resetDir(framesDir);

  const { page, context, server } = await openDemoPage(browser, 'portrait');
  try {
    await cleanupListingChrome(page);
    await prepareScene(page, 'listing-portrait');
    await runGhost(page, 'smoke');
    await advance(page, 650);
    await captureFrames(page, framesDir, 48);
    copyFrame(framesDir, 16, join(LISTING_ROOT, `${PORTRAIT_PREFIX}-screenshot-1.png`));
    copyFrame(framesDir, 34, join(LISTING_ROOT, `${PORTRAIT_PREFIX}-screenshot-2.png`));
  } finally {
    await context.close();
    await server.close();
  }
}

async function main() {
  ensureDir(LISTING_ROOT);
  ensureDir(OUTPUT_ROOT);
  const browser = await chromium.launch({ headless: true });
  try {
    await captureLandscape(browser);
    await capturePortrait(browser);
  } finally {
    await browser.close();
  }
  console.log('listing captures written');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
