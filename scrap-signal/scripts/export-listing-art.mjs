import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const listingDir = path.join(rootDir, "listing");
const outputDir = path.join(rootDir, "output", "ai-art");

const landscapePath = path.join(listingDir, "hero-landscape.png");
const portraitPath = path.join(listingDir, "hero-portrait.png");
const iconPath = path.join(listingDir, "icon.png");
const familyReviewPath = path.join(outputDir, "fallback-family-review.png");

fs.mkdirSync(outputDir, { recursive: true });

const server = await createStaticServer(rootDir);
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({
    viewport: { width: 2800, height: 2600 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.goto(`${server.url}/listing/marketing.html`, {
    waitUntil: "load",
  });
  await page.waitForLoadState("networkidle");

  await page.locator("#hero-landscape").screenshot({ path: landscapePath });
  await page.locator("#hero-portrait").screenshot({ path: portraitPath });
  await page.locator("#icon-art").screenshot({ path: iconPath });
  await page.screenshot({ path: familyReviewPath, fullPage: true });

  process.stdout.write(
    `${JSON.stringify(
      {
        landscapePath,
        portraitPath,
        iconPath,
        familyReviewPath,
      },
      null,
      2,
    )}\n`,
  );

  await context.close();
} finally {
  await browser.close();
  await server.close();
}

async function createStaticServer(directory) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(
      url.pathname === "/" ? "/index.html" : url.pathname,
    );
    const filePath = path.join(directory, pathname);

    if (!filePath.startsWith(directory)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        response.writeHead(301, { Location: `${pathname}/index.html` }).end();
        return;
      }

      response.writeHead(200, { "Content-Type": contentType(filePath) });
      fs.createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind static server");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}
