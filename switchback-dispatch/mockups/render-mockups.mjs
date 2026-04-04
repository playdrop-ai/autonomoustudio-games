import { chromium } from 'playwright';
import { resolve } from 'node:path';

const root = resolve(process.cwd(), 'mockups');
const screens = [
  ['contract-select.html', 'contract-select-desktop.png'],
  ['gameplay.html', 'gameplay-desktop.png'],
  ['results.html', 'results-desktop.png'],
];

const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  for (const [input, output] of screens) {
    const page = await context.newPage();
    await page.goto(`file://${resolve(root, input)}`);
    await page.screenshot({
      path: resolve(root, output),
      type: 'png',
    });
    await page.close();
  }
} finally {
  await browser.close();
}
