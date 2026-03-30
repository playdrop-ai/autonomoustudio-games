import { chromium, devices } from "/opt/homebrew/lib/node_modules/playwright/index.mjs";

const APP_URL = "http://localhost:8888/apps/wordbraid.html";

await captureSurface("mobile", "local-mobile", devices["iPhone 14"]);
await captureSurface("desktop", "local-desktop", {
  viewport: { width: 1280, height: 720 },
});

async function captureSurface(name, prefix, contextOptions) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  await page.goto(APP_URL, { waitUntil: "networkidle" });
  await page.waitForFunction(() => typeof window.__wordbraidDebug === "object" && typeof window.__wordbraidControls === "object");
  await page.screenshot({ path: `tmp/${prefix}-start.png` });

  await page.evaluate(() => {
    window.__wordbraidControls.start();
  });
  await page.waitForTimeout(200);

  for (let turn = 0; turn < 6; turn += 1) {
    const candidate = await page.evaluate(() => window.__wordbraidDebug.topCandidates[0] ?? null);
    if (candidate == null) break;
    await commitCandidate(page, candidate.pulls);
  }
  await page.screenshot({ path: `tmp/${prefix}-gameplay.png` });

  let loops = 0;
  while (loops < 160) {
    const state = await page.evaluate(() => ({
      screen: window.__wordbraidDebug.screen,
      candidates: window.__wordbraidDebug.topCandidates,
    }));
    if (state.screen === "gameover") break;
    const shortCandidate =
      state.candidates.find((candidate) => candidate.word.length === 3) ?? state.candidates[state.candidates.length - 1] ?? null;
    if (shortCandidate == null) break;
    await commitCandidate(page, shortCandidate.pulls);
    loops += 1;
  }
  await page.screenshot({ path: `tmp/${prefix}-end.png` });
  console.log(name, await page.evaluate(() => window.__wordbraidDebug));

  await browser.close();
}

async function commitCandidate(page, pulls) {
  await page.evaluate((values) => {
    for (const pull of values) {
      window.__wordbraidControls.selectRibbon(pull);
    }
    window.__wordbraidControls.submit();
  }, pulls);
  await page.waitForTimeout(120);
}
