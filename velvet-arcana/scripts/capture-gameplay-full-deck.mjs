import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const outputDir = path.join(rootDir, "output", "playwright", "card-art-full-deck");
const compositePath = path.join(outputDir, "velvet-arcana-card-art-full-deck-composite.png");
const seed = Number(process.env.SEED ?? 1009);

const viewports = [
  {
    name: "desktop",
    label: "Desktop",
    viewport: { width: 1440, height: 1024 },
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 2,
  },
  {
    name: "mobile-portrait",
    label: "Mobile Portrait",
    viewport: { width: 430, height: 932 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  },
  {
    name: "mobile-landscape",
    label: "Mobile Landscape",
    viewport: { width: 932, height: 430 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  },
];

async function main() {
  await mkdir(outputDir, { recursive: true });
  const server = await startStaticServer(distDir);
  const browser = await chromium.launch({ headless: true });

  try {
    for (const target of viewports) {
      const context = await browser.newContext({
        viewport: target.viewport,
        screen: target.viewport,
        isMobile: target.isMobile,
        hasTouch: target.hasTouch,
        deviceScaleFactor: target.deviceScaleFactor,
      });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      await page.goto(`${server.url}/index.html?seed=${seed}`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => Boolean(window.velvetArcanaDebug));
      await page.evaluate(({ runSeed }) => {
        const debug = window.velvetArcanaDebug;
        if (!debug) throw new Error("velvetArcanaDebug missing");
        window.localStorage.removeItem("velvet-arcana-best-score");
        debug.startRun(runSeed);
        debug.draw();
        debug.setTutorialStep(null);
        debug.setHelpOpen(false);
        for (let step = 0; step < 16; step += 1) {
          debug.autoStep("planner");
          const state = debug.getState();
          if (state.phase === "gameover") break;
        }
      }, { runSeed: seed });

      await page.waitForTimeout(150);

      const shotPath = path.join(outputDir, `${target.name}.png`);
      await page.screenshot({ path: shotPath });

      const stateJson = await page.evaluate(() => window.render_game_to_text?.() ?? "");
      await writeFile(path.join(outputDir, `${target.name}.json`), stateJson, "utf8");

      if (consoleErrors.length > 0) {
        throw new Error(`${target.name} console errors:\n${consoleErrors.join("\n")}`);
      }

      await context.close();
      console.log(`captured ${target.name}.png`);
    }
  } finally {
    await browser.close();
    await server.close();
  }

  await buildComposite();
}

async function buildComposite() {
  const python = `
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

output_dir = Path(${JSON.stringify(outputDir)})
images = [
    ("Desktop", output_dir / "desktop.png"),
    ("Mobile Portrait", output_dir / "mobile-portrait.png"),
    ("Mobile Landscape", output_dir / "mobile-landscape.png"),
]
thumb_w = 420
gap = 28
margin = 30
label_h = 36
bg = (17, 17, 17)
fg = (226, 221, 211)

loaded = []
for label, path in images:
    img = Image.open(path).convert("RGBA")
    scale = thumb_w / img.width
    thumb = img.resize((thumb_w, int(img.height * scale)), Image.Resampling.LANCZOS)
    loaded.append((label, thumb))

font = ImageFont.load_default()
height = margin * 2 + max(img.height for _, img in loaded) + label_h
width = margin * 2 + sum(img.width for _, img in loaded) + gap * (len(loaded) - 1)
canvas = Image.new("RGBA", (width, height), bg)
draw = ImageDraw.Draw(canvas)
x = margin
for label, img in loaded:
    draw.text((x, margin), label, fill=fg, font=font)
    canvas.alpha_composite(img, (x, margin + label_h))
    x += img.width + gap
canvas.save(${JSON.stringify(compositePath)})
`;

  const { spawn } = await import("node:child_process");
  await new Promise((resolve, reject) => {
    const child = spawn("python3", ["-c", python], { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`composite build failed: ${code}`))));
  });
  console.log(`wrote ${compositePath}`);
}

async function startStaticServer(root) {
  const server = createServer(async (req, res) => {
    try {
      const requestPath = req.url?.split("?")[0] ?? "/";
      const relativePath = requestPath === "/" ? "/index.html" : requestPath;
      const filePath = path.join(root, relativePath);
      const body = await readFile(filePath);
      res.writeHead(200, { "content-type": contentType(filePath) });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("failed to bind local static server");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  return "application/octet-stream";
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
