import { chromium } from "playwright";
import path from "node:path";
import { pathToFileURL } from "node:url";

const rootDir = path.resolve(import.meta.dirname, "..");
const mockupPath = path.join(rootDir, "mockups", "relayline-mockup.html");
const mockupUrl = pathToFileURL(mockupPath).href;

const jobs = [
  {
    state: "start",
    surface: "portrait",
    viewport: { width: 720, height: 1280 },
    output: path.join(rootDir, "mockups", "relayline-portrait-start.png"),
  },
  {
    state: "play",
    surface: "portrait",
    viewport: { width: 720, height: 1280 },
    output: path.join(rootDir, "mockups", "relayline-portrait-gameplay.png"),
  },
  {
    state: "gameover",
    surface: "portrait",
    viewport: { width: 720, height: 1280 },
    output: path.join(rootDir, "mockups", "relayline-portrait-gameover.png"),
  },
  {
    state: "start",
    surface: "desktop",
    viewport: { width: 1280, height: 720 },
    output: path.join(rootDir, "mockups", "relayline-desktop-start.png"),
  },
  {
    state: "play",
    surface: "desktop",
    viewport: { width: 1280, height: 720 },
    output: path.join(rootDir, "mockups", "relayline-desktop-gameplay.png"),
  },
  {
    state: "gameover",
    surface: "desktop",
    viewport: { width: 1280, height: 720 },
    output: path.join(rootDir, "mockups", "relayline-desktop-gameover.png"),
  },
];

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();

  for (const job of jobs) {
    await page.setViewportSize(job.viewport);
    await page.goto(`${mockupUrl}?state=${job.state}&surface=${job.surface}`, {
      waitUntil: "load",
    });
    await page.screenshot({ path: job.output, fullPage: false });
    console.log(`captured ${path.basename(job.output)}`);
  }
} finally {
  await browser.close();
}
