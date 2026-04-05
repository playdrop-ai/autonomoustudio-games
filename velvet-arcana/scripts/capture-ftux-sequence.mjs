import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "output", "playwright", "ftux-sequence");
const baseUrl =
  process.env.TARGET_URL ??
  "http://127.0.0.1:8888/apps/dev/autonomoustudio/game/velvet-arcana/index.html";
const seed = Number(process.env.SEED ?? 1009);

const viewports = [
  {
    prefix: "desktop",
    label: "Desktop",
    viewport: { width: 1440, height: 1024 },
    isMobile: false,
    hasTouch: false,
  },
  {
    prefix: "mobile",
    label: "Mobile Portrait",
    viewport: { width: 430, height: 932 },
    isMobile: true,
    hasTouch: true,
  },
  {
    prefix: "mobile-landscape",
    label: "Mobile Landscape",
    viewport: { width: 932, height: 430 },
    isMobile: true,
    hasTouch: true,
  },
];

const scenarios = [
  { key: "welcome", order: "01", label: "Welcome" },
  { key: "reveal", order: "02", label: "Reveal Reading" },
  { key: "match", order: "03", label: "Match Card" },
  { key: "draw", order: "04", label: "Reveal New Reading" },
  { key: "help", order: "05", label: "How To Play" },
  { key: "normal", order: "06", label: "Normal Gameplay" },
];

async function main() {
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: viewport.viewport,
        screen: viewport.viewport,
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
        deviceScaleFactor: viewport.isMobile ? 3 : 2,
      });
      const page = await context.newPage();

      for (const scenario of scenarios) {
        await loadScenario(page, scenario.key);
        const targetPath = path.join(outputDir, `${viewport.prefix}-${scenario.order}-${slugify(scenario.label)}.png`);
        await page.screenshot({ path: targetPath });
        console.log(`captured ${path.basename(targetPath)}`);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }
}

async function loadScenario(page, scenarioKey) {
  await page.goto(`${baseUrl}?seed=${seed}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => Boolean(window.velvetArcanaDebug));
  await page.evaluate(() => window.localStorage.removeItem("velvet-arcana-best-score"));
  await page.evaluate(
    ({ runSeed, scenario }) => {
      const debug = window.velvetArcanaDebug;
      if (!debug) throw new Error("velvetArcanaDebug missing");

      const playFirst = () => {
        const current = debug.getState();
        if (current.playableColumns.length > 0) {
          debug.playColumn(current.playableColumns[0] - 1);
        }
      };

      const playUntilNoMatch = () => {
        for (let step = 0; step < 40; step += 1) {
          const current = debug.getState();
          if (current.playableColumns.length === 0 && current.stock > 0) return;
          if (current.playableColumns.length > 0) {
            debug.playColumn(current.playableColumns[0] - 1);
            continue;
          }
          if (current.stock > 0) {
            debug.draw();
            continue;
          }
          return;
        }
      };

      debug.startRun(runSeed);
      debug.setHelpOpen(false);
      debug.setTutorialStep(null);

      if (scenario === "welcome") {
        debug.setTutorialStep("welcome");
        return;
      }

      if (scenario === "reveal") {
        debug.setTutorialStep("reveal");
        return;
      }

      if (scenario === "match") {
        debug.draw();
        debug.setTutorialStep("match");
        return;
      }

      if (scenario === "draw") {
        debug.draw();
        playUntilNoMatch();
        debug.setTutorialStep("draw");
        return;
      }

      if (scenario === "help") {
        debug.setHelpOpen(true);
        return;
      }

      if (scenario === "normal") {
        debug.draw();
        playFirst();
      }
    },
    { runSeed: seed, scenario: scenarioKey },
  );
  await page.waitForTimeout(180);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
