import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const baseUrl = process.argv[2] || "http://127.0.0.1:4174";
const outputDir = "/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright";

mkdirSync(outputDir, { recursive: true });

const TARGET_LATCHES = [
  ["cross", "cross"],
  ["straight"],
  ["straight", "straight"],
  ["straight"],
  ["straight", "straight"],
];

const SCENES = [
  { name: "local-desktop-review", viewport: { width: 1600, height: 900 } },
  { name: "local-portrait-review", viewport: { width: 720, height: 1280 } },
];

for (const scene of SCENES) {
  await captureScene(scene.name, scene.viewport);
}

async function captureScene(name, viewport) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  page.setDefaultTimeout(45_000);

  await openFresh(page);
  await page.screenshot({ path: `${outputDir}/${name}-start.png`, fullPage: true });

  await page.evaluate(() => {
    window.__latchbloomControls?.startRun();
    window.advanceTime?.(4200);
  });
  await page.screenshot({ path: `${outputDir}/${name}-gameplay.png`, fullPage: true });

  await openFresh(page);
  await page.evaluate((target) => {
    window.__latchbloomControls?.startRun();
    const current = window.__latchbloomDebug?.latches ?? [];
    for (let row = 0; row < target.length; row += 1) {
      for (let pairIndex = 0; pairIndex < target[row].length; pairIndex += 1) {
        if (current[row]?.[pairIndex] !== target[row][pairIndex]) {
          window.__latchbloomControls?.toggleLatch(row, pairIndex);
        }
      }
    }
    for (let step = 0; step < 40; step += 1) {
      if (window.__latchbloomDebug?.screen === "gameover") break;
      window.advanceTime?.(1000);
    }
  }, TARGET_LATCHES);
  await page.waitForFunction(() => window.__latchbloomDebug?.screen === "gameover");
  await page.screenshot({ path: `${outputDir}/${name}-gameover.png`, fullPage: true });

  await browser.close();
}

async function openFresh(page) {
  await page.goto(`${baseUrl}?seed=1337`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__latchbloomDebug && window.__latchbloomControls));
}
