import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const url = new URL("../dist/index.html", import.meta.url).href;
const outDir = new URL("../assets/marketing/screenshots/", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (const target of [
    { name: "portrait-1.png", width: 720, height: 1280, surface: "mobile-portrait", sceneId: "listing-portrait" },
    { name: "landscape-1.png", width: 1280, height: 720, surface: "mobile-landscape", sceneId: "listing-landscape" },
  ]) {
    const page = await browser.newPage({ viewport: { width: target.width, height: target.height }, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector("canvas");
    await page.evaluate(async (payload) => {
      await window.__listingCapture?.prepare?.({
        active: true,
        sceneId: payload.sceneId,
        surface: payload.surface,
        seed: "listing",
        audioPolicy: "sfx-only",
      });
    }, target);
    await page.waitForTimeout(1050);
    await page.screenshot({ path: `${outDir}${target.name}`, fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(`[block-burst] Wrote screenshots to ${outDir}`);
