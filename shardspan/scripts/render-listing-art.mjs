#!/usr/bin/env node

import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = '/Users/oliviermichon/Documents/autonomoustudio-games/shardspan';
const PLAYDROP_ROOT = '/Users/oliviermichon/Documents/playdrop';
const LISTING_ROOT = join(PROJECT_ROOT, 'listing');
const require = createRequire(join(PLAYDROP_ROOT, 'package.json'));
const { chromium } = require('playwright');

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function dataUrlFor(path) {
  const buffer = readFileSync(path);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

function buildCss({ width, height, screenshotUrl, portrait = false, icon = false }) {
  const titleSize = portrait ? 98 : 112;
  const subtitleSize = portrait ? 26 : 24;
  const shotWidth = portrait ? '76%' : '42%';
  const shotHeight = portrait ? '26%' : '58%';
  const shotLeft = portrait ? '12%' : '8%';
  const shotBottom = portrait ? '12%' : '13%';
  const secondShotWidth = portrait ? '64%' : '28%';
  const secondShotHeight = portrait ? '22%' : '40%';
  const secondShotRight = portrait ? '8%' : '10%';
  const secondShotTop = portrait ? '14%' : '16%';

  if (icon) {
    return `
      :root {
        --bg: #08101f;
        --ink: #f7f8ff;
        --amber: #f0b43f;
        --cobalt: #59a6ff;
        --violet: #6c4ab6;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        background:
          radial-gradient(circle at 50% 38%, rgba(247, 248, 255, 0.24), transparent 16%),
          radial-gradient(circle at 24% 78%, rgba(240, 180, 63, 0.22), transparent 22%),
          radial-gradient(circle at 78% 24%, rgba(89, 166, 255, 0.2), transparent 24%),
          linear-gradient(145deg, #14284d 0%, #08101f 54%, #0d1630 100%);
        position: relative;
        font-family: "Arial Black", Impact, "Helvetica Neue", sans-serif;
      }
      .band {
        position: absolute;
        left: -10%;
        right: -10%;
        height: 18%;
        border-radius: 999px;
        filter: blur(0.4px);
      }
      .band-amber {
        top: 58%;
        transform: rotate(-26deg);
        background: linear-gradient(90deg, transparent 0%, rgba(240, 180, 63, 0.16) 18%, rgba(240, 180, 63, 0.96) 48%, rgba(240, 180, 63, 0.18) 82%, transparent 100%);
      }
      .band-cobalt {
        top: 32%;
        transform: rotate(28deg);
        background: linear-gradient(90deg, transparent 0%, rgba(89, 166, 255, 0.16) 14%, rgba(89, 166, 255, 0.95) 50%, rgba(89, 166, 255, 0.18) 86%, transparent 100%);
      }
      .ring {
        position: absolute;
        inset: 22%;
        border-radius: 32%;
        border: 22px solid rgba(247, 248, 255, 0.08);
        transform: rotate(14deg);
      }
      .ring::after {
        content: "";
        position: absolute;
        inset: 8%;
        border-radius: 32%;
        border: 10px solid rgba(247, 248, 255, 0.05);
      }
      .shard {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 34%;
        height: 34%;
        transform: translate(-50%, -52%) rotate(8deg);
        background: linear-gradient(160deg, #ffffff 0%, #eef1ff 36%, #b7c9ff 100%);
        clip-path: polygon(50% 0%, 86% 31%, 70% 100%, 26% 100%, 12% 32%);
        box-shadow:
          0 0 0 18px rgba(247, 248, 255, 0.06),
          0 0 80px rgba(247, 248, 255, 0.24);
      }
      .shard::before,
      .shard::after {
        content: "";
        position: absolute;
        inset: 0;
        clip-path: inherit;
      }
      .shard::before {
        background: linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0));
      }
      .shard::after {
        background: linear-gradient(90deg, rgba(89,166,255,0.18), rgba(240,180,63,0.18));
        mix-blend-mode: multiply;
      }
      .relay {
        position: absolute;
        width: 26%;
        aspect-ratio: 1;
        border-radius: 26%;
        background: radial-gradient(circle at 50% 35%, rgba(255,255,255,0.18), transparent 32%), linear-gradient(180deg, rgba(20, 33, 64, 0.98), rgba(7, 12, 27, 0.98));
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.34);
      }
      .relay-left {
        left: 6%;
        bottom: 8%;
        transform: rotate(-10deg);
      }
      .relay-right {
        right: 6%;
        top: 8%;
        transform: rotate(14deg);
      }
      .relay::before {
        content: "";
        position: absolute;
        inset: 11%;
        border-radius: 22%;
        border: 18px solid rgba(247, 248, 255, 0.08);
      }
      .relay::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        width: 26%;
        height: 26%;
        transform: translate(-50%, -50%) rotate(8deg);
        background: linear-gradient(160deg, #ffffff 0%, #d7def8 100%);
        clip-path: polygon(50% 0%, 86% 31%, 70% 100%, 26% 100%, 12% 32%);
      }
    `;
  }

  return `
    :root {
      --bg: #08101f;
      --ink: #f7f8ff;
      --muted: rgba(247, 248, 255, 0.72);
      --amber: #f0b43f;
      --cobalt: #59a6ff;
      --violet: #6c4ab6;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: ${width}px;
      height: ${height}px;
      overflow: hidden;
      background:
        radial-gradient(circle at 20% 18%, rgba(240, 180, 63, 0.16), transparent 25%),
        radial-gradient(circle at 78% 20%, rgba(89, 166, 255, 0.18), transparent 28%),
        radial-gradient(circle at 56% 70%, rgba(247, 248, 255, 0.12), transparent 18%),
        linear-gradient(150deg, #14284d 0%, #08101f 56%, #0d1630 100%);
      font-family: "Arial Black", Impact, "Helvetica Neue", sans-serif;
      position: relative;
      color: var(--ink);
    }
    .noise {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
      background-size: 72px 72px;
      opacity: 0.14;
      mix-blend-mode: soft-light;
    }
    .haze {
      position: absolute;
      inset: -10%;
      background:
        radial-gradient(circle at 50% 40%, rgba(247, 248, 255, 0.12), transparent 18%),
        radial-gradient(circle at 46% 58%, rgba(247, 248, 255, 0.08), transparent 26%);
      filter: blur(32px);
      opacity: 0.9;
    }
    .band {
      position: absolute;
      left: -12%;
      right: -12%;
      height: ${portrait ? '15%' : '18%'};
      border-radius: 999px;
      opacity: 0.96;
      filter: blur(0.3px);
    }
    .band-amber {
      top: ${portrait ? '65%' : '59%'};
      transform: rotate(-26deg);
      background: linear-gradient(90deg, transparent 0%, rgba(240, 180, 63, 0.1) 16%, rgba(240, 180, 63, 0.96) 50%, rgba(240, 180, 63, 0.12) 82%, transparent 100%);
    }
    .band-cobalt {
      top: ${portrait ? '29%' : '33%'};
      transform: rotate(28deg);
      background: linear-gradient(90deg, transparent 0%, rgba(89, 166, 255, 0.14) 14%, rgba(89, 166, 255, 0.95) 50%, rgba(89, 166, 255, 0.14) 86%, transparent 100%);
    }
    .screenshot {
      position: absolute;
      width: ${shotWidth};
      height: ${shotHeight};
      left: ${shotLeft};
      bottom: ${shotBottom};
      border-radius: 28px;
      overflow: hidden;
      border: 2px solid rgba(247, 248, 255, 0.12);
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.42);
      transform: ${portrait ? 'rotate(-8deg)' : 'rotate(-8deg)'};
    }
    .screenshot.secondary {
      width: ${secondShotWidth};
      height: ${secondShotHeight};
      right: ${secondShotRight};
      left: auto;
      top: ${secondShotTop};
      bottom: auto;
      transform: ${portrait ? 'rotate(9deg)' : 'rotate(8deg)'};
      opacity: 0.82;
    }
    .screenshot img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: saturate(1.12) contrast(1.05) brightness(0.9);
    }
    .screenshot::after {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(180deg, rgba(8, 16, 31, 0.08), rgba(8, 16, 31, 0.54)),
        linear-gradient(125deg, rgba(240, 180, 63, 0.18), transparent 35%, rgba(89, 166, 255, 0.18));
    }
    .title-stack {
      position: absolute;
      left: 50%;
      top: ${portrait ? '48%' : '46%'};
      transform: translate(-50%, -50%);
      width: ${portrait ? '82%' : '54%'};
      text-align: center;
      z-index: 3;
    }
    .eyebrow {
      font-size: ${portrait ? 22 : 20}px;
      letter-spacing: 0.34em;
      color: rgba(247, 248, 255, 0.72);
      margin-bottom: 14px;
      text-transform: uppercase;
    }
    .title {
      margin: 0;
      font-size: ${titleSize}px;
      line-height: 0.92;
      letter-spacing: -0.05em;
      text-shadow:
        0 8px 28px rgba(0, 0, 0, 0.34),
        0 0 28px rgba(247, 248, 255, 0.18);
    }
    .title span {
      display: block;
      background: linear-gradient(180deg, #ffffff 0%, #eef2ff 62%, #cdd6fb 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      margin-top: 14px;
      font-size: ${subtitleSize}px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(247, 248, 255, 0.78);
    }
    .shard {
      position: absolute;
      left: 50%;
      top: ${portrait ? '48%' : '45%'};
      width: ${portrait ? '18%' : '13%'};
      height: ${portrait ? '15%' : '18%'};
      transform: translate(-50%, -50%) rotate(8deg);
      background: linear-gradient(160deg, #ffffff 0%, #eef1ff 38%, #bccaf9 100%);
      clip-path: polygon(50% 0%, 86% 31%, 70% 100%, 26% 100%, 12% 32%);
      box-shadow:
        0 0 0 18px rgba(247, 248, 255, 0.06),
        0 0 80px rgba(247, 248, 255, 0.24);
      z-index: 2;
    }
    .shard::before,
    .shard::after {
      content: "";
      position: absolute;
      inset: 0;
      clip-path: inherit;
    }
    .shard::before {
      background: linear-gradient(180deg, rgba(255,255,255,0.56), rgba(255,255,255,0));
    }
    .shard::after {
      background: linear-gradient(90deg, rgba(89,166,255,0.18), rgba(240,180,63,0.18));
      mix-blend-mode: multiply;
    }
    .relay-ring {
      position: absolute;
      left: 50%;
      top: ${portrait ? '48%' : '45%'};
      width: ${portrait ? '32%' : '24%'};
      height: ${portrait ? '18%' : '28%'};
      transform: translate(-50%, -50%) rotate(12deg);
      border-radius: 30%;
      border: 18px solid rgba(247, 248, 255, 0.09);
      z-index: 1;
    }
    .relay-ring::after {
      content: "";
      position: absolute;
      inset: 8%;
      border-radius: 30%;
      border: 8px solid rgba(247, 248, 255, 0.05);
    }
    .footer {
      position: absolute;
      left: 50%;
      bottom: ${portrait ? '7%' : '6%'};
      transform: translateX(-50%);
      font-size: ${portrait ? 20 : 18}px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(247, 248, 255, 0.56);
    }
  `;
}

function buildMarkup({ width, height, screenshotUrl, portrait = false, icon = false }) {
  const css = buildCss({ width, height, screenshotUrl, portrait, icon });
  if (icon) {
    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>${css}</style>
        </head>
        <body>
          <div class="band band-cobalt"></div>
          <div class="band band-amber"></div>
          <div class="ring"></div>
          <div class="relay relay-left"></div>
          <div class="relay relay-right"></div>
          <div class="shard"></div>
        </body>
      </html>
    `;
  }

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${css}</style>
      </head>
      <body>
        <div class="noise"></div>
        <div class="haze"></div>
        <div class="band band-cobalt"></div>
        <div class="band band-amber"></div>
        <div class="screenshot">
          <img src="${screenshotUrl}" alt="" />
        </div>
        <div class="screenshot secondary">
          <img src="${screenshotUrl}" alt="" />
        </div>
        <div class="relay-ring"></div>
        <div class="shard"></div>
        <div class="title-stack">
          <div class="eyebrow">Desktop Relay Sprint</div>
          <h1 class="title"><span>Shardspan</span></h1>
          <div class="subtitle">Wake the right bridge. Beat dusk.</div>
        </div>
        <div class="footer">Amber // Cobalt // Four Relays</div>
      </body>
    </html>
  `;
}

async function renderAsset(browser, { width, height, markup, outputPath }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  try {
    await page.setContent(markup, { waitUntil: 'load' });
    await page.evaluate(async () => {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
    });
    await page.screenshot({
      path: outputPath,
      type: 'png',
      animations: 'disabled',
    });
  } finally {
    await context.close();
  }
}

async function main() {
  ensureDir(LISTING_ROOT);
  const screenshotUrl = dataUrlFor(join(LISTING_ROOT, 'shardspan_1280x720-screenshot-1.png'));
  const browser = await chromium.launch({ headless: true });
  try {
    await renderAsset(browser, {
      width: 1280,
      height: 720,
      markup: buildMarkup({ width: 1280, height: 720, screenshotUrl }),
      outputPath: join(LISTING_ROOT, 'hero-landscape.png'),
    });
    await renderAsset(browser, {
      width: 720,
      height: 1280,
      markup: buildMarkup({ width: 720, height: 1280, screenshotUrl, portrait: true }),
      outputPath: join(LISTING_ROOT, 'hero-portrait.png'),
    });
    await renderAsset(browser, {
      width: 768,
      height: 768,
      markup: buildMarkup({ width: 768, height: 768, screenshotUrl, icon: true }),
      outputPath: join(LISTING_ROOT, 'icon.png'),
    });
  } finally {
    await browser.close();
  }
  console.log('listing art written');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
