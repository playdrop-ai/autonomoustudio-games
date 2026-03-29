import { chromium, webkit, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const HOUSE_LABEL_TO_ID = {
  SUN: 0,
  DROP: 1,
  LEAF: 2,
  STAR: 3,
};

const HOUSE_DOORSTEPS = [
  { x: 3, y: 1 },
  { x: 11, y: 1 },
  { x: 3, y: 9 },
  { x: 11, y: 9 },
];

const outputDir = resolve(process.argv[2] ?? 'tmp/verification');
const targetArg = process.argv[3] ?? 'local';

mkdirSync(outputDir, { recursive: true });

const localUrl = `${pathToFileURL(resolve('tmp/preview/index.html')).href}?automation=1`;
const targetUrl = targetArg === 'local'
  ? localUrl
  : appendAutomationFlag(targetArg);

await runDesktopCheck();
await runMobileCheck();

async function runDesktopCheck() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await bootPage(page);
  await page.screenshot({ path: resolve(outputDir, 'desktop-start.png') });
  await startRun(page);
  await assertKeyboardResponsive(page);
  await followGuideWithPointer(page, 2);
  await page.screenshot({ path: resolve(outputDir, 'desktop-playing.png') });
  const beforeLoss = await getSnapshot(page);
  await waitForGameOver(page);
  const afterLoss = await getSnapshot(page);
  if (afterLoss.bestScore < beforeLoss.score) {
    throw new Error(`desktop_best_score_not_persisted:${afterLoss.bestScore}:${beforeLoss.score}`);
  }
  await page.screenshot({ path: resolve(outputDir, 'desktop-gameover.png') });
  await page.evaluate(() => window.__wickstreetAutomation.retry());
  await page.waitForFunction(() => window.__wickstreetAutomation.snapshot().screen === 'playing');
  await browser.close();
}

async function runMobileCheck() {
  const browser = await webkit.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    viewport: { width: 932, height: 430 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await bootPage(page);
  await page.screenshot({ path: resolve(outputDir, 'mobile-start.png') });
  await startRun(page);
  await followGuideWithPointer(page, 2);
  await page.screenshot({ path: resolve(outputDir, 'mobile-playing.png') });
  await browser.close();
}

async function bootPage(page) {
  page.on('console', message => {
    const text = message.text();
    if (!text.includes('preview-stub')) {
      console.log(`[browser:${page.url() || 'boot'}]`, text);
    }
  });
  page.on('pageerror', error => {
    console.error(`[pageerror] ${error.message}`);
  });
  await page.goto(targetUrl, { waitUntil: 'load' });
  await waitForAutomation(page);
}

async function startRun(page) {
  await page.evaluate(() => window.__wickstreetAutomation.start());
  await page.waitForFunction(() => window.__wickstreetAutomation.snapshot().screen === 'playing');
  await page.waitForTimeout(150);
}

async function followGuideWithPointer(page, deliveriesNeeded) {
  const appBounds = await page.locator('#app').boundingBox();
  if (!appBounds) {
    throw new Error('mobile_verification_missing_app_bounds');
  }
  const holdPoint = { x: appBounds.x + appBounds.width / 2, y: appBounds.y + appBounds.height / 2 };
  await page.mouse.move(holdPoint.x, holdPoint.y);
  await page.mouse.down();

  let deliveries = 0;
  let previousScore = 0;
  while (deliveries < deliveriesNeeded) {
    const snapshot = await getSnapshot(page);
    if (snapshot.screen !== 'playing') {
      throw new Error(`mobile_verification_not_playing:${snapshot.screen}`);
    }
    if (snapshot.score > previousScore) {
      deliveries += 1;
      previousScore = snapshot.score;
    }
    const nextTarget = pickNextGuideCell(snapshot.guidePath, snapshot.player);
    const targetCell = nextTarget ?? HOUSE_DOORSTEPS[snapshot.activeRequest] ?? HOUSE_DOORSTEPS[0];
    const screenTarget = cellCenter(targetCell, snapshot.metrics);
    await page.mouse.move(screenTarget.x, screenTarget.y, { steps: 3 });
    await page.waitForTimeout(110);
  }

  await page.mouse.up();
}

async function assertKeyboardResponsive(page) {
  await page.locator('#app').click({ position: { x: 120, y: 120 } });
  const before = await getSnapshot(page);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(160);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(120);
  const after = await getSnapshot(page);
  if (after.player.x <= before.player.x + 0.08) {
    throw new Error(`desktop_keyboard_no_movement:${before.player.x}:${after.player.x}`);
  }
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

async function getSnapshot(page) {
  return page.evaluate(() => window.__wickstreetAutomation.snapshot());
}

async function waitForAutomation(page) {
  await page.waitForFunction(() => typeof window.__wickstreetAutomation?.snapshot === 'function');
}

async function waitForGameOver(page) {
  await page.waitForFunction(
    () => window.__wickstreetAutomation.snapshot().screen === 'gameover',
    { timeout: 45000 },
  );
}

function appendAutomationFlag(url) {
  const value = new URL(url);
  value.searchParams.set('automation', '1');
  return value.toString();
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
