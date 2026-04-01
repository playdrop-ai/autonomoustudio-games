import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";

const serverBase = process.argv[2] ?? "http://127.0.0.1:4179/dist/index.html";
const outDir = process.argv[3] ?? path.resolve("output/playwright/ui-audit");

const viewports = [
  { name: "desktop", width: 1280, height: 720 },
  { name: "portrait", width: 430, height: 932 },
];

const states = [
  { name: "start", label: "Start", params: "" },
  { name: "play", label: "Play", params: "?autostart=1" },
  { name: "drop", label: "Drop", params: "?autostart=1&autoplay=expert&debug_clock=manual" },
  { name: "gameover", label: "Game Over", params: "?autostart=1&autoplay=expert&debug_clock=manual" },
];

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of viewports) {
    for (const state of states) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      await page.goto(`${serverBase}${state.params}`, { waitUntil: "networkidle" });
      await waitForGame(page);

      if (state.name === "play") {
        await page.waitForTimeout(150);
      }

      if (state.name === "drop") {
        await waitForDropLabel(page);
      }

      if (state.name === "gameover") {
        await waitForGameOver(page);
      }

      const file = path.join(outDir, `${state.name}-${viewport.name}.png`);
      await page.screenshot({ path: file });
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const manifest = {
  serverBase,
  outDir,
  screens: viewports.flatMap((viewport) =>
    states.map((state) => ({
      state: state.name,
      viewport: viewport.name,
      file: `${state.name}-${viewport.name}.png`,
    })),
  ),
};

await fs.writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

async function waitForGame(page) {
  await page.waitForFunction(() => Boolean(window.__fruitSaladControls?.getState));
}

async function waitForDropLabel(page) {
  await page.evaluate(async () => {
    const controls = window.__fruitSaladControls;
    if (!controls) throw new Error("fruit salad controls unavailable");
    let previousLargestDrop = controls.getState().largestDrop;
    for (let step = 0; step < 180; step += 1) {
      await window.advanceTime?.(80);
      const current = controls.getState();
      if (current.largestDrop > previousLargestDrop && current.animating) {
        return;
      }
      previousLargestDrop = Math.max(previousLargestDrop, current.largestDrop);
    }
    throw new Error("drop label state not reached");
  });
}

async function waitForGameOver(page) {
  await page.evaluate(async () => {
    const controls = window.__fruitSaladControls;
    if (!controls) throw new Error("fruit salad controls unavailable");
    for (let step = 0; step < 500; step += 1) {
      const current = controls.getState();
      if (current.screen === "gameover") return;
      await window.advanceTime?.(120);
    }
    throw new Error("game over state not reached");
  });
}
